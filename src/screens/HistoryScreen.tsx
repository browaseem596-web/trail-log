import { useState } from 'react';
import { MapView } from '../components/MapView';
import {
  distanceLabel,
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
  paceLabel,
} from '../lib/geo';
import { exportRuns } from '../lib/gpx';
import type { Run, Settings } from '../types';

interface Props {
  runs: Run[];
  settings: Settings;
  onDelete: (id: string) => void;
}

export function HistoryScreen({ runs, settings, onDelete }: Props) {
  const [selected, setSelected] = useState<Run | null>(null);
  const [note, setNote] = useState<string | null>(null);

  if (selected) {
    return (
      <section className="screen">
        <button className="back-button" onClick={() => { setSelected(null); setNote(null); }}>
          ← All runs
        </button>
        <div className="screen-heading">
          <div>
            <p className="eyebrow">{formatDate(selected.startedAt)}</p>
            <h1>{selected.name}</h1>
          </div>
        </div>
        <div className="map-card map-card--detail">
          <MapView points={selected.points} fit className="map-card__map" />
        </div>
        <div className="stat-grid">
          <Stat label={`Distance (${distanceLabel(settings.units)})`} value={formatDistance(selected.distanceM, settings.units)} />
          <Stat label="Elapsed" value={formatDuration(selected.durationMs)} />
          <Stat label="Moving" value={formatDuration(selected.movingMs)} />
          <Stat label={`Pace (${paceLabel(settings.units)})`} value={formatPace(selected.distanceM, selected.movingMs, settings.units)} />
          <Stat label="Elevation" value={`${Math.round(selected.elevGainM)} m`} />
          <Stat label="Calories" value={`${selected.calories} kcal`} />
        </div>
        {note && <p className="hint">{note}</p>}
        <div className="row-actions">
          <button
            className="button button--primary"
            onClick={async () => {
              const result = await exportRuns([selected]);
              setNote(result === 'shared' ? 'GPX opened in share sheet.' : result === 'saved' ? 'GPX saved to app storage.' : 'GPX downloaded.');
            }}
          >
            Export GPX
          </button>
          <button
            className="button button--danger"
            onClick={() => {
              if (window.confirm('Delete this run permanently?')) {
                onDelete(selected.id);
                setSelected(null);
              }
            }}
          >
            Delete
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Your local log</p>
          <h1>History</h1>
        </div>
        <span className="count-badge">{runs.length} runs</span>
      </div>

      {runs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">◎</div>
          <h2>No runs yet</h2>
          <p>Head to Track and record your first run. It will appear here automatically.</p>
        </div>
      ) : (
        <ul className="run-list">
          {runs.map((run) => (
            <li key={run.id}>
              <button className="run-item" onClick={() => setSelected(run)}>
                <span className="run-item__date">{formatDate(run.startedAt)}</span>
                <span className="run-item__main">
                  <strong>{formatDistance(run.distanceM, settings.units)}</strong>
                  <span>{distanceLabel(settings.units)}</span>
                </span>
                <span className="run-item__meta">
                  <span>{formatDuration(run.durationMs)}</span>
                  <span>{formatPace(run.distanceM, run.movingMs, settings.units)} {paceLabel(settings.units)}</span>
                </span>
                <span className="run-item__arrow">›</span>
              </button>
            </li>
          ))}
        </ul>
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
