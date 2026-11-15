
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

import type { AnalyzeRequest, AnalyzeResponse, Features, FeatureName, Flag, Status } from './types';

export interface HistoryEntry {
  id: string;
  deviceId?: string;
  at: string;
  features: Features;
  readinessScore: number | null;
  status: Status;
  flags: Flag[];
}

export const MAX_HISTORY = 30;
export const MIN_BASELINE_SESSIONS = 3;

const FEATURES: FeatureName[] = ['dwellMs', 'sentencePauseMs', 'flightVolatilityMs'];
const MIN_SAMPLES: Record<FeatureName, number> = { dwellMs: 20, sentencePauseMs: 1, flightVolatilityMs: 20 };
const STATUSES: Status[] = ['near_baseline', 'some_deviation', 'large_deviation', 'insufficient_samples', 'baseline_missing', 'baseline_insufficient'];
const FLAGS: Flag[] = ['long_key_hold', 'long_sentence_pause', 'uneven_typing_rhythm'];
const key = (userId: string) => `p360.history.${userId}`;
export function checkinDeviceId(storage: StorageLike): string {
  const existing = storage.getItem('p360.checkin-device');
  if (existing && /^[a-f0-9-]{36}$/i.test(existing)) return existing;
  const id = crypto.randomUUID();
  storage.setItem('p360.checkin-device', id);
  return id;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validFeatures(value: unknown): value is Features {
  return isObject(value) && FEATURES.every((name) => {
    const f = value[name];
    if (!isObject(f) || !Number.isInteger(f.samples) || (f.samples as number) < 0 || (f.samples as number) > 5000) return false;
    if (f.samples === 0 ? f.value !== null : typeof f.value !== 'number' || !Number.isFinite(f.value) || f.value < 0 || f.value > 3600000) return false;
    return (f.minSamples === undefined || f.minSamples === MIN_SAMPLES[name]) &&
      (f.sufficient === undefined || f.sufficient === ((f.samples as number) >= MIN_SAMPLES[name]));
  });
}

function validEntry(value: unknown): value is HistoryEntry {
  if (!isObject(value)) return false;
  return typeof value.id === 'string' && (value.deviceId === undefined || (typeof value.deviceId === 'string' && /^[a-f0-9-]{36}$/i.test(value.deviceId))) && typeof value.at === 'string' && Number.isFinite(Date.parse(value.at)) &&
    validFeatures(value.features) && STATUSES.includes(value.status as Status) &&
    (value.readinessScore === null || (Number.isInteger(value.readinessScore) && (value.readinessScore as number) >= 0 && (value.readinessScore as number) <= 100)) &&
    Array.isArray(value.flags) && value.flags.every((flag) => FLAGS.includes(flag));
}

export function loadHistory(storage: StorageLike, userId: string): HistoryEntry[] {
  try {
    const parsed = JSON.parse(storage.getItem(key(userId)) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(validEntry).slice(-MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export function saveHistory(storage: StorageLike, userId: string, entries: unknown): void {
  storage.setItem(key(userId), JSON.stringify(Array.isArray(entries) ? entries.filter(validEntry).slice(-MAX_HISTORY) : []));
}

export function isUsable(features: Features): boolean {
  return validFeatures(features) && FEATURES.every((name) => features[name].samples >= MIN_SAMPLES[name]);
}

export function addEntry(storage: StorageLike, userId: string, result: AnalyzeResponse, now = new Date()): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    deviceId: checkinDeviceId(storage),
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

export function baselineFrom(history: HistoryEntry[], deviceId?: string): AnalyzeRequest['baseline'] | undefined {
  const usable = history.filter((h) => h && (!deviceId || h.deviceId === deviceId) && isUsable(h.features)).slice(-MAX_HISTORY);
  if (usable.length === 0) return undefined;
  return {
    sessions: usable.map((h) => ({
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
