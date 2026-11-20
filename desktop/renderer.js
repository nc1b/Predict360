'use strict';
document.documentElement.dataset.platform = new URLSearchParams(location.search).get('platform') || '';

// Theme: dark by default, light on request; remembered per computer.
(function () {
  const root = document.documentElement;
  try {
    if (localStorage.getItem('p360.desktop.theme') === 'light') root.setAttribute('data-theme', 'light');
  } catch (e) {}
  const name = document.getElementById('theme-name');
  const sync = () => { name.textContent = root.getAttribute('data-theme') === 'light' ? 'Daylight' : 'Midnight'; };
  sync();
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    if (next === 'light') root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
    try { localStorage.setItem('p360.desktop.theme', next); } catch (e) {}
    sync();
  });
})();

const element = (id) => document.getElementById(id);
const duration = (ms) => { const minutes = Math.floor(ms / 60000); return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`; };
const ENERGY = { low: 'Running low', steady: 'About usual', good: 'Feeling good' };
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
function setDot(id, tone) { element(id).className = `dot ${tone || ''}`.trim(); }

// Hourly bar chart: 24 columns with a violet gradient.
const SVG = 'http://www.w3.org/2000/svg';
const chartBars = Array.from({ length: 24 }, (_, hour) => {
  const bar = document.createElement('div'); bar.className = 'bar-col'; bar.setAttribute('role', 'img');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 10 120'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('width', '100%'); svg.setAttribute('height', '120'); svg.setAttribute('aria-hidden', 'true');
  if (hour === 0) {
    const defs = document.createElementNS(SVG, 'defs'), grad = document.createElementNS(SVG, 'linearGradient');
    grad.id = 'bar-gradient'; grad.setAttribute('x1', '0'); grad.setAttribute('x2', '0'); grad.setAttribute('y1', '0'); grad.setAttribute('y2', '1');
    for (const [offset, color, opacity] of [['0%', '#b18cf5', '1'], ['100%', '#b18cf5', '0.25']]) {
      const stop = document.createElementNS(SVG, 'stop'); stop.setAttribute('offset', offset); stop.setAttribute('stop-color', color); stop.setAttribute('stop-opacity', opacity); grad.append(stop);
    }
    defs.append(grad); svg.append(defs);
  }
  const rect = document.createElementNS(SVG, 'rect'); rect.setAttribute('width', '10'); rect.setAttribute('height', '2'); rect.setAttribute('y', '118'); rect.setAttribute('rx', '2');
  svg.append(rect); bar.append(svg); element('chart').append(bar);
  return { hour, bar, rect };
});

function render(state) {
  lastState = state;
  const result = state.analytics, totals = result.totals;
  const hour = new Date().getHours();

  element('status').textContent = state.running ? 'Tracking' : state.connected ? 'Paused' : 'Not connected';
  element('pill').classList.toggle('running', state.running);
  element('connection').textContent = state.connected ? (state.running ? 'Counting activity across your apps' : 'Connected to your account') : 'Connect your account to begin';
  element('headline').textContent = `${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}.`;
  element('date').textContent = new Date(`${result.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  setDot('dot-tracking', state.running ? 'good' : state.connected ? 'warn' : '');
  element('line-tracking').textContent = state.running ? 'On, even with the window closed' : 'Paused';
  setDot('dot-account', state.connected ? 'good' : 'bad');
  element('line-account').textContent = state.connected ? 'Connected to your website account' : 'Not connected';
  setDot('dot-sync', state.connected ? (/could not|failed|unavailable|expired/i.test(state.syncMessage) ? 'warn' : 'good') : '');
  element('sync-message').textContent = state.syncMessage;
  setDot('dot-energy', state.energy === 'low' ? 'warn' : state.energy ? 'good' : '');
  element('line-energy').textContent = state.energy ? ENERGY[state.energy] : 'Not set';

  element('cta-title').textContent = !state.connected ? 'Get started' : state.running ? 'Tracking is on' : 'Ready to track';
  element('cta-sub').textContent = !state.connected ? 'Connect your website account.' : state.running ? 'Close the window anytime; it keeps running.' : 'Counts only. Never your words.';
  element('connect').hidden = state.connected;
  element('start').hidden = !state.connected || state.running;
  element('pause').hidden = !state.running;

  element('ai-text').textContent = state.aiText ? state.aiText + ' (Written by Claude Sonnet from counts; it can be wrong.)' : 'A short summary of today written by Claude Sonnet. Only numbers are sent, and it can be wrong.';
  element('ai-text').classList.toggle('muted', !state.aiText);

  for (const button of document.querySelectorAll('[data-action]')) {
    const action = button.dataset.action;
    button.disabled = pending.has(action) || (['sync', 'disconnect', 'delete', 'explain'].includes(action) && !state.connected) || (action === 'explain' && !totals.trackedMs);
  }
  element('credentials').hidden = state.credentialsSaved;

  count('clicks', totals.clicks); count('keys', totals.keyPresses);
  element('active').textContent = duration(totals.activeMs);
  element('idle').textContent = duration(totals.idleMs);
  const share = totals.trackedMs ? totals.activeMs / totals.trackedMs : 0;
  element('active-pct').textContent = `${Math.round(share * 100)}%`;
  element('gauge-active').style.strokeDasharray = `${188.5 * share} 251.3`;
  element('bar-idle').style.width = `${totals.trackedMs ? (totals.idleMs / totals.trackedMs) * 100 : 0}%`;

  for (const { hour: h, bar, rect } of chartBars) {
    const value = result.hourly.find((entry) => entry.hour === h)?.activeMs || 0;
    const height = Math.max(2, Math.min(120, value / 3600000 * 120));
    rect.setAttribute('height', String(height)); rect.setAttribute('y', String(120 - height));
    rect.classList.toggle('empty', value === 0);
    bar.title = `${h}:00 — ${duration(value)} active`; bar.setAttribute('aria-label', bar.title);
  }
  element('summary').textContent = totals.trackedMs ? `${duration(totals.trackedMs)} monitored · ${totals.scrollEvents.toLocaleString()} scrolls · ${totals.activePercent}% active` : 'Your activity appears here after you start tracking.';

  for (const button of document.querySelectorAll('[data-energy]')) button.setAttribute('aria-pressed', String(button.dataset.energy === state.energy));
  const planKey = JSON.stringify(state.plan.suggestions);
  if (planKey !== previousPlan) {
    previousPlan = planKey;
    element('plan').replaceChildren(...state.plan.suggestions.map((suggestion) => {
      const card = document.createElement('article'), title = document.createElement('h3'), detail = document.createElement('p');
      card.className = 'plan-card'; title.textContent = suggestion.title; detail.textContent = suggestion.detail; card.append(title, detail); return card;
    }));
  }
  element('plan-context').textContent = state.plan.observedDays >= 3 ? `Recent median: ${state.plan.usualActiveMinutes} active minutes over ${state.plan.observedDays} days. Context, not a measure of health.` : 'Suggestions are optional and never shared.';
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

// Sidebar: scroll to a section and highlight it.
const navItems = [...document.querySelectorAll('[data-scroll]')];
for (const item of navItems) item.addEventListener('click', () => {
  navItems.forEach((other) => other.classList.toggle('active', other === item));
  element(item.dataset.scroll).scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
});

window.predict360.subscribe(render);
action('get');
