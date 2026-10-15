import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigation, MapPin, LocateFixed, Search, ArrowUpDown, Footprints, Clock3, Route, X, Crosshair, GraduationCap, Locate, ChevronRight, Info, LoaderCircle, ShieldCheck, BookOpen, ExternalLink, Download, Layers, Play, Square } from 'lucide-react';
import './style.css';
import { haversine, nodeDistance, nearestGraphNode, dijkstra, graphInstructions, projectOnRoute, trimRoute } from './routing-core.js';
import CampusMap from './CampusMap.jsx';
import CampusDirectory from './CampusDirectory.jsx';
import { CAMPUS_PLACES, findCampusPlace, loadCampusIndex, searchCampusPlaces } from './campus-directory-data.js';

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

function buildWalkingGraph(data) {
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
      // Long straight segments are legitimate on a 110-acre campus; only discard bad data.
      if (!Number.isFinite(weight) || weight <= 0 || weight > 1000) continue;
      addEdge(a.id, b.id, weight);
      addEdge(b.id, a.id, weight);
    }
  }
  if (nodes.size < 2 || adj.size < 2) throw new Error('No connected walking paths were found in the current OpenStreetMap data for this campus area.');
  return { nodes, adj };
}

let graphPromise = null;
async function loadWalkingGraph() {
  if (graphCache && Date.now() - graphCacheAt < 10 * 60 * 1000) return graphCache;
  if (graphPromise) return graphPromise;
  const { south, west, north, east } = CAMPUS_BOUNDS;
  const query = `[out:json][timeout:20];(way[highway](${south},${west},${north},${east})[foot!~"no|private"][access!~"no|private"];);out body;>;out skel qt;`;
  const fromEndpoint = async endpoint => {
    const res = await fetchWithTimeout(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' }, body: `data=${encodeURIComponent(query)}`,
    }, 16000);
    if (res.status === 429 || res.status === 504) throw new Error('OpenStreetMap walking data is busy. Please retry shortly.');
    if (!res.ok) throw new Error(`Walking map data request failed (${res.status}).`);
    return buildWalkingGraph(await res.json());
  };
  // Ask every mirror at once and use whichever answers first (previously: one after another, up to ~50 s).
  graphPromise = Promise.any(OVERPASS_ENDPOINTS.map(fromEndpoint))
    .then(graph => { graphCache = graph; graphCacheAt = Date.now(); return graph; })
    .catch(e => { throw e?.errors?.[0] || e || new Error('Could not load pedestrian map data.'); })
    .finally(() => { graphPromise = null; });
  return graphPromise;
}

function directRoute(from, to, reason) {
  const distance = haversine(from, to);
  return {
    coordinates: [from, to], distance, duration: distance / 75 * 60,
    instructions: [{ text: 'Head straight toward your destination', distance }, { text: 'You have arrived at your destination', distance: 0 }],
    strategy: 'Direct line (approximate)', shortest: false, direct: true, source: 'Straight line',
    warning: `No mapped walking path could be found${reason ? ` (${reason})` : ''}. A straight line is shown — follow the visible paths on the ground.`,
  };
}

async function getShortestWalkingRoute(from, to) {
  let reason = '';
  if (inCampusBounds(from) && inCampusBounds(to)) {
    try {
      const graph = await loadWalkingGraph();
      const start = nearestGraphNode(from, graph, 250), end = nearestGraphNode(to, graph, 250);
      const path = dijkstra(graph, start.node.id, end.node.id);
      const coords = path.map(id => { const n = graph.nodes.get(id); return [n.lat, n.lon]; });
      const full = [from, ...coords, to];
      const distance = full.slice(1).reduce((sum, p, i) => sum + haversine(full[i], p), 0);
      return { coordinates: full, distance, duration: distance / 75 * 60, instructions: graphInstructions(full), strategy: 'Shortest mapped path', shortest: true, source: 'OpenStreetMap walking graph' };
    } catch (e) { reason = e.message; }
  }
  try {
    const route = await getRecommendedRoute(from, to);
    return { ...route, warning: reason ? `Exact shortest-path calculation was unavailable: ${reason}` : 'For routes outside the campus map area, the public pedestrian router returns its recommended route; it is not guaranteed to be the shortest by distance.' };
  } catch (e) {
    // Always give the user a visible line for on-campus trips instead of failing with only an error.
    if (haversine(from, to) <= 5000) return directRoute(from, to, reason || e.message);
    throw e;
  }
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
  const [campusPlaces, setCampusPlaces] = useState(CAMPUS_PLACES);
  const [approxFrom, setApproxFrom] = useState(false);
  const [approxTo, setApproxTo] = useState(false);
  const [fieldFocused, setFieldFocused] = useState(false);
  const [navActive, setNavActive] = useState(false);
  const [navPos, setNavPos] = useState(null);
  const [navProj, setNavProj] = useState(null);
  const [navStatus, setNavStatus] = useState('');
  const searchRequest = useRef(0);
  const navWatchRef = useRef(null);
  const navIndexRef = useRef(0);
  const navMetaRef = useRef({ strikes: 0, busy: false, last: 0 });
  const routeRef = useRef(null);
  const toRef = useRef(null);
  routeRef.current = route;
  toRef.current = to;

  // Warm up pedestrian data and the live OpenStreetMap place index in the background.
  useEffect(() => {
    const timer = setTimeout(() => { loadWalkingGraph().catch(() => {}); }, 800);
    let alive = true;
    loadCampusIndex().then(index => { if (alive && index?.places?.length) setCampusPlaces(index.places); }).catch(() => {});
    return () => { alive = false; clearTimeout(timer); };
  }, []);
  useEffect(() => () => {
    if (navWatchRef.current != null) navigator.geolocation?.clearWatch(navWatchRef.current);
  }, []);

  const campusOnly = useMemo(() => campusPlaces.filter(place => place.campusLikely), [campusPlaces]);

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

  const popular = useMemo(() => campusOnly.filter(place => place.popular), [campusOnly]);

  const stopNav = useCallback(message => {
    if (navWatchRef.current != null) navigator.geolocation?.clearWatch(navWatchRef.current);
    navWatchRef.current = null;
    setNavActive(false); setNavPos(null); setNavProj(null); setNavStatus('');
    if (message) setNotice(message);
  }, []);

  const setPoint = useCallback(async (which, coords, label, meta = {}) => {
    const name = label || await reverseGeocode(coords[0], coords[1]);
    if (which === 'from') { setFrom(coords); setFromText(name); setGpsAccuracy(null); setApproxFrom(Boolean(meta.approx)); }
    else { setTo(coords); setToText(name); setApproxTo(Boolean(meta.approx)); }
    stopNav();
    setMapPoint(coords); setFocusKey(v => v + 1); setSearchResults([]); setPickMode(null); setRoute(null); setError('');
  }, [stopNav]);

  function pickPlace(field, place) {
    setPoint(field, [place.lat, place.lon], place.name, { approx: place.approx });
    setNotice(place.approx
      ? `${place.name}: exact map pin not verified yet, so this location is approximate. Use “Pick … on map” to set the exact spot.`
      : `${place.name} selected${field === 'to' ? ' as destination' : ' as start'}.`);
  }

  const gpsErrorMessage = err => err.code === 1 ? 'Location permission was denied. Allow location access in browser settings or select your start point on the map.' : err.code === 3 ? 'GPS took too long to respond. Check location services and retry, or choose a point on the map.' : 'Could not get GPS location. Check device location settings, or choose a point on the map.';

  const getGPSOnce = useCallback(() => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('This browser does not support GPS location. Choose your starting point manually on the map.')); return; }
    setLocating(true); setNotice('Waiting for location permission…');
    navigator.geolocation.getCurrentPosition(async pos => {
      const coords = [pos.coords.latitude, pos.coords.longitude];
      await setPoint('from', coords, 'My current location');
      setGpsAccuracy(pos.coords.accuracy || null);
      setLocating(false); setNotice('GPS location set. Choose your destination.');
      resolve(coords);
    }, err => { setLocating(false); reject(new Error(gpsErrorMessage(err))); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 15000 });
  }), [setPoint]);

  const useGPS = useCallback(() => {
    setError('');
    getGPSOnce().catch(e => setError(e.message));
  }, [getGPSOnce]);

  function chooseDirectoryPlace(place) {
    const coordinates = [place.lat, place.lon];
    stopNav();
    setTo(coordinates);
    setToText(place.name);
    setApproxTo(Boolean(place.approx));
    if (place.approx) setNotice(`${place.name}: exact map pin not verified yet, so this location is approximate.`);
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

  function choosePopular(place) {
    setError('');
    pickPlace('to', place);
  }

  // Typed text -> place. Campus names resolve instantly from the local directory; anything else uses search.
  function submitField(which) {
    const text = which === 'from' ? fromText : toText;
    const exact = findCampusPlace(text, campusOnly);
    if (exact) { pickPlace(which, exact); return; }
    if (searchCampusPlaces(text, campusOnly, 1).length) { setFieldFocused(true); return; }
    searchPlace(text, which);
  }

  async function resolveEndpoint(which) {
    const current = which === 'from' ? from : to;
    if (current) return current;
    const text = (which === 'from' ? fromText : toText).trim();
    if (which === 'from' && (!text || /^my (current )?location$/i.test(text))) return getGPSOnce();
    if (!text) throw new Error(which === 'from' ? 'Enter a start point, or use the GPS button.' : 'Enter a destination.');
    const local = findCampusPlace(text, campusOnly);
    if (local) { pickPlace(which, local); return [local.lat, local.lon]; }
    const results = await geocode(text);
    const hit = results.map(r => ({ name: r.name || r.display_name.split(',')[0], coords: [Number(r.lat), Number(r.lon)] }))
      .find(r => Number.isFinite(r.coords[0]) && Number.isFinite(r.coords[1]) && isNearCampus(r.coords));
    if (!hit) throw new Error(`Could not find “${text}” on campus. Pick it from the suggestions, or choose the point on the map.`);
    await setPoint(which, hit.coords, hit.name);
    return hit.coords;
  }

  async function findRoute() {
    setError(''); setShowSteps(false);
    setRouting(true); setNotice('Finding your start and destination…');
    try {
      const fromPoint = await resolveEndpoint('from');
      const toPoint = await resolveEndpoint('to');
      if (haversine(fromPoint, toPoint) < 3) { setError('Start and destination are almost the same point. Choose a different destination.'); setNotice('Choose a different destination.'); return; }
      setNotice('Calculating the walking route…'); setRoute(null);
      const r = await getShortestWalkingRoute(fromPoint, toPoint);
      setRoute(r);
      setNotice(r.direct ? 'Direct line shown — mapped paths unavailable' : r.shortest ? 'Shortest mapped walking path ready' : 'Recommended walking route ready');
    } catch (e) { setError(e.message || 'Could not calculate a route.'); setNotice('Route unavailable'); }
    finally { setRouting(false); }
  }

  // ---------- live navigation: the blue line shrinks behind you, like Google Maps ----------
  async function reroute(point) {
    const meta = navMetaRef.current;
    meta.busy = true; meta.last = Date.now(); setNavStatus('Recalculating route…');
    try {
      const r = await getShortestWalkingRoute(point, toRef.current);
      if (navWatchRef.current == null) return;
      navIndexRef.current = 0;
      setFrom(point); setFromText('My current location'); setNavProj(null); setRoute(r);
    } catch { setNavStatus('Could not recalculate. Keep following the visible paths.'); }
    finally { meta.busy = false; meta.strikes = 0; }
  }

  function onNavFix(pos) {
    const point = [pos.coords.latitude, pos.coords.longitude];
    const accuracy = pos.coords.accuracy || 0;
    const current = routeRef.current, dest = toRef.current;
    if (!current || !dest) return;
    if (accuracy > 100) { setNavStatus('GPS signal is weak — move to open sky'); return; }
    setGpsAccuracy(accuracy);
    const proj = projectOnRoute(point, current.coordinates, navIndexRef.current);
    navIndexRef.current = proj.index;
    setNavPos(point); setNavProj(proj);
    if (haversine(point, dest) <= 15 || proj.remaining <= 10) { stopNav('You have arrived at your destination.'); setRoute(null); return; }
    const meta = navMetaRef.current;
    if (proj.offRoute > Math.max(35, accuracy * 1.5)) {
      meta.strikes += 1; setNavStatus('You are off the route');
      if (meta.strikes >= 2 && !meta.busy && Date.now() - meta.last > 10000) reroute(point);
    } else { meta.strikes = 0; setNavStatus(`${fmtDistance(proj.remaining)} to go · ${fmtTime(proj.remaining / 75 * 60)}`); }
  }

  function onNavError(err) {
    if (err.code === 1) { stopNav(); setError('Location permission was denied, so live navigation cannot start. Allow location access and try again.'); return; }
    setNavStatus('Waiting for a GPS signal…');
  }

  function startNav() {
    if (!routeRef.current) return;
    if (!navigator.geolocation) { setError('This browser does not support GPS location, so live navigation is unavailable.'); return; }
    setError(''); navIndexRef.current = 0; navMetaRef.current = { strikes: 0, busy: false, last: 0 };
    setNavActive(true); setNavProj(null); setNavStatus('Waiting for GPS…');
    setNotice('Navigation started. Walk along the blue line — the part you pass disappears.');
    navWatchRef.current = navigator.geolocation.watchPosition(onNavFix, onNavError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
  }

  function clearRoute() { stopNav(); setRoute(null); setShowSteps(false); }

  const view = useMemo(() => {
    if (!route || !navActive || !navProj) return route;
    return { ...route, coordinates: trimRoute(route.coordinates, navProj), distance: navProj.remaining, duration: navProj.remaining / 75 * 60 };
  }, [route, navActive, navProj]);

  const suggestions = useMemo(() => {
    const pending = activeField === 'from' ? !from : !to;
    const text = activeField === 'from' ? fromText : toText;
    if (!fieldFocused || !pending || searchResults.length || /^my (current )?location$/i.test(text.trim())) return [];
    return searchCampusPlaces(text, campusOnly, 6).map(result => result.place);
  }, [fieldFocused, activeField, from, to, fromText, toText, searchResults, campusOnly]);

  function onMapPick(mode, coords) {
    setPoint(mode, coords);
    setNotice(`Selected ${mode === 'from' ? 'starting point' : 'destination'} on the map.`);
  }
  function swapPoints() {
    const a = from, b = to, at = fromText, bt = toText, aa = approxFrom, ab = approxTo;
    stopNav(); setFrom(b); setTo(a); setFromText(bt); setToText(at); setApproxFrom(ab); setApproxTo(aa); setGpsAccuracy(null); setRoute(null); setError('');
  }
  function focusPoint(point) {
    if (point) { setMapPoint(point); setFocusKey(v => v + 1); }
    else { setMapPoint(CAMPUS); setFocusKey(v => v + 1); }
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><GraduationCap size={22}/></div><div><div className="brand-title">GLA <span>Campus Navigator</span></div><div className="brand-sub">YOUR CAMPUS. YOUR WAY.</div></div></div>
      <div className="header-actions"><div className="top-status"><span className="live-dot"/> OpenStreetMap <span className="top-divider">·</span> Pedestrian routing</div><button className="directory-app-btn" onClick={() => setDirectoryOpen(true)} aria-haspopup="dialog"><BookOpen size={15}/><span>Campus directory</span></button>{!isInstalled && !isEmbeddedShell && <button className="install-app-btn" onClick={installApp}><Download size={15}/><span>Install app</span></button>}</div>
    </header>
    <main className="workspace">
      <aside className="sidebar">
        <div className="intro"><div className="eyebrow">CAMPUS WAYFINDING</div><h1>Find your way<br/><span>around GLA.</span></h1><p>Choose your start and destination. Routes follow mapped walking paths where available.</p></div>
        <section className="route-form">
          <div className="field-label">FROM</div>
          <div className="location-field"><span className="field-icon start-dot"><MapPin size={17}/></span><input aria-label="Starting point" autoComplete="off" value={fromText} onFocus={() => {setActiveField('from'); setFieldFocused(true);}} onBlur={() => setFieldFocused(false)} onChange={e => {setFromText(e.target.value); setFrom(null); setApproxFrom(false); setGpsAccuracy(null); stopNav(); setRoute(null); setActiveField('from'); setFieldFocused(true); setSearchResults([]);}} onKeyDown={e => e.key === 'Enter' && submitField('from')} placeholder="Search start or use GPS"/><button className="field-action" title="Search starting point" aria-label="Search starting point" onClick={() => submitField('from')} disabled={searching}><Search size={17}/></button><button className="field-action" title="Use my GPS location" aria-label="Use my GPS location" onClick={useGPS} disabled={locating}>{locating ? <LoaderCircle className="spin" size={18}/> : <LocateFixed size={18}/>}</button></div>
          <button className="map-pick" onClick={() => {setPickMode('from'); setActiveField('from'); setNotice('Tap the map to set your starting point.')}}><Crosshair size={14}/> Pick start point on map</button>
          {from && <div className="selected-note"><ShieldCheck size={13}/> Start point selected{gpsAccuracy ? ` · GPS accuracy about ${Math.round(gpsAccuracy)} m` : ''}</div>}
          <div className="swap-row"><div className="connector-line"/><button onClick={swapPoints} className="swap-btn" title="Swap start and destination" aria-label="Swap start and destination"><ArrowUpDown size={15}/></button></div>
          <div className="field-label">TO</div>
          <div className="location-field"><span className="field-icon end-dot"><MapPin size={17}/></span><input aria-label="Destination" autoComplete="off" value={toText} onFocus={() => {setActiveField('to'); setFieldFocused(true);}} onBlur={() => setFieldFocused(false)} onChange={e => {setToText(e.target.value); setTo(null); setApproxTo(false); stopNav(); setRoute(null); setActiveField('to'); setFieldFocused(true); setSearchResults([]);}} onKeyDown={e => e.key === 'Enter' && submitField('to')} placeholder="Search campus building or place"/><button className="field-action" title="Search destination" aria-label="Search destination" onClick={() => submitField('to')} disabled={searching}>{searching ? <LoaderCircle className="spin" size={18}/> : <Search size={18}/>}</button></div>
          <button className="map-pick" onClick={() => {setPickMode('to'); setActiveField('to'); setNotice('Tap the map to set your destination.')}}><Crosshair size={14}/> Pick destination on map</button>
          {suggestions.length > 0 && <div className="search-results suggestions" aria-label="Campus place suggestions" onMouseDown={e => e.preventDefault()}>{suggestions.map(place => <button key={place.id} onClick={() => {pickPlace(activeField, place); setFieldFocused(false);}}><MapPin size={15}/><span><b>{place.name}</b><small>{place.subtitle || place.category}{place.approx ? ' · ≈ approximate location' : ''}</small></span></button>)}</div>}
          {searchResults.length > 0 && <div className="search-results" aria-label="Search results">{searchResults.map((r,i)=><button key={`${r.coords.join(',')}-${i}`} onClick={() => setPoint(r.field || activeField, r.coords, r.name)}><MapPin size={15}/><span><b>{r.name}</b><small>{r.detail}</small></span></button>)}</div>}
          <button className="primary-btn" onClick={findRoute} disabled={routing}>{routing ? <LoaderCircle className="spin" size={18}/> : <Navigation size={18}/>} {routing ? 'Finding route…' : 'Find walking route'}<ChevronRight size={18}/></button>
        </section>
        {error && <div className="error-box" role="status"><Info size={16}/><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss message"><X size={15}/></button></div>}
        {route && <section className="route-summary"><div className="summary-heading"><span className="summary-icon"><Footprints size={18}/></span><div><b>{route.direct ? 'Direct line (approximate)' : route.shortest ? 'Shortest mapped path' : 'Recommended walking route'}</b><small>{route.direct ? 'No mapped path found' : route.shortest ? 'Dijkstra · shortest by mapped distance' : 'Based on available pedestrian data'}</small></div><button onClick={clearRoute} aria-label="Clear route"><X size={16}/></button></div><div className="metrics"><div><Route size={16}/><b>{fmtDistance(view.distance)}</b><small>{navActive ? 'Remaining' : 'Distance'}</small></div><div><Clock3 size={16}/><b>{fmtTime(view.duration)}</b><small>{navActive ? 'Time left' : 'Est. walking'}</small></div></div><div className="nav-controls">{!navActive ? <button className="nav-start-btn" onClick={startNav}><Play size={16}/> Start navigation</button> : <><div className="nav-live" role="status"><span className="live-dot"/><span>{navStatus || 'Navigating…'}</span></div><button className="nav-stop-btn" onClick={() => stopNav('Navigation stopped.')}><Square size={13}/> Stop</button></>}</div>{route.warning && <div className="route-warning"><Info size={14}/>{route.warning}</div>}{(approxFrom || approxTo) && <div className="route-warning"><Info size={14}/>{approxFrom && approxTo ? 'Start and destination pins are approximate — their exact map positions are not verified yet.' : `${approxTo ? toText : fromText} has an approximate pin (exact map position not verified yet). The route leads to that area.`}</div>}<button className="steps-toggle" onClick={() => setShowSteps(!showSteps)}>{showSteps ? 'Hide directions' : 'View turn-by-turn directions'}<ChevronRight size={16} className={showSteps ? 'rotate' : ''}/></button>{showSteps && <ol className="steps-list">{route.instructions.map((s,i)=><li key={i}><span>{i+1}</span><div>{s.text}<small>{s.distance > 0 ? fmtDistance(s.distance) : (s.text.toLowerCase().includes('arrived') ? 'Finish' : 'At junction')}</small></div></li>)}</ol>}<a className="external-directions" href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${from[0]}%2C${from[1]}%3B${to[0]}%2C${to[1]}`} target="_blank" rel="noreferrer">Open directions in OpenStreetMap <ExternalLink size={13}/></a></section>}
        {!route && <section className="quick-dest"><div className="section-heading"><span>POPULAR DESTINATIONS</span><span className="mini-count">{popular.length} PLACES</span></div><div className="destination-list">{popular.map((p,i)=><button key={p.id} onClick={() => choosePopular(p)} disabled={searching}><span className={`place-symbol place-${i % 5}`}><MapPin size={16}/></span><span className="place-copy"><b>{p.name}</b><small>{p.subtitle}{p.approx ? ' · ≈ approx.' : ''}</small></span><ChevronRight size={16} className="place-arrow"/></button>)}</div></section>}
        <div className="sidebar-foot"><Info size={14}/><span>Campus paths may be incomplete. Verify before walking. GPS and selected coordinates are sent to public map services for routing/search.</span></div>
      </aside>
      <section className="map-area">
        <div className="map-toolbar"><div className="map-title"><span className="map-title-icon"><MapPin size={17}/></span><div><b>GLA University</b><small>Mathura, Uttar Pradesh, India</small></div></div><div className="map-toolbar-actions"><button className={`map-3d-toggle${map3D && threeDAvailable ? ' active' : ''}`} disabled={!threeDAvailable} title={threeDAvailable ? 'Toggle 3D building view' : '3D buildings need WebGL2; showing the 2D map'} onClick={() => setMap3D(value => !value)} aria-pressed={threeDAvailable && map3D}><Layers size={16}/><span>{threeDAvailable ? (map3D ? '3D buildings' : '2D map') : '2D fallback'}</span></button><button className="locate-map-btn" onClick={() => from ? focusPoint(from) : useGPS()}><Locate size={16}/><span>My location</span></button></div></div>
        {pickMode && <div className="map-instruction"><Crosshair size={16}/><span>Tap the map to set your <b>{pickMode === 'from' ? 'starting point' : 'destination'}</b></span><button onClick={() => setPickMode(null)} aria-label="Cancel map selection"><X size={15}/></button></div>}
        <div className="map-frame"><CampusMap from={from} to={to} route={view} places={campusOnly} userPosition={navPos} navActive={navActive} gpsAccuracy={gpsAccuracy} mapPoint={mapPoint} focusKey={focusKey} pickMode={pickMode} is3D={map3D} onPick={onMapPick} on3DAvailabilityChange={setThreeDAvailable}/><div className="map-legend"><span><i className="legend-dot green"/> Start</span><span><i className="legend-dot red"/> Destination</span><span><i className="legend-line"/> Walking route</span></div><button className="map-recenter" onClick={() => focusPoint(from || CAMPUS)} title="Recenter map" aria-label="Recenter map"><LocateFixed size={19}/></button></div>
        <div className="map-bottom"><div className="map-bottom-left"><span className="map-bottom-icon"><Footprints size={17}/></span><div><b>{view ? `${fmtDistance(view.distance)} ${navActive ? 'remaining' : 'walking route'}` : 'Explore the campus map'}</b><small>{view ? (navActive ? navStatus || 'Navigating…' : `${fmtTime(view.duration)} on foot · ${route.direct ? 'direct line' : route.shortest ? 'shortest mapped distance' : 'recommended route'}`) : (pickMode ? `Tap map to choose ${pickMode === 'from' ? 'start' : 'destination'}` : notice)}</small></div></div>{route && <button className="clear-route" onClick={clearRoute}>{navActive ? 'Stop & clear' : 'Clear route'} <X size={14}/></button>}</div>
      </section>
    </main>
    <footer className="footer"><span>GLA CAMPUS NAVIGATOR <span className="footer-dot">·</span> STUDENT PROJECT</span><span>© OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Report a map issue</a></span></footer>
    {directoryOpen && <CampusDirectory onClose={() => setDirectoryOpen(false)} onSelectPlace={chooseDirectoryPlace}/>}
    {installHelpOpen && <div className="install-help-backdrop" onMouseDown={event => {if (event.target === event.currentTarget) setInstallHelpOpen(false);}}><section className="install-help" role="dialog" aria-modal="true" aria-labelledby="install-help-title"><button className="install-help-close" onClick={() => setInstallHelpOpen(false)} aria-label="Close install instructions"><X size={18}/></button><span className="install-help-icon"><Download size={20}/></span><h2 id="install-help-title">Add GLA Campus Navigator</h2><p>Install this website on your device for a home-screen app experience. An internet connection is still needed for live maps and routing.</p><div><b>Android / Chrome</b><span>Open the browser menu and choose “Install app” or “Add to Home screen”.</span></div><div><b>iPhone / iPad</b><span>In Safari, tap Share, then choose “Add to Home Screen”.</span></div><button className="install-help-done" onClick={() => setInstallHelpOpen(false)}>Got it</button></section></div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
