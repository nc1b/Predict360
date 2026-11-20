import type { HistoryEntry } from './history';
import type { FeatureName } from './types';

/**
 * Tracks the three timing measures that published keystroke studies examined, against the
 * person's own earlier check-ins. This describes change in typing only: it does not detect,
 * predict or rule out any condition.
 */
export interface SignalDef {
  key: FeatureName;
  name: string;
  hint: string;
  /** Change (as a ratio of usual) above which a measure counts as raised; matches the scoring tolerances. */
  tolerance: number;
  /** Conditions where research examined this measure. Context only. */
  studiedIn: string[];
}

export const SIGNAL_DEFS: SignalDef[] = [
  { key: 'dwellMs', name: 'Key hold', hint: 'How long each key stays down', tolerance: 1.15, studiedIn: ["Parkinson's disease", 'Sleep loss'] },
  { key: 'sentencePauseMs', name: 'Sentence pause', hint: 'Gap between your two sentences', tolerance: 1.5, studiedIn: ['Mild cognitive impairment', 'Mood changes', 'Mental workload'] },
  { key: 'flightVolatilityMs', name: 'Rhythm variation', hint: 'How uneven the gaps between keys are', tolerance: 1.25, studiedIn: ["Parkinson's disease", 'Multiple sclerosis', 'Stress'] },
];

export type TrendState = 'gathering' | 'steady' | 'raised' | 'lasting' | 'lower';

export interface SignalTrend {
  def: SignalDef;
  /** Values oldest first, for a sparkline. */
  series: number[];
  usual: number | null;
  recent: number | null;
  /** recent / usual */
  ratio: number | null;
  state: TrendState;
}

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Needs this many earlier check-ins to form a usual, and this many recent ones to judge a trend. */
export const MIN_USUAL = 3;
export const RECENT = 3;

export function signalTrends(history: HistoryEntry[]): SignalTrend[] {
  return SIGNAL_DEFS.map((def) => {
    const series = history
      .filter((h) => h.status !== 'insufficient_samples')
      .map((h) => h.features[def.key].value)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
      .slice(-20);
    if (series.length < MIN_USUAL + 1) return { def, series, usual: null, recent: null, ratio: null, state: 'gathering' };
    const recentCount = Math.min(RECENT, series.length - MIN_USUAL);
    const earlier = series.slice(0, series.length - recentCount).slice(-10);
    const latest = series.slice(-recentCount);
    const usual = median(earlier);
    const recent = median(latest);
    const ratio = recent / usual;
    // "Lasting" only when every one of the last RECENT check-ins is above tolerance, not one odd day.
    const allRaised = latest.length === RECENT && latest.every((v) => v / usual > def.tolerance);
    const state: TrendState = allRaised ? 'lasting' : ratio > def.tolerance ? 'raised' : ratio < 1 / def.tolerance ? 'lower' : 'steady';
    return { def, series, usual, recent, ratio, state };
  });
}
