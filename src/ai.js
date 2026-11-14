'use strict';

// Optional AI explanation of a check-in result.
//
// The API key lives only on the server (process.env.HACKCLUB_AI_KEY) and is
// never sent to the browser. Only NUMBERS reach the model: the score and the
// three timing features versus the user's own usual. No typed text, no
// keystrokes, no identifiers are ever included.

const AI_ENDPOINT = 'https://ai.hackclub.com/proxy/v1/chat/completions';
const AI_MODEL = 'openai/gpt-4o-mini';

const SYSTEM_PROMPT = [
  'You are the explainer for Predict 360, an experimental typing check-in.',
  'You receive only numbers about how someone typed two sentences today compared with their own usual typing. You never see their words.',
  'Explain what the numbers suggest in 2 to 3 short, plain, supportive sentences.',
  'Rules you must follow:',
  '- This is about typing timing only. Never give medical advice.',
  '- Never name or imply any illness, condition, disorder or diagnosis.',
  '- Never say whether the person is healthy, unwell, or fit to work.',
  '- A difference is just a difference from their usual, with ordinary possible causes such as distraction, a different keyboard, or tiredness.',
  '- Finish by reminding them this is a prototype and not medical advice.',
].join('\n');

const FEATURE_LABELS = {
  dwellMs: 'key hold time',
  sentencePauseMs: 'pause between sentences',
  flightVolatilityMs: 'typing rhythm variation',
};

function isConfigured() {
  return typeof process.env.HACKCLUB_AI_KEY === 'string' && process.env.HACKCLUB_AI_KEY.length > 0;
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * Build a plain-text description of a result from numbers only. Returns null if
 * the payload is not a usable summary object. This is the ONLY thing sent to the
 * model, so nothing but numbers can leak.
 */
function buildSummaryText(summary) {
  if (summary === null || typeof summary !== 'object') return null;
  const lines = [];
  const score = num(summary.readinessScore);
  lines.push(score === null ? 'Score: not available yet (still building a baseline).' : `Score: ${score} out of 100.`);
  if (typeof summary.status === 'string' && /^[a-z_]{1,40}$/.test(summary.status)) {
    lines.push(`Status label: ${summary.status}.`);
  }

  const features = summary.features && typeof summary.features === 'object' ? summary.features : {};
  const comparisons = summary.comparisons && typeof summary.comparisons === 'object' ? summary.comparisons : {};
  let hasFeature = false;
  for (const key of Object.keys(FEATURE_LABELS)) {
    const value = num(features[key] && features[key].value);
    if (value === null) continue;
    hasFeature = true;
    const c = comparisons[key] && typeof comparisons[key] === 'object' ? comparisons[key] : null;
    const base = c ? num(c.baselineMs) : null;
    const ratio = c ? num(c.ratio) : null;
    const flagged = c && typeof c.flag === 'string' && c.flag.length > 0;
    let line = `${FEATURE_LABELS[key]}: ${Math.round(value)} ms today`;
    if (base !== null) line += `, usual ${Math.round(base)} ms`;
    if (ratio !== null) line += ` (${ratio.toFixed(2)}x usual)`;
    if (flagged) line += ' — larger than usual';
    lines.push(line + '.');
  }
  if (!hasFeature && score === null) return null;

  if (Array.isArray(summary.drivers) && summary.drivers.length > 0) {
    const names = summary.drivers
      .map((d) => d && typeof d.feature === 'string' && FEATURE_LABELS[d.feature])
      .filter(Boolean);
    if (names.length > 0) lines.push(`Biggest difference from usual: ${names.join(', ')}.`);
  }
  return lines.join('\n');
}

/** Call the Hack Club AI proxy. Throws on any failure. */
async function callAi(summaryText, { signal } = {}) {
  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HACKCLUB_AI_KEY}`,
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.4,
      max_tokens: 200,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Here are today's numbers:\n${summaryText}\n\nExplain them to me.` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const data = await res.json();
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (typeof text !== 'string' || text.trim().length === 0) throw new Error('empty completion');
  return text.trim();
}

module.exports = { isConfigured, buildSummaryText, callAi, AI_ENDPOINT, AI_MODEL };
