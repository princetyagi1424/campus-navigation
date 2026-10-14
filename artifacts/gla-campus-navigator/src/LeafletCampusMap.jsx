import { useEffect } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CAMPUS_CENTER = [27.605, 77.594];
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
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <MapEvents pickMode={pickMode} onPick={onPick} />
      <SyncViewport route={route} mapPoint={mapPoint} focusKey={focusKey} />
      {route?.coordinates?.length > 1 && (
        <Polyline positions={route.coordinates} pathOptions={{ color: '#2268f5', weight: 6, opacity: 0.95 }} />
      )}
      {from && gpsAccuracy > 0 && (
        <Circle center={from} radius={gpsAccuracy} pathOptions={{ color: '#326ff0', fillColor: '#326ff0', fillOpacity: 0.1, weight: 1.5 }} />
      )}
      {from && <Marker position={from} icon={startIcon} title="Starting point" />}
      {to && <Marker position={to} icon={destinationIcon} title="Destination" />}
    </MapContainer>
  );
}
