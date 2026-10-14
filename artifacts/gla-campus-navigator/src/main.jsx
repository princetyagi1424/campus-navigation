import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigation, MapPin, LocateFixed, Search, ArrowUpDown, Footprints, Clock3, Route, X, Crosshair, GraduationCap, Locate, ChevronRight, Info, LoaderCircle, ShieldCheck, BookOpen, ExternalLink, Download, Layers } from 'lucide-react';
import './style.css';
import { haversine, nodeDistance, nearestGraphNode, dijkstra, graphInstructions } from './routing-core.js';
import CampusMap from './CampusMap.jsx';
import CampusDirectory from './CampusDirectory.jsx';

// Campus center and curated popular destinations with fixed campus coordinates.
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
  if (inCampusBounds(from) && inCampusBounds(to)) {
    try {
      const graph = await loadWalkingGraph();
      const start = nearestGraphNode(from, graph), end = nearestGraphNode(to, graph);
      const path = dijkstra(graph, start.node.id, end.node.id);
      const coords = path.map(id => { const n = graph.nodes.get(id); return [n.lat, n.lon]; });
      const distance = coords.slice(1).reduce((sum, p, i) => sum + haversine(coords[i], p), 0) + start.connectorDistance + end.connectorDistance;
      return { coordinates: [from, ...coords, to], distance, duration: distance / 75 * 60, instructions: graphInstructions([from, ...coords, to]), strategy: 'Shortest mapped path', shortest: true, source: 'OpenStreetMap walking graph' };
    } catch (e) {
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
  const [directoryOpen, setDirectoryOpen] = useState(false);
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
    { name: 'Main Gate', coords: [27.6075, 77.5920], subtitle: 'Campus entrance' },
    { name: 'AB1 — Computer Engg', coords: [27.6058535, 77.5934114], subtitle: 'Academic block' },
    { name: 'AB2', coords: [27.6061443, 77.5929219], subtitle: 'Academic block' },
    { name: 'AB3 — ECE / EE', coords: [27.6061411, 77.5949034], subtitle: 'Academic block' },
    { name: 'Central Library', coords: [27.6054, 77.5939], subtitle: 'Study & research' },
    { name: 'Admin Block', coords: [27.60565, 77.59305], subtitle: 'Administration' },
    { name: 'Main Canteen', coords: [27.6050264, 77.5927952], subtitle: 'Food & dining' },
    { name: 'GD Subway', coords: [27.6045404, 77.5971517], subtitle: 'Food court' },
    { name: 'Boys Hostel', coords: [27.6038591, 77.5992022], subtitle: 'Accommodation' },
    { name: 'Girls Hostel', coords: [27.6034571, 77.5979109], subtitle: 'Accommodation' },
    { name: 'KC Ground', coords: [27.606379, 77.5942812], subtitle: 'Sports' },
    { name: 'Ninad Ground', coords: [27.6054066, 77.5946042], subtitle: 'Sports' },
    { name: 'Dispensary', coords: [27.6069072, 77.5948829], subtitle: 'Health' },
    { name: 'I&J Block', coords: [27.6040363, 77.6004804], subtitle: 'Academic / hostel area' },
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

  function chooseDirectoryPlace(place) {
    const coordinates = [place.lat, place.lon];
    setTo(coordinates);
    setToText(place.name);
    setMapPoint(coordinates);
    setFocusKey(value => value + 1);
    setGpsAccuracy(null);
    setActiveField('to');
    setPickMode(null);
    setRoute(null);
    setSearchResults([]);
    setError('');
  }

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
    setError(''); setSearchResults([]);
    if (item.coords && item.coords.length === 2) {
      await setPoint('to', item.coords, item.name);
      setNotice(`${item.name} selected as destination. Set start point and find route.`);
      return;
    }
    setSearching(true);
    try {
      const results = await geocode(item.query || item.name);
      const valid = results.map(r => ({ name: r.name || r.display_name.split(',')[0], detail: r.display_name, coords: [Number(r.lat), Number(r.lon)] }))
        .filter(r => Number.isFinite(r.coords[0]) && Number.isFinite(r.coords[1]) && inCampusBounds(r.coords) && isNearCampus(r.coords));
      if (!valid.length) {
        setError(`${item.name} could not be located. Open Campus Directory or pick on the map.`);
        return;
      }
      setSearchResults(valid.map(r => ({ ...r, field: 'to' })));
      setNotice(`Choose the mapped result for ${item.name}.`);
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
      <div className="header-actions"><div className="top-status"><span className="live-dot"/> OpenStreetMap <span className="top-divider">·</span> Pedestrian routing</div><button className="directory-app-btn" onClick={() => setDirectoryOpen(true)} aria-haspopup="dialog"><BookOpen size={15}/><span>Campus directory</span></button>{!isInstalled && !isEmbeddedShell && <button className="install-app-btn" onClick={installApp}><Download size={15}/><span>{installPromptEvent ? 'Install app' : 'Add to home'}</span></button>}</div>
    </header>
    <div className="workspace">
      <aside className="sidebar">
        <div className="intro"><div className="eyebrow">GLA UNIVERSITY · MATHURA</div><h1>Find your way <span>across campus</span></h1><p>Search places, pick points on the map, and get a walking route with distance and ETA.</p></div>
        <div className="route-form">
          <label className="field"><span>From</span><div className="field-row"><input value={fromText} onChange={e => { setFromText(e.target.value); setActiveField('from'); }} onFocus={() => setActiveField('from')} placeholder="Start point" /><button type="button" className="icon-btn" onClick={useGPS} disabled={locating} title="Use GPS">{locating ? <LoaderCircle size={16} className="spin"/> : <LocateFixed size={16}/></button></div></label>
          <label className="field"><span>To</span><div className="field-row"><input value={toText} onChange={e => { setToText(e.target.value); setActiveField('to'); }} onFocus={() => setActiveField('to')} onKeyDown={e => { if (e.key === 'Enter') searchPlace(toText, 'to'); }} placeholder="Search destination" /><button type="button" className="icon-btn" onClick={() => searchPlace(toText, 'to')} disabled={searching} title="Search">{searching ? <LoaderCircle size={16} className="spin"/> : <Search size={16}/></button></div></label>
          <div className="form-actions"><button type="button" className="secondary" onClick={() => setPickMode(pickMode === 'from' ? null : 'from')}>{pickMode === 'from' ? 'Cancel pick' : 'Pick start on map'}</button><button type="button" className="secondary" onClick={() => setPickMode(pickMode === 'to' ? null : 'to')}>{pickMode === 'to' ? 'Cancel pick' : 'Pick destination'}</button><button type="button" className="secondary" onClick={swapPoints} title="Swap"><ArrowUpDown size={16}/></button></div>
          <button type="button" className="primary route-btn" onClick={findRoute} disabled={routing}>{routing ? <><LoaderCircle size={16} className="spin"/> Calculating…</> : <><Navigation size={16}/> Find walking route</>}</button>
        </div>
        {notice && <div className="notice" role="status">{notice}</div>}
        {error && <div className="error-box" role="alert"><Info size={16}/><span>{error}</span><button type="button" onClick={() => setError('')}><X size={14}/></button></div>}
        {searchResults.length > 0 && <section className="results"><div className="section-heading"><span>SEARCH RESULTS</span></div><div className="destination-list">{searchResults.map((r,i)=><button key={`${r.name}-${i}`} onClick={() => setPoint(r.field || 'to', r.coords, r.name)}><span className={`place-symbol place-${i % 5}`}><MapPin size={16}/></span><span className="place-copy"><b>{r.name}</b><small>{r.detail}</small></span><ChevronRight size={16} className="place-arrow"/></button>)}</div></section>}
        {!route && <section className="quick-dest"><div className="section-heading"><span>POPULAR DESTINATIONS</span><span className="mini-count">{popular.length} PLACES</span></div><div className="destination-list">{popular.map((p,i)=><button key={p.name} onClick={() => choosePopular(p)} disabled={searching}><span className={`place-symbol place-${i % 5}`}><MapPin size={16}/></span><span className="place-copy"><b>{p.name}</b><small>{p.subtitle}</small></span><ChevronRight size={16} className="place-arrow"/></button>)}</div></section>}
        {route && <div className="route-summary"><div className="summary-heading"><div className="summary-icon"><Route size={18}/></div><div><b>{route.strategy || 'Walking route'}</b><small>{route.source || 'Map data'}</small></div><button type="button" onClick={() => setRoute(null)}><X size={16}/></button></div><div className="metrics"><div><Footprints size={16}/><b>{fmtDistance(route.distance)}</b><small>Distance</small></div><div><Clock3 size={16}/><b>{fmtTime(route.duration)}</b><small>Est. time</small></div></div>{route.warning && <p className="route-warning">{route.warning}</p>}<button type="button" className="steps-toggle" onClick={() => setShowSteps(v => !v)}><span>Turn-by-turn directions</span><ChevronRight size={16} className={showSteps ? 'rotate' : ''}/></button>{showSteps && <ol className="steps-list">{(route.instructions || []).map((s,i)=><li key={i}><span>{i+1}</span><div><b>{s.text}</b>{s.distance > 0 && <small>{fmtDistance(s.distance)}</small>}</div></li>)}</ol>}</div>}
      </aside>
      <section className="map-panel">
        <div className="map-toolbar"><div className="map-title"><Locate size={15}/><span>Campus map</span></div><div className="map-toolbar-actions"><button type="button" className="map-3d-toggle" disabled={!threeDAvailable} onClick={() => setMap3D(v => !v)}><Layers size={14}/><span>{map3D ? '3D on' : '2D'}</span></button><button type="button" className="map-recenter" onClick={() => focusPoint(route?.coordinates?.[0] || from || CAMPUS)} title="Recenter"><Crosshair size={15}/></button></div></div>
        <div className="map-frame"><CampusMap from={from} to={to} route={route} gpsAccuracy={gpsAccuracy} mapPoint={mapPoint} focusKey={focusKey} pickMode={pickMode} is3D={map3D} onPick={onMapPick} on3DAvailabilityChange={setThreeDAvailable}/></div>
      </section>
    </div>
    {directoryOpen && <CampusDirectory onClose={() => setDirectoryOpen(false)} onSelectPlace={chooseDirectoryPlace}/>}
    {installHelpOpen && <div className="install-help-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setInstallHelpOpen(false); }}><div className="install-help"><h2>Add to Home Screen</h2><p>Use your browser menu to install this app for quick access.</p><button type="button" className="install-help-done" onClick={() => setInstallHelpOpen(false)}>Got it</button></div></div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
