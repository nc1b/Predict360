import type { Keystroke } from './capture';

export type FeatureName = 'dwellMs' | 'sentencePauseMs' | 'flightVolatilityMs';

export interface FeatureValue {
  value: number | null;
  samples: number;
  minSamples?: number;
  sufficient?: boolean;
}

export type Features = Record<FeatureName, FeatureValue>;

export type Status =
  | 'near_baseline'
  | 'some_deviation'
  | 'large_deviation'
  | 'insufficient_samples'
  | 'baseline_missing'
  | 'baseline_insufficient';

export type Flag = 'long_key_hold' | 'long_sentence_pause' | 'uneven_typing_rhythm';

export interface Comparison {
  sessionMs: number;
  baselineMs: number;
  deltaMs: number;
  ratio: number;
  pointsDeducted: number;
  flag: Flag | null;
}

export interface AnalyzeResponse {
  readinessScore: number | null;
  status: Status;
  reasons: string[];
  features: Features;
  baseline: {
    sessionsProvided: number;
    features: Record<FeatureName, { value: number | null; sessionsUsed: number; minSessions: number; valid: boolean }>;
  } | null;
  comparisons: Record<FeatureName, Comparison | null>;
  drivers: { feature: FeatureName; flag: Flag; pointsDeducted: number; ratio: number }[];
  flags: Flag[];
  experimental: boolean;
  disclaimer: string;
}

export interface AnalyzeRequest {
  keystrokes: Keystroke[];
  baseline?: { sessions: ({ features: Features } | { keystrokes: Keystroke[] })[] };
}
