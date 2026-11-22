import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { computeStats } from '../lib/geo';
import type { Run, TrackPoint } from '../types';

type TrackerState = 'idle' | 'requesting' | 'tracking';

interface RawPosition {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
    speed: number | null;
  };
  timestamp: number;
}

function toPoint(pos: RawPosition): TrackPoint {
  return {
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
    alt: pos.coords.altitude,
    t: pos.timestamp,
    acc: pos.coords.accuracy,
    speed: pos.coords.speed,
  };
}

export function useTracker(
  weightKg: number,
  onFinish: (run: Run) => void,
) {
  const [state, setState] = useState<TrackerState>('idle');
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const pointsRef = useRef<TrackPoint[]>([]);
  const startedRef = useRef(0);
  const nativeWatchRef = useRef<string | null>(null);
  const browserWatchRef = useRef<number | null>(null);
  const weightRef = useRef(weightKg);
  const finishRef = useRef(onFinish);

  useEffect(() => {
    weightRef.current = weightKg;
    finishRef.current = onFinish;
  }, [weightKg, onFinish]);

  useEffect(() => {
    if (state !== 'tracking') return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [state]);

  const addPoint = useCallback((raw: RawPosition) => {
    const point = toPoint(raw);
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return;

    const list = pointsRef.current;
    const last = list[list.length - 1];
    if (last && point.t - last.t < 900 && point.lat === last.lat && point.lon === last.lon) {
      return; // duplicate fix
    }
    pointsRef.current = [...list, point];
    setPoints(pointsRef.current);
  }, []);

  const stop = useCallback(async () => {
    if (nativeWatchRef.current) {
      try {
        await Geolocation.clearWatch({ id: nativeWatchRef.current });
      } catch {
        /* ignore */
      }
      nativeWatchRef.current = null;
    }
    if (browserWatchRef.current != null) {
      navigator.geolocation.clearWatch(browserWatchRef.current);
      browserWatchRef.current = null;
    }

    const endedAt = Date.now();
    const recorded = pointsRef.current;
    setState('idle');

    if (recorded.length >= 2) {
      const stats = computeStats(recorded, startedRef.current, endedAt, weightRef.current);
      if (stats.distanceM >= 10) {
        const run: Run = {
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          name: new Intl.DateTimeFormat(undefined, {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
          }).format(new Date(startedRef.current)),
          startedAt: startedRef.current,
          endedAt,
          ...stats,
          points: recorded,
        };
        finishRef.current(run);
      } else {
        setError('Too little movement to save a run. Try again outdoors.');
      }
    } else {
      setError('Not enough GPS fixes. Make sure location is enabled and try again.');
    }

    pointsRef.current = [];
    setPoints([]);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setState('requesting');
    pointsRef.current = [];
    setPoints([]);
    const startedAt = Date.now();
    startedRef.current = startedAt;
    setNow(startedAt);

    const handleError = (message: string) => {
      setError(message);
      setState('idle');
    };

    try {
      if (Capacitor.isNativePlatform()) {
        let permission = await Geolocation.checkPermissions();
        if (permission.location !== 'granted') {
          permission = await Geolocation.requestPermissions({ permissions: ['location'] });
        }
        if (permission.location !== 'granted') {
          handleError('Location permission is required to record a run.');
          return;
        }

        nativeWatchRef.current = await Geolocation.watchPosition(
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
          (position, err) => {
            if (err) {
              setError(err.message || 'GPS error');
              return;
            }
            if (position) addPoint(position as RawPosition);
          },
        );
      } else {
        if (!('geolocation' in navigator)) {
          handleError('Geolocation is not supported by this browser.');
          return;
        }
        browserWatchRef.current = navigator.geolocation.watchPosition(
          (position) => addPoint(position as RawPosition),
          (err) => handleError(err.message),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
        );
      }
      setState('tracking');
    } catch (err) {
      handleError(err instanceof Error ? err.message : 'Could not start GPS.');
    }
  }, [addPoint]);

  return {
    state,
    error,
    points,
    startedAt: startedRef.current,
    elapsedMs: state === 'tracking' ? now - startedRef.current : 0,
    start,
    stop,
    dismissError: () => setError(null),
  };
}
