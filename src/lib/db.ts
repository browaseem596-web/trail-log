import { openDB } from 'idb';
import type { Run } from '../types';

const DB_NAME = 'trail-log';
const DB_VERSION = 1;
const STORE = 'runs';

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE, { keyPath: 'id' });
    }
  },
});

export async function getRuns(): Promise<Run[]> {
  const db = await dbPromise;
  const all = (await db.getAll(STORE)) as Run[];
  return all.sort((a, b) => b.startedAt - a.startedAt);
}

export async function saveRun(run: Run): Promise<void> {
  const db = await dbPromise;
  await db.put(STORE, run);
}

export async function deleteRun(id: string): Promise<void> {
  const db = await dbPromise;
  await db.delete(STORE, id);
}

export async function clearRuns(): Promise<void> {
  const db = await dbPromise;
  await db.clear(STORE);
}
