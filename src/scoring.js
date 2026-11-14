'use strict';

const {
  FEATURES,
  MIN_SAMPLES,
  MIN_BASELINE_SESSIONS,
  SCORING,
  STATUS_BANDS,
  DISCLAIMER,
} = require('./config');
const { extractFeatures, median, round2 } = require('./features');

/**
 * Build a baseline from prior sessions' feature objects
 * ({ dwellMs: { value, samples }, ... }). For each feature, the baseline is the
 * median of the values from sessions that met that feature's minimum samples.
 */
function buildBaseline(sessionFeatures) {
  const features = {};
  for (const name of FEATURES) {
    const values = sessionFeatures
      .map((f) => f[name])
      .filter((f) => f && typeof f.value === 'number' && f.samples >= MIN_SAMPLES[name])
      .map((f) => f.value);
    const value = round2(median(values));
    features[name] = {
      value,
      sessionsUsed: values.length,
      minSessions: MIN_BASELINE_SESSIONS,
      valid: values.length >= MIN_BASELINE_SESSIONS && value > 0,
    };
  }
  return { sessionsProvided: sessionFeatures.length, features };
}

function pointsFor(name, ratio) {
  const { tolerance, fullAt, maxPoints } = SCORING[name];
  if (ratio <= tolerance) return 0;
  if (ratio >= fullAt) return maxPoints;
  return Math.round(((ratio - tolerance) / (fullAt - tolerance)) * maxPoints * 10) / 10;
}

function compare(name, current, base) {
  if (!base || !base.valid || current.value === null) return null;
  const ratio = round2(current.value / base.value);
  const pointsDeducted = current.sufficient ? pointsFor(name, ratio) : 0;
  return {
    sessionMs: current.value,
    baselineMs: base.value,
    deltaMs: round2(current.value - base.value),
    ratio,
    pointsDeducted,
    flag: pointsDeducted > 0 ? SCORING[name].flag : null,
  };
}

/**
 * Score one session's features against a baseline (or null).
 * Only increases are penalised: longer holds, longer sentence pause, more uneven rhythm.
 */
function scoreSession(features, baseline) {
  const reasons = [];

  for (const name of FEATURES) {
    const f = features[name];
    if (!f.sufficient) {
      reasons.push(`${name} has ${f.samples} sample(s); at least ${f.minSamples} required.`);
    }
  }
  const samplesOk = reasons.length === 0;

  let baselineOk = false;
  if (!baseline) {
    reasons.push('No baseline supplied; send baseline.sessions with earlier check-ins.');
  } else {
    baselineOk = true;
    for (const name of FEATURES) {
      const b = baseline.features[name];
      if (!b.valid) {
        baselineOk = false;
        reasons.push(
          `Baseline for ${name} has ${b.sessionsUsed} usable session(s); at least ${b.minSessions} required.`
        );
      }
    }
  }

  const comparisons = {};
  for (const name of FEATURES) {
    comparisons[name] = compare(name, features[name], baseline && baseline.features[name]);
  }

  const drivers = FEATURES.filter((name) => comparisons[name] && comparisons[name].flag)
    .map((name) => ({
      feature: name,
      flag: comparisons[name].flag,
      pointsDeducted: comparisons[name].pointsDeducted,
      ratio: comparisons[name].ratio,
    }))
    .sort((a, b) => b.pointsDeducted - a.pointsDeducted);

  let readinessScore = null;
  let status;
  if (!samplesOk) {
    status = 'insufficient_samples';
  } else if (!baseline) {
    status = 'baseline_missing';
  } else if (!baselineOk) {
    status = 'baseline_insufficient';
  } else {
    const total = drivers.reduce((sum, d) => sum + d.pointsDeducted, 0);
    readinessScore = Math.max(0, Math.min(100, Math.round(100 - total)));
    status = STATUS_BANDS.find((band) => readinessScore >= band.min).status;
  }

  return {
    readinessScore,
    status,
    reasons,
    features,
    baseline: baseline || null,
    comparisons,
    drivers,
    flags: drivers.map((d) => d.flag),
    experimental: true,
    disclaimer: DISCLAIMER,
  };
}

/** Full pipeline for a validated request body. */
function analyze(body) {
  const features = extractFeatures(body.keystrokes);
  let baseline = null;
  if (body.baseline && Array.isArray(body.baseline.sessions)) {
    const sessionFeatures = body.baseline.sessions.map((s) =>
      s.keystrokes ? extractFeatures(s.keystrokes) : s.features
    );
    baseline = buildBaseline(sessionFeatures);
  }
  return scoreSession(features, baseline);
}

/** Naive comparator used for the judging evidence: never detects anything. */
function naiveAnalyze() {
  return { readinessScore: 100, status: 'near_baseline', flags: [] };
}

module.exports = { analyze, scoreSession, buildBaseline, pointsFor, naiveAnalyze };
