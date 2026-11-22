export interface LatLon {
  lat: number;
  lon: number;
}

export interface TrackPoint extends LatLon {
  alt: number | null;
  t: number;
  acc: number | null;
  speed: number | null;
}

export interface Run {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number;
  distanceM: number;
  durationMs: number;
  movingMs: number;
  elevGainM: number;
  calories: number;
  points: TrackPoint[];
}

export interface Settings {
  weightKg: number;
  units: 'km' | 'mi';
}

export interface PlannedRoute {
  id: string;
  name: string;
  points: LatLon[];
  createdAt: number;
  distanceM: number;
}
