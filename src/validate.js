'use strict';

const { KINDS, FEATURES, MIN_SAMPLES, LIMITS } = require('./config');

const EVENT_KEYS = ['kind', 'downMs', 'upMs'];
const FEATURE_KEYS = ['value', 'samples', 'minSamples', 'sufficient'];

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function unknownKeys(obj, allowed) {
  return Object.keys(obj).filter((k) => !allowed.includes(k));
}

class Collector {
  constructor() {
    this.errors = [];
    this.truncated = false;
  }
  get full() {
    return this.errors.length >= LIMITS.maxErrorDetails;
  }
  add(path, message) {
    if (this.full) {
      this.truncated = true;
      return;
    }
    this.errors.push({ path, message });
  }
}

function validateKeystrokes(keystrokes, path, c) {
  if (!Array.isArray(keystrokes)) {
    c.add(path, 'Must be an array of keystroke objects ordered by downMs.');
    return;
  }
  if (keystrokes.length === 0) {
    c.add(path, 'Must contain at least 1 keystroke.');
    return;
  }
  if (keystrokes.length > LIMITS.maxEvents) {
    c.add(path, `Has ${keystrokes.length} events; the maximum is ${LIMITS.maxEvents}.`);
    return;
  }

  let prevDown = -Infinity;
  for (let i = 0; i < keystrokes.length && !c.truncated; i++) {
    const k = keystrokes[i];
    const p = `${path}[${i}]`;
    if (!isPlainObject(k)) {
      c.add(p, 'Must be an object like {"kind":"character","downMs":0,"upMs":95}.');
      continue;
    }
    const extra = unknownKeys(k, EVENT_KEYS);
    if (extra.length > 0) {
      c.add(
        p,
        `Unexpected field(s): ${extra.join(', ')}. Only kind, downMs and upMs are accepted; ` +
          'do not send key values, text or identifiers.'
      );
    }
    if (!KINDS.includes(k.kind)) {
      c.add(`${p}.kind`, `Must be one of: ${KINDS.join(', ')}.`);
    }
    let timesOk = true;
    for (const field of ['downMs', 'upMs']) {
      const v = k[field];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        c.add(`${p}.${field}`, 'Must be a finite number of milliseconds relative to session start.');
        timesOk = false;
      } else if (v < 0 || v > LIMITS.maxTimestampMs) {
        c.add(`${p}.${field}`, `Must be between 0 and ${LIMITS.maxTimestampMs}.`);
        timesOk = false;
      }
    }
    if (!timesOk) continue;
    if (k.upMs < k.downMs) {
      c.add(`${p}.upMs`, `upMs (${k.upMs}) must be >= downMs (${k.downMs}).`);
    }
    if (k.downMs < prevDown) {
      c.add(
        `${p}.downMs`,
        `downMs (${k.downMs}) is earlier than the previous keystroke's downMs (${prevDown}); ` +
          'sort events by downMs. Overlapping holds are fine.'
      );
    }
    prevDown = k.downMs;
  }
}

function validateFeatureSummary(features, path, c) {
  if (!isPlainObject(features)) {
    c.add(path, 'Must be the `features` object returned by an earlier /api/analyze call.');
    return;
  }
  const extra = unknownKeys(features, FEATURES);
  if (extra.length > 0) c.add(path, `Unexpected field(s): ${extra.join(', ')}.`);
  for (const name of FEATURES) {
    const f = features[name];
    const p = `${path}.${name}`;
    if (!isPlainObject(f)) {
      c.add(p, 'Required object like {"value":95,"samples":64}.');
      continue;
    }
    const extraF = unknownKeys(f, FEATURE_KEYS);
    if (extraF.length > 0) c.add(p, `Unexpected field(s): ${extraF.join(', ')}.`);
    if (f.value !== null && (typeof f.value !== 'number' || !Number.isFinite(f.value) || f.value < 0 || f.value > LIMITS.maxTimestampMs)) {
      c.add(`${p}.value`, `Must be a number of milliseconds between 0 and ${LIMITS.maxTimestampMs}, or null.`);
    }
    if (!Number.isInteger(f.samples) || f.samples < 0 || f.samples > LIMITS.maxEvents) {
      c.add(`${p}.samples`, `Must be an integer between 0 and ${LIMITS.maxEvents}.`);
    } else if ((f.samples === 0) !== (f.value === null)) {
      c.add(`${p}.value`, 'Must be null exactly when samples is 0.');
    }
    if (f.minSamples !== undefined && f.minSamples !== MIN_SAMPLES[name]) {
      c.add(`${p}.minSamples`, `Must be ${MIN_SAMPLES[name]} when supplied.`);
    }
    if (f.sufficient !== undefined && f.sufficient !== (f.samples >= MIN_SAMPLES[name])) {
      c.add(`${p}.sufficient`, 'Must agree with samples and the minimum sample count.');
    }
  }
}

function validateBaseline(baseline, c) {
  if (!isPlainObject(baseline)) {
    c.add('baseline', 'Must be an object like {"sessions":[...]}, or omitted.');
    return;
  }
  const extra = unknownKeys(baseline, ['sessions']);
  if (extra.length > 0) c.add('baseline', `Unexpected field(s): ${extra.join(', ')}.`);
  if (!Array.isArray(baseline.sessions)) {
    c.add('baseline.sessions', 'Must be an array of earlier check-ins.');
    return;
  }
  if (baseline.sessions.length > LIMITS.maxBaselineSessions) {
    c.add(
      'baseline.sessions',
      `Has ${baseline.sessions.length} sessions; the maximum is ${LIMITS.maxBaselineSessions}.`
    );
    return;
  }
  baseline.sessions.forEach((s, i) => {
    if (c.truncated) return;
    const p = `baseline.sessions[${i}]`;
    if (!isPlainObject(s)) {
      c.add(p, 'Must be an object with either `keystrokes` or `features`.');
      return;
    }
    const extraS = unknownKeys(s, ['keystrokes', 'features']);
    if (extraS.length > 0) c.add(p, `Unexpected field(s): ${extraS.join(', ')}.`);
    const hasK = s.keystrokes !== undefined;
    const hasF = s.features !== undefined;
    if (hasK === hasF) {
      c.add(p, 'Provide exactly one of `keystrokes` or `features`.');
      return;
    }
    if (hasK) validateKeystrokes(s.keystrokes, `${p}.keystrokes`, c);
    else validateFeatureSummary(s.features, `${p}.features`, c);
  });
}

function validateAnalyzeRequest(body) {
  const c = new Collector();
  if (!isPlainObject(body)) {
    c.add('', 'Request body must be a JSON object with a `keystrokes` array.');
    return c;
  }
  const extra = unknownKeys(body, ['keystrokes', 'baseline']);
  if (extra.length > 0) {
    c.add(
      '',
      `Unexpected field(s): ${extra.join(', ')}. Only keystrokes and baseline are accepted; ` +
        'do not send journal text or user identifiers.'
    );
  }
  if (body.keystrokes === undefined) {
    c.add('keystrokes', 'Required: an ordered array of {kind, downMs, upMs}.');
  } else {
    validateKeystrokes(body.keystrokes, 'keystrokes', c);
  }
  if (body.baseline !== undefined && body.baseline !== null) {
    validateBaseline(body.baseline, c);
  }
  return c;
}

module.exports = { validateAnalyzeRequest };
