'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const day = (date, active, tracked = active) => ({ date, buckets: [{ activeMs: active * 60000, trackedMs: tracked * 60000 }] });
test('workday planning never recommends time off from activity alone', async () => {
  const { createWorkdayPlan } = await import('../src/workday.mjs');
  const days = [day('2026-11-11', 360), day('2026-11-12', 400), day('2026-11-13', 420), day('2026-11-14', 500)];
  const plan = createWorkdayPlan({ days });
  assert.equal(plan.employmentDecision, false); assert.equal(plan.private, true);
  assert.ok(!plan.suggestions.some((suggestion) => suggestion.id === 'lighter-day'));
  assert.ok(plan.suggestions.some((suggestion) => suggestion.id === 'break'));
});
test('low self-reported energy can offer an optional lighter afternoon with usage context', async () => {
  const { createWorkdayPlan } = await import('../src/workday.mjs');
  const plan = createWorkdayPlan({ days: [day('2026-11-14', 90, 150)], energy: 'low' });
  const option = plan.suggestions.find((suggestion) => suggestion.id === 'lighter-day');
  assert.ok(option); assert.match(option.detail, /your choice/);
});
test('missing history does not invent a trend or employment rating', async () => {
  const { createWorkdayPlan } = await import('../src/workday.mjs');
  const plan = createWorkdayPlan();
  assert.equal(plan.usualActiveMinutes, null); assert.equal(plan.aboveRecentUsage, false);
  assert.ok(plan.suggestions.some((suggestion) => suggestion.id === 'build'));
});
