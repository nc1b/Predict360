import { describe, expect, it } from 'vitest';
import { signalTrends } from './signal-trends';
import type { HistoryEntry } from './history';

function entry(i: number, dwell: number, pause = 700, rhythm = 20): HistoryEntry {
  const f = (value: number) => ({ value, samples: 40 });
  return { id: String(i), at: new Date(2026, 10, i + 1).toISOString(), status: 'near_baseline', readinessScore: 90, flags: [], features: { dwellMs: f(dwell), sentencePauseMs: f(pause), flightVolatilityMs: f(rhythm) } };
}

describe('signal trends', () => {
  it('waits for enough check-ins', () => {
    const t = signalTrends([entry(0, 80), entry(1, 80), entry(2, 80)]);
    expect(t.every((s) => s.state === 'gathering')).toBe(true);
  });

  it('is steady when recent typing matches the usual', () => {
    const t = signalTrends([80, 82, 79, 81, 80, 83].map((d, i) => entry(i, d)));
    expect(t[0].state).toBe('steady');
    expect(t[0].usual).toBe(80);
  });

  it('separates one raised day from a lasting change', () => {
    const oneDay = signalTrends([80, 80, 80, 80, 80, 80, 80, 104].map((d, i) => entry(i, d)));
    expect(oneDay[0].state).toBe('steady'); // median of last 3 is still 80
    const lasting = signalTrends([80, 80, 80, 80, 80, 100, 98, 102].map((d, i) => entry(i, d)));
    expect(lasting[0].state).toBe('lasting');
    expect(lasting[0].ratio).toBeGreaterThan(1.15);
  });

  it('ignores rejected check-ins', () => {
    const h = [80, 80, 80, 80, 80].map((d, i) => entry(i, d));
    h.push({ ...entry(9, 300), status: 'insufficient_samples' });
    expect(signalTrends(h)[0].state).toBe('steady');
  });
});
