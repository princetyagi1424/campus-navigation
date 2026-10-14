import { useEffect } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CAMPUS_PLACES } from './campus-directory-data.js';

const CAMPUS_CENTER = [27.605, 77.594];

const LABEL_CSS = `
.leaflet-tooltip.campus-place-label {
  background: rgba(255,255,255,.94);
  border: 0;
  border-radius: 6px;
  box-shadow: 0 1px 5px rgba(0,0,0,.2);
  color: #1e293b;
  font: 700 10px/1.2 Manrope, system-ui, sans-serif;
  padding: 2px 7px;
  white-space: nowrap;
}
.leaflet-tooltip.campus-place-label::before { display: none; }
.campus-place-dot.leaflet-div-icon { background: transparent !important; border: 0 !important; }
.campus-place-marker {
  display: flex; flex-direction: column; align-items: center;
  pointer-events: none; transform: translateY(-4px);
}
.campus-place-marker .campus-place-dot {
  width: 11px; height: 11px; border-radius: 50%;
  border: 2px solid #fff; box-shadow: 0 1px 5px rgba(0,0,0,.4);
}
.campus-place-marker .campus-place-name {
  margin-top: 3px; padding: 2px 6px; border-radius: 6px;
  background: rgba(255,255,255,.92); color: #1e293b;
  font: 700 10px/1.2 Manrope, system-ui, sans-serif;
  white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,.18);
  max-width: 140px; overflow: hidden; text-overflow: ellipsis;
}
`;

const startIcon = L.divIcon({
  html: '<span>A</span>',
  className: 'map-location-pin start',
  iconSize: [35, 35],
  iconAnchor: [17, 32],
});
const destinationIcon = L.divIcon({
  html: '<span>B</span>',
  className: 'map-location-pin destination',
  iconSize: [35, 35],
  iconAnchor: [17, 32],
});

function placeIcon(category) {
  const color =
    category === 'Academic blocks' ? '#1d4ed8' :
    category === 'Hostels' ? '#7c3aed' :
    category === 'Grounds' ? '#15803d' :
    category === 'Food & dining' ? '#c2410c' :
    category === 'Health' ? '#b91c1c' : '#475569';
  return L.divIcon({
    html: `<span style="background:${color};width:10px;height:10px;border-radius:50%;display:block;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
    className: 'campus-place-dot',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function MapEvents({ pickMode, onPick }) {
  useMapEvents({
    click(event) {
      if (pickMode) onPick(pickMode, [event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

function SyncViewport({ route, mapPoint, focusKey }) {
  const map = useMap();

  useEffect(() => {
    const routePoints = route?.coordinates?.filter((point) => point?.length === 2) || [];
    if (routePoints.length > 1) {
      map.fitBounds(routePoints, { padding: [72, 72], maxZoom: 19 });
    } else if (mapPoint) {
      map.flyTo(mapPoint, 18, { duration: 0.8 });
    }
  }, [map, route, mapPoint, focusKey]);

  return null;
}

function InjectLabelStyles() {
  useEffect(() => {
    if (document.getElementById('campus-place-label-css')) return undefined;
    const style = document.createElement('style');
    style.id = 'campus-place-label-css';
    style.textContent = LABEL_CSS;
    document.head.appendChild(style);
    return undefined;
  }, []);
  return null;
}

export default function LeafletCampusMap({
  from,
  to,
  route,
  gpsAccuracy,
  mapPoint,
  focusKey,
  pickMode,
  onPick,
}) {
  return (
    <MapContainer
      center={CAMPUS_CENTER}
      zoom={16}
      scrollWheelZoom
      className={`leaflet-map-fallback${pickMode ? ' picking' : ''}`}
      aria-label="Interactive campus map"
    >
      <InjectLabelStyles />
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <MapEvents pickMode={pickMode} onPick={onPick} />
      <SyncViewport route={route} mapPoint={mapPoint} focusKey={focusKey} />

      {CAMPUS_PLACES.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lon]}
          icon={placeIcon(place.category)}
          opacity={0.95}
        >
          <Tooltip permanent direction="top" offset={[0, -8]} className="campus-place-label" opacity={0.95}>
            {place.rawName || place.name}
          </Tooltip>
        </Marker>
      ))}

      {route?.coordinates?.length > 1 && (
        <Polyline
          positions={route.coordinates}
          pathOptions={{ color: '#2268f5', weight: 7, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
        />
      )}
      {from && gpsAccuracy > 0 && (
        <Circle center={from} radius={gpsAccuracy} pathOptions={{ color: '#326ff0', fillColor: '#326ff0', fillOpacity: 0.1, weight: 1.5 }} />
      )}
      {from && <Marker position={from} icon={startIcon} title="Starting point" />}
      {to && <Marker position={to} icon={destinationIcon} title="Destination" />}
    </MapContainer>
  );
}
