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

function buildBaseline(sessionFeatures) {
  const features = {};
  for (const name of FEATURES) {
    const values = sessionFeatures
      .map((f) => f[name])
      .filter((f) => f && Number.isFinite(f.value) && f.value >= 0 && f.samples >= MIN_SAMPLES[name])
      .map((f) => f.value);
    const value = round2(median(values));
    features[name] = {
      value,
      sessionsUsed: values.length,
      minSessions: MIN_BASELINE_SESSIONS,
      valid: values.length >= MIN_BASELINE_SESSIONS && value !== null,
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
  const rawRatio = base.value === 0 ? (current.value === 0 ? 1 : Infinity) : current.value / base.value;
  const ratio = Number.isFinite(rawRatio) ? round2(rawRatio) : null;
  const pointsDeducted = current.sufficient ? pointsFor(name, rawRatio) : 0;
  return {
    sessionMs: current.value,
    baselineMs: base.value,
    deltaMs: round2(current.value - base.value),
    ratio,
    pointsDeducted,
    flag: pointsDeducted > 0 ? SCORING[name].flag : null,
  };
}

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

function naiveAnalyze() {
  return { readinessScore: 100, status: 'near_baseline', flags: [] };
}

module.exports = { analyze, scoreSession, buildBaseline, pointsFor, naiveAnalyze };
