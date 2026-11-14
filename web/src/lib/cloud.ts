import config from '../../../config/public.json';
import { loadHistory, saveHistory, type HistoryEntry } from './history';

export class CloudError extends Error {}
export async function cloud<T>(route: string, token: string, method = 'GET', body?: unknown): Promise<T> {
  try {
    const response = await fetch(`${config.cloudUrl}?route=${encodeURIComponent(route)}`, {
      method, headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok) throw new CloudError(data.error?.message || 'Sync is temporarily unavailable.');
    return data as T;
  } catch (error) {
    if (error instanceof CloudError) throw error;
    throw new CloudError('Could not sync. Check your connection and try again.');
  }
}
const pendingKey = (user: string) => `p360.pending.${user}`;
function pending(user: string): string[] {
  try { const ids = JSON.parse(localStorage.getItem(pendingKey(user)) || '[]'); return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string').slice(-30) : []; } catch { return []; }
}
export function queueCheckin(user: string, entry: HistoryEntry) {
  localStorage.setItem(pendingKey(user), JSON.stringify([...new Set([...pending(user), entry.id])].slice(-30)));
}
const syncing = new Map<string, Promise<HistoryEntry[]>>();
export function syncCheckins(user: string, token: string): Promise<HistoryEntry[]> {
  const existing = syncing.get(user);
  if (existing) return existing;
  const work = syncHistory(user, token).finally(() => { syncing.delete(user); });
  syncing.set(user, work);
  return work;
}
async function syncHistory(user: string, token: string): Promise<HistoryEntry[]> {
  const local = loadHistory(localStorage, user);
  for (const id of pending(user)) {
    const entry = local.find((item) => item.id === id);
    if (entry) await cloud('checkins', token, 'POST', entry);
    localStorage.setItem(pendingKey(user), JSON.stringify(pending(user).filter((item) => item !== id)));
  }
  const { entries } = await cloud<{ entries: HistoryEntry[] }>('checkins', token);
  // New entries can be queued while the fetch is in flight. Preserve those
  // locally until the next sync rather than replacing them with an older read.
  const unsent = new Set(pending(user));
  const fresh = loadHistory(localStorage, user).filter((entry) => unsent.has(entry.id));
  const merged = [...new Map([...entries, ...fresh].map((entry) => [entry.id, entry])).values()].sort((a, b) => a.at.localeCompare(b.at));
  saveHistory(localStorage, user, merged);
  return loadHistory(localStorage, user);
}
export function clearPending(user: string) { localStorage.removeItem(pendingKey(user)); }
