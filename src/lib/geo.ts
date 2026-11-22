import type { LatLon, TrackPoint } from '../types';
import type { Settings } from '../types';

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in metres. */
export function haversineMeters(a: TrackPoint, b: TrackPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export interface ComputedStats {
  distanceM: number;
  durationMs: number;
  movingMs: number;
  elevGainM: number;
  calories: number;
}

export function computeStats(
  points: TrackPoint[],
  startedAt: number,
  endedAt: number,
  weightKg: number,
): ComputedStats {
  let distanceM = 0;
  let movingMs = 0;
  let elevGainM = 0;

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const step = haversineMeters(prev, curr);
    const dt = Math.max(0, curr.t - prev.t);

    // Ignore GPS jitter, impossible jumps and stale duplicates.
    if (step >= 0.5 && step <= 400 && dt <= 120_000) {
      distanceM += step;
      const speed = curr.speed ?? (dt > 0 ? step / (dt / 1000) : 0);
      if (speed >= 0.4) movingMs += dt;
    }

    if (prev.alt != null && curr.alt != null) {
      const dAlt = curr.alt - prev.alt;
      if (dAlt > 0.8 && dAlt < 50) elevGainM += dAlt;
    }
  }

  const durationMs = Math.max(0, endedAt - startedAt);
  const minutes = movingMs / 60_000;
  // Rough running MET estimate; good enough for a motivational number.
  const calories = Math.round(9.8 * 3.5 * weightKg * minutes * (1 / 200));

  return { distanceM, durationMs, movingMs, elevGainM, calories };
}

export function metersToDisplay(meters: number, units: Settings['units']): number {
  return units === 'mi' ? meters / 1609.344 : meters / 1000;
}

export function formatDistance(meters: number, units: Settings['units']): string {
  return metersToDisplay(meters, units).toFixed(2);
}

export function distanceLabel(units: Settings['units']): string {
  return units === 'mi' ? 'mi' : 'km';
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

export function formatPace(
  distanceM: number,
  movingMs: number,
  units: Settings['units'],
): string {
  if (distanceM < 10 || movingMs <= 0) return '--:--';
  const displayDistance = metersToDisplay(distanceM, units);
  const minutesPerUnit = movingMs / 60_000 / displayDistance;
  if (!Number.isFinite(minutesPerUnit) || minutesPerUnit <= 0) return '--:--';
  const minutes = Math.floor(minutesPerUnit);
  const seconds = Math.round((minutesPerUnit - minutes) * 60);
  return seconds === 60
    ? `${minutes + 1}:00`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function paceLabel(units: Settings['units']): string {
  return units === 'mi' ? '/mi' : '/km';
}

export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ts));
}

export function routeDistanceMeters(points: LatLon[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineMeters(
      { ...points[i - 1], alt: null, t: 0, acc: null, speed: null },
      { ...points[i], alt: null, t: 0, acc: null, speed: null },
    );
  }
  return total;
}

/** Metres from a position to the closest point on the planned route line. */
export function distanceToRoute(position: LatLon, route: LatLon[]): number {
  if (route.length === 0) return 0;
  if (route.length === 1) {
    return haversineMeters(
      { ...position, alt: null, t: 0, acc: null, speed: null },
      { ...route[0], alt: null, t: 0, acc: null, speed: null },
    );
  }

  let best = Infinity;
  for (let i = 1; i < route.length; i += 1) {
    best = Math.min(best, distanceToSegment(position, route[i - 1], route[i]));
  }
  return best;
}

function distanceToSegment(p: LatLon, a: LatLon, b: LatLon): number {
  const latRange = b.lat - a.lat;
  const lonRange = b.lon - a.lon;
  const lengthSq = latRange ** 2 + lonRange ** 2;
  if (lengthSq === 0) {
    return haversineMeters(
      { ...p, alt: null, t: 0, acc: null, speed: null },
      { ...a, alt: null, t: 0, acc: null, speed: null },
    );
  }
  const t = Math.max(0, Math.min(1, ((p.lat - a.lat) * latRange + (p.lon - a.lon) * lonRange) / lengthSq));
  const projected = { lat: a.lat + t * latRange, lon: a.lon + t * lonRange };
  return haversineMeters(
    { ...p, alt: null, t: 0, acc: null, speed: null },
    { ...projected, alt: null, t: 0, acc: null, speed: null },
  );
}

export function nextWaypoint(position: LatLon, route: LatLon[]): { index: number; distanceM: number } {
  let index = 0;
  let best = Infinity;
  route.forEach((point, i) => {
    const d = haversineMeters(
      { ...position, alt: null, t: 0, acc: null, speed: null },
      { ...point, alt: null, t: 0, acc: null, speed: null },
    );
    if (d < best) {
      best = d;
      index = i;
    }
  });
  return { index, distanceM: best };
}
