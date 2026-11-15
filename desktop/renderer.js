'use strict';
document.documentElement.dataset.platform = new URLSearchParams(location.search).get('platform') || '';
(function () {
  try {
    const saved = localStorage.getItem('p360.desktop.theme');
    if (saved === 'light' || saved === 'dark') document.documentElement.setAttribute('data-theme', saved);
  } catch (e) {}
  const btn = document.getElementById('theme-toggle');
  const sync = () => {
    if (btn) btn.textContent = document.documentElement.getAttribute('data-theme') === 'light' ? 'Dark' : 'Light';
  };
  sync();
  if (btn)
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem('p360.desktop.theme', next);
      } catch (e) {}
      sync();
    });
})();
const element = (id) => document.getElementById(id);
const duration = (ms) => { const minutes = Math.floor(ms / 60000); return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`; };
const pending = new Set(), animations = new WeakMap();
let lastState = null, previousPlan = '';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function count(id, value) {
  const node = element(id), previous = Number(node.dataset.value || 0);
  if (value === previous) return;
  cancelAnimationFrame(animations.get(node)); node.dataset.value = String(value);
  if (reducedMotion.matches) { node.textContent = value.toLocaleString(); return; }
  const started = performance.now();
  function frame(now) {
    const progress = Math.min(1, (now - started) / 450), eased = 1 - (1 - progress) ** 3;
    node.textContent = Math.round(previous + (value - previous) * eased).toLocaleString();
    if (progress < 1) animations.set(node, requestAnimationFrame(frame));
  }
  animations.set(node, requestAnimationFrame(frame));
}
const chartBars = Array.from({ length: 24 }, (_, hour) => {
  const bar = document.createElement('div'); bar.className = 'bar'; bar.setAttribute('role', 'img');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 10 110'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('width', '100%'); svg.setAttribute('height', '110'); svg.setAttribute('aria-hidden', 'true');
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); rect.setAttribute('width', '10'); rect.setAttribute('height', '2'); rect.setAttribute('y', '108'); rect.setAttribute('rx', '1');
  svg.append(rect); bar.append(svg); element('chart').append(bar);
  return { hour, bar, rect };
});
function render(state) {
  lastState = state;
  element('status').textContent = state.running ? '● Tracking is on' : 'Paused';
  element('status').className = state.running ? 'status running' : 'status';
  element('connection').textContent = state.connected ? 'Connected to your website account' : 'Connect your account to begin';
  element('sync-message').textContent = state.syncMessage;
  element('ai-text').textContent = state.aiText || 'Get a short explanation of your latest activity totals. Only numeric summaries are sent.';
  element('connect').hidden = state.connected;
  element('start').hidden = !state.connected || state.running;
  element('pause').hidden = !state.running;
  const result = state.analytics, totals = result.totals;
  for (const button of document.querySelectorAll('[data-action]')) {
    const action = button.dataset.action;
    button.disabled = pending.has(action) || (['sync', 'disconnect', 'delete', 'explain'].includes(action) && !state.connected) || (action === 'explain' && !totals.trackedMs);
  }
  element('credentials').hidden = state.credentialsSaved;
  count('clicks', totals.clicks); count('keys', totals.keyPresses);
  element('active').textContent = duration(totals.activeMs); element('idle').textContent = duration(totals.idleMs);
  element('date').textContent = new Date(`${result.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  for (const { hour, bar, rect } of chartBars) {
    const value = result.hourly.find((entry) => entry.hour === hour)?.activeMs || 0;
    const height = Math.max(2, Math.min(110, value / 3600000 * 110));
    rect.setAttribute('height', String(height)); rect.setAttribute('y', String(110 - height));
    bar.title = `${hour}:00 — ${duration(value)} active`; bar.setAttribute('aria-label', bar.title);
  }
  element('summary').textContent = totals.trackedMs ? `${duration(totals.trackedMs)} monitored · ${totals.scrollEvents.toLocaleString()} scroll events · ${totals.activePercent}% active` : 'Your activity appears here after you start tracking.';
  for (const button of document.querySelectorAll('[data-energy]')) button.setAttribute('aria-pressed', String(button.dataset.energy === state.energy));
  const planKey = JSON.stringify(state.plan.suggestions);
  if (planKey !== previousPlan) {
    previousPlan = planKey; const cards = state.plan.suggestions.map((suggestion) => {
      const card = document.createElement('article'), title = document.createElement('h3'), detail = document.createElement('p');
      card.className = 'plan-card'; title.textContent = suggestion.title; detail.textContent = suggestion.detail; card.append(title, detail); return card;
    }); element('plan').replaceChildren(...cards);
  }
  element('plan-context').textContent = state.plan.observedDays >= 3 ? `Your recent median is ${state.plan.usualActiveMinutes} active computer minutes across ${state.plan.observedDays} earlier days. Usage is context, not a measure of health or effort.` : 'Suggestions are optional and never shared as a hiring or fitness-for-work assessment.';
}
async function action(name, value) {
  if (pending.has(name)) return; pending.add(name); element('error').hidden = true;
  if (lastState) render(lastState);
  try { const result = await window.predict360.invoke(name, value); if (!result.ok) throw new Error(result.message); render(result.state); }
  catch (error) { element('error').textContent = error.message || 'Please try again.'; element('error').hidden = false; }
  finally { pending.delete(name); if (lastState) render(lastState); }
}
for (const button of document.querySelectorAll('[data-action]')) button.addEventListener('click', () => action(button.dataset.action));
for (const button of document.querySelectorAll('[data-energy]')) button.addEventListener('click', () => action('energy', lastState?.energy === button.dataset.energy ? null : button.dataset.energy));
window.predict360.subscribe(render);
action('get');
