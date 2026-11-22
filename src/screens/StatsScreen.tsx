import { useMemo } from 'react';
import {
  distanceLabel,
  formatDistance,
  formatDuration,
  formatPace,
  metersToDisplay,
  paceLabel,
} from '../lib/geo';
import type { Run, Settings } from '../types';

interface Props {
  runs: Run[];
  settings: Settings;
}

interface DayBar {
  label: string;
  meters: number;
  key: string;
}

export function StatsScreen({ runs, settings }: Props) {
  const totals = useMemo(() => {
    const distanceM = runs.reduce((sum, r) => sum + r.distanceM, 0);
    const durationMs = runs.reduce((sum, r) => sum + r.durationMs, 0);
    const movingMs = runs.reduce((sum, r) => sum + r.movingMs, 0);
    return {
      distanceM,
      durationMs,
      movingMs,
      avgPace: runs.length ? formatPace(distanceM, movingMs, settings.units) : '--:--',
    };
  }, [runs, settings.units]);

  const bests = useMemo(() => {
    if (runs.length === 0) return { longest: 0, fastestMs: 0 };
    const longest = Math.max(...runs.map((r) => r.distanceM));
    const qualifiers = runs.filter((r) => r.distanceM >= 1000);
    const fastestMs = qualifiers.length
      ? Math.min(...qualifiers.map((r) => r.movingMs / (r.distanceM / 1000)))
      : 0;
    return { longest, fastestMs };
  }, [runs]);

  const bars = useMemo<DayBar[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - index));
      const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      const meters = runs
        .filter((r) => {
          const d = new Date(r.startedAt);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === key;
        })
        .reduce((sum, r) => sum + r.distanceM, 0);
      return {
        key,
        label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day).slice(0, 2),
        meters,
      };
    });
  }, [runs]);

  const maxBar = Math.max(...bars.map((b) => b.meters), 1);
  const unit = distanceLabel(settings.units);

  return (
    <section className="screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">The big picture</p>
          <h1>Statistics</h1>
        </div>
      </div>

      <div className="hero-stat">
        <span className="hero-stat__value">{formatDuration(totals.durationMs)}</span>
        <span className="hero-stat__label">Total time moving &amp; resting</span>
      </div>

      <div className="stat-grid">
        <Stat label={`Total distance (${unit})`} value={formatDistance(totals.distanceM, settings.units)} />
        <Stat label="Runs" value={String(runs.length)} />
        <Stat label={`Avg pace (${paceLabel(settings.units)})`} value={totals.avgPace} />
        <Stat label="Moving time" value={formatDuration(totals.movingMs)} />
      </div>

      <div className="card">
        <h2>Last 7 days</h2>
        <div className="chart">
          {bars.map((bar) => (
            <div className="chart__col" key={bar.key}>
              <div className="chart__bar-track">
                <div
                  className="chart__bar"
                  style={{ height: `${Math.max(bar.meters > 0 ? 6 : 0, (bar.meters / maxBar) * 100)}%` }}
                  title={`${formatDistance(bar.meters, settings.units)} ${unit}`}
                />
              </div>
              <span className="chart__label">{bar.label}</span>
            </div>
          ))}
        </div>
        <p className="hint">Each bar is total distance for that day.</p>
      </div>

      <div className="card">
        <h2>Personal bests</h2>
        <div className="pb-row">
          <span>Longest run</span>
          <strong>{formatDistance(bests.longest, settings.units)} {unit}</strong>
        </div>
        <div className="pb-row">
          <span>Best average pace</span>
          <strong>
            {bests.fastestMs
              ? formatPace(1000, bests.fastestMs, settings.units) + ' ' + paceLabel(settings.units)
              : '--:--'}
          </strong>
        </div>
        <p className="hint">Pace bests consider runs of at least 1 {unit === 'mi' ? 'mile' : 'km'}.</p>
      </div>

      {runs.length > 0 && (
        <p className="hint">
          That is {metersToDisplay(totals.distanceM, settings.units).toFixed(1)} {unit} of roads and trails explored.
        </p>
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
