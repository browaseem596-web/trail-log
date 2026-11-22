import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { Run } from '../types';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function trackToXml(run: Run): string {
  const points = run.points
    .map((p) => {
      const ele = p.alt != null ? `<ele>${p.alt.toFixed(1)}</ele>` : '';
      const time = `<time>${new Date(p.t).toISOString()}</time>`;
      return `      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}">${ele}${time}</trkpt>`;
    })
    .join('\n');

  return `  <trk>
    <name>${escapeXml(run.name)}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>`;
}

export function buildGpx(runs: Run[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrailLog" xmlns="http://www.topografix.com/GPX/1/1">
${runs.map(trackToXml).join('\n')}
</gpx>
`;
}

function safeFileName(run: Run): string {
  const date = new Date(run.startedAt).toISOString().slice(0, 10);
  return `trailog-${date}-${run.id.slice(0, 6)}.gpx`;
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportRuns(runs: Run[]): Promise<'shared' | 'downloaded' | 'saved'> {
  if (runs.length === 0) return 'downloaded';
  const text = buildGpx(runs);
  const filename =
    runs.length === 1 ? safeFileName(runs[0]) : `trailog-${runs.length}-runs.gpx`;

  if (Capacitor.isNativePlatform()) {
    const path = filename;
    await Filesystem.writeFile({
      path,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    try {
      await Share.share({ title: 'TrailLog GPX', url: uri, dialogTitle: 'Share GPX' });
      return 'shared';
    } catch {
      // User cancelled the share sheet or no app handles GPX.
      return 'saved';
    }
  }

  downloadText(filename, text);
  return 'downloaded';
}
