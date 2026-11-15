'use strict';


const { generateSession } = require('../fixtures/synthetic');
const { analyze } = require('../src/scoring');

const PROFILES = [
  { name: 'fast', dwellMean: 70, dwellJitter: 10, flightMean: 110, flightJitter: 20, pauseMs: 450 },
  { name: 'average', dwellMean: 95, dwellJitter: 15, flightMean: 160, flightJitter: 30, pauseMs: 700 },
  { name: 'slow', dwellMean: 140, dwellJitter: 25, flightMean: 260, flightJitter: 55, pauseMs: 1200 },
];

const SCENARIOS = [
  { name: 'ordinary', expected: null, change: () => ({}) },
  { name: 'longer_key_holds', expected: 'long_key_hold', change: () => ({ dwellScale: 1.8 }) },
  { name: 'four_second_pause', expected: 'long_sentence_pause', change: () => ({ pauseMs: 4000 }) },
  {
    name: 'uneven_typing',
    expected: 'uneven_typing_rhythm',
    change: (p) => ({ flightJitter: Math.round(p.flightJitter * 3.5) }),
  },
];

const PAUSE_WOBBLE = [0.9, 1.0, 1.1, 0.95, 1.05];

function baselineFor(profile, profileIndex) {
  return {
    sessions: PAUSE_WOBBLE.map((w, i) => ({
      keystrokes: generateSession({
        ...profile,
        seed: 9000 + profileIndex * 100 + i,
        pauseMs: Math.round(profile.pauseMs * w),
      }),
    })),
  };
}

function run(sessionsPerCell = 300) {
  const rows = [];
  PROFILES.forEach((profile, pi) => {
    const baseline = baselineFor(profile, pi);
    for (const scenario of SCENARIOS) {
      let expectedFired = 0;
      let unexpectedFired = 0;
      let exactMatch = 0;
      let scoreSum = 0;
      for (let seed = 1; seed <= sessionsPerCell; seed++) {
        const pauseMs = Math.round(profile.pauseMs * PAUSE_WOBBLE[seed % PAUSE_WOBBLE.length]);
        const keystrokes = generateSession({ ...profile, seed, pauseMs, ...scenario.change(profile) });
        const r = analyze({ keystrokes, baseline });
        const wanted = scenario.expected ? [scenario.expected] : [];
        if (scenario.expected && r.flags.includes(scenario.expected)) expectedFired++;
        if (r.flags.some((f) => f !== scenario.expected)) unexpectedFired++;
        if (r.flags.join() === wanted.join()) exactMatch++;
        scoreSum += r.readinessScore;
      }
      rows.push({
        profile: profile.name,
        scenario: scenario.name,
        sessions: sessionsPerCell,
        expectedFlag: scenario.expected,
        expectedFired,
        unexpectedFired,
        exactMatch,
        meanScore: Math.round((scoreSum / sessionsPerCell) * 10) / 10,
      });
    }
  });
  return rows;
}

function toMarkdown(rows) {
  const lines = [
    '| Profile | Scenario | Sessions | Expected flag fired | Sessions with an unexpected flag | Exact match | Mean score |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    const fired = r.expectedFlag ? `${r.expectedFired}/${r.sessions}` : 'n/a';
    lines.push(
      `| ${r.profile} | ${r.scenario} | ${r.sessions} | ${fired} | ${r.unexpectedFired}/${r.sessions} | ` +
        `${r.exactMatch}/${r.sessions} | ${r.meanScore} |`
    );
  }
  return lines.join('\n');
}

const SWEEPS = [
  { flag: 'long_key_hold', label: 'key holds x', sizes: [1.05, 1.1, 1.2, 1.3, 1.5], change: (p, x) => ({ dwellScale: x }) },
  {
    flag: 'long_sentence_pause',
    label: 'sentence pause x',
    sizes: [1.2, 1.4, 1.6, 2, 3],
    change: (p, x) => ({ pauseMs: Math.round(p.pauseMs * x) }),
  },
  {
    flag: 'uneven_typing_rhythm',
    label: 'flight jitter x',
    sizes: [1.1, 1.2, 1.4, 1.7, 2],
    change: (p, x) => ({ flightJitter: Math.round(p.flightJitter * x) }),
  },
];

function sweep(sessionsPerCell = 300) {
  const profile = PROFILES[1];
  const baseline = baselineFor(profile, 1);
  const rows = [];
  for (const s of SWEEPS) {
    for (const size of s.sizes) {
      let fired = 0;
      let scoreSum = 0;
      for (let seed = 1; seed <= sessionsPerCell; seed++) {
        const keystrokes = generateSession({ ...profile, seed, ...s.change(profile, size) });
        const r = analyze({ keystrokes, baseline });
        if (r.flags.includes(s.flag)) fired++;
        scoreSum += r.readinessScore;
      }
      rows.push({
        change: `${s.label}${size}`,
        flag: s.flag,
        sessions: sessionsPerCell,
        fired,
        meanScore: Math.round((scoreSum / sessionsPerCell) * 10) / 10,
      });
    }
  }
  return rows;
}

function sweepMarkdown(rows) {
  const lines = ['| Simulated change | Flag | Fired | Mean score |', '|---|---|---|---|'];
  for (const r of rows) lines.push(`| ${r.change} | ${r.flag} | ${r.fired}/${r.sessions} | ${r.meanScore} |`);
  return lines.join('\n');
}

if (require.main === module) {
  console.log(toMarkdown(run()));
  console.log();
  console.log(sweepMarkdown(sweep()));
}

module.exports = { run, sweep, toMarkdown, sweepMarkdown };
