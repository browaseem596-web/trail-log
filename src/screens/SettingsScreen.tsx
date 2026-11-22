import { useState } from 'react';
import { exportRuns } from '../lib/gpx';
import type { Run, Settings } from '../types';

interface Props {
  runs: Run[];
  settings: Settings;
  onSettingsChange: (next: Settings) => void;
  onClear: () => void;
}

export function SettingsScreen({ runs, settings, onSettingsChange, onClear }: Props) {
  const [note, setNote] = useState<string | null>(null);
  const [weightDraft, setWeightDraft] = useState(String(settings.weightKg));

  const commitWeight = () => {
    const value = Number.parseFloat(weightDraft);
    if (Number.isFinite(value) && value >= 20 && value <= 300) {
      onSettingsChange({ ...settings, weightKg: value });
      setNote('Weight saved. Calorie estimates use it for future runs.');
    } else {
      setWeightDraft(String(settings.weightKg));
      setNote('Enter a weight between 20 and 300 kg.');
    }
  };

  return (
    <section className="screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Make it yours</p>
          <h1>Settings</h1>
        </div>
      </div>

      <div className="card">
        <h2>Units</h2>
        <div className="segmented">
          {(['km', 'mi'] as const).map((unit) => (
            <button
              key={unit}
              className={settings.units === unit ? 'segmented__option is-active' : 'segmented__option'}
              onClick={() => onSettingsChange({ ...settings, units: unit })}
            >
              {unit === 'km' ? 'Kilometres' : 'Miles'}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Body weight</h2>
        <p className="hint">Used only to estimate calories. Stored on your device.</p>
        <div className="field-row">
          <input
            type="number"
            inputMode="decimal"
            min="20"
            max="300"
            value={weightDraft}
            onChange={(e) => setWeightDraft(e.target.value)}
            aria-label="Weight in kilograms"
          />
          <span>kg</span>
          <button className="button button--primary button--small" onClick={commitWeight}>Save</button>
        </div>
      </div>

      <div className="card">
        <h2>Your data</h2>
        <p className="hint">
          Runs are stored locally in this app. Export them any time as standard GPX files that
          other apps can read.
        </p>
        <div className="row-actions">
          <button
            className="button button--primary"
            disabled={runs.length === 0}
            onClick={async () => {
              const result = await exportRuns(runs);
              setNote(result === 'shared' ? 'GPX opened in share sheet.' : result === 'saved' ? 'GPX saved to app storage.' : 'GPX downloaded.');
            }}
          >
            Export all ({runs.length})
          </button>
          <button
            className="button button--danger"
            disabled={runs.length === 0}
            onClick={() => {
              if (window.confirm(`Delete all ${runs.length} runs? This cannot be undone.`)) {
                onClear();
                setNote('All runs deleted.');
              }
            }}
          >
            Delete all
          </button>
        </div>
      </div>

      <div className="card card--about">
        <h2>About TrailLog</h2>
        <p>
          A small, privacy-first running tracker. No account, no cloud, no ads — your routes
          belong to you.
        </p>
        <p className="hint">
          Maps &copy; OpenStreetMap contributors. Route data is stored on your device.
        </p>
      </div>

      {note && <div className="banner banner--info">{note}</div>}
    </section>
  );
}
