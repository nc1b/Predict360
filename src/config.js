'use strict';


const KINDS = ['character', 'space', 'sentence_end', 'edit'];

const FEATURES = ['dwellMs', 'sentencePauseMs', 'flightVolatilityMs'];

const MIN_SAMPLES = {
  dwellMs: 20,
  sentencePauseMs: 1,
  flightVolatilityMs: 20,
};

const MIN_BASELINE_SESSIONS = 3;

const SCORING = {
  dwellMs: { flag: 'long_key_hold', tolerance: 1.15, fullAt: 2.0, maxPoints: 35 },
  sentencePauseMs: { flag: 'long_sentence_pause', tolerance: 1.5, fullAt: 4.0, maxPoints: 35 },
  flightVolatilityMs: { flag: 'uneven_typing_rhythm', tolerance: 1.25, fullAt: 3.0, maxPoints: 30 },
};

const STATUS_BANDS = [
  { min: 80, status: 'near_baseline' },
  { min: 50, status: 'some_deviation' },
  { min: 0, status: 'large_deviation' },
];

const LIMITS = {
  maxBodyBytes: 256 * 1024,
  maxExplainBodyBytes: 32 * 1024,
  maxEvents: 5000,
  maxBaselineSessions: 30,
  maxTimestampMs: 60 * 60 * 1000,
  maxErrorDetails: 20,
};

const DISCLAIMER =
  'Experimental comparison with your usual typing on synthetic-tested timing features. ' +
  'This project is a prototype and is not medical advice.';

module.exports = {
  KINDS,
  FEATURES,
  MIN_SAMPLES,
  MIN_BASELINE_SESSIONS,
  SCORING,
  STATUS_BANDS,
  LIMITS,
  DISCLAIMER,
};
