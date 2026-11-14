'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { buildSummaryText } = require('../src/ai');

const sampleSummary = {
  readinessScore: 65,
  status: 'some_deviation',
  features: { dwellMs: { value: 82 }, sentencePauseMs: { value: 4220 }, flightVolatilityMs: { value: 13 } },
  comparisons: {
    dwellMs: { baselineMs: 78, ratio: 1.05, flag: null },
    sentencePauseMs: { baselineMs: 824, ratio: 5.12, flag: 'long_sentence_pause' },
    flightVolatilityMs: { baselineMs: 16, ratio: 0.81, flag: null },
  },
  drivers: [{ feature: 'sentencePauseMs', flag: 'long_sentence_pause', ratio: 5.12 }],
};

async function withServer(fn) {
  const app = createApp();
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
  fetch(`${base}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('buildSummaryText turns numbers into text and rejects junk', () => {
  const text = buildSummaryText(sampleSummary);
  assert.match(text, /Score: 65 out of 100/);
  assert.match(text, /pause between sentences: 4220 ms today, usual 824 ms/);
  assert.match(text, /larger than usual/);
  assert.equal(buildSummaryText(null), null);
  assert.equal(buildSummaryText({}), null);
  assert.equal(buildSummaryText('hello'), null);
});

test('POST /api/explain returns 503 when no AI key is configured', async () => {
  const prev = process.env.HACKCLUB_AI_KEY;
  delete process.env.HACKCLUB_AI_KEY;
  try {
    await withServer(async (base) => {
      const res = await post(base, { summary: sampleSummary });
      assert.equal(res.status, 503);
      assert.equal((await res.json()).error.code, 'ai_unconfigured');
    });
  } finally {
    if (prev !== undefined) process.env.HACKCLUB_AI_KEY = prev;
  }
});

test('POST /api/explain rejects a body with no usable summary', async () => {
  process.env.HACKCLUB_AI_KEY = 'test-key';
  try {
    await withServer(async (base) => {
      const res = await post(base, { summary: 'nope' });
      assert.equal(res.status, 400);
      assert.equal((await res.json()).error.code, 'invalid_request');
    });
  } finally {
    delete process.env.HACKCLUB_AI_KEY;
  }
});

test('POST /api/explain forwards only numbers to the proxy and returns its text', async () => {
  process.env.HACKCLUB_AI_KEY = 'test-key';
  const realFetch = global.fetch;
  let sentBody = null;
  global.fetch = (url, opts) => {
    if (String(url).includes('ai.hackclub.com')) {
      sentBody = JSON.parse(opts.body);
      return Promise.resolve({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Your pause was longer than usual today. This is a prototype, not medical advice.' } }],
        }),
      });
    }
    return realFetch(url, opts);
  };
  try {
    await withServer(async (base) => {
      const res = await post(base, { summary: sampleSummary });
      assert.equal(res.status, 200);
      const { text } = await res.json();
      assert.match(text, /not medical advice/);
      const userMessage = sentBody.messages.find((m) => m.role === 'user').content;
      assert.match(userMessage, /4220 ms/);
      // Nothing but numbers: no text/keystroke fields anywhere in the outgoing request.
      const wire = JSON.stringify(sentBody);
      assert.ok(!/keystrokes|downMs|upMs|journal/i.test(wire));
    });
  } finally {
    global.fetch = realFetch;
    delete process.env.HACKCLUB_AI_KEY;
  }
});
