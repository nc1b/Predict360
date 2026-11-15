'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { LIMITS } = require('../src/config');
const { requestFor, fixture } = require('../fixtures/synthetic');

const logs = [];
let server;
let base;

test.before(async () => {
  const app = createApp({ log: (line) => logs.push(line) });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

async function post(body, { raw = false, headers = { 'Content-Type': 'application/json' } } = {}) {
  const res = await fetch(`${base}/api/analyze`, {
    method: 'POST',
    headers,
    body: raw ? body : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

const key = (kind, downMs, upMs) => ({ kind, downMs, upMs });

test('GET /health', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('POST /api/analyze scores a fixture', async () => {
  const { status, json } = await post(requestFor('four_second_pause'));
  assert.equal(status, 200);
  assert.equal(json.readinessScore, 65);
  assert.equal(json.status, 'some_deviation');
  assert.equal(json.typingPattern, 'different');
  assert.deepEqual(json.flags, ['long_sentence_pause']);
  assert.equal(json.features.sentencePauseMs.value, 4000);
  assert.equal(json.comparisons.sentencePauseMs.baselineMs, 700);
});

test('works without a baseline: 200 with null score', async () => {
  const { status, json } = await post({ keystrokes: fixture('ordinary').keystrokes });
  assert.equal(status, 200);
  assert.equal(json.readinessScore, null);
  assert.equal(json.status, 'baseline_missing');
});

test('accepts overlapping key holds', async () => {
  const { status, json } = await post({
    keystrokes: [key('character', 0, 160), key('character', 100, 220), key('character', 200, 330)],
  });
  assert.equal(status, 200);
  assert.equal(json.features.dwellMs.value, 130);
});

test('rejects invalid kinds, timestamps and ordering with actionable paths', async () => {
  const { status, json } = await post({
    keystrokes: [
      key('letter', 0, 90),
      key('character', 100, 50),
      key('character', 40, 90),
      key('character', -5, 90),
      key('character', '200', 290),
      key('character', 300, null),
    ],
  });
  assert.equal(status, 400);
  assert.equal(json.error.code, 'invalid_request');
  const paths = json.error.details.map((d) => d.path);
  assert.deepEqual(paths, [
    'keystrokes[0].kind',
    'keystrokes[1].upMs',
    'keystrokes[2].downMs',
    'keystrokes[3].downMs',
    'keystrokes[4].downMs',
    'keystrokes[5].upMs',
  ]);
  assert.match(json.error.details[1].message, /must be >= downMs/);
});

test('rejects key values, text and identifiers', async () => {
  const withKey = await post({ keystrokes: [{ kind: 'character', downMs: 0, upMs: 90, key: 'a' }] });
  assert.equal(withKey.status, 400);
  assert.match(withKey.json.error.details[0].message, /Unexpected field\(s\): key/);

  const withText = await post({ keystrokes: [key('character', 0, 90)], text: 'hello', userId: 'u1' });
  assert.equal(withText.status, 400);
  assert.match(withText.json.error.details[0].message, /text, userId/);
});

test('rejects missing, empty and oversized keystroke arrays', async () => {
  assert.equal((await post({})).json.error.details[0].path, 'keystrokes');
  assert.equal((await post({ keystrokes: [] })).status, 400);
  assert.equal((await post({ keystrokes: 'abc' })).status, 400);
  assert.equal((await post([1, 2])).status, 400);

  const many = Array.from({ length: LIMITS.maxEvents + 1 }, (_, i) => [i, i]);
  const { status, json } = await post({ keystrokes: many });
  assert.equal(status, 400);
  assert.match(json.error.details[0].message, /maximum is 5000/);
});

test('rejects a malformed baseline', async () => {
  const keystrokes = [key('character', 0, 90)];
  const a = await post({ keystrokes, baseline: { sessions: [{}] } });
  assert.equal(a.status, 400);
  assert.match(a.json.error.details[0].message, /exactly one of/);

  const b = await post({ keystrokes, baseline: { sessions: [{ features: { dwellMs: { value: -1, samples: 2 } } }] } });
  assert.equal(b.status, 400);
  assert.ok(b.json.error.details.some((d) => d.path === 'baseline.sessions[0].features.dwellMs.value'));

  const c = await post({ keystrokes, baseline: { sessions: Array(LIMITS.maxBaselineSessions + 1).fill({}) } });
  assert.match(c.json.error.details[0].message, /maximum is 30/);
});

test('caps the number of reported errors', async () => {
  const bad = Array.from({ length: 100 }, () => key('nope', 0, 1));
  const { json } = await post({ keystrokes: bad });
  assert.equal(json.error.details.length, LIMITS.maxErrorDetails);
  assert.match(json.error.message, /first 20/);
});

test('malformed JSON, wrong content type, oversized body, unknown route', async () => {
  const malformed = await post('{"keystrokes": [', { raw: true });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.json.error.code, 'invalid_json');

  const text = await post('hello', { raw: true, headers: { 'Content-Type': 'text/plain' } });
  assert.equal(text.status, 415);

  const big = await post(JSON.stringify({ pad: 'x'.repeat(LIMITS.maxBodyBytes + 10) }), { raw: true });
  assert.equal(big.status, 413);
  assert.equal(big.json.error.code, 'payload_too_large');

  const missing = await fetch(`${base}/nope`);
  assert.equal(missing.status, 404);
});

test('CORS preflight succeeds', async () => {
  const res = await fetch(`${base}/api/analyze`, { method: 'OPTIONS' });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});

test('logs never contain request bodies', async () => {
  await post({ keystrokes: [{ kind: 'character', downMs: 123456, upMs: 123999, secret: 'journal-text' }] });
  await post('{"keystrokes": [journal-text', { raw: true });
  assert.ok(logs.length > 0);
  for (const line of logs) {
    assert.match(line, /^(GET|POST|OPTIONS) (\/[a-z/]*|\[unmatched\]) \d{3} \d+ms$/);
  }
});

test('optional static serving: pages fall back to index.html, API routes still 404 as JSON', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p360-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>spa</title>');
  const app = createApp({ staticDir: dir });
  const s = await new Promise((resolve) => {
    const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
  });
  const origin = `http://127.0.0.1:${s.address().port}`;
  try {
    const page = await fetch(`${origin}/app`, { headers: { Accept: 'text/html' } });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /spa/);
    const health = await fetch(`${origin}/health`);
    assert.equal((await health.json()).status, 'ok');
    const missingApi = await fetch(`${origin}/api/nope`, { headers: { Accept: 'text/html' } });
    assert.equal(missingApi.status, 404);
    assert.equal((await missingApi.json()).error.code, 'not_found');
    const missingAsset = await fetch(`${origin}/assets/missing.js`, { headers: { Accept: 'text/html' } });
    assert.equal(missingAsset.status, 404);
    assert.equal((await missingAsset.json()).error.code, 'not_found');
  } finally {
    await new Promise((resolve) => s.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects impossible or contradictory baseline summaries without producing a score', async () => {
  const { extractFeatures } = require('../src/features');
  const good = extractFeatures(fixture('ordinary').keystrokes);
  for (const change of [
    { value: 1e308 }, { samples: 5001 }, { samples: 0 },
    { value: null }, { sufficient: false }, { minSamples: 1 },
  ]) {
    const features = { ...good, dwellMs: { ...good.dwellMs, ...change } };
    const { status, json } = await post({
      keystrokes: fixture('ordinary').keystrokes,
      baseline: { sessions: [{ features }] },
    });
    assert.equal(status, 400, JSON.stringify(change));
    assert.equal(json.error.code, 'invalid_request');
    assert.match(json.error.details[0].path, /features.dwellMs/);
  }
});

test('unsupported character sets and compressed uploads produce 415 JSON errors', async () => {
  for (const headers of [
    { 'Content-Type': 'application/json; charset=iso-8859-1' },
    { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' },
  ]) {
    const { status, json } = await post('{}', { raw: true, headers });
    assert.equal(status, 415);
    assert.equal(json.error.code, 'unsupported_media_type');
  }
});

test('primitive JSON receives schema validation errors', async () => {
  for (const body of [null, 42, 'private words', true]) {
    const { status, json } = await post(body);
    assert.equal(status, 400);
    assert.equal(json.error.code, 'invalid_request');
    assert.ok(!JSON.stringify(json).includes('private words'));
  }
});

test('personal results are not cacheable and unknown URLs are not logged', async () => {
  const res = await fetch(`${base}/api/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestFor('ordinary')),
  });
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  await res.json();
  await fetch(`${base}/private-journal-words?text=secret`).then((r) => r.json());
  assert.ok(logs.every((line) => !/private-journal|secret/.test(line)));
});
