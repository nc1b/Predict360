'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const ai = require('../src/ai');

async function withServer(opts, fn) {
  const app = createApp(opts);
  const server = await new Promise((resolve) => {
    const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
  });
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const post = (base, body) =>
  fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const sampleHistory = [
  { date: '2026-11-14T08:00:00Z', readinessScore: 65, features: { dwellMs: { value: 82 }, sentencePauseMs: { value: 4200 }, flightVolatilityMs: { value: 13 } } },
];

test('buildHistoryText and prepareChat use numbers only', () => {
  assert.equal(ai.buildHistoryText([]), null);
  const text = ai.buildHistoryText(sampleHistory);
  assert.match(text, /2026-11-14: score 65/);
  assert.match(text, /4200ms/);

  assert.ok(ai.prepareChat({ messages: [] }).error, 'empty messages rejected');
  assert.ok(ai.prepareChat({ messages: [{ role: 'assistant', content: 'hi' }] }).error, 'last must be user');
  assert.ok(ai.prepareChat({ messages: [{ role: 'user', content: '' }] }).error, 'empty content rejected');

  const prepared = ai.prepareChat({ messages: [{ role: 'user', content: 'summarise' }], history: sampleHistory });
  assert.ok(Array.isArray(prepared.messages));
  assert.equal(prepared.messages[0].role, 'user');
  assert.match(prepared.system, /Predict 360/);
  const wire = JSON.stringify(prepared);
  assert.match(wire, /4200ms/);
  assert.match(wire, /summarise/);
  assert.ok(!/keystrokes|downMs|upMs|journal/i.test(wire));
});

const fakeAi = {
  isConfigured: () => true,
  prepareChat: ai.prepareChat,
  chat: async () => 'Your pause grew a little this week. This is a prototype, not medical advice.',
};

test('POST /api/chat enforces config, auth, validation, then replies', async () => {
  await withServer({ aiClient: { ...fakeAi, isConfigured: () => false }, authenticateAi: async () => true }, async (base) => {
    assert.equal((await post(base, { messages: [{ role: 'user', content: 'hi' }] })).status, 503);
  });
  await withServer({ aiClient: fakeAi, authenticateAi: async () => false }, async (base) => {
    assert.equal((await post(base, { messages: [{ role: 'user', content: 'hi' }] })).status, 401);
  });
  await withServer({ aiClient: fakeAi, authenticateAi: async () => true }, async (base) => {
    assert.equal((await post(base, { messages: [] })).status, 400);
    const res = await post(base, { messages: [{ role: 'user', content: 'summarise my week' }], history: sampleHistory });
    assert.equal(res.status, 200);
    assert.match((await res.json()).text, /not medical advice/);
  });
});

test('daily analysis: numbers only, Opus model, auth and validation enforced', async () => {
  const text = ai.buildDailyText({ history: sampleHistory, energy: 'low', activity: { activeMinutesToday: 95, usualActiveMinutes: 80, keyPressesToday: 4000 } });
  assert.match(text, /4200ms/);
  assert.match(text, /running low/);
  assert.match(text, /95 active minutes/);
  assert.equal(ai.buildDailyText({}), null);
  assert.equal(ai.DEEP_MODEL, 'claude-opus-5-5');
  assert.equal(ai.FAST_MODEL, 'claude-sonnet-5-5');

  let sent = null;
  const client = { isConfigured: () => true, buildDailyText: ai.buildDailyText, dailyAnalysis: async (t) => { sent = t; return 'Steady day.\n- Key hold close to usual.\nPrototype, not medical advice.'; } };
  const call = (base, body) => fetch(`${base}/api/daily-analysis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  await withServer({ aiClient: client, authenticateAi: async () => false }, async (base) => {
    assert.equal((await call(base, { history: sampleHistory })).status, 401);
  });
  await withServer({ aiClient: client, authenticateAi: async () => true }, async (base) => {
    assert.equal((await call(base, {})).status, 400);
    const res = await call(base, { history: sampleHistory, journal: 'secret words' });
    assert.equal(res.status, 200);
    assert.match((await res.json()).text, /Steady day/);
    assert.ok(!sent.includes('secret words'));
  });
});
