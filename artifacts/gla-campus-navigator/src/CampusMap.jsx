import { useCallback, useEffect, useRef, useState } from 'react';
import { LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import LeafletCampusMap from './LeafletCampusMap.jsx';
import { CAMPUS_PLACES, labelablePlaces } from './campus-directory-data.js';

setWorkerUrl(mapLibreWorkerUrl);

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const EMPTY_FEATURES = { type: 'FeatureCollection', features: [] };

function hasWebGL2() {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}

function makeRouteFeature(route) {
  const coordinates = route?.coordinates?.map(([lat, lon]) => [lon, lat]) || [];
  return coordinates.length > 1
    ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }
    : EMPTY_FEATURES;
}

function makeAccuracyFeature(point, radius) {
  if (!point || !radius) return EMPTY_FEATURES;
  const [lat, lon] = point;
  const ring = [];
  for (let index = 0; index <= 64; index += 1) {
    const angle = (index / 64) * Math.PI * 2;
    const latitude = lat + (radius / 111320) * Math.cos(angle);
    const longitude = lon + (radius / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
    ring.push([longitude, latitude]);
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

function makePin(kind, label) {
  const element = document.createElement('div');
  element.className = `map-location-pin ${kind}`;
  element.setAttribute('aria-label', label);
  element.textContent = kind === 'start' ? 'A' : 'B';
  return element;
}

const CATEGORY_COLORS = {
  'Academic blocks': '#1d4ed8',
  Hostels: '#7c3aed',
  Grounds: '#15803d',
  'Food & dining': '#c2410c',
  Health: '#b91c1c',
};

function makeUserDot() {
  const element = document.createElement('div');
  element.className = 'user-location-dot';
  element.setAttribute('aria-label', 'Your live location');
  element.innerHTML = '<span class="user-location-pulse"></span><span class="user-location-core"></span>';
  return element;
}

function makePlaceMarker(place) {
  const el = document.createElement('div');
  el.className = 'campus-place-marker';
  const dot = document.createElement('span');
  dot.className = 'campus-place-dot';
  dot.style.background = CATEGORY_COLORS[place.category] || '#475569';
  const name = document.createElement('span');
  name.className = 'campus-place-name';
  const label = place.rawName || place.name;
  name.textContent = label; // textContent: place names come from OpenStreetMap and must not be parsed as HTML
  el.append(dot, name);
  return { element: el, width: Math.min(150, label.length * 6.6 + 20) };
}

// Labels cannot overlap: highest-priority names win, the rest hide until there is room (zoom in to see them).
function declutterLabels(map, entries) {
  if (!map || !entries.length) return;
  const zoom = map.getZoom();
  const placed = [];
  const ordered = [...entries].sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label));
  for (const entry of ordered) {
    const element = entry.marker.getElement();
    if (zoom < entry.minZoom) { element.classList.add('is-hidden'); continue; }
    const point = map.project(entry.marker.getLngLat());
    const rect = { x1: point.x - entry.width / 2 - 3, x2: point.x + entry.width / 2 + 3, y1: point.y - 36, y2: point.y };
    const clash = placed.some(other => !(rect.x2 < other.x1 || rect.x1 > other.x2 || rect.y2 < other.y1 || rect.y1 > other.y2));
    element.classList.toggle('is-hidden', clash);
    if (!clash) placed.push(rect);
  }
}

export default function CampusMap({
  from,
  to,
  route,
  gpsAccuracy,
  mapPoint,
  focusKey,
  pickMode,
  is3D,
  onPick,
  on3DAvailabilityChange,
  places = CAMPUS_PLACES,
  userPosition = null,
  navActive = false,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const styleReadyRef = useRef(false);
  const [styleReady, setStyleReady] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState('');
  const [useRasterFallback, setUseRasterFallback] = useState(false);
  const fromMarkerRef = useRef(null);
  const toMarkerRef = useRef(null);
  const placeMarkersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const placesRef = useRef(places);
  placesRef.current = places;
  const latestPropsRef = useRef({ pickMode, onPick });
  const latestDataRef = useRef({ from, to, route, gpsAccuracy, is3D });
  latestPropsRef.current = { pickMode, onPick };
  latestDataRef.current = { from, to, route, gpsAccuracy, is3D };

  const updateSources = useCallback(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    const current = latestDataRef.current;
    map.getSource('campus-route')?.setData(makeRouteFeature(current.route));
    map.getSource('gps-accuracy')?.setData(makeAccuracyFeature(current.from, current.gpsAccuracy));
  }, []);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    if (!hasWebGL2()) {
      on3DAvailabilityChange?.(false);
      setUseRasterFallback(true);
      setMapLoading(false);
      return undefined;
    }
    let map;
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: STYLE_URL,
        center: [77.594, 27.605],
        zoom: 16,
        pitch: 58,
        bearing: -22,
        maxPitch: 75,
        attributionControl: { compact: true },
        dragRotate: true,
        touchPitch: true,
      });
    } catch {
      on3DAvailabilityChange?.(false);
      setUseRasterFallback(true);
      setMapLoading(false);
      return undefined;
    }
    on3DAvailabilityChange?.(true);
    mapRef.current = map;

    map.addControl(new NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), 'top-right');
    map.on('load', () => setMapLoading(false));
    map.on('error', () => {
      if (!styleReadyRef.current) {
        setMapLoading(false);
        setMapError('The live map service could not be reached. Check your connection and retry.');
      }
    });

    const handleClick = (event) => {
      const { pickMode: mode, onPick: pick } = latestPropsRef.current;
      if (mode) pick(mode, [event.lngLat.lat, event.lngLat.lng]);
    };
    const updateCursor = (event) => {
      map.getCanvas().style.cursor = latestPropsRef.current.pickMode && event.point ? 'crosshair' : '';
    };
    map.on('click', handleClick);
    map.on('mousemove', updateCursor);

    const handleStyleLoad = () => {
      styleReadyRef.current = true;
      if (map.getLayer('building-3d')) {
        map.setLayoutProperty('building-3d', 'visibility', latestDataRef.current.is3D ? 'visible' : 'none');
      }
      if (!map.getSource('campus-route')) {
        map.addSource('campus-route', { type: 'geojson', data: EMPTY_FEATURES });
        map.addLayer({
          id: 'campus-route-line',
          type: 'line',
          source: 'campus-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#2268f5',
            'line-width': ['interpolate', ['linear'], ['zoom'], 14, 5, 19, 9],
            'line-opacity': 0.98,
          },
        });
      }
      if (!map.getSource('gps-accuracy')) {
        map.addSource('gps-accuracy', { type: 'geojson', data: EMPTY_FEATURES });
        map.addLayer({
          id: 'gps-accuracy-fill',
          type: 'fill',
          source: 'gps-accuracy',
          paint: { 'fill-color': '#326ff0', 'fill-opacity': 0.1 },
        });
        map.addLayer({
          id: 'gps-accuracy-outline',
          type: 'line',
          source: 'gps-accuracy',
          paint: { 'line-color': '#326ff0', 'line-width': 1.5, 'line-opacity': 0.65 },
        });
      }

      updateSources();
      setMapError('');
      setMapLoading(false);
      setStyleReady(true);
    };
    map.on('style.load', handleStyleLoad);

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', updateCursor);
      map.off('style.load', handleStyleLoad);
      styleReadyRef.current = false;
      fromMarkerRef.current?.remove();
      toMarkerRef.current?.remove();
      placeMarkersRef.current.forEach((entry) => entry.marker.remove());
      placeMarkersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [on3DAvailabilityChange, updateSources]);

  useEffect(() => {
    updateSources();
  }, [updateSources, route, from, gpsAccuracy]);

  // Permanent campus labels (verified coordinates only), rebuilt whenever the place list changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return undefined;
    placeMarkersRef.current.forEach((entry) => entry.marker.remove());
    placeMarkersRef.current = labelablePlaces(places).map((place) => {
      const { element, width } = makePlaceMarker(place);
      const priority = place.labelPriority ?? 4;
      const marker = new Marker({ element, anchor: 'bottom' }).setLngLat([place.lon, place.lat]).addTo(map);
      return { marker, width, priority, minZoom: priority <= 1 ? 16 : 16.8, label: place.rawName || place.name };
    });
    const run = () => declutterLabels(map, placeMarkersRef.current);
    run();
    map.on('idle', run);
    return () => { map.off('idle', run); };
  }, [places, styleReady]);

  // Live position dot + follow mode while navigating.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    if (navActive && userPosition) {
      const lngLat = [userPosition[1], userPosition[0]];
      if (!userMarkerRef.current) userMarkerRef.current = new Marker({ element: makeUserDot() });
      userMarkerRef.current.setLngLat(lngLat).addTo(map);
      map.easeTo({ center: lngLat, zoom: Math.max(map.getZoom(), 18), duration: 700 });
    } else {
      userMarkerRef.current?.remove();
    }
  }, [navActive, userPosition, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    if (map.getLayer('building-3d')) {
      map.setLayoutProperty('building-3d', 'visibility', is3D ? 'visible' : 'none');
    }
    map.easeTo({ pitch: is3D ? 58 : 0, bearing: is3D ? -22 : 0, duration: 650 });
  }, [is3D, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    if (from) {
      const position = [from[1], from[0]];
      if (!fromMarkerRef.current) {
        fromMarkerRef.current = new Marker({ element: makePin('start', 'Starting point') });
      }
      fromMarkerRef.current.setLngLat(position).addTo(map);
    } else {
      fromMarkerRef.current?.remove();
    }
    if (to) {
      const position = [to[1], to[0]];
      if (!toMarkerRef.current) {
        toMarkerRef.current = new Marker({ element: makePin('destination', 'Destination') });
      }
      toMarkerRef.current.setLngLat(position).addTo(map);
    } else {
      toMarkerRef.current?.remove();
    }
  }, [from, to, styleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || navActive) return;
    const routePoints = route?.coordinates?.filter((point) => point?.length === 2) || [];
    if (routePoints.length > 1) {
      const bounds = new LngLatBounds();
      routePoints.forEach(([lat, lon]) => bounds.extend([lon, lat]));
      map.fitBounds(bounds, { padding: { top: 72, right: 72, bottom: 88, left: 72 }, maxZoom: 19, duration: 900 });
    } else if (mapPoint) {
      map.flyTo({ center: [mapPoint[1], mapPoint[0]], zoom: 18, duration: 800 });
    }
  }, [mapPoint, route, focusKey, styleReady, navActive]);

  function retryMap() {
    const map = mapRef.current;
    if (!map) return;
    styleReadyRef.current = false;
    setStyleReady(false);
    setMapError('');
    setMapLoading(true);
    map.setStyle(STYLE_URL);
  }

  if (useRasterFallback) {
    return <>
      <LeafletCampusMap
        from={from}
        to={to}
        route={route}
        gpsAccuracy={gpsAccuracy}
        mapPoint={mapPoint}
        focusKey={focusKey}
        pickMode={pickMode}
        onPick={onPick}
        places={places}
        userPosition={userPosition}
        navActive={navActive}
      />
      <div className="map-fallback-note" role="status">2D map shown; 3D buildings need WebGL2.</div>
    </>;
  }

  return <>
    <div ref={containerRef} className="campus-map-canvas" aria-label="Interactive 3D campus map" role="application" />
    {mapLoading && <div className="map-loading" role="status"><span className="map-loading-dot"/><span>Loading 3D campus map…</span></div>}
    {mapError && <div className="map-load-error" role="alert"><b>Map unavailable</b><span>{mapError}</span><button onClick={retryMap}>Retry map</button></div>}
  </>;
}
