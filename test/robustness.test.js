'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { run, sweep } = require('../scripts/robustness');
const { validateAnalyzeRequest } = require('../src/validate');
const { generateSession } = require('../fixtures/synthetic');

test('across fast, average and slow synthetic typists every session matches its script', () => {
  const rows = run(100);
  assert.equal(rows.length, 12);
  for (const r of rows) {
    assert.equal(r.exactMatch, r.sessions, `${r.profile}/${r.scenario}`);
    assert.equal(r.unexpectedFired, 0, `${r.profile}/${r.scenario}`);
  }
});

test('sensitivity: small changes stay under the thresholds, large ones are flagged', () => {
  const rows = sweep(100);
  const fired = (change) => rows.find((r) => r.change === change).fired;
  assert.equal(fired('key holds x1.05'), 0);
  assert.equal(fired('key holds x1.5'), 100);
  assert.equal(fired('sentence pause x1.2'), 0);
  assert.equal(fired('sentence pause x3'), 100);
  assert.equal(fired('flight jitter x2'), 100);
});

test('every generated session passes request validation', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const keystrokes = generateSession({ seed, dwellScale: 1 + (seed % 5), flightJitter: 150 });
    assert.deepEqual(validateAnalyzeRequest({ keystrokes }).errors, [], `seed ${seed}`);
  }
});
