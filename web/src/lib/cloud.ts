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
  const unsent = new Set(pending(user));
  const fresh = loadHistory(localStorage, user).filter((entry) => unsent.has(entry.id));
  const merged = [...new Map([...entries, ...fresh].map((entry) => [entry.id, entry])).values()].sort((a, b) => a.at.localeCompare(b.at));
  saveHistory(localStorage, user, merged);
  return loadHistory(localStorage, user);
}
export function clearPending(user: string) { localStorage.removeItem(pendingKey(user)); }

export interface DailyRow { day: string; energy: 'low' | 'steady' | 'good' | null; analysis: string | null }

/**
 * Best-effort account sync for logins, energy and the daily analysis. Local storage stays the
 * source of truth on this device, so a sync failure never blocks the user.
 */
export const accountSync = {
  async recordLogin(user: string, sessionId: string | null, token: string, displayName: string) {
    const key = `p360.login-recorded.${user}.${sessionId ?? 'tab'}`;
    const store = sessionId ? localStorage : sessionStorage;
    if (store.getItem(key)) return;
    let timezone: string | undefined;
    try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* optional */ }
    await cloud('profile', token, 'POST', { client: 'web', displayName: displayName.slice(0, 100), ...(timezone && /^[A-Za-z0-9_+\-/]{1,64}$/.test(timezone) ? { timezone } : {}) });
    store.setItem(key, '1');
  },
  async today(token: string, day: string): Promise<DailyRow | null> {
    const { days } = await cloud<{ days: DailyRow[] }>('daily', token);
    return days.find((d) => d.day === day) ?? null;
  },
  saveEnergy: (token: string, day: string, energy: DailyRow['energy']) => cloud('daily', token, 'PUT', { day, energy }),
  saveAnalysis: (token: string, day: string, analysis: string) => cloud('daily', token, 'PUT', { day, analysis: analysis.slice(0, 4000) }),
};
