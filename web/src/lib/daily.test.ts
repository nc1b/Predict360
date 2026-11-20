import { describe, expect, it } from 'vitest';
import { checkedInOn, daysThisWeek, dismissDaily, loadEnergy, localDay, saveEnergy, shouldPromptDaily, streak } from './daily';
import type { HistoryEntry, StorageLike } from './history';
import type { Status } from './types';

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

const f = { value: 1, samples: 30 };
function entry(at: Date, status: Status = 'near_baseline'): HistoryEntry {
  return { id: at.toISOString(), at: at.toISOString(), status, readinessScore: 90, flags: [], features: { dwellMs: f, sentencePauseMs: f, flightVolatilityMs: f } };
}
const now = new Date(2026, 10, 20, 9, 30);
const daysAgo = (n: number, hour = 10) => new Date(2026, 10, 20 - n, hour);

describe('daily check-in', () => {
  it('formats the local day', () => {
    expect(localDay(now)).toBe('2026-11-20');
  });

  it('counts a streak ending today or yesterday, ignoring rejected check-ins', () => {
    expect(streak([], now)).toBe(0);
    expect(streak([entry(daysAgo(0, 8)), entry(daysAgo(1)), entry(daysAgo(2))], now)).toBe(3);
    expect(streak([entry(daysAgo(1)), entry(daysAgo(2))], now)).toBe(2);
    expect(streak([entry(daysAgo(2)), entry(daysAgo(3))], now)).toBe(0);
    expect(streak([entry(daysAgo(0, 8), 'insufficient_samples'), entry(daysAgo(1))], now)).toBe(1);
  });

  it('counts distinct days this week', () => {
    expect(daysThisWeek([entry(daysAgo(0, 8)), entry(daysAgo(0, 9)), entry(daysAgo(3)), entry(daysAgo(8))], now)).toBe(2);
  });

  it('prompts on each sign-in until today is done', () => {
    const s = memoryStorage();
    expect(shouldPromptDaily([entry(daysAgo(1))], s, 'u', 'sess1', now)).toBe(true);
    dismissDaily(s, 'u', 'sess1', now);
    expect(shouldPromptDaily([], s, 'u', 'sess1', now)).toBe(false);
    expect(shouldPromptDaily([], s, 'u', 'sess2', now)).toBe(true);
    expect(shouldPromptDaily([entry(daysAgo(0, 8))], memoryStorage(), 'u', 'sess3', now)).toBe(false);
    expect(checkedInOn([entry(daysAgo(0, 8), 'insufficient_samples')], '2026-11-20')).toBe(false);
  });

  it('keeps energy for today only', () => {
    const s = memoryStorage();
    saveEnergy(s, 'u', 'low', now);
    expect(loadEnergy(s, 'u', now)).toBe('low');
    expect(loadEnergy(s, 'u', new Date(2026, 10, 21, 8))).toBe(null);
    saveEnergy(s, 'u', null, now);
    expect(loadEnergy(s, 'u', now)).toBe(null);
  });
});

describe('dashboard preferences', () => {
  it('defaults on and round-trips', async () => {
    const { loadPrefs, savePrefs } = await import('./daily');
    const s = memoryStorage();
    expect(loadPrefs(s, 'u')).toEqual({ promptAtLogin: true, autoAnalysis: true });
    savePrefs(s, 'u', { promptAtLogin: false, autoAnalysis: true });
    expect(loadPrefs(s, 'u').promptAtLogin).toBe(false);
    s.setItem('p360.prefs.u', 'not json');
    expect(loadPrefs(s, 'u')).toEqual({ promptAtLogin: true, autoAnalysis: true });
  });
});
