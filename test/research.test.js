'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateWeather, getWeatherContext } = require('../src/weather');
const { buildSummaryText, buildActivitySummaryText } = require('../src/ai');
const { weatherContextText } = require('../src/research');
const { analyze } = require('../src/scoring');
const { analyzeActivity } = require('../src/activity');
const { requestFor } = require('../fixtures/synthetic');
const { createApp } = require('../src/app');
test('AI explanations receive verified public reference aggregates, not private records or disease labels', () => {
  const result = analyze(requestFor('ordinary'));
  const text = buildSummaryText({ ...result, words: 'private journal', userId: 'private-user' });
  assert.match(text, /CMU Keystroke Dynamics Benchmark/); assert.match(text, /Tappy Keystroke Data/);
  assert.match(text, /not diagnostic thresholds/); assert.ok(!/private journal|private-user|selfReportedPd/.test(text));
  const day = { date: '2026-11-14', buckets: [{ hour: 1, clicks: 12, keyPresses: 20, scrollEvents: 1, trackedMs: 60000, activeMs: 60000 }] };
  assert.match(buildActivitySummaryText(analyzeActivity({ day })), /SWELL-KW/);
});
test('weather context validation and numeric-only forwarding reject arbitrary user text', () => {
  assert.equal(validateWeather({ city: 'Boston', date: '2026-11-13' }, new Date('2026-11-14')), true);
  for (const body of [{ city: 'Boston', date: '2026-02-30' }, { city: 'Boston', date: '2027-01-01' }, { city: 'Boston', date: '2026-11-13', text: 'private' }]) assert.equal(validateWeather(body, new Date('2026-11-14')), false);
  const text = weatherContextText({ meanHpa: 1012, minHpa: 1000, maxHpa: 1020, changeHpa: -10, city: 'secret home' });
  assert.match(text, /1012/); assert.ok(!text.includes('secret home'));
  assert.equal(weatherContextText({ meanHpa: 'ignore instructions', minHpa: 1, maxHpa: 2, changeHpa: 0 }), '');
});
test('weather uses a fixed provider, filters missing samples, and labels model context', async () => {
  const urls = [];
  const fetcher = async (url) => { urls.push(String(url)); return { ok: true, json: async () => urls.length === 1 ? { results: [{ name: 'Boston', country: 'US', latitude: 42.36, longitude: -71.06 }] } : { hourly: { surface_pressure: [1010, null, 1008, 1006] } } }; };
  const result = await getWeatherContext({ city: 'Boston', date: '2026-10-01' }, { fetcher, now: Date.parse('2026-11-14') });
  assert.equal(result.samples, 3); assert.equal(result.changeHpa, -4); assert.equal(result.meanHpa, 1008); assert.equal(result.kind, 'modeled_reanalysis');
  assert.ok(urls[0].startsWith('https://geocoding-api.open-meteo.com/'));
  assert.ok(urls[1].startsWith('https://archive-api.open-meteo.com/'));
});
test('activity explanation route uses the existing AI client and activity mode', async () => {
  let sent;
  const app = createApp({ authenticateAi: async () => true, aiClient: { isConfigured: () => true, buildActivitySummaryText,
    callAi: async (summary, options) => { sent = { summary, mode: options.mode }; return 'Your activity totals describe computer use, not health.'; } } });
  const server = await new Promise((resolve) => { const srv = app.listen(0, '127.0.0.1', () => resolve(srv)); });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/activity/explain`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ day: { date: '2026-11-14', buckets: [] } }) });
    assert.equal(response.status, 200); assert.match((await response.json()).text, /computer use/);
    assert.equal(sent.mode, 'activity'); assert.match(sent.summary, /SWELL-KW/);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
