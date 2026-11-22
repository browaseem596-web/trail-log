import { openDB } from 'idb';
import type { PlannedRoute, Run } from '../types';

const DB_NAME = 'trail-log';
const DB_VERSION = 2;
const RUNS = 'runs';
const ROUTES = 'routes';

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1 && !db.objectStoreNames.contains(RUNS)) {
      db.createObjectStore(RUNS, { keyPath: 'id' });
    }
    if (oldVersion < 2 && !db.objectStoreNames.contains(ROUTES)) {
      db.createObjectStore(ROUTES, { keyPath: 'id' });
    }
  },
});

export async function getRuns(): Promise<Run[]> {
  const db = await dbPromise;
  const all = (await db.getAll(RUNS)) as Run[];
  return all.sort((a, b) => b.startedAt - a.startedAt);
}

export async function saveRun(run: Run): Promise<void> {
  const db = await dbPromise;
  await db.put(RUNS, run);
}

export async function deleteRun(id: string): Promise<void> {
  const db = await dbPromise;
  await db.delete(RUNS, id);
}

export async function clearRuns(): Promise<void> {
  const db = await dbPromise;
  await db.clear(RUNS);
}

export async function getRoutes(): Promise<PlannedRoute[]> {
  const db = await dbPromise;
  const all = (await db.getAll(ROUTES)) as PlannedRoute[];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveRoute(route: PlannedRoute): Promise<void> {
  const db = await dbPromise;
  await db.put(ROUTES, route);
}

export async function deleteRoute(id: string): Promise<void> {
  const db = await dbPromise;
  await db.delete(ROUTES, id);
}
