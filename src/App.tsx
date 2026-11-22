import { useCallback, useEffect, useState } from 'react';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { StatsScreen } from './screens/StatsScreen';
import { TrackScreen } from './screens/TrackScreen';
import { clearRuns, deleteRun, getRuns, saveRun } from './lib/db';
import type { Run, Settings } from './types';

type Tab = 'track' | 'history' | 'stats' | 'settings';

const SETTINGS_KEY = 'trail-log-settings';

const defaultSettings: Settings = { weightKg: 70, units: 'km' };

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      weightKg: typeof parsed.weightKg === 'number' ? parsed.weightKg : defaultSettings.weightKg,
      units: parsed.units === 'mi' ? 'mi' : 'km',
    };
  } catch {
    return defaultSettings;
  }
}

function Icon({ name }: { name: Tab }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (name === 'track') {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === 'history') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v4h4" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    );
  }
  if (name === 'stats') {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M22 20H2" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1H21v4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('track');
  const [runs, setRuns] = useState<Run[]>([]);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRuns()
      .then(setRuns)
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const handleSave = useCallback(async (run: Run) => {
    await saveRun(run);
    setRuns((current) => [run, ...current]);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteRun(id);
    setRuns((current) => current.filter((r) => r.id !== id));
  }, []);

  const handleClear = useCallback(async () => {
    await clearRuns();
    setRuns([]);
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand__mark">TL</span>
          <div>
            <span className="brand__name">TrailLog</span>
            <span className="brand__tagline">Run freely. Keep your data.</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        {loading ? (
          <div className="loading">Loading your runs…</div>
        ) : tab === 'track' ? (
          <TrackScreen settings={settings} onSave={handleSave} />
        ) : tab === 'history' ? (
          <HistoryScreen runs={runs} settings={settings} onDelete={handleDelete} />
        ) : tab === 'stats' ? (
          <StatsScreen runs={runs} settings={settings} />
        ) : (
          <SettingsScreen
            runs={runs}
            settings={settings}
            onSettingsChange={setSettings}
            onClear={handleClear}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {([
          ['track', 'Track'],
          ['history', 'History'],
          ['stats', 'Stats'],
          ['settings', 'Settings'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? 'nav-item is-active' : 'nav-item'}
            onClick={() => setTab(key)}
            aria-current={tab === key ? 'page' : undefined}
          >
            <Icon name={key} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
