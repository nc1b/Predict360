import { describe, expect, it } from 'vitest';
import { addEntry, baselineFrom, clearHistory, isUsable, loadHistory, MAX_HISTORY, type StorageLike } from './history';
import type { AnalyzeResponse, Features } from './types';

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function features(dwell: number, sufficient = true): Features {
  return {
    dwellMs: { value: dwell, samples: 60, minSamples: 20, sufficient },
    sentencePauseMs: { value: 700, samples: 1, minSamples: 1, sufficient: true },
    flightVolatilityMs: { value: 20, samples: 55, minSamples: 20, sufficient: true },
  };
}

function result(dwell: number): AnalyzeResponse {
  return {
    readinessScore: null,
    status: 'baseline_missing',
    reasons: [],
    features: features(dwell),
    baseline: null,
    comparisons: { dwellMs: null, sentencePauseMs: null, flightVolatilityMs: null },
    drivers: [],
    flags: [],
    experimental: true,
    disclaimer: '',
  };
}

describe('history', () => {
  it('stores entries per user and builds a baseline of feature summaries only', () => {
    const s = memoryStorage();
    addEntry(s, 'u1', result(90));
    addEntry(s, 'u1', result(95));
    addEntry(s, 'u2', result(140));
    expect(loadHistory(s, 'u1')).toHaveLength(2);
    expect(loadHistory(s, 'u2')).toHaveLength(1);
    expect(baselineFrom(loadHistory(s, 'u1'))).toEqual({
      sessions: [90, 95].map((v) => ({
        features: {
          dwellMs: { value: v, samples: 60 },
          sentencePauseMs: { value: 700, samples: 1 },
          flightVolatilityMs: { value: 20, samples: 55 },
        },
      })),
    });
    expect(baselineFrom([])).toBeUndefined();
  });

  it('caps history at the API baseline limit and clears', () => {
    const s = memoryStorage();
    for (let i = 0; i < MAX_HISTORY + 5; i++) addEntry(s, 'u1', result(i));
    const h = loadHistory(s, 'u1');
    expect(h).toHaveLength(MAX_HISTORY);
    expect(h[0].features.dwellMs.value).toBe(5);
    clearHistory(s, 'u1');
    expect(loadHistory(s, 'u1')).toEqual([]);
  });

  it('survives corrupted storage', () => {
    const s = memoryStorage();
    s.setItem('p360.history.u1', '{not json');
    expect(loadHistory(s, 'u1')).toEqual([]);
  });

  it('discards malformed entries without losing valid history or poisoning the baseline', () => {
    const s = memoryStorage();
    const [valid] = addEntry(s, 'u1', result(90));
    s.setItem('p360.history.u1', JSON.stringify([
      null, {}, { ...valid, at: 'not-a-date' }, { ...valid, status: 'invalid' },
      { ...valid, features: { ...valid.features, dwellMs: { value: 1e308, samples: 50 } } },
      { ...valid, features: { ...valid.features, dwellMs: { value: null, samples: 50 } } },
      valid,
    ]));
    expect(loadHistory(s, 'u1')).toEqual([valid]);
    expect(baselineFrom(loadHistory(s, 'u1'))?.sessions).toHaveLength(1);
  });

  it('only sends usable sessions when building the next baseline', () => {
    const s = memoryStorage();
    const [valid] = addEntry(s, 'u1', result(90));
    const short = { ...valid, features: { ...valid.features, dwellMs: { value: 90, samples: 2, sufficient: false } } };
    expect(baselineFrom([short])).toBeUndefined();
    expect(baselineFrom([short, valid])?.sessions).toHaveLength(1);
  });

  it('keeps check-in baselines separate when account history syncs across devices', () => {
    const first = memoryStorage(), second = memoryStorage();
    const [a] = addEntry(first, 'u1', result(90));
    const [b] = addEntry(second, 'u1', result(140));
    expect(a.deviceId).not.toBe(b.deviceId);
    expect(baselineFrom([a, b], a.deviceId)?.sessions).toHaveLength(1);
    expect(baselineFrom([a, b], a.deviceId)?.sessions[0]).toEqual({ features: {
      dwellMs: { value: 90, samples: 60 }, sentencePauseMs: { value: 700, samples: 1 }, flightVolatilityMs: { value: 20, samples: 55 },
    } });
  });

  it('isUsable requires every feature to have enough samples', () => {
    expect(isUsable(features(90))).toBe(true);
    expect(isUsable(features(90, false))).toBe(false);
  });
});
