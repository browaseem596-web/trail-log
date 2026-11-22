import { useMemo, useState } from 'react';
import { MapView } from '../components/MapView';
import { useTracker } from '../hooks/useTracker';
import {
  computeStats,
  distanceLabel,
  distanceToRoute,
  formatDistance,
  formatDuration,
  formatPace,
  nextWaypoint,
  paceLabel,
} from '../lib/geo';
import { exportRuns } from '../lib/gpx';
import type { PlannedRoute, Run, Settings } from '../types';

interface Props {
  settings: Settings;
  activeRoute: PlannedRoute | null;
  onClearRoute: () => void;
  onSave: (run: Run) => void;
}

export function TrackScreen({ settings, activeRoute, onClearRoute, onSave }: Props) {
  const [follow, setFollow] = useState(true);
  const [lastRun, setLastRun] = useState<Run | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);

  const tracker = useTracker(settings.weightKg, (run) => {
    onSave(run);
    setLastRun(run);
  });

  const live = useMemo(() => {
    const started = tracker.startedAt || Date.now();
    return computeStats(
      tracker.points,
      started,
      started + tracker.elapsedMs,
      settings.weightKg,
    );
  }, [tracker.points, tracker.startedAt, tracker.elapsedMs, settings.weightKg]);

  const shown = lastRun ? lastRun : null;
  const stats = shown
    ? {
        distanceM: shown.distanceM,
        durationMs: shown.durationMs,
        movingMs: shown.movingMs,
        elevGainM: shown.elevGainM,
        calories: shown.calories,
      }
    : live;
  const currentPoint = tracker.points[tracker.points.length - 1] ?? null;
  const routeInfo = activeRoute && currentPoint
    ? {
        offRouteM: distanceToRoute(currentPoint, activeRoute.points),
        next: nextWaypoint(currentPoint, activeRoute.points),
      }
    : null;

  return (
    <section className="screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Ready when you are</p>
          <h1>Track a run</h1>
        </div>
        {tracker.state === 'tracking' && (
          <span className="live-badge"><span className="live-dot" /> LIVE</span>
        )}
      </div>

      {tracker.error && (
        <div className="banner banner--error" role="alert">
          <span>{tracker.error}</span>
          <button onClick={tracker.dismissError} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="map-card">
        <MapView
          points={shown ? shown.points : tracker.points}
          current={tracker.state === 'tracking' ? currentPoint : null}
          follow={follow && tracker.state === 'tracking'}
          overlayPoints={activeRoute ? activeRoute.points : undefined}
          overlayColor="#f59e0b"
          fit={Boolean(activeRoute) && tracker.state !== 'tracking' && tracker.points.length < 2}
          className="map-card__map"
        />
        {tracker.state === 'tracking' && (
          <button
            className={`follow-chip ${follow ? 'follow-chip--on' : ''}`}
            onClick={() => setFollow((v) => !v)}
          >
            {follow ? 'Following you' : 'Follow off'}
          </button>
        )}
        {activeRoute && (
          <button className="route-chip" onClick={onClearRoute}>
            Route: {activeRoute.name} ×
          </button>
        )}
      </div>

      {activeRoute && (
        <div className="route-guide">
          <div>
            <span className="route-guide__label">Following route</span>
            <strong>{activeRoute.name}</strong>
          </div>
          <div>
            <span className="route-guide__label">Next point</span>
            <strong>{routeInfo ? `${Math.round(routeInfo.next.distanceM)} m` : 'Start GPS'}</strong>
          </div>
          <div>
            <span className="route-guide__label">Off route</span>
            <strong className={routeInfo && routeInfo.offRouteM > 60 ? 'route-guide__warn' : ''}>
              {routeInfo ? `${Math.round(routeInfo.offRouteM)} m` : '--'}
            </strong>
          </div>
        </div>
      )}

      <div className="stat-grid stat-grid--live">
        <Stat label={`Distance (${distanceLabel(settings.units)})`} value={formatDistance(stats.distanceM, settings.units)} />
        <Stat label="Elapsed" value={formatDuration(stats.durationMs)} />
        <Stat label={`Pace (${paceLabel(settings.units)})`} value={formatPace(stats.distanceM, stats.movingMs, settings.units)} />
        <Stat label="Elevation" value={`${Math.round(stats.elevGainM)} m`} />
      </div>

      <button
        className={`record-button ${tracker.state === 'tracking' ? 'record-button--stop' : ''}`}
        disabled={tracker.state === 'requesting'}
        onClick={() => {
          if (tracker.state === 'tracking') void tracker.stop();
          else void tracker.start();
        }}
      >
        <span className="record-button__icon" />
        {tracker.state === 'requesting'
          ? 'Getting GPS…'
          : tracker.state === 'tracking'
            ? 'Finish run'
            : 'Start run'}
      </button>
      <p className="hint">
        GPS accuracy is best outdoors. Your runs stay on this device unless you export them.
      </p>

      {shown && (
        <div className="sheet-backdrop" onClick={() => { setLastRun(null); setExportNote(null); }}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet__handle" />
            <p className="eyebrow">Run complete</p>
            <h2>Nice work!</h2>
            <div className="stat-grid">
              <Stat label={`Distance (${distanceLabel(settings.units)})`} value={formatDistance(shown.distanceM, settings.units)} />
              <Stat label="Time" value={formatDuration(shown.durationMs)} />
              <Stat label={`Pace (${paceLabel(settings.units)})`} value={formatPace(shown.distanceM, shown.movingMs, settings.units)} />
              <Stat label="Calories" value={`${shown.calories} kcal`} />
            </div>
            {exportNote && <p className="hint">{exportNote}</p>}
            <div className="sheet__actions">
              <button
                className="button button--primary"
                onClick={async () => {
                  const result = await exportRuns([shown]);
                  setExportNote(result === 'shared' ? 'GPX opened in share sheet.' : result === 'saved' ? 'GPX saved to app storage.' : 'GPX downloaded.');
                }}
              >
                Export GPX
              </button>
              <button className="button" onClick={() => { setLastRun(null); setExportNote(null); }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
