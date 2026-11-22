import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
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

const TILE_SUBDOMAINS = ['a', 'b', 'c'];
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function createCssTile(
  coords: L.Coords,
  onStatus: (ok: boolean) => void,
): HTMLElement {
  const tile = document.createElement('div');
  tile.className = 'leaflet-tile tl-css-tile leaflet-tile-loaded';
  tile.style.opacity = '1';
  tile.style.color = '#000';
  tile.style.fontSize = '10px';
  tile.textContent = `${coords.z}/${coords.x}/${coords.y}`;
  const sub = TILE_SUBDOMAINS[(coords.x + coords.y) % TILE_SUBDOMAINS.length];
  const url = `https://${sub}.tile.openstreetmap.org/${coords.z}/${coords.x}/${coords.y}.png`;

  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  img.loading = 'eager';
  img.decoding = 'async';
  img.style.width = '256px';
  img.style.height = '256px';
  img.style.display = 'block';
  img.style.opacity = '0.7';
  img.onload = () => onStatus(true);
  img.onerror = () => {
    img.style.display = 'none';
    onStatus(false);
  };
  tile.appendChild(img);

  void fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error('Tile request failed');
      return response.blob();
    })
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Tile read failed'));
          reader.readAsDataURL(blob);
        }),
    )
    .then((dataUrl) => {
      tile.style.backgroundImage = `url("${dataUrl}")`;
      img.style.display = 'none';
      onStatus(true);
    })
    .catch(() => {
      // Keep the plain <img> child visible as fallback.
    });

  return tile;
}

class CssGridLayer extends L.GridLayer {
  constructor(
    options: L.GridLayerOptions,
    private readonly onStatus: (ok: boolean) => void,
  ) {
    super(options);
  }

  createTile(coords: L.Coords): HTMLElement {
    return createCssTile(coords, this.onStatus);
  }
}

function CssTiles({ onStatus }: { onStatus: (ok: boolean) => void }) {
  const map = useMap();

  useEffect(() => {
    const layer = new CssGridLayer(
      {
        tileSize: 256,
        minZoom: 0,
        maxZoom: 19,
        attribution: TILE_ATTRIBUTION,
        keepBuffer: 4,
        updateWhenIdle: false,
      },
      onStatus,
    );

    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, onStatus]);

  return null;
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

function Recenter({ center }: { center?: [number, number] }) {
  const map = useMap();
  const lat = center?.[0];
  const lon = center?.[1];
  useEffect(() => {
    if (lat == null || lon == null) return;
    map.setView([lat, lon], Math.max(map.getZoom(), 14), { animate: false });
  }, [lat, lon, map]);
  return null;
}

function ResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const refresh = () => map.invalidateSize();
    const timer = window.setTimeout(refresh, 150);
    const timer2 = window.setTimeout(refresh, 600);
    window.addEventListener('resize', refresh);
    map.whenReady(refresh);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(timer2);
      window.removeEventListener('resize', refresh);
    };
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
  const [tilesFailed, setTilesFailed] = useState(false);
  const [debug, setDebug] = useState('map: init');
  const okCount = useRef(0);
  const errCount = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const report = () => {
      const r = el.getBoundingClientRect();
      const hasLeaflet = el.querySelector('.leaflet-container') ? 1 : 0;
      setDebug((d) => {
        const rest = d.replace(/^map:\d+x\d+L?\d*\s*/, '');
        return `map:${Math.round(r.width)}x${Math.round(r.height)}L${hasLeaflet} ${rest}`;
      });
    };
    report();
    const t = window.setTimeout(report, 800);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch('https://a.tile.openstreetmap.org/0/0/0.png')
      .then((response) => {
        if (active && !response.ok) setTilesFailed(true);
      })
      .catch(() => {
        if (active) setTilesFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const onStatus = useMemo(
    () => (ok: boolean) => {
      if (ok) okCount.current += 1;
      else errCount.current += 1;
      setDebug((d) => {
        const prefix = d.match(/^map:\S+/)?.[0] ?? 'map:?';
        return `${prefix} ok:${okCount.current} err:${errCount.current}`;
      });
    },
    [],
  );

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
    <div ref={containerRef} className={`tl-map ${className ?? ''}`}>
      <MapContainer
        center={fallbackCenter}
        zoom={current || center ? 16 : 13}
        zoomControl={false}
        scrollWheelZoom
        attributionControl
      >
        <CssTiles onStatus={onStatus} />
        <ResizeHandler />
        <Recenter center={center} />
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
      <div className="tl-map__debug" aria-hidden="true">{debug}</div>
      {tilesFailed && (
        <div className="tl-map__notice" role="status">
          Map tiles could not load. Check your internet connection, then reopen this screen.
        </div>
      )}
    </div>
  );
}
