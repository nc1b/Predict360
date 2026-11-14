'use strict';

// Hourly counts only. This module also runs inside the desktop main process.
const HOUR = 3600000;
const COUNTS = ['clicks', 'keyPresses', 'scrollEvents'];
const FIELDS = ['hour', ...COUNTS, 'trackedMs', 'activeMs'];
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const dateValid = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;

function validateDay(day, path = 'day') {
  const errors = [];
  const add = (field, message) => { if (errors.length < 20) errors.push({ path: `${path}${field}`, message }); };
  if (!object(day)) return [{ path, message: 'Must be a daily activity summary.' }];
  if (Object.keys(day).some((key) => !['date', 'buckets'].includes(key))) add('', 'Only date and buckets are accepted.');
  if (!dateValid(day.date)) add('.date', 'Use a valid YYYY-MM-DD date.');
  if (!Array.isArray(day.buckets) || day.buckets.length > 24) {
    add('.buckets', 'Use at most 24 hourly buckets.');
    return errors;
  }
  const hours = new Set();
  let tracked = 0;
  day.buckets.forEach((bucket, i) => {
    const p = `.buckets[${i}]`;
    if (!object(bucket)) return add(p, 'Must be an hourly aggregate.');
    if (Object.keys(bucket).some((key) => !FIELDS.includes(key))) add(p, 'Only hourly counts and durations are accepted.');
    if (!Number.isInteger(bucket.hour) || bucket.hour < 0 || bucket.hour > 23 || hours.has(bucket.hour)) add(`${p}.hour`, 'Use a unique hour between 0 and 23.');
    hours.add(bucket.hour);
    for (const field of [...COUNTS, 'trackedMs', 'activeMs']) {
      const max = COUNTS.includes(field) ? 10000000 : 2 * HOUR; // repeated DST hour
      if (!Number.isInteger(bucket[field]) || bucket[field] < 0 || bucket[field] > max) add(`${p}.${field}`, `Use an integer between 0 and ${max}.`);
    }
    if (bucket.activeMs > bucket.trackedMs) add(`${p}.activeMs`, 'Active time cannot exceed tracked time.');
    tracked += bucket.trackedMs;
  });
  if (tracked > 25 * HOUR) add('.buckets', 'Tracked time cannot exceed 25 hours per local day.');
  return errors;
}

function validateActivityRequest(body) {
  if (!object(body)) return [{ path: '', message: 'Send { day, baseline?: { days } }.' }];
  const errors = validateDay(body.day);
  if (Object.keys(body).some((key) => !['day', 'baseline'].includes(key))) errors.push({ path: '', message: 'Only day and baseline are accepted.' });
  if (body.baseline !== undefined) {
    if (!object(body.baseline) || Object.keys(body.baseline).some((key) => key !== 'days') || !Array.isArray(body.baseline.days) || body.baseline.days.length > 30) {
      errors.push({ path: 'baseline.days', message: 'Use at most 30 earlier daily summaries.' });
    } else {
      const dates = new Set();
      body.baseline.days.forEach((day, i) => {
        errors.push(...validateDay(day, `baseline.days[${i}]`));
        if (day && (day.date >= body.day?.date || dates.has(day.date))) errors.push({ path: `baseline.days[${i}].date`, message: 'Baseline dates must be unique and earlier than the current day.' });
        dates.add(day?.date);
      });
    }
  }
  return errors.slice(0, 20);
}

const round = (n) => Math.round(n * 100) / 100;
function summarizeDay(day) {
  const totals = { clicks: 0, keyPresses: 0, scrollEvents: 0, trackedMs: 0, activeMs: 0 };
  for (const bucket of day.buckets) for (const field of Object.keys(totals)) totals[field] += bucket[field];
  const interactions = totals.clicks + totals.keyPresses + totals.scrollEvents;
  return {
    ...totals, interactions, idleMs: totals.trackedMs - totals.activeMs,
    activePercent: totals.trackedMs ? round(100 * totals.activeMs / totals.trackedMs) : null,
    interactionsPerActiveMinute: totals.activeMs ? round(interactions * 60000 / totals.activeMs) : null,
  };
}

function analyzeActivity(body) {
  const totals = summarizeDay(body.day);
  const prior = (body.baseline?.days || []).map(summarizeDay).filter((day) => day.trackedMs >= 900000 && day.activeMs >= 60000);
  const median = (field) => {
    if (!prior.length) return null;
    const values = prior.map((day) => day[field]).sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    return round(values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2);
  };
  const ready = prior.length >= 3;
  const baseline = { daysProvided: body.baseline?.days.length || 0, daysUsed: prior.length, minDays: 3, ready,
    activePercent: median('activePercent'), interactionsPerActiveMinute: median('interactionsPerActiveMinute') };
  return {
    date: body.day.date, totals,
    hourly: [...body.day.buckets].sort((a, b) => a.hour - b.hour).map((bucket) => ({ ...bucket, idleMs: bucket.trackedMs - bucket.activeMs })),
    baseline,
    comparison: ready && totals.activeMs >= 60000 ? {
      activePercentagePointChange: round(totals.activePercent - baseline.activePercent),
      interactionsPerActiveMinuteChange: round(totals.interactionsPerActiveMinute - baseline.interactionsPerActiveMinute),
    } : null,
    disclaimer: 'Activity counts describe computer use. They do not measure productivity, hydration, or health.',
  };
}

module.exports = { validateDay, validateActivityRequest, summarizeDay, analyzeActivity };
