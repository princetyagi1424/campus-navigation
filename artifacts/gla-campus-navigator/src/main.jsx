import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigation, MapPin, LocateFixed, Search, ArrowUpDown, Footprints, Clock3, Route, X, Crosshair, GraduationCap, Locate, ChevronRight, Info, LoaderCircle, ShieldCheck, ExternalLink, Download, Layers } from 'lucide-react';
import './style.css';
import { haversine, nodeDistance, nearestGraphNode, dijkstra, graphInstructions } from './routing-core.js';
import CampusMap from './CampusMap.jsx';

// Approximate campus map center only. Popular-place coordinates are never fabricated.
const CAMPUS = [27.605, 77.594];
const CAMPUS_BOUNDS = { south: 27.59, west: 77.58, north: 27.62, east: 77.61 };
const CAMPUS_RADIUS_M = 2200;
const isEmbeddedShell = new URLSearchParams(window.location.search).get('native') === '1';
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const ROUTING_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving/';
let graphCache = null;
let graphCacheAt = 0;
let overpassEndpointIndex = 0;
const geocodeCache = new Map();
const reverseCache = new Map();
let nominatimQueue = Promise.resolve();
let lastNominatimRequestAt = 0;

const fmtDistance = m => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
const fmtTime = seconds => {
  const min = Math.max(1, Math.round(seconds / 60));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} hr ${min % 60} min`;
};
const inCampusBounds = ([lat, lon]) => lat >= CAMPUS_BOUNDS.south && lat <= CAMPUS_BOUNDS.north && lon >= CAMPUS_BOUNDS.west && lon <= CAMPUS_BOUNDS.east;
const isNearCampus = point => haversine(point, CAMPUS) <= CAMPUS_RADIUS_M;

async function fetchWithTimeout(url, options = {}, timeoutMs = 18000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

// Serialize public Nominatim requests to stay below its one-request-per-second guidance.
function nominatimFetch(url, timeoutMs = 12000) {
  const task = async () => {
    const waitMs = Math.max(0, 1100 - (Date.now() - lastNominatimRequestAt));
    if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
    lastNominatimRequestAt = Date.now();
    return fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, timeoutMs);
  };
  const result = nominatimQueue.then(task, task);
  nominatimQueue = result.then(() => undefined, () => undefined);
  return result;
}
// Search is explicit (button/Enter), not per-keystroke, and repeated queries are cached.
async function geocode(query) {
  const q = query.trim();
  if (q.length < 2) throw new Error('Enter at least 2 characters to search.');
  const scoped = /gla|mathura|uttar pradesh/i.test(q) ? q : `${q}, GLA University, Mathura, Uttar Pradesh, India`;
  const key = scoped.toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&q=${encodeURIComponent(scoped)}`;
  const res = await nominatimFetch(url);
  if (res.status === 429) throw new Error('Place search is temporarily rate-limited. Wait a moment or choose the point directly on the map.');
  if (!res.ok) throw new Error('Place search is temporarily unavailable. Try selecting the point on the map.');
  const data = await res.json();
  geocodeCache.set(key, data);
  return data;
}
async function reverseGeocode(lat, lon) {
  const fallback = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (reverseCache.has(key)) return reverseCache.get(key);
  try {
    const res = await nominatimFetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, 9000);
    if (!res.ok) return fallback;
    const data = await res.json();
    const label = data.name || data.display_name?.split(',').slice(0, 2).join(',') || fallback;
    reverseCache.set(key, label);
    return label;
  } catch { return fallback; }
}

async function loadWalkingGraph() {
  if (graphCache && Date.now() - graphCacheAt < 10 * 60 * 1000) return graphCache;
  const { south, west, north, east } = CAMPUS_BOUNDS;
  const query = `[out:json][timeout:20];(way[highway](${south},${west},${north},${east})[foot!~"no|private"][access!~"no|private"];);out body;>;out skel qt;`;
  let lastError;
  for (let attempt = 0; attempt < OVERPASS_ENDPOINTS.length; attempt++) {
    const idx = (overpassEndpointIndex + attempt) % OVERPASS_ENDPOINTS.length;
    try {
      const res = await fetchWithTimeout(OVERPASS_ENDPOINTS[idx], {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' }, body: `data=${encodeURIComponent(query)}`,
      }, 26000);
      if (res.status === 429 || res.status === 504) throw new Error('OpenStreetMap walking data is busy. Please retry shortly.');
      if (!res.ok) throw new Error(`Walking map data request failed (${res.status}).`);
      const data = await res.json();
      const nodes = new Map();
      const ways = [];
      for (const el of data.elements || []) {
        if (el.type === 'node') nodes.set(el.id, { id: el.id, lat: el.lat, lon: el.lon });
        if (el.type === 'way' && el.nodes?.length > 1) {
          const tags = el.tags || {};
          if (tags.foot === 'no' || tags.foot === 'private' || tags.access === 'no' || tags.access === 'private') continue;
          if (tags.highway === 'motorway' || tags.highway === 'motorway_link' || tags.highway === 'construction') continue;
          ways.push(el.nodes);
        }
      }
      const adj = new Map();
      const addEdge = (a, b, weight) => {
        if (!adj.has(a)) adj.set(a, []);
        adj.get(a).push({ id: b, weight });
      };
      for (const way of ways) {
        for (let i = 1; i < way.length; i++) {
          const a = nodes.get(way[i - 1]), b = nodes.get(way[i]);
          if (!a || !b) continue;
          const weight = nodeDistance(a, b);
          if (!Number.isFinite(weight) || weight <= 0 || weight > 250) continue;
          addEdge(a.id, b.id, weight);
          addEdge(b.id, a.id, weight);
        }
      }
      if (nodes.size < 2 || adj.size < 2) throw new Error('No connected walking paths were found in the current OpenStreetMap data for this campus area.');
      graphCache = { nodes, adj };
      graphCacheAt = Date.now();
      overpassEndpointIndex = idx;
      return graphCache;
    } catch (e) { lastError = e; }
  }
  throw lastError || new Error('Could not load pedestrian map data.');
}

async function getShortestWalkingRoute(from, to) {
  // Only use the local graph for campus-scale routes; don't download a large network for distant GPS points.
  if (inCampusBounds(from) && inCampusBounds(to)) {
    try {
      const graph = await loadWalkingGraph();
      const start = nearestGraphNode(from, graph), end = nearestGraphNode(to, graph);
      const path = dijkstra(graph, start.node.id, end.node.id);
      const coords = path.map(id => { const n = graph.nodes.get(id); return [n.lat, n.lon]; });
      const distance = coords.slice(1).reduce((sum, p, i) => sum + haversine(coords[i], p), 0) + start.connectorDistance + end.connectorDistance;
      return { coordinates: [from, ...coords, to], distance, duration: distance / 75 * 60, instructions: graphInstructions([from, ...coords, to]), strategy: 'Shortest mapped path', shortest: true, source: 'OpenStreetMap walking graph' };
    } catch (e) {
      // A transparent fallback is useful if the OSM walking graph is missing or temporarily unavailable.
      const fallback = await getRecommendedRoute(from, to);
      return { ...fallback, warning: `Exact shortest-path calculation was unavailable: ${e.message}` };
    }
  }
  const route = await getRecommendedRoute(from, to);
  return { ...route, warning: 'For routes outside the campus map area, the public pedestrian router returns its recommended route; it is not guaranteed to be the shortest by distance.' };
}
async function getRecommendedRoute(from, to) {
  const coords = `${from[1]},${from[0]};${to[1]},${to[0]}`;
  const url = `${ROUTING_URL}${coords}?overview=full&geometries=geojson&steps=true`;
  const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 18000);
  if (!res.ok) throw new Error('The walking-route service is temporarily unavailable. Check your connection or retry shortly.');
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route found in available pedestrian map data. The paths between these points may not be mapped. Try selecting points closer to visible paths.');
  const r = data.routes[0];
  const instructions = (r.legs || []).flatMap(leg => leg.steps || []).map(s => {
    const m = s.maneuver || {};
    const modifier = m.modifier ? m.modifier.replace('-', ' ') : '';
    const action = m.type === 'depart' ? 'Start walking' : m.type === 'arrive' ? 'You have arrived' : m.type === 'roundabout' ? 'At the roundabout' : modifier ? `Turn ${modifier}` : 'Continue along the path';
    return { text: `${action}${s.name && s.name.trim() ? ` onto ${s.name}` : ''}`, distance: s.distance || 0 };
  });
  return { coordinates: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]), distance: r.distance, duration: r.duration, instructions, strategy: 'Recommended walking route', shortest: false, source: 'OSM pedestrian routing service' };
}

function App() {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [fromText, setFromText] = useState('My location');
  const [toText, setToText] = useState('');
  const [activeField, setActiveField] = useState('to');
  const [pickMode, setPickMode] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [routing, setRouting] = useState(false);
  const [route, setRoute] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('Choose a destination to get started.');
  const [showSteps, setShowSteps] = useState(false);
  const [mapPoint, setMapPoint] = useState(CAMPUS);
  const [focusKey, setFocusKey] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [map3D, setMap3D] = useState(true);
  const [threeDAvailable, setThreeDAvailable] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const searchRequest = useRef(0);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(error => console.error('App shell could not be cached:', error));
    }
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
    const captureInstallPrompt = event => { event.preventDefault(); setInstallPromptEvent(event); };
    const markInstalled = () => { setIsInstalled(true); setInstallPromptEvent(null); };
    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPromptEvent) { setInstallHelpOpen(true); return; }
    try {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice?.outcome === 'accepted') setIsInstalled(true);
      setInstallPromptEvent(null);
    } catch (error) {
      console.error('The browser could not open its install prompt:', error);
      setInstallHelpOpen(true);
    }
  }

  const popular = useMemo(() => [
    { name: 'GLA University Main Gate', query: 'GLA University main gate, Mathura, Uttar Pradesh, India', subtitle: 'Campus entrance' },
    { name: 'Academic Block', query: 'Academic block GLA University, Mathura, India', subtitle: 'Teaching & learning' },
    { name: 'Central Library', query: 'Central library GLA University, Mathura, India', subtitle: 'Study & research' },
    { name: 'Canteen', query: 'Canteen GLA University, Mathura, India', subtitle: 'Food & refreshments' },
    { name: 'Boys Hostel', query: 'Boys hostel GLA University, Mathura, India', subtitle: 'Accommodation' },
    { name: 'Girls Hostel', query: 'Girls hostel GLA University, Mathura, India', subtitle: 'Accommodation' },
    { name: 'Sports Facilities', query: 'Sports facilities GLA University, Mathura, India', subtitle: 'Sports & recreation' },
  ], []);

  const setPoint = useCallback(async (which, coords, label) => {
    const name = label || await reverseGeocode(coords[0], coords[1]);
    if (which === 'from') { setFrom(coords); setFromText(name); setGpsAccuracy(null); }
    else { setTo(coords); setToText(name); }
    setMapPoint(coords); setFocusKey(v => v + 1); setSearchResults([]); setPickMode(null); setRoute(null); setError('');
  }, []);

  const useGPS = useCallback(() => {
    setError('');
    if (!navigator.geolocation) { setError('This browser does not support GPS location. Choose your starting point manually on the map.'); return; }
    setLocating(true); setNotice('Waiting for location permission…');
    navigator.geolocation.getCurrentPosition(async pos => {
      const coords = [pos.coords.latitude, pos.coords.longitude];
      await setPoint('from', coords, 'My current location');
      setGpsAccuracy(pos.coords.accuracy || null);
      setLocating(false); setNotice('GPS location set. Choose your destination.');
    }, err => {
      setLocating(false);
      setError(err.code === 1 ? 'Location permission was denied. Allow location access in browser settings or select your start point on the map.' : err.code === 3 ? 'GPS took too long to respond. Check location services and retry, or choose a point on the map.' : 'Could not get GPS location. Check device location settings, or choose a point on the map.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 15000 });
  }, [setPoint]);

  async function searchPlace(q, field = activeField) {
    if (!q.trim()) { setError('Type a place name first.'); return; }
    const requestId = ++searchRequest.current;
    setSearching(true); setError(''); setSearchResults([]);
    try {
      const results = await geocode(q);
      if (requestId !== searchRequest.current) return;
      const mapped = results.map(r => ({ name: r.name || r.display_name.split(',')[0], detail: r.display_name, coords: [Number(r.lat), Number(r.lon)], field }))
        .filter(r => Number.isFinite(r.coords[0]) && Number.isFinite(r.coords[1]));
      if (!mapped.length) setError('No matching place found. Try a different name or select the exact point on the map.');
      else setSearchResults(mapped);
    } catch (e) { if (requestId === searchRequest.current) setError(e.message || 'Place search failed.'); }
    finally { if (requestId === searchRequest.current) setSearching(false); }
  }

  async function choosePopular(item) {
    setSearching(true); setError(''); setSearchResults([]);
    try {
      const results = await geocode(item.query);
      const valid = results.map(r => ({ name: r.name || r.display_name.split(',')[0], detail: r.display_name, coords: [Number(r.lat), Number(r.lon)] }))
        .filter(r => Number.isFinite(r.coords[0]) && Number.isFinite(r.coords[1]) && inCampusBounds(r.coords) && isNearCampus(r.coords));
      if (!valid.length) {
        setError(`${item.name} could not be reliably located in OpenStreetMap. Search for it and verify the result, or select its exact location on the map. No guessed coordinates were used.`);
        return;
      }
      // Even a single geocoded hit must be explicitly confirmed; OSM names can be approximate.
      setSearchResults(valid.map(r => ({ ...r, field: 'to' })));
      setNotice(`Choose the mapped result for ${item.name} to confirm its location.`);
    } catch (e) { setError(e.message || `Could not find ${item.name}.`); }
    finally { setSearching(false); }
  }

  async function findRoute() {
    setError('');
    if (!from) { setError('Set a starting point using GPS or by selecting a point on the map.'); return; }
    if (!to) { setError('Choose a destination from search results or select a point on the map.'); return; }
    if (haversine(from, to) < 3) { setError('Start and destination are almost the same point. Choose a different destination.'); return; }
    setRouting(true); setNotice('Loading mapped pedestrian paths and calculating route…'); setShowSteps(false); setRoute(null);
    try {
      const r = await getShortestWalkingRoute(from, to);
      setRoute(r); setNotice(r.shortest ? 'Shortest mapped walking path ready' : 'Recommended walking route ready');
    } catch (e) { setError(e.message || 'Could not calculate a route.'); setNotice('Route unavailable'); }
    finally { setRouting(false); }
  }

  function onMapPick(mode, coords) {
    setPoint(mode, coords);
    setNotice(`Selected ${mode === 'from' ? 'starting point' : 'destination'} on the map.`);
  }
  function swapPoints() {
    const a = from, b = to, at = fromText, bt = toText;
    setFrom(b); setTo(a); setFromText(bt); setToText(at); setGpsAccuracy(null); setRoute(null); setError('');
  }
  function focusPoint(point) {
    if (point) { setMapPoint(point); setFocusKey(v => v + 1); }
    else { setMapPoint(CAMPUS); setFocusKey(v => v + 1); }
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><GraduationCap size={22}/></div><div><div className="brand-title">GLA <span>Campus Navigator</span></div><div className="brand-sub">YOUR CAMPUS. YOUR WAY.</div></div></div>
      <div className="header-actions"><div className="top-status"><span className="live-dot"/> OpenStreetMap <span className="top-divider">·</span> Pedestrian routing</div>{!isInstalled && !isEmbeddedShell && <button className="install-app-btn" onClick={installApp}><Download size={15}/><span>Install app</span></button>}</div>
    </header>
    <main className="workspace">
      <aside className="sidebar">
        <div className="intro"><div className="eyebrow">CAMPUS WAYFINDING</div><h1>Find your way<br/><span>around GLA.</span></h1><p>Choose your start and destination. Routes follow mapped walking paths where available.</p></div>
        <section className="route-form">
          <div className="field-label">FROM</div>
          <div className="location-field"><span className="field-icon start-dot"><MapPin size={17}/></span><input aria-label="Starting point" value={fromText} onFocus={() => setActiveField('from')} onChange={e => {setFromText(e.target.value); setFrom(null); setGpsAccuracy(null); setRoute(null); setActiveField('from'); setSearchResults([]);}} onKeyDown={e => e.key === 'Enter' && searchPlace(fromText, 'from')} placeholder="Search start or use GPS"/><button className="field-action" title="Search starting point" aria-label="Search starting point" onClick={() => searchPlace(fromText, 'from')} disabled={searching}><Search size={17}/></button><button className="field-action" title="Use my GPS location" aria-label="Use my GPS location" onClick={useGPS} disabled={locating}>{locating ? <LoaderCircle className="spin" size={18}/> : <LocateFixed size={18}/>}</button></div>
          <button className="map-pick" onClick={() => {setPickMode('from'); setActiveField('from'); setNotice('Tap the map to set your starting point.')}}><Crosshair size={14}/> Pick start point on map</button>
          {from && <div className="selected-note"><ShieldCheck size={13}/> Start point selected{gpsAccuracy ? ` · GPS accuracy about ${Math.round(gpsAccuracy)} m` : ''}</div>}
          <div className="swap-row"><div className="connector-line"/><button onClick={swapPoints} className="swap-btn" title="Swap start and destination" aria-label="Swap start and destination"><ArrowUpDown size={15}/></button></div>
          <div className="field-label">TO</div>
          <div className="location-field"><span className="field-icon end-dot"><MapPin size={17}/></span><input aria-label="Destination" value={toText} onFocus={() => setActiveField('to')} onChange={e => {setToText(e.target.value); setTo(null); setRoute(null); setActiveField('to'); setSearchResults([]);}} onKeyDown={e => e.key === 'Enter' && searchPlace(toText, 'to')} placeholder="Search campus building or place"/><button className="field-action" title="Search destination" aria-label="Search destination" onClick={() => searchPlace(toText, 'to')} disabled={searching}>{searching ? <LoaderCircle className="spin" size={18}/> : <Search size={18}/>}</button></div>
          <button className="map-pick" onClick={() => {setPickMode('to'); setActiveField('to'); setNotice('Tap the map to set your destination.')}}><Crosshair size={14}/> Pick destination on map</button>
          {searchResults.length > 0 && <div className="search-results" aria-label="Search results">{searchResults.map((r,i)=><button key={`${r.coords.join(',')}-${i}`} onClick={() => setPoint(r.field || activeField, r.coords, r.name)}><MapPin size={15}/><span><b>{r.name}</b><small>{r.detail}</small></span></button>)}</div>}
          <button className="primary-btn" onClick={findRoute} disabled={routing}>{routing ? <LoaderCircle className="spin" size={18}/> : <Navigation size={18}/>} {routing ? 'Finding route…' : 'Find walking route'}<ChevronRight size={18}/></button>
        </section>
        {error && <div className="error-box" role="status"><Info size={16}/><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss message"><X size={15}/></button></div>}
        {route && <section className="route-summary"><div className="summary-heading"><span className="summary-icon"><Footprints size={18}/></span><div><b>{route.shortest ? 'Shortest mapped path' : 'Recommended walking route'}</b><small>{route.shortest ? 'Dijkstra · shortest by mapped distance' : 'Based on available pedestrian data'}</small></div><button onClick={() => {setRoute(null);setShowSteps(false);}} aria-label="Clear route"><X size={16}/></button></div><div className="metrics"><div><Route size={16}/><b>{fmtDistance(route.distance)}</b><small>Distance</small></div><div><Clock3 size={16}/><b>{fmtTime(route.duration)}</b><small>Est. walking</small></div></div>{route.warning && <div className="route-warning"><Info size={14}/>{route.warning}</div>}<button className="steps-toggle" onClick={() => setShowSteps(!showSteps)}>{showSteps ? 'Hide directions' : 'View turn-by-turn directions'}<ChevronRight size={16} className={showSteps ? 'rotate' : ''}/></button>{showSteps && <ol className="steps-list">{route.instructions.map((s,i)=><li key={i}><span>{i+1}</span><div>{s.text}<small>{s.distance > 0 ? fmtDistance(s.distance) : (s.text.toLowerCase().includes('arrived') ? 'Finish' : 'At junction')}</small></div></li>)}</ol>}<a className="external-directions" href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${from[0]}%2C${from[1]}%3B${to[0]}%2C${to[1]}`} target="_blank" rel="noreferrer">Open directions in OpenStreetMap <ExternalLink size={13}/></a></section>}
        {!route && <section className="quick-dest"><div className="section-heading"><span>POPULAR DESTINATIONS</span><span className="mini-count">{popular.length} PLACES</span></div><div className="destination-list">{popular.map((p,i)=><button key={p.name} onClick={() => choosePopular(p)} disabled={searching}><span className={`place-symbol place-${i % 5}`}><MapPin size={16}/></span><span className="place-copy"><b>{p.name}</b><small>{p.subtitle}</small></span><ChevronRight size={16} className="place-arrow"/></button>)}</div></section>}
        <div className="sidebar-foot"><Info size={14}/><span>Campus paths may be incomplete. Verify before walking. GPS and selected coordinates are sent to public map services for routing/search.</span></div>
      </aside>
      <section className="map-area">
        <div className="map-toolbar"><div className="map-title"><span className="map-title-icon"><MapPin size={17}/></span><div><b>GLA University</b><small>Mathura, Uttar Pradesh, India</small></div></div><div className="map-toolbar-actions"><button className={`map-3d-toggle${map3D && threeDAvailable ? ' active' : ''}`} disabled={!threeDAvailable} title={threeDAvailable ? 'Toggle 3D building view' : '3D buildings need WebGL2; showing the 2D map'} onClick={() => setMap3D(value => !value)} aria-pressed={threeDAvailable && map3D}><Layers size={16}/><span>{threeDAvailable ? (map3D ? '3D buildings' : '2D map') : '2D fallback'}</span></button><button className="locate-map-btn" onClick={() => from ? focusPoint(from) : useGPS()}><Locate size={16}/><span>My location</span></button></div></div>
        {pickMode && <div className="map-instruction"><Crosshair size={16}/><span>Tap the map to set your <b>{pickMode === 'from' ? 'starting point' : 'destination'}</b></span><button onClick={() => setPickMode(null)} aria-label="Cancel map selection"><X size={15}/></button></div>}
        <div className="map-frame"><CampusMap from={from} to={to} route={route} gpsAccuracy={gpsAccuracy} mapPoint={mapPoint} focusKey={focusKey} pickMode={pickMode} is3D={map3D} onPick={onMapPick} on3DAvailabilityChange={setThreeDAvailable}/><div className="map-legend"><span><i className="legend-dot green"/> Start</span><span><i className="legend-dot red"/> Destination</span><span><i className="legend-line"/> Walking route</span></div><button className="map-recenter" onClick={() => focusPoint(from || CAMPUS)} title="Recenter map" aria-label="Recenter map"><LocateFixed size={19}/></button></div>
        <div className="map-bottom"><div className="map-bottom-left"><span className="map-bottom-icon"><Footprints size={17}/></span><div><b>{route ? `${fmtDistance(route.distance)} walking route` : 'Explore the campus map'}</b><small>{route ? `${fmtTime(route.duration)} on foot · ${route.shortest ? 'shortest mapped distance' : 'recommended route'}` : (pickMode ? `Tap map to choose ${pickMode === 'from' ? 'start' : 'destination'}` : notice)}</small></div></div>{route && <button className="clear-route" onClick={() => {setRoute(null);setShowSteps(false);}}>Clear route <X size={14}/></button>}</div>
      </section>
    </main>
    <footer className="footer"><span>GLA CAMPUS NAVIGATOR <span className="footer-dot">·</span> STUDENT PROJECT</span><span>© OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Report a map issue</a></span></footer>
    {installHelpOpen && <div className="install-help-backdrop" onMouseDown={event => {if (event.target === event.currentTarget) setInstallHelpOpen(false);}}><section className="install-help" role="dialog" aria-modal="true" aria-labelledby="install-help-title"><button className="install-help-close" onClick={() => setInstallHelpOpen(false)} aria-label="Close install instructions"><X size={18}/></button><span className="install-help-icon"><Download size={20}/></span><h2 id="install-help-title">Add GLA Campus Navigator</h2><p>Install this website on your device for a home-screen app experience. An internet connection is still needed for live maps and routing.</p><div><b>Android / Chrome</b><span>Open the browser menu and choose “Install app” or “Add to Home screen”.</span></div><div><b>iPhone / iPad</b><span>In Safari, tap Share, then choose “Add to Home Screen”.</span></div><button className="install-help-done" onClick={() => setInstallHelpOpen(false)}>Got it</button></section></div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
