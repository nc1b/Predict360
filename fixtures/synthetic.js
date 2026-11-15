'use strict';


const SENTENCES = [
  [5, 2, 4, 3, 6, 4],
  [1, 4, 5, 2, 7, 3, 5],
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSession({
  seed,
  dwellMean = 95,
  dwellJitter = 15,
  dwellScale = 1,
  flightMean = 160,
  flightJitter = 30,
  pauseMs = 700,
  sentences = SENTENCES,
}) {
  const rand = mulberry32(seed);
  const keystrokes = [];
  let t = 0;

  const press = (kind) => {
    const dwellU = rand() * 2 - 1;
    const flightU = rand() * 2 - 1;
    const dwell = Math.round((dwellMean + dwellU * dwellJitter) * dwellScale);
    const flight = Math.round(flightMean + flightU * flightJitter);
    keystrokes.push({ kind, downMs: t, upMs: t + dwell });
    return flight;
  };

  sentences.forEach((words, s) => {
    words.forEach((length, w) => {
      for (let i = 0; i < length; i++) t += press('character');
      if (w < words.length - 1) t += press('space');
    });
    const endDown = t;
    const flightAfterEnd = press('sentence_end');
    if (s < sentences.length - 1) {
      t = endDown + flightAfterEnd;
      press('space');
      t = endDown + pauseMs;
    }
  });

  return keystrokes;
}

const BASELINE_SPECS = [
  { seed: 101, dwellMean: 93, pauseMs: 640 },
  { seed: 102, dwellMean: 95, pauseMs: 700 },
  { seed: 103, dwellMean: 97, pauseMs: 760 },
  { seed: 104, dwellMean: 94, pauseMs: 680 },
  { seed: 105, dwellMean: 96, pauseMs: 720 },
];

function baselineSessions() {
  return BASELINE_SPECS.map((spec) => ({ keystrokes: generateSession(spec) }));
}

const FIXTURE_SPECS = [
  {
    name: 'ordinary',
    label: 'Ordinary typing, no scripted change',
    options: { seed: 11 },
    expectedFlags: [],
  },
  {
    name: 'longer_key_holds',
    label: 'Every key held 1.8x longer',
    options: { seed: 11, dwellScale: 1.8 },
    expectedFlags: ['long_key_hold'],
  },
  {
    name: 'four_second_pause',
    label: 'Deliberate 4000 ms pause between sentences',
    options: { seed: 11, pauseMs: 4000 },
    expectedFlags: ['long_sentence_pause'],
  },
  {
    name: 'uneven_typing',
    label: 'Uneven within-sentence rhythm (flight jitter 30 -> 110 ms)',
    options: { seed: 11, flightJitter: 110 },
    expectedFlags: ['uneven_typing_rhythm'],
  },
  {
    name: 'distracted_pause',
    label: 'Confounder: typist distracted for 6500 ms between sentences',
    options: { seed: 23, pauseMs: 6500 },
    expectedFlags: ['long_sentence_pause'],
    confounder: true,
  },
];

function fixtures() {
  return FIXTURE_SPECS.map((spec) => ({
    name: spec.name,
    label: spec.label,
    expectedFlags: spec.expectedFlags,
    confounder: Boolean(spec.confounder),
    keystrokes: generateSession(spec.options),
  }));
}

function fixture(name) {
  const found = fixtures().find((f) => f.name === name);
  if (!found) throw new Error(`Unknown fixture: ${name}`);
  return found;
}

function requestFor(name) {
  return { keystrokes: fixture(name).keystrokes, baseline: { sessions: baselineSessions() } };
}

module.exports = { generateSession, baselineSessions, fixtures, fixture, requestFor, SENTENCES };
