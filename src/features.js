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

function collectSamples(keystrokes) {
  const dwells = [];
  const pauses = [];
  const flights = [];

  let boundaryDownMs = null;
  let prevDownMs = null;

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
      if (k.kind === 'space') continue;
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
