'use strict';

const Anthropic = require('@anthropic-ai/sdk').default;

// Every AI feature (explanations, chat, daily analysis) uses Claude Opus 5.5.
// Requests go through the Hack Club AI proxy with HACKCLUB_AI_KEY; if ANTHROPIC_API_KEY is set
// instead, they go straight to the Anthropic API with the same model.
const MODEL = 'claude-opus-5-5';
const HACKCLUB_ENDPOINT = 'https://ai.hackclub.com/proxy/v1/chat/completions';
const HACKCLUB_MODEL = 'anthropic/claude-opus-5.5';
const FAST_MODEL = MODEL;
const DEEP_MODEL = MODEL;
// If a model declines, the API reruns the request on a suitable fallback model in the same call.
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
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
  'Describe the counts plainly and specifically, using whole numbers. Avoid generic wellness advice; mention a break only if active minutes are 90 or more.',
  'Do not infer content, app names, productivity, hydration, illness, diagnosis, or fitness to work.',
  'Finish by noting these counts describe computer use, not health.',
].join('\n');

const FEATURE_LABELS = {
  dwellMs: 'key hold time',
  sentencePauseMs: 'pause between sentences',
  flightVolatilityMs: 'typing rhythm variation',
};

const hasKey = (name) => typeof process.env[name] === 'string' && process.env[name].trim().length > 0;
/** 'anthropic' when an Anthropic key is set, else 'hackclub' when a Hack Club AI key is set, else null. */
function provider() {
  if (hasKey('ANTHROPIC_API_KEY')) return 'anthropic';
  if (hasKey('HACKCLUB_AI_KEY')) return 'hackclub';
  return null;
}
function isConfigured() {
  return provider() !== null;
}

let client = null;
function getClient() {
  // Resolve fetch at call time so tests can stub global fetch.
  if (!client) client = new Anthropic({ fetch: (...args) => globalThis.fetch(...args), maxRetries: 1 });
  return client;
}

/** Hack Club AI proxy (chat-completions format), used with the project's existing HACKCLUB_AI_KEY. */
async function completeViaHackClub({ system, messages, maxTokens, signal }) {
  const res = await fetch(HACKCLUB_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.HACKCLUB_AI_KEY}`, 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ model: HACKCLUB_MODEL, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] }),
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const data = await res.json();
  const choice = data && data.choices && data.choices[0];
  const text = choice && choice.message && choice.message.content;
  if (typeof text !== 'string' || text.trim().length === 0) throw new Error('empty completion');
  return text.trim();
}

/** One model call; returns the reply text or throws. */
async function complete({ model, system, messages, effort, maxTokens, signal }) {
  if (provider() === 'hackclub') return completeViaHackClub({ system, messages, maxTokens, signal });
  const response = await getClient().beta.messages.create(
    {
      model,
      max_tokens: maxTokens,
      system,
      messages,
      output_config: { effort },
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
    },
    { signal }
  );
  if (response.stop_reason === 'refusal') throw new Error('refused');
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  if (!text) throw new Error('empty completion');
  return text;
}

const num = (v, max = LIMITS.maxTimestampMs) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : null);

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
    const names = Object.keys(FEATURE_LABELS)
      .filter((key) => summary.drivers.some((d) => d && d.feature === key))
      .map((key) => FEATURE_LABELS[key]);
    if (names.length > 0) lines.push(`Biggest difference from usual: ${names.join(', ')}.`);
  }
  return lines.join('\n') + '\nPublic research context (not diagnostic thresholds):\n' + typingResearchContext();
}

function buildActivitySummaryText(result) {
  const totals = result.totals;
  return [
    `Clicks: ${totals.clicks}. Key presses: ${totals.keyPresses}. Scroll events: ${totals.scrollEvents}.`,
    `Tracked minutes: ${Math.round(totals.trackedMs / 60000)}. Active minutes: ${Math.round(totals.activeMs / 60000)}. Idle minutes: ${Math.round(totals.idleMs / 60000)}.`,
    `Interactions per active minute: ${totals.interactionsPerActiveMinute === null ? 'unavailable' : Math.round(totals.interactionsPerActiveMinute)}.`,
    result.comparison ? `Active share change vs prior days: ${Math.round(result.comparison.activePercentagePointChange)} percentage points. Interaction rate change: ${Math.round(result.comparison.interactionsPerActiveMinuteChange)} per active minute.` : 'Not enough earlier days for a baseline comparison.',
  ].join('\n') + '\n' + activityResearchContext();
}

async function callAi(summaryText, { signal, mode = 'typing' } = {}) {
  return complete({
    model: FAST_MODEL,
    system: mode === 'activity' ? ACTIVITY_PROMPT : SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Here are today's numbers:\n${summaryText}\n\nExplain them to me.` }],
    effort: 'low',
    maxTokens: 4000,
    signal,
  });
}

const CHAT_SYSTEM_PROMPT = [
  'You are the assistant for Predict 360, an experimental two-sentence typing check-in.',
  "Each check-in has the user type two sentences; the app measures only timing (key hold time, the pause between sentences, and how even the rhythm is) and compares it with the user's own usual. You never see what they wrote.",
  "You may be given a list of the user's recent check-ins as numbers only. Use it to answer questions and summarise trends plainly and supportively.",
  'Keep replies short and friendly (usually under 120 words), in plain language.',
  'Rules you must follow:',
  '- This is about typing timing only. Never give medical advice.',
  '- Never name or imply any illness, condition, disorder or diagnosis.',
  '- Never say whether the person is healthy, unwell, or fit to work.',
  '- A difference is just a difference from their usual, with ordinary possible causes such as distraction, a different keyboard, or tiredness.',
  '- Use only the supplied numbers and references. Never invent accuracy, a disease threshold, or a causal explanation.',
  '- If asked for medical advice or a diagnosis, gently decline and suggest talking to a professional.',
  '- If there is no check-in data yet, say so and invite them to do a check-in.',
].join('\n');

const MAX_CHAT_MESSAGES = 20;
const MAX_CHAT_CHARS = 2000;
const MAX_HISTORY_ITEMS = 30;

function buildHistoryText(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const rows = [];
  for (const item of history.slice(-MAX_HISTORY_ITEMS)) {
    if (!item || typeof item !== 'object') continue;
    const date = typeof item.date === 'string' && /^[0-9T:.\-Z ]{1,32}$/.test(item.date) ? item.date.slice(0, 10) : '?';
    const score = num(item.readinessScore, 100);
    const f = item.features && typeof item.features === 'object' ? item.features : {};
    const parts = [];
    for (const key of Object.keys(FEATURE_LABELS)) {
      const v = num(f[key] && f[key].value);
      if (v !== null) parts.push(`${FEATURE_LABELS[key]} ${Math.round(v)}ms`);
    }
    if (score === null && parts.length === 0) continue;
    rows.push(`${date}: score ${score === null ? 'n/a' : score}${parts.length ? ', ' + parts.join(', ') : ''}`);
  }
  return rows.length ? rows.join('\n') : null;
}

function prepareChat(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { error: 'Send { messages: [...] }.' };
  const raw = Array.isArray(body.messages) ? body.messages : null;
  if (!raw || raw.length === 0) return { error: 'messages must be a non-empty array.' };
  if (raw.length > MAX_CHAT_MESSAGES) return { error: `Too many messages (max ${MAX_CHAT_MESSAGES}).` };
  const messages = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') return { error: 'Each message must be an object.' };
    if (m.role !== 'user' && m.role !== 'assistant') return { error: 'Each message role must be user or assistant.' };
    if (typeof m.content !== 'string' || m.content.length === 0) return { error: 'Each message needs string content.' };
    if (m.content.length > MAX_CHAT_CHARS) return { error: `A message is too long (max ${MAX_CHAT_CHARS} chars).` };
    messages.push({ role: m.role, content: m.content });
  }
  if (messages[messages.length - 1].role !== 'user') return { error: 'The last message must be from the user.' };
  const historyText = buildHistoryText(body.history);
  const system = [
    CHAT_SYSTEM_PROMPT,
    historyText
      ? `The user's recent check-ins (numbers only, oldest first):\n${historyText}\n\nPublic research context (not diagnostic thresholds):\n${typingResearchContext()}`
      : 'The user has no saved check-ins yet.',
  ].join('\n\n');
  return { system, messages };
}

async function chat(prepared, { signal } = {}) {
  return complete({ model: FAST_MODEL, system: prepared.system, messages: prepared.messages, effort: 'low', maxTokens: 6000, signal });
}

const DAILY_PROMPT = [
  'You write the daily analysis for Predict 360, an experimental two-sentence typing check-in.',
  "You receive numbers only: today's check-in compared with the user's own usual, their recent check-in history, an optional self-reported energy level, and optional computer-activity totals. You never see what they typed.",
  'Compare today with their recent pattern. Point out what changed, what stayed steady, and any trend across days, using the actual numbers.',
  'Format: one short headline sentence on its own line, then 2 to 4 lines that each start with "- ". Under 130 words in total. Plain, warm language.',
  'Rules you must follow:',
  '- This is about typing timing and computer use only. Never give medical advice.',
  '- Never name or imply any illness, condition, disorder or diagnosis, and never say the person has or may have one.',
  '- Never say whether the person is healthy, unwell, or fit to work.',
  '- A difference is just a difference from their usual, with ordinary possible causes such as distraction, a different keyboard, or tiredness.',
  '- If they reported low energy, you may suggest a short break; otherwise do not give generic wellness advice.',
  '- Use only the supplied numbers. Never invent accuracy, thresholds or causes.',
  '- End with: "Prototype, not medical advice."',
].join('\n');

const ENERGY_TEXT = { low: 'running low', steady: 'about usual', good: 'feeling good' };

function buildDailyText(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null;
  const parts = [];
  const today = body.today ? buildSummaryText(body.today) : null;
  parts.push(today ? `Today's check-in:\n${today}` : 'No scored check-in yet today.');
  const historyText = buildHistoryText(body.history);
  parts.push(historyText ? `Recent check-ins (oldest first):\n${historyText}` : 'No earlier check-ins.');
  if (Object.hasOwn(ENERGY_TEXT, body.energy)) parts.push(`Self-reported energy today: ${ENERGY_TEXT[body.energy]}.`);
  const a = body.activity;
  if (a && typeof a === 'object') {
    const active = num(a.activeMinutesToday, 24 * 60);
    const usual = num(a.usualActiveMinutes, 24 * 60);
    const keys = num(a.keyPressesToday, 10_000_000);
    if (active !== null) parts.push(`Computer activity today: ${Math.round(active)} active minutes${keys !== null ? `, ${Math.round(keys)} key presses` : ''}${usual !== null ? `; recent median ${Math.round(usual)} active minutes` : ''}.`);
  }
  if (!today && !historyText) return null;
  return parts.join('\n\n');
}

async function dailyAnalysis(text, { signal } = {}) {
  return complete({
    model: DEEP_MODEL,
    system: DAILY_PROMPT,
    messages: [{ role: 'user', content: `${text}\n\nWrite today's analysis.` }],
    effort: 'medium',
    maxTokens: 12000,
    signal,
  });
}

module.exports = {
  isConfigured,
  buildSummaryText,
  buildActivitySummaryText,
  buildHistoryText,
  prepareChat,
  chat,
  callAi,
  buildDailyText,
  dailyAnalysis,
  FAST_MODEL,
  DEEP_MODEL,
  HACKCLUB_MODEL,
  HACKCLUB_ENDPOINT,
  provider,
};
