'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze, pointsFor, naiveAnalyze, scoreSession, buildBaseline } = require('../src/scoring');
const { extractFeatures } = require('../src/features');
const { fixture, requestFor, baselineSessions, generateSession } = require('../fixtures/synthetic');
const { evaluate } = require('../scripts/evaluate');

test('ordinary session scores 100 with no flags', () => {
  const r = analyze(requestFor('ordinary'));
  assert.equal(r.readinessScore, 100);
  assert.equal(r.status, 'near_baseline');
  assert.deepEqual(r.flags, []);
  assert.deepEqual(r.drivers, []);
  assert.equal(r.experimental, true);
  assert.match(r.disclaimer, /not medical advice/);
});

test('each scripted change produces exactly its expected flag and lowers the score', () => {
  for (const [name, flag, feature] of [
    ['longer_key_holds', 'long_key_hold', 'dwellMs'],
    ['four_second_pause', 'long_sentence_pause', 'sentencePauseMs'],
    ['uneven_typing', 'uneven_typing_rhythm', 'flightVolatilityMs'],
  ]) {
    const r = analyze(requestFor(name));
    assert.deepEqual(r.flags, [flag], name);
    assert.ok(r.readinessScore < 100, name);
    assert.equal(r.drivers[0].feature, feature);
    assert.equal(r.comparisons[feature].flag, flag);
    assert.ok(r.comparisons[feature].ratio > 1);
  }
});

test('points are linear between tolerance and fullAt', () => {
  assert.equal(pointsFor('sentencePauseMs', 1.5), 0);
  assert.equal(pointsFor('sentencePauseMs', 2.75), 17.5);
  assert.equal(pointsFor('sentencePauseMs', 4), 35);
  assert.equal(pointsFor('sentencePauseMs', 40), 35);
  assert.equal(pointsFor('dwellMs', 0.5), 0);
});

test('deductions use the original ratio, not the rounded display ratio', () => {
  const features = extractFeatures(fixture('ordinary').keystrokes);
  features.dwellMs.value = 115.4;
  const prior = { ...features, dwellMs: { ...features.dwellMs, value: 100 } };
  const result = scoreSession(features, buildBaseline([prior, prior, prior]));
  assert.equal(result.comparisons.dwellMs.ratio, 1.15);
  assert.equal(result.comparisons.dwellMs.pointsDeducted, 0.2);
  assert.deepEqual(result.flags, ['long_key_hold']);
});

test('a zero-variation baseline scores unchanged rhythm and serializes an increase safely', () => {
  const keystrokes = generateSession({ seed: 11, flightJitter: 0 });
  const features = extractFeatures(keystrokes);
  assert.equal(features.flightVolatilityMs.value, 0);
  const baseline = { sessions: Array.from({ length: 3 }, () => ({ features })) };
  const unchanged = analyze({ keystrokes, baseline });
  assert.equal(unchanged.readinessScore, 100);
  assert.equal(unchanged.comparisons.flightVolatilityMs.ratio, 1);
  const changed = analyze({ keystrokes: fixture('ordinary').keystrokes, baseline });
  assert.equal(changed.readinessScore, 70);
  assert.equal(changed.comparisons.flightVolatilityMs.ratio, null);
  assert.deepEqual(changed.flags, ['uneven_typing_rhythm']);
  assert.deepEqual(JSON.parse(JSON.stringify(changed)), changed);
});

test('score clamps to 0 when all three features are far above baseline', () => {
  const keystrokes = generateSession({ seed: 11, dwellScale: 3, pauseMs: 9000, flightJitter: 150 });
  const r = analyze({ keystrokes, baseline: { sessions: baselineSessions() } });
  assert.equal(r.readinessScore, 0);
  assert.equal(r.status, 'large_deviation');
  assert.equal(r.flags.length, 3);
});

test('missing baseline returns metrics, a clear status and a null score', () => {
  const r = analyze({ keystrokes: fixture('ordinary').keystrokes });
  assert.equal(r.readinessScore, null);
  assert.equal(r.status, 'baseline_missing');
  assert.equal(r.baseline, null);
  assert.equal(r.features.dwellMs.value, 95);
  assert.equal(r.comparisons.dwellMs, null);
  assert.ok(r.reasons.length > 0);
});

test('baseline with too few sessions returns baseline_insufficient', () => {
  const r = analyze({
    keystrokes: fixture('ordinary').keystrokes,
    baseline: { sessions: baselineSessions().slice(0, 2) },
  });
  assert.equal(r.readinessScore, null);
  assert.equal(r.status, 'baseline_insufficient');
  assert.equal(r.baseline.features.dwellMs.sessionsUsed, 2);
});

test('baseline sessions that are too short do not count', () => {
  const short = { keystrokes: generateSession({ seed: 1, sentences: [[3], [2]] }) };
  const r = analyze({
    keystrokes: fixture('ordinary').keystrokes,
    baseline: { sessions: [...baselineSessions().slice(0, 2), short, short] },
  });
  assert.equal(r.status, 'baseline_insufficient');
  assert.equal(r.baseline.features.dwellMs.sessionsUsed, 2);
  assert.equal(r.baseline.features.sentencePauseMs.sessionsUsed, 4);
});

test('short session returns available metrics, insufficient_samples and a null score', () => {
  const keystrokes = generateSession({ seed: 5, sentences: [[4, 3], [2]] });
  const r = analyze({ keystrokes, baseline: { sessions: baselineSessions() } });
  assert.equal(r.readinessScore, null);
  assert.equal(r.status, 'insufficient_samples');
  assert.equal(r.features.dwellMs.sufficient, false);
  assert.equal(typeof r.features.dwellMs.value, 'number');
  assert.equal(r.features.sentencePauseMs.sufficient, true);
  assert.deepEqual(r.flags, []);
});

test('single sentence ending in punctuation cannot be scored (no pause sample)', () => {
  const keystrokes = generateSession({ seed: 5, sentences: [[5, 4, 6, 3, 5, 4]] });
  const r = analyze({ keystrokes, baseline: { sessions: baselineSessions() } });
  assert.equal(r.status, 'insufficient_samples');
  assert.equal(r.features.sentencePauseMs.samples, 0);
  assert.equal(r.features.dwellMs.sufficient, true);
});

test('baseline given as stored feature summaries matches raw keystroke baseline', () => {
  const raw = analyze(requestFor('four_second_pause'));
  const summaries = baselineSessions().map((s) => ({ features: extractFeatures(s.keystrokes) }));
  const stored = analyze({
    keystrokes: fixture('four_second_pause').keystrokes,
    baseline: { sessions: summaries },
  });
  assert.deepEqual(stored, raw);
});

test('evaluation: algorithm matches every script, naive comparator misses every change', () => {
  const rows = evaluate();
  for (const row of rows) {
    assert.equal(row.algorithm.matchesScript, true, row.name);
    assert.deepEqual(row.naive, {
      readinessScore: 100,
      flags: [],
      matchesScript: row.expectedFlags.length === 0,
    });
  }
  assert.deepEqual(naiveAnalyze().flags, []);
});

test('confounder: a distracted pause produces the same flag as a deliberate pause', () => {
  const deliberate = analyze(requestFor('four_second_pause'));
  const distracted = analyze(requestFor('distracted_pause'));
  assert.deepEqual(distracted.flags, deliberate.flags);
  assert.deepEqual(distracted.flags, ['long_sentence_pause']);
});
