import type { Energy } from '../../../src/workday.mjs';
import type { StorageLike, HistoryEntry } from './history';

/** Local calendar day, e.g. "2026-11-20". */
export function localDay(at: Date | string = new Date()): string {
  const d = typeof at === 'string' ? new Date(at) : at;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A check-in counts toward the day only if it was saved (not rejected as too short). */
const counts = (h: HistoryEntry) => h.status !== 'insufficient_samples';

export function checkedInOn(history: HistoryEntry[], day: string): boolean {
  return history.some((h) => counts(h) && localDay(h.at) === day);
}

/** Consecutive days with a check-in, ending today (or yesterday, so a streak isn't lost before today's check-in). */
export function streak(history: HistoryEntry[], now = new Date()): number {
  const days = new Set(history.filter(counts).map((h) => localDay(h.at)));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (days.has(localDay(cursor))) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

/** Number of distinct days with a check-in in the 7 days ending today. */
export function daysThisWeek(history: HistoryEntry[], now = new Date()): number {
  const days = new Set(history.filter(counts).map((h) => localDay(h.at)));
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    if (days.has(localDay(d))) n += 1;
  }
  return n;
}

const ENERGIES = ['low', 'steady', 'good'] as const;
const energyKey = (userId: string) => `p360.energy.${userId}`;

/** Today's self-reported energy. Stays on this device; never synced. */
export function loadEnergy(storage: StorageLike, userId: string, now = new Date()): Energy {
  try {
    const saved = JSON.parse(storage.getItem(energyKey(userId)) ?? 'null');
    return saved && saved.day === localDay(now) && ENERGIES.includes(saved.energy) ? saved.energy : null;
  } catch {
    return null;
  }
}

export function saveEnergy(storage: StorageLike, userId: string, energy: Energy, now = new Date()): void {
  if (energy === null) storage.removeItem(energyKey(userId));
  else storage.setItem(energyKey(userId), JSON.stringify({ day: localDay(now), energy }));
}

/**
 * The daily check-in opens on every sign-in until today's check-in is done.
 * "Not now" hides it only for the current sign-in (keyed by session), so the next login asks again.
 */
const dismissKey = (userId: string, sessionKey: string, now: Date) => `p360.daily-dismissed.${userId}.${sessionKey}.${localDay(now)}`;

export function shouldPromptDaily(
  history: HistoryEntry[],
  storage: StorageLike,
  userId: string,
  sessionKey: string,
  now = new Date()
): boolean {
  if (checkedInOn(history, localDay(now))) return false;
  return storage.getItem(dismissKey(userId, sessionKey, now)) === null;
}

export function dismissDaily(storage: StorageLike, userId: string, sessionKey: string, now = new Date()): void {
  storage.setItem(dismissKey(userId, sessionKey, now), '1');
}
