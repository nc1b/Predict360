'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ActivityTracker, localDate } = require('../desktop/activity');
const { validateDay, validateActivityRequest, analyzeActivity } = require('../src/activity');
const { createStore } = require('../desktop/store');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
function clock(start = new Date(2026, 10, 14, 10).getTime()) {
  let time = start;
  const tracker = new ActivityTracker({ now: () => time });
  return { tracker, advance(ms) { while (ms > 0) { const step = Math.min(5000, ms); time += step; tracker.tick(); ms -= step; } }, jump(ms) { time += ms; tracker.tick(); } };
}
const bucket = (hour = 10, extra = {}) => ({ hour, clicks: 10, keyPresses: 20, scrollEvents: 5, trackedMs: 1200000, activeMs: 600000, ...extra });
const day = (date = '2026-11-14') => ({ date, buckets: [bucket()] });
test('global activity keeps only counts, discards repeats, and excludes paused input', () => {
  const { tracker, advance } = clock(); tracker.start();
  tracker.input('keydown', 30); tracker.input('keydown', 30); tracker.input('keyup', 30);
  tracker.input('keydown', 31); tracker.input('keyup', 31);
  tracker.input('mousedown'); tracker.input('wheel'); tracker.input('mousemove');
  advance(120000); tracker.pause(); tracker.input('mousedown'); advance(30000);
  const days = tracker.snapshot(), result = analyzeActivity({ day: days[0] });
  assert.equal(result.totals.clicks, 1); assert.equal(result.totals.keyPresses, 2); assert.equal(result.totals.scrollEvents, 1);
  assert.equal(result.totals.activeMs, 60000); assert.equal(result.totals.idleMs, 60000);
  assert.equal(result.totals.trackedMs, 120000);
  assert.deepEqual(Object.keys(days[0].buckets[0]).sort(), ['hour', 'clicks', 'keyPresses', 'scrollEvents', 'trackedMs', 'activeMs'].sort());
  assert.deepEqual(validateDay(days[0]), []);
});
test('hour and midnight boundaries split active time correctly', () => {
  const { tracker, advance } = clock(new Date(2026, 10, 14, 23, 59, 50).getTime());
  tracker.start(); tracker.input('mousedown'); advance(20000); tracker.pause();
  const days = tracker.snapshot(); assert.equal(days.length, 2);
  assert.equal(days[0].buckets[0].activeMs, 10000); assert.equal(days[1].buckets[0].activeMs, 10000);
  assert.equal(days[0].date, '2026-11-14'); assert.equal(days[1].date, '2026-11-15');
  assert.equal(days[0].buckets[0].hour, 23); assert.equal(days[1].buckets[0].hour, 0);
});
test('sleep, backward clocks, and pause gaps never create fake active time', () => {
  const { tracker, jump, advance } = clock(); tracker.start(); tracker.input('mousedown');
  jump(3600000); advance(10000); jump(-5000); advance(5000); tracker.pause();
  const totals = analyzeActivity({ day: tracker.snapshot()[0] }).totals;
  assert.equal(totals.activeMs, 0); assert.equal(totals.trackedMs, 15000);
});
test('day validation rejects raw input, duplicate hours, invalid dates and impossible durations', () => {
  for (const invalid of [
    { ...day(), words: 'private' }, { date: '2026-02-30', buckets: [] },
    { ...day(), buckets: [bucket(), bucket()] }, { ...day(), buckets: [bucket(24)] },
    { ...day(), buckets: [bucket(10, { activeMs: 1300000 })] },
    { ...day(), buckets: [bucket(10, { clicks: -1 })] },
    { ...day(), buckets: [bucket(10, { keycode: 30 })] },
  ]) assert.ok(validateDay(invalid).length, JSON.stringify(invalid));
  assert.ok(validateActivityRequest({ day: day(), baseline: { days: [day()] } }).length);
  assert.deepEqual(validateActivityRequest({ day: day() }), []);
});
test('daily analytics compare rates with three sufficiently observed earlier days', () => {
  const result = analyzeActivity({ day: day(), baseline: { days: ['11', '12', '13'].map((d) => day(`2026-11-${d}`)) } });
  assert.equal(result.totals.interactions, 35); assert.equal(result.totals.activePercent, 50);
  assert.equal(result.baseline.ready, true); assert.equal(result.baseline.daysUsed, 3);
  assert.deepEqual(result.comparison, { activePercentagePointChange: 0, interactionsPerActiveMinuteChange: 0 });
  assert.equal(result.readinessScore, undefined);
  const short = analyzeActivity({ day: day(), baseline: { days: [{ date: '2026-11-13', buckets: [bucket(10, { trackedMs: 1000, activeMs: 1000 })] }] } });
  assert.equal(short.comparison, null); assert.equal(short.baseline.daysUsed, 0);
});
test('local storage survives restarts and isolates account queues', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'p360-activity-'));
  try {
    const store = createStore(directory, validateDay); store.save('user_A', [day()], 5);
    const restored = createStore(directory, validateDay);
    assert.equal(store.deviceId, restored.deviceId); assert.deepEqual(restored.load('user_A'), { days: [day()], revision: 5 });
    assert.deepEqual(restored.load('user_B').days, []); restored.clear('user_A'); assert.deepEqual(restored.load('user_A').days, []);
    assert.match(localDate(new Date(2026, 10, 14).getTime()), /^2026-11-14$/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
