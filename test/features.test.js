'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractFeatures, collectSamples } = require('../src/features');
const { fixture, generateSession } = require('../fixtures/synthetic');

const k = (kind, downMs, upMs) => ({ kind, downMs, upMs });
const feats = (name) => extractFeatures(fixture(name).keystrokes);

test('fixtures are reproducible', () => {
  assert.deepEqual(generateSession({ seed: 11 }), generateSession({ seed: 11 }));
  assert.notDeepEqual(generateSession({ seed: 11 }), generateSession({ seed: 12 }));
});

test('ordinary fixture yields all three features with enough samples', () => {
  const f = feats('ordinary');
  assert.equal(f.dwellMs.samples, 65);
  assert.equal(f.sentencePauseMs.samples, 1);
  assert.equal(f.flightVolatilityMs.samples, 62);
  assert.equal(f.sentencePauseMs.value, 700);
  for (const name of Object.keys(f)) assert.equal(f[name].sufficient, true);
});

test('longer key holds raise dwell only', () => {
  const base = feats('ordinary');
  const f = feats('longer_key_holds');
  assert.ok(f.dwellMs.value > base.dwellMs.value * 1.5);
  assert.deepEqual(f.sentencePauseMs, base.sentencePauseMs);
  assert.deepEqual(f.flightVolatilityMs, base.flightVolatilityMs);
});

test('a four-second sentence pause raises the pause and leaves volatility unchanged', () => {
  const base = feats('ordinary');
  const f = feats('four_second_pause');
  assert.equal(f.sentencePauseMs.value, 4000);
  assert.deepEqual(f.flightVolatilityMs, base.flightVolatilityMs);
  assert.deepEqual(f.dwellMs, base.dwellMs);
});

test('uneven within-sentence typing raises volatility only', () => {
  const base = feats('ordinary');
  const f = feats('uneven_typing');
  assert.ok(f.flightVolatilityMs.value > base.flightVolatilityMs.value * 2);
  assert.deepEqual(f.dwellMs, base.dwellMs);
  assert.deepEqual(f.sentencePauseMs, base.sentencePauseMs);
});

test('hand-computed example: median dwell, pause, population std dev', () => {
  const session = [
    k('character', 0, 80),
    k('character', 100, 200),
    k('space', 300, 420),
    k('character', 400, 490),
    k('sentence_end', 600, 700),
    k('space', 750, 800),
    k('character', 1600, 1700),
    k('character', 1700, 1790),
  ];
  const s = collectSamples(session);
  assert.deepEqual(s.flights, [100, 200, 100, 200, 100]);
  assert.deepEqual(s.pauses, [1000]);
  const f = extractFeatures(session);
  assert.equal(f.dwellMs.value, 95);
  assert.equal(f.sentencePauseMs.value, 1000);
  assert.equal(f.flightVolatilityMs.value, 48.99);
});

test('final punctuation with no following sentence contributes no pause sample', () => {
  const one = extractFeatures([k('character', 0, 90), k('character', 150, 240), k('sentence_end', 300, 390)]);
  assert.equal(one.sentencePauseMs.samples, 0);
  assert.equal(one.sentencePauseMs.value, null);
  assert.equal(one.sentencePauseMs.sufficient, false);

  const trailing = extractFeatures([
    k('character', 0, 90),
    k('sentence_end', 300, 390),
    k('space', 500, 580),
    k('edit', 700, 780),
  ]);
  assert.equal(trailing.sentencePauseMs.samples, 0);
});

test('pause skips spaces and edits and ends at the first typed character', () => {
  const s = collectSamples([
    k('character', 0, 90),
    k('sentence_end', 100, 190),
    k('space', 250, 330),
    k('edit', 400, 480),
    k('space', 500, 580),
    k('character', 900, 990),
    k('character', 1000, 1090),
  ]);
  assert.deepEqual(s.pauses, [800]);
  assert.deepEqual(s.flights, [100, 100]);
});

test('multiple pauses use the median', () => {
  const session = [];
  let t = 0;
  for (const pause of [500, 3000, 900]) {
    session.push(k('character', t, t + 90));
    session.push(k('sentence_end', t + 100, t + 190));
    t += 100 + pause;
  }
  session.push(k('character', t, t + 90));
  const f = extractFeatures(session);
  assert.equal(f.sentencePauseMs.samples, 3);
  assert.equal(f.sentencePauseMs.value, 900);
});

test('overlapping key holds are measured normally', () => {
  const f = extractFeatures([k('character', 0, 160), k('character', 100, 220), k('character', 200, 330)]);
  assert.equal(f.dwellMs.value, 130);
  assert.equal(f.dwellMs.samples, 3);
  assert.equal(f.flightVolatilityMs.value, 0);
  assert.equal(f.flightVolatilityMs.samples, 2);
});

test('edits are excluded from dwell and break the flight chain', () => {
  const s = collectSamples([
    k('character', 0, 90),
    k('character', 100, 190),
    k('edit', 900, 1500),
    k('character', 2000, 2090),
    k('character', 2100, 2190),
  ]);
  assert.deepEqual(s.dwells, [90, 90, 90, 90]);
  assert.deepEqual(s.flights, [100, 100]);
});
