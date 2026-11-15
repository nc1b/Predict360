export function createWorkdayPlan({ days = [], energy = null } = {}) {
  const summaries = days.filter((day) => day && typeof day.date === 'string' && Array.isArray(day.buckets))
    .map((day) => ({ date: day.date, active: day.buckets.reduce((sum, bucket) => sum + (Number.isFinite(bucket.activeMs) ? Math.max(0, bucket.activeMs) : 0), 0) / 60000,
      tracked: day.buckets.reduce((sum, bucket) => sum + (Number.isFinite(bucket.trackedMs) ? Math.max(0, bucket.trackedMs) : 0), 0) / 60000 }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const today = summaries.at(-1);
  const prior = summaries.slice(0, -1).filter((day) => day.tracked >= 15).slice(-7);
  const sorted = prior.map((day) => day.active).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const usual = sorted.length ? (sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2) : null;
  const suggestions = [];
  if (!today || today.tracked < 15) suggestions.push({ id: 'build', title: 'Start with an ordinary day', detail: 'Record a little of your usual computer use. There is no target to hit and no performance rating.' });
  if (today?.active >= 90) suggestions.push({ id: 'break', title: 'Make room for a screen break', detail: 'If you have not stepped away recently, consider a 5–10 minute break. Daily totals do not tell us whether you have already taken breaks.' });
  if (energy === 'low') {
    suggestions.push({ id: 'energy', title: 'Give yourself a little breathing room', detail: 'You said your energy is low. Try a short break, water if you need it, and a check-in with yourself before choosing your next task.' });
    if (today?.tracked >= 120 || (prior.length >= 3 && usual >= 240)) suggestions.push({ id: 'lighter-day', title: 'A lighter afternoon is an option', detail: 'If you still feel drained after a break, consider reducing your workload or discussing a half-day with your manager. This is your choice, not a work restriction or a medical recommendation.' });
  } else if (energy === 'good') suggestions.push({ id: 'pace', title: 'Keep a comfortable pace', detail: 'You said your energy is good. Keep breaks in your plans and adjust your day if that changes.' });
  else suggestions.push({ id: 'check-in', title: 'Your experience matters', detail: 'An optional energy check-in can help you choose a plan. Activity counts alone cannot tell how you feel.' });
  return { observedDays: prior.length, usualActiveMinutes: usual === null ? null : Math.round(usual),
    aboveRecentUsage: prior.length >= 3 && today.active > usual * 1.2,
    suggestions, private: true, employmentDecision: false };
}
