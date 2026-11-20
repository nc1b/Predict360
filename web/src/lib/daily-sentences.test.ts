import { describe, expect, it } from 'vitest';
import { DAILY_SENTENCES, sentencesFor } from './daily-sentences';

describe('daily sentences', () => {
  it('every entry is exactly two sentences ending in a period', () => {
    for (const s of DAILY_SENTENCES) {
      expect(s.match(/\./g)?.length, s).toBe(2);
      expect(s.endsWith('.'), s).toBe(true);
      expect(s, s).toMatch(/^[A-Za-z ,.]+$/);
      expect(s.includes('  '), s).toBe(false);
    }
  });

  it('is the same all day and changes the next day', () => {
    const morning = new Date(2026, 10, 20, 6, 0);
    const night = new Date(2026, 10, 20, 23, 30);
    const tomorrow = new Date(2026, 10, 21, 6, 0);
    expect(sentencesFor(morning)).toBe(sentencesFor(night));
    expect(sentencesFor(tomorrow)).not.toBe(sentencesFor(morning));
  });

  it('visits every entry over a full cycle', () => {
    const seen = new Set<string>();
    for (let d = 0; d < DAILY_SENTENCES.length; d++) seen.add(sentencesFor(new Date(2026, 0, 1 + d, 12)));
    expect(seen.size).toBe(DAILY_SENTENCES.length);
  });
});
