'use strict';

const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { generateSession } = require('../fixtures/synthetic');
const { extractFeatures } = require('../src/features');
const { buildBaseline, analyze } = require('../src/scoring');
const { timingInputs, predictTiming } = require('../src/typing-model');

function random(seed) {
  let value = seed;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function examples(profileStart, profileCount) {
  const rows = [];
  for (let id = profileStart; id < profileStart + profileCount; id++) {
    const draw = random(62237 + id * 31337);
    const profile = {
      dwellMean: 60 + 95 * draw(),
      dwellJitter: 8 + 17 * draw(),
      flightMean: 115 + 175 * draw(),
      flightJitter: 15 + 45 * draw(),
      pauseMs: 470 + 1000 * draw(),
    };
    function session(index, shift) {
      const options = {
        ...profile,
        seed: 50000 + id * 1000 + index,
        dwellScale: 0.91 + 0.18 * draw(),
        pauseMs: Math.round(profile.pauseMs * (0.82 + 0.36 * draw())),
        flightJitter: profile.flightJitter * (0.86 + 0.28 * draw()),
      };
      const factor = 1.15 + 0.85 * draw();
      if (shift === 0) options.dwellScale *= factor;
      if (shift === 1) options.pauseMs = Math.round(options.pauseMs * factor);
      if (shift === 2) options.flightJitter *= factor;
      return generateSession(options);
    }
    const sessions = Array.from({ length: 5 }, (_, i) => ({ features: extractFeatures(session(i, null)) }));
    const baseline = buildBaseline(sessions.map(({ features }) => features));
    for (let i = 0; i < 60; i++) {
      const change = i % 2 === 1;
      const shift = change ? Math.floor(i / 2) % 3 : null;
      const keystrokes = session(i + 5, shift);
      const features = extractFeatures(keystrokes);
      const ruleFlags = analyze({ keystrokes, baseline: { sessions } }).flags.length > 0;
      rows.push({ profile: id, features: timingInputs(features, baseline), change, shift, keystrokes, sessions, ruleFlags });
    }
  }
  return rows;
}

function fit(rows) {
  const weights = [0, 0, 0, 0];
  for (let step = 0; step < 2400; step++) {
    const gradient = [0, 0, 0, 0];
    for (const row of rows) {
      const [hold, pause, rhythm] = row.features;
      const logit = weights[0] + weights[1] * hold + weights[2] * pause + weights[3] * rhythm;
      const error = 1 / (1 + Math.exp(-logit)) - Number(row.change);
      gradient[0] += error;
      gradient[1] += error * hold;
      gradient[2] += error * pause;
      gradient[3] += error * rhythm;
    }
    weights[0] -= gradient[0] / rows.length;
    for (let i = 1; i < weights.length; i++) {
      weights[i] -= gradient[i] / rows.length + 0.001 * weights[i];
    }
  }
  return weights.map((weight) => Number(weight.toFixed(8)));
}

function measure(rows, predict) {
  const counts = { trueNegatives: 0, falsePositives: 0, falseNegatives: 0, truePositives: 0 };
  for (const row of rows) {
    const flagged = predict(row.features, row) === 'different';
    const key = row.change
      ? (flagged ? 'truePositives' : 'falseNegatives')
      : (flagged ? 'falsePositives' : 'trueNegatives');
    counts[key]++;
  }
  return counts;
}

const trainingProfiles = 12;
const testProfiles = 6;
const train = examples(0, trainingProfiles);
const test = examples(trainingProfiles, testProfiles);
const weights = fit(train);
const report = {
  method: 'Logistic regression trained on generated timing sessions',
  trainingProfiles,
  testProfiles,
  trainingSessions: train.length,
  testSessions: test.length,
  weights,
  inputs: 'Increase over the personal baseline, max(0, log(1 + current) - log(1 + baseline)), for key hold, sentence pause and rhythm',
  caveat: 'Simulated typists only. The scripted changes (1.15x to 2x) come from the same simulator that generated the baselines, so this is a sanity test, not evidence on real people.',
  baseline: measure(test, () => 'usual'),
  ruleBaseline: measure(test, (_, row) => (row.ruleFlags ? 'different' : 'usual')),
  model: measure(test, (features) => predictTiming(features, weights)),
  byProfile: Array.from({ length: testProfiles }, (_, i) => ({
    profile: i + 1,
    ...measure(test.filter((row) => row.profile === trainingProfiles + i), (features) => predictTiming(features, weights)),
  })),
};

writeFileSync(join(__dirname, '../research/typing-model.json'), JSON.stringify(report, null, 2) + '\n');
const missed = test.find(({ shift, features }) => shift === 0 && predictTiming(features, weights) === 'usual')
  || test.find(({ change, features }) => change && predictTiming(features, weights) === 'usual');
if (!missed) throw new Error('The held-out example must show a missed change.');
console.error(`Missed example: shift ${missed.shift}`);
const example = { keystrokes: missed.keystrokes, baseline: { sessions: missed.sessions } };
writeFileSync(join(__dirname, '../fixtures/json/held_out_missed_change.request.json'), JSON.stringify(example, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));

