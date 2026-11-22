import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { MapView } from '../components/MapView';
import { distanceLabel, formatDistance, formatDate, routeDistanceMeters } from '../lib/geo';
import type { LatLon, PlannedRoute, Settings } from '../types';

interface Props {
  routes: PlannedRoute[];
  settings: Settings;
  onSaveRoute: (route: PlannedRoute) => void;
  onUseRoute: (route: PlannedRoute) => void;
  onDeleteRoute: (id: string) => void;
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PlanScreen({ routes, settings, onSaveRoute, onUseRoute, onDeleteRoute }: Props) {
  const [draft, setDraft] = useState<LatLon[]>([]);
  const [name, setName] = useState('');
  const [center, setCenter] = useState<[number, number] | undefined>(undefined);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const use = (lat: number, lon: number) => {
      if (active) setCenter([lat, lon]);
    };

    if (Capacitor.isNativePlatform()) {
      void (async () => {
        try {
          let permission = await Geolocation.checkPermissions();
          if (permission.location !== 'granted') {
            permission = await Geolocation.requestPermissions({ permissions: ['location'] });
          }
          if (permission.location !== 'granted') return;
          const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10_000 });
          use(position.coords.latitude, position.coords.longitude);
        } catch {
          /* keep world view if location is unavailable */
        }
      })();
    } else if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => use(position.coords.latitude, position.coords.longitude),
        () => undefined,
        { timeout: 10_000 },
      );
    }
    return () => { active = false; };
  }, []);

  const addPoint = (lat: number, lon: number) => {
    setNote(null);
    setDraft((current) => (current.length >= 60 ? current : [...current, { lat, lon }]));
  };

  const makeRoute = (): PlannedRoute | null => {
    if (draft.length < 2) {
      setNote('Tap at least two points on the map to make a route.');
      return null;
    }
    return {
      id: newId(),
      name: name.trim() || `Route ${routes.length + 1}`,
      points: draft,
      createdAt: Date.now(),
      distanceM: routeDistanceMeters(draft),
    };
  };

  const saveDraft = (): PlannedRoute | null => {
    const route = makeRoute();
    if (!route) return null;
    onSaveRoute(route);
    setDraft([]);
    setName('');
    setNote('Route saved to this device.');
    return route;
  };

  const draftDistance = routeDistanceMeters(draft);

  return (
    <section className="screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Plan before you go</p>
          <h1>My routes</h1>
        </div>
      </div>

      <p className="hint hint--top">
        Tap the map to drop waypoints in order. They connect into a route you can save and follow
        on your next run.
      </p>

      <div className="map-card">
        <MapView
          points={draft}
          center={center}
          onPick={addPoint}
          numbered
          className="map-card__map map-card__map--plan"
        />
        {draft.length > 0 && <span className="waypoint-count">{draft.length} points</span>}
      </div>

      <div className="plan-summary">
        <div>
          <span className="plan-summary__value">{formatDistance(draftDistance, settings.units)}</span>
          <span className="plan-summary__label">{distanceLabel(settings.units)} planned</span>
        </div>
        <div className="row-actions plan-summary__actions">
          <button className="button button--small" disabled={draft.length === 0} onClick={() => setDraft((d) => d.slice(0, -1))}>
            Undo
          </button>
          <button className="button button--small" disabled={draft.length === 0} onClick={() => { setDraft([]); setNote(null); }}>
            Clear
          </button>
        </div>
      </div>

      <input
        className="route-name-input"
        placeholder="Route name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
      />

      <div className="row-actions">
        <button className="button" disabled={draft.length < 2} onClick={() => saveDraft()}>
          Save route
        </button>
        <button
          className="button button--primary"
          disabled={draft.length < 2}
          onClick={() => {
            const route = makeRoute();
            if (route) {
              onSaveRoute(route);
              setDraft([]);
              setName('');
              onUseRoute(route);
            }
          }}
        >
          Save &amp; run
        </button>
      </div>

      {note && <div className="banner banner--info">{note}</div>}

      <h2 className="section-title">Saved routes</h2>
      {routes.length === 0 ? (
        <div className="empty-state empty-state--small">
          <p>No saved routes yet. Draw one above or record a run and reuse its path.</p>
        </div>
      ) : (
        <ul className="route-list">
          {routes.map((route) => (
            <li key={route.id} className="route-item">
              <div className="route-item__info">
                <strong>{route.name}</strong>
                <span>
                  {formatDistance(route.distanceM, settings.units)} {distanceLabel(settings.units)} · {formatDate(route.createdAt)}
                </span>
              </div>
              <button className="button button--small button--primary" onClick={() => onUseRoute(route)}>
                Use
              </button>
              <button
                className="route-item__delete"
                aria-label="Delete route"
                onClick={() => {
                  if (window.confirm(`Delete route "${route.name}"?`)) onDeleteRoute(route.id);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
