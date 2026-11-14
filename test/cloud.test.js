'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { validateDay } = require('../src/activity');
const { validateAnalyzeRequest } = require('../src/validate');
async function setup() {
  const { createCloudHandler, hash } = await import('../src/cloud-core.mjs');
  let time = Date.now();
  const codes = new Map(), sessions = new Map(), days = new Map(), checkins = new Map();
  const repository = {
    saveCode: async (row) => codes.set(row.code_hash, row),
    consumeCode: async (key, challenge, now) => { const value = codes.get(key); if (!value || value.challenge !== challenge || value.expires_at <= now) return null; codes.delete(key); return value; },
    saveSession: async (row) => sessions.set(row.token_hash, row),
    getSession: async (key, now) => { const value = sessions.get(key); return value?.expires_at > now ? value : null; },
    deleteSession: async (key) => sessions.delete(key),
    deleteUserSessions: async (user) => { for (const [key, value] of sessions) if (value.user_id === user) sessions.delete(key); },
    listDays: async (user) => [...days.values()].filter((row) => row.user === user),
    saveDays: async (user, device, revision, snapshots) => { for (const day of snapshots) { const key = `${user}/${device}/${day.date}`; const old = days.get(key); if (!old || old.revision < revision) days.set(key, { user, device, revision, summary: day }); } },
    deleteDays: async (user) => { for (const [key, value] of days) if (value.user === user) days.delete(key); },
    deleteActivity: async (user) => { await repository.deleteUserSessions(user); await repository.deleteDays(user); },
    listCheckins: async (user) => [...checkins.values()].filter((entry) => entry.user === user).map((entry) => entry.summary),
    saveCheckin: async (user, summary) => checkins.set(`${user}/${summary.id}`, { user, summary }),
    deleteCheckins: async (user) => { for (const [key, value] of checkins) if (value.user === user) checkins.delete(key); },
  };
  const handle = createCloudHandler({ repository, validateDay,
    validateFeatures: (features) => !validateAnalyzeRequest({ keystrokes: [{ kind: 'character', downMs: 0, upMs: 1 }], baseline: { sessions: [{ features }] } }).errors.length,
    verifyWebToken: async (token) => { if (token === 'webA') return 'user_A'; if (token === 'webB') return 'user_B'; throw new Error('invalid'); }, now: () => time });
  return { hash, codes, sessions, advance: (ms) => { time += ms; },
    async request(route, method = 'GET', body, token = 'webA') {
      const response = await handle(new Request(`https://example.test?route=${route}`, { method, headers: token ? { Authorization: `Bearer ${token}` } : {}, body: body === undefined ? undefined : JSON.stringify(body) }));
      return { status: response.status, data: await response.json() };
    } };
}
test('desktop sign-in verifies PKCE, expires, consumes codes once, and stores only hashes', async () => {
  const app = await setup(), verifier = randomBytes(32).toString('base64url');
  const auth = await app.request('authorize', 'POST', { challenge: await app.hash(verifier) });
  assert.equal(auth.status, 200); assert.ok(!app.codes.has(auth.data.code));
  assert.equal((await app.request('exchange', 'POST', { code: auth.data.code, verifier: randomBytes(32).toString('base64url') }, null)).status, 401);
  const exchange = await app.request('exchange', 'POST', { code: auth.data.code, verifier }, null);
  assert.equal(exchange.status, 200); assert.equal(exchange.data.userId, 'user_A');
  assert.ok(!app.sessions.has(exchange.data.token));
  assert.equal((await app.request('exchange', 'POST', { code: auth.data.code, verifier }, null)).status, 401);
  const next = await app.request('authorize', 'POST', { challenge: await app.hash(verifier) });
  app.advance(120001);
  assert.equal((await app.request('exchange', 'POST', { code: next.data.code, verifier }, null)).status, 401);
});
test('sync requires verified identity, isolates users, and retries snapshots without duplicates', async () => {
  const app = await setup();
  assert.equal((await app.request('activity', 'GET', undefined, null)).status, 401);
  assert.equal((await app.request('activity', 'GET', undefined, 'forged')).status, 401);
  const day = { date: '2026-11-14', buckets: [] }, snapshot = { deviceId: 'a4dab18e-a006-4d91-9637-ec399cb7efbc', revision: 5, days: [day] };
  assert.equal((await app.request('activity', 'PUT', snapshot)).status, 200);
  await app.request('activity', 'PUT', snapshot); await app.request('activity', 'PUT', { ...snapshot, revision: 4, days: [] });
  assert.equal((await app.request('activity')).data.days.length, 1);
  assert.equal((await app.request('activity', 'GET', undefined, 'webB')).data.days.length, 0);
  assert.equal((await app.request('activity', 'PUT', { ...snapshot, userId: 'user_B' })).status, 400);
  assert.equal((await app.request('activity', 'PUT', { ...snapshot, days: [{ ...day, text: 'private' }] })).status, 400);
});
test('deleting activity revokes every desktop so stale queues cannot restore it', async () => {
  const app = await setup(), verifier = randomBytes(32).toString('base64url');
  const auth = await app.request('authorize', 'POST', { challenge: await app.hash(verifier) });
  const { data } = await app.request('exchange', 'POST', { code: auth.data.code, verifier }, null);
  assert.equal((await app.request('activity', 'GET', undefined, data.token)).status, 200);
  assert.equal((await app.request('authorize', 'POST', { challenge: await app.hash(verifier) }, data.token)).status, 403);
  await app.request('activity', 'DELETE');
  assert.equal((await app.request('activity', 'GET', undefined, data.token)).status, 401);
});
test('cloud check-ins accept only valid feature summaries and remain private', async () => {
  const app = await setup();
  const features = require('../src/features').extractFeatures(require('../fixtures/synthetic').fixture('ordinary').keystrokes);
  const entry = { id: 'test-1', at: new Date().toISOString(), features, status: 'baseline_missing', readinessScore: null, flags: [] };
  assert.equal((await app.request('checkins', 'POST', entry)).status, 200);
  assert.deepEqual((await app.request('checkins')).data.entries, [entry]);
  assert.deepEqual((await app.request('checkins', 'GET', undefined, 'webB')).data.entries, []);
  assert.equal((await app.request('checkins', 'POST', { ...entry, keystrokes: [] })).status, 400);
  assert.equal((await app.request('checkins', 'POST', { ...entry, features: {} })).status, 400);
  await app.request('checkins', 'DELETE'); assert.deepEqual((await app.request('checkins')).data.entries, []);
});
