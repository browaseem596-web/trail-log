import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLon } from '../types';

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

function numberedIcon(number: number) {
  return L.divIcon({
    className: 'tl-map-icon tl-map-icon--number',
    html: `<span>${number}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function FitBounds({ points, active }: { points: LatLon[]; active: boolean }) {
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

function FollowPosition({ point, active }: { point: LatLon | null; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (active && point) {
      map.flyTo([point.lat, point.lon], Math.max(map.getZoom(), 16), { duration: 0.6 });
    }
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

function ClickHandler({ onPick }: { onPick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onPick?.(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

interface MapViewProps {
  points: LatLon[];
  current?: (LatLon & { acc?: number | null }) | null;
  fit?: boolean;
  follow?: boolean;
  className?: string;
  center?: [number, number];
  onPick?: (lat: number, lon: number) => void;
  overlayPoints?: LatLon[];
  overlayColor?: string;
  numbered?: boolean;
}

export function MapView({
  points,
  current,
  fit = false,
  follow = false,
  className,
  center,
  onPick,
  overlayPoints,
  overlayColor = '#f59e0b',
  numbered = false,
}: MapViewProps) {
  const positions = useMemo(
    () => points.map((p) => [p.lat, p.lon] as [number, number]),
    [points],
  );
  const overlayPositions = useMemo(
    () => (overlayPoints ?? []).map((p) => [p.lat, p.lon] as [number, number]),
    [overlayPoints],
  );
  const firstPoint = points[0];
  const fallbackCenter: [number, number] = current
    ? [current.lat, current.lon]
    : center ?? (firstPoint ? [firstPoint.lat, firstPoint.lon] : [0, 0]);

  return (
    <div className={`tl-map ${className ?? ''}`}>
      <MapContainer
        center={fallbackCenter}
        zoom={current || center ? 16 : 13}
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
        <ClickHandler onPick={onPick} />
        <FitBounds points={points} active={fit} />
        <FollowPosition point={current ?? null} active={follow} />

        {overlayPositions.length > 1 && (
          <Polyline
            positions={overlayPositions}
            pathOptions={{ color: overlayColor, weight: 4, opacity: 0.85, dashArray: '8 8' }}
          />
        )}
        {overlayPositions.length > 0 && numbered && (
          <Marker position={overlayPositions[0]} icon={startIcon} />
        )}

        {positions.length > 1 && (
          <Polyline positions={positions} pathOptions={{ color: '#0f766e', weight: 5, opacity: 0.95 }} />
        )}
        {numbered ? (
          positions.map((position, index) => (
            <Marker key={index} position={position} icon={numberedIcon(index + 1)} />
          ))
        ) : (
          positions.length > 0 && <Marker position={positions[0]} icon={startIcon} />
        )}

        {current && current.acc != null && current.acc < 200 && (
          <Circle
            center={[current.lat, current.lon]}
            radius={current.acc}
            pathOptions={{ color: '#0f766e', fillOpacity: 0.12, weight: 1 }}
          />
        )}
        {current && <Marker position={[current.lat, current.lon]} icon={currentIcon} />}
      </MapContainer>
    </div>
  );
}
