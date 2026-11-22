import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { TrackPoint } from '../types';

const startIcon = L.divIcon({
  className: 'tl-map-icon tl-map-icon--start',
  html: '<span></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const currentIcon = L.divIcon({
  className: 'tl-map-icon tl-map-icon--current',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FitBounds({ points, active }: { points: TrackPoint[]; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!active || points.length < 2) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number]));
    map.fitBounds(bounds.pad(0.18), { animate: false });
    const timer = window.setTimeout(() => map.invalidateSize(), 120);
    return () => window.clearTimeout(timer);
  }, [active, points.length, map]);
  return null;
}

function FollowPosition({ point, active }: { point: TrackPoint | null; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (active && point) map.flyTo([point.lat, point.lon], Math.max(map.getZoom(), 16), {
      duration: 0.6,
    });
  }, [active, point?.lat, point?.lon, map]);
  return null;
}

function ResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

interface MapViewProps {
  points: TrackPoint[];
  current?: TrackPoint | null;
  fit?: boolean;
  follow?: boolean;
  className?: string;
}

export function MapView({ points, current, fit = false, follow = false, className }: MapViewProps) {
  const positions = useMemo(
    () => points.map((p) => [p.lat, p.lon] as [number, number]),
    [points],
  );
  const center: [number, number] = current
    ? [current.lat, current.lon]
    : positions[0] ?? [0, 0];

  return (
    <div className={`tl-map ${className ?? ''}`}>
      <MapContainer
        center={center}
        zoom={current ? 16 : 13}
        zoomControl={false}
        scrollWheelZoom
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <ResizeHandler />
        <FitBounds points={points} active={fit} />
        <FollowPosition point={current ?? null} active={follow} />
        {positions.length > 1 && (
          <Polyline positions={positions} pathOptions={{ color: '#0f766e', weight: 5, opacity: 0.95 }} />
        )}
        {positions.length > 0 && (
          <>
            <Marker position={positions[0]} icon={startIcon} />
            {current && current.acc != null && current.acc < 200 && (
              <Circle
                center={[current.lat, current.lon]}
                radius={current.acc}
                pathOptions={{ color: '#0f766e', fillOpacity: 0.12, weight: 1 }}
              />
            )}
            {current && (
              <Marker position={[current.lat, current.lon]} icon={currentIcon} />
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
}
