export interface TrackPoint {
  lat: number;
  lon: number;
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
