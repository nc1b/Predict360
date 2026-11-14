'use strict';

const { MIN_SAMPLES } = require('./config');

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function populationStdDev(values) {
  if (values.length === 0) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function round2(value) {
  return value === null ? null : Math.round(value * 100) / 100;
}

function feature(name, value, samples) {
  return {
    value: round2(value),
    samples,
    minSamples: MIN_SAMPLES[name],
    sufficient: samples >= MIN_SAMPLES[name],
  };
}

/**
 * Collect the raw samples behind the three features from one ordered session.
 *
 * Rules (see README "Feature rules"):
 * - Dwell: upMs - downMs for every non-edit keystroke.
 * - Sentence pause: keydown of a sentence_end to keydown of the next `character`.
 *   Spaces and edits in between are skipped. A run of sentence_end keys ("?!")
 *   measures from the last one. A sentence_end with no later character adds nothing.
 * - Flight: keydown-to-keydown intervals between adjacent non-edit keystrokes
 *   inside a sentence. The chain ends at the sentence_end (inclusive) and restarts
 *   at the first character of the next sentence, so the boundary gap is never a
 *   flight interval. An edit breaks the chain instead of being bridged.
 */
function collectSamples(keystrokes) {
  const dwells = [];
  const pauses = [];
  const flights = [];

  let boundaryDownMs = null; // keydown of the pending sentence_end, if any
  let prevDownMs = null; // previous keydown in the current within-sentence chain

  for (const k of keystrokes) {
    if (k.kind === 'edit') {
      prevDownMs = null;
      continue;
    }

    dwells.push(k.upMs - k.downMs);

    if (k.kind === 'sentence_end') {
      if (prevDownMs !== null) flights.push(k.downMs - prevDownMs);
      prevDownMs = null;
      boundaryDownMs = k.downMs;
      continue;
    }

    if (boundaryDownMs !== null) {
      if (k.kind === 'space') continue; // still in the gap between sentences
      pauses.push(k.downMs - boundaryDownMs);
      boundaryDownMs = null;
      prevDownMs = k.downMs;
      continue;
    }

    if (prevDownMs !== null) flights.push(k.downMs - prevDownMs);
    prevDownMs = k.downMs;
  }

  return { dwells, pauses, flights };
}

function extractFeatures(keystrokes) {
  const { dwells, pauses, flights } = collectSamples(keystrokes);
  return {
    dwellMs: feature('dwellMs', median(dwells), dwells.length),
    sentencePauseMs: feature('sentencePauseMs', median(pauses), pauses.length),
    flightVolatilityMs: feature('flightVolatilityMs', populationStdDev(flights), flights.length),
  };
}

module.exports = { extractFeatures, collectSamples, median, populationStdDev, round2 };
