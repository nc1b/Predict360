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

async function withServer(fn, options) {
  const app = createApp({ authenticateAi: async () => true, ...options });
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

test('summary sanitization allows only known labels and bounded numbers', () => {
  const text = buildSummaryText({
    ...sampleSummary,
    status: 'private_words',
    features: { dwellMs: { value: -10 }, sentencePauseMs: { value: 1e308 }, flightVolatilityMs: { value: 12 } },
    drivers: [{ feature: 'constructor' }, { feature: 'toString' }, { feature: 'flightVolatilityMs' }, { feature: 'flightVolatilityMs' }],
  });
  assert.ok(!/private_words|function|native code|-10|1e\+308/.test(text));
  assert.match(text, /Biggest difference from usual: typing rhythm variation\./);
  assert.equal(buildSummaryText({ readinessScore: 101 }), null);
  assert.equal(buildSummaryText([]), null);
});

test('explanation body limit reports the actual limit', async () => {
  await withServer(async (base) => {
    const res = await post(base, { pad: 'x'.repeat(33 * 1024) });
    assert.equal(res.status, 413);
    assert.match((await res.json()).error.message, /32768 bytes/);
  });
});

const configuredClient = (callAi) => ({ isConfigured: () => true, buildSummaryText, callAi });

test('anonymous requests cannot spend the configured AI key', async () => {
  let called = false;
  await withServer(async (base) => {
    const res = await post(base, { summary: sampleSummary });
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, 'unauthorized');
    assert.equal(called, false);
  }, { authenticateAi: require('../src/auth').verifyAiRequest, aiClient: configuredClient(async () => { called = true; return 'unexpected'; }) });
});

test('upstream failures and timeouts are sanitized and release the explanation slot', async () => {
  for (const timeout of [false, true]) {
    let calls = 0;
    const aiClient = configuredClient((text, { signal }) => {
      if (++calls > 1) return Promise.resolve('Recovered explanation.');
      if (!timeout) throw new Error('private upstream response and credentials');
      return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
    });
    await withServer(async (base) => {
      const res = await post(base, { summary: sampleSummary });
      assert.equal(res.status, timeout ? 504 : 502);
      const json = await res.json();
      assert.equal(json.error.code, timeout ? 'ai_timeout' : 'ai_error');
      assert.ok(!JSON.stringify(json).includes('private upstream'));
      const recovered = await post(base, { summary: sampleSummary });
      assert.equal(recovered.status, 200);
      assert.equal((await recovered.json()).text, 'Recovered explanation.');
    }, { aiClient, aiTimeoutMs: 20, maxAiConcurrent: 1 });
  }
});

test('busy explanations return 429 while health and analysis keep working', async () => {
  let release;
  let entered;
  const started = new Promise((resolve) => { entered = resolve; });
  const aiClient = configuredClient(() => {
    entered();
    return new Promise((resolve) => { release = resolve; });
  });
  await withServer(async (base) => {
    const first = post(base, { summary: sampleSummary });
    try {
      await started;
      const busy = await post(base, { summary: sampleSummary });
      assert.equal(busy.status, 429);
      assert.equal(busy.headers.get('retry-after'), '5');
      assert.equal((await busy.json()).error.code, 'ai_busy');
      assert.equal((await fetch(`${base}/health`)).status, 200);
      const { requestFor } = require('../fixtures/synthetic');
      const analysis = await fetch(`${base}/api/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestFor('ordinary')),
      });
      assert.equal((await analysis.json()).readinessScore, 100);
    } finally {
      release('Explanation.');
      assert.equal((await first).status, 200);
    }
  }, { aiClient, maxAiConcurrent: 1 });
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
