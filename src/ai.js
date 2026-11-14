'use strict';

// Optional AI explanation of a check-in result.
//
// The API key lives only on the server (process.env.HACKCLUB_AI_KEY) and is
// never sent to the browser. Only NUMBERS reach the model: the score and the
// three timing features versus the user's own usual. No typed text, no
// keystrokes, no identifiers are ever included.

const AI_ENDPOINT = 'https://ai.hackclub.com/proxy/v1/chat/completions';
const AI_MODEL = 'openai/gpt-4o-mini';
const { LIMITS, SCORING, STATUS_BANDS } = require('./config');
const STATUSES = [...STATUS_BANDS.map((band) => band.status), 'baseline_missing', 'baseline_insufficient', 'insufficient_samples'];
const { typingResearchContext, activityResearchContext } = require('./research');

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
  '- Use only the supplied measurements and references. Never invent accuracy, a disease threshold, or a causal explanation.',
].join('\n');
const ACTIVITY_PROMPT = [
  'Explain the numeric computer-activity summary in 2 to 3 short, clear sentences.',
  'Counts cover only the time the user enabled tracking. Idle means no input for 60 seconds.',
  'Describe patterns and suggest an optional break. Do not infer content, app names, productivity, hydration, illness, diagnosis, or fitness to work.',
  'Finish by noting these counts describe computer use, not health.',
].join('\n');

const FEATURE_LABELS = {
  dwellMs: 'key hold time',
  sentencePauseMs: 'pause between sentences',
  flightVolatilityMs: 'typing rhythm variation',
};

function isConfigured() {
  return typeof process.env.HACKCLUB_AI_KEY === 'string' && process.env.HACKCLUB_AI_KEY.trim().length > 0;
}

const num = (v, max = LIMITS.maxTimestampMs) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : null);

/**
 * Build a plain-text description of a result from numbers only. Returns null if
 * the payload is not a usable summary object. This is the ONLY thing sent to the
 * model, so nothing but numbers can leak.
 */
function buildSummaryText(summary) {
  if (summary === null || typeof summary !== 'object' || Array.isArray(summary)) return null;
  const lines = [];
  const score = num(summary.readinessScore, 100);
  lines.push(score === null ? 'Score: not available (insufficient samples or baseline).' : `Score: ${score} out of 100.`);
  if (STATUSES.includes(summary.status)) {
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
    const ratio = c ? num(c.ratio, Number.MAX_VALUE) : null;
    const flagged = c && c.flag === SCORING[key].flag;
    let line = `${FEATURE_LABELS[key]}: ${Math.round(value)} ms today`;
    if (base !== null) line += `, usual ${Math.round(base)} ms`;
    if (ratio !== null) line += ` (${ratio.toFixed(2)}x usual)`;
    if (flagged) line += ' — larger than usual';
    lines.push(line + '.');
  }
  if (!hasFeature && score === null) return null;

  if (Array.isArray(summary.drivers) && summary.drivers.length > 0) {
    // Iterate known keys: prototype names (constructor, toString) are never labels.
    const names = Object.keys(FEATURE_LABELS)
      .filter((key) => summary.drivers.some((d) => d && d.feature === key))
      .map((key) => FEATURE_LABELS[key]);
    if (names.length > 0) lines.push(`Biggest difference from usual: ${names.join(', ')}.`);
  }
  return lines.join('\n') + '\nPublic research context (not diagnostic thresholds):\n' + typingResearchContext();
}

/** Call the Hack Club AI proxy. Throws on any failure. */
function buildActivitySummaryText(result) {
  const totals = result.totals;
  return [
    `Clicks: ${totals.clicks}. Key presses: ${totals.keyPresses}. Scroll events: ${totals.scrollEvents}.`,
    `Tracked minutes: ${Math.round(totals.trackedMs / 60000)}. Active minutes: ${Math.round(totals.activeMs / 60000)}. Idle minutes: ${Math.round(totals.idleMs / 60000)}.`,
    `Interactions per active minute: ${totals.interactionsPerActiveMinute ?? 'unavailable'}.`,
    result.comparison ? `Active share change vs prior days: ${result.comparison.activePercentagePointChange} percentage points. Interaction rate change: ${result.comparison.interactionsPerActiveMinuteChange}.` : 'Not enough earlier days for a baseline comparison.',
  ].join('\n') + '\n' + activityResearchContext();
}

async function callAi(summaryText, { signal, mode = 'typing' } = {}) {
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
        { role: 'system', content: mode === 'activity' ? ACTIVITY_PROMPT : SYSTEM_PROMPT },
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

module.exports = { isConfigured, buildSummaryText, buildActivitySummaryText, callAi, AI_ENDPOINT, AI_MODEL };
