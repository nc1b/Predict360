// Per-account check-in history, stored on this device only.
// An entry holds three numbers and their sample counts. No text and no keystrokes.

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

import type { AnalyzeRequest, AnalyzeResponse, Features, FeatureName, Flag, Status } from './types';

export interface HistoryEntry {
  id: string;
  at: string;
  features: Features;
  readinessScore: number | null;
  status: Status;
  flags: Flag[];
}

export const MAX_HISTORY = 30; // the API accepts at most 30 baseline sessions
export const MIN_BASELINE_SESSIONS = 3;

const FEATURES: FeatureName[] = ['dwellMs', 'sentencePauseMs', 'flightVolatilityMs'];
const key = (userId: string) => `p360.history.${userId}`;

export function loadHistory(storage: StorageLike, userId: string): HistoryEntry[] {
  try {
    const parsed = JSON.parse(storage.getItem(key(userId)) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** A check-in is worth keeping only if every feature had enough samples. */
export function isUsable(features: Features): boolean {
  return FEATURES.every((name) => features[name]?.sufficient === true);
}

export function addEntry(storage: StorageLike, userId: string, result: AnalyzeResponse, now = new Date()): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    at: now.toISOString(),
    features: result.features,
    readinessScore: result.readinessScore,
    status: result.status,
    flags: result.flags,
  };
  const next = [...loadHistory(storage, userId), entry].slice(-MAX_HISTORY);
  storage.setItem(key(userId), JSON.stringify(next));
  return next;
}

export function clearHistory(storage: StorageLike, userId: string): void {
  storage.removeItem(key(userId));
}

/** The `baseline` field for the next request, built from stored feature summaries. */
export function baselineFrom(history: HistoryEntry[]): AnalyzeRequest['baseline'] | undefined {
  if (history.length === 0) return undefined;
  return {
    sessions: history.slice(-MAX_HISTORY).map((h) => ({
      features: {
        dwellMs: { value: h.features.dwellMs.value, samples: h.features.dwellMs.samples },
        sentencePauseMs: { value: h.features.sentencePauseMs.value, samples: h.features.sentencePauseMs.samples },
        flightVolatilityMs: {
          value: h.features.flightVolatilityMs.value,
          samples: h.features.flightVolatilityMs.samples,
        },
      },
    })),
  };
}
