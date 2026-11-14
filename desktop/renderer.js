'use strict';
const element = (id) => document.getElementById(id);
const duration = (ms) => { const minutes = Math.floor(ms / 60000); return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`; };
function render(state) {
  element('status').textContent = state.running ? '● Tracking is on' : 'Paused';
  element('status').className = state.running ? 'status running' : 'status';
  element('connection').textContent = state.connected ? 'Connected to your website account' : 'Connect your account to begin';
  element('sync-message').textContent = state.syncMessage;
  element('ai-text').textContent = state.aiText || 'Get a short explanation of your latest activity totals. Only numeric summaries are sent.';
  element('connect').hidden = state.connected;
  element('start').hidden = !state.connected || state.running;
  element('pause').hidden = !state.running;
  for (const name of ['sync', 'disconnect', 'delete']) element(name).disabled = !state.connected;
  element('credentials').hidden = state.credentialsSaved;
  const result = state.analytics, totals = result.totals;
  element('clicks').textContent = totals.clicks.toLocaleString();
  element('keys').textContent = totals.keyPresses.toLocaleString();
  element('active').textContent = duration(totals.activeMs);
  element('idle').textContent = duration(totals.idleMs);
  element('date').textContent = new Date(`${result.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const chart = element('chart'); chart.replaceChildren();
  for (let hour = 0; hour < 24; hour++) {
    const bucket = result.hourly.find((entry) => entry.hour === hour);
    const bar = document.createElement('div'); bar.className = 'bar';
    // CSP permits no inline styles: heights are set with an SVG bar element.
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%'); svg.setAttribute('height', String(Math.max(3, Math.min(110, (bucket?.activeMs || 0) / 3600000 * 110))));
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); rect.setAttribute('width', '100%'); rect.setAttribute('height', '100%'); rect.setAttribute('fill', '#202020'); svg.append(rect);
    bar.append(svg); bar.title = `${hour}:00 — ${duration(bucket?.activeMs || 0)} active`; chart.append(bar);
  }
  element('summary').textContent = totals.trackedMs ? `${duration(totals.trackedMs)} monitored · ${totals.scrollEvents.toLocaleString()} scroll events · ${totals.activePercent}% active` : 'Your activity appears here after you start tracking.';
}
const pending = new Set();
async function action(name) {
  if (pending.has(name)) return; pending.add(name); element('error').hidden = true;
  const button = document.querySelector(`[data-action="${name}"]`);
  if (button) button.disabled = true;
  try { const result = await window.predict360.invoke(name); if (!result.ok) throw new Error(result.message); render(result.state); }
  catch (error) { element('error').textContent = error.message || 'Please try again.'; element('error').hidden = false; }
  finally { pending.delete(name); if (button) button.disabled = false; }
}
for (const button of document.querySelectorAll('[data-action]')) button.addEventListener('click', () => action(button.dataset.action));
window.predict360.subscribe(render);
action('get');
