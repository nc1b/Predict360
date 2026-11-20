'use strict';
const { app, BrowserWindow, Menu, Tray, ipcMain, shell, safeStorage, powerMonitor, dialog, systemPreferences, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { randomBytes, createHash } = require('node:crypto');
const { ActivityTracker, localDate } = require('./activity');
const { createStore, atomicWrite, read } = require('./store');
const assets = path.join(__dirname, 'assets');
const config = require('./assets/public.json');
const { validateDay, analyzeActivity } = require('./assets/activity-analyzer.cjs');
const { createWorkdayPlan } = require('./assets/workday.cjs');
const site = new URL(process.env.PREDICT360_URL || config.siteUrl);
if (site.protocol !== 'https:' && !(site.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(site.hostname))) throw new Error('Use an HTTPS website URL.');
let win, tray, store, hook, session = null, pendingLogin = null;
let tracker = new ActivityTracker();
let revision = 0, syncing = false, syncMessage = 'Sign in to connect your website account.', quitting = false, aiText = '', credentialsAvailable = false, energy = null;
const sessionFile = () => path.join(app.getPath('userData'), 'account.enc.json');
const sha = (value) => createHash('sha256').update(value).digest('base64url');
const secureCredentials = () => credentialsAvailable;
async function cloud(route, method = 'GET', body, token = session?.token) {
  const response = await fetch(`${config.cloudUrl}?route=${route}`, {
    method, headers: { apikey: config.publishableKey, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error?.message || 'Sync is unavailable.'); error.status = response.status; throw error; }
  return data;
}
function persist() {
  if (!session) return;
  try { store.save(session.userId, tracker.snapshot(), ++revision); }
  catch { tracker.pause(); hook?.stop(); syncMessage = 'Tracking paused: could not save activity. Check your available disk space.'; }
}
async function setAccount(account) {
  tracker.pause(); session = account; aiText = ''; energy = null;
  if (account) {
    const saved = store.load(account.userId); revision = saved.revision;
    tracker = new ActivityTracker({ days: saved.days });
    if (secureCredentials()) atomicWrite(sessionFile(), { encrypted: (await safeStorage.encryptStringAsync(JSON.stringify(account))).toString('base64') });
  } else { tracker = new ActivityTracker(); fs.rmSync(sessionFile(), { force: true }); }
}
function state() {
  const days = tracker.snapshot(), today = localDate(Date.now());
  const day = days.find((entry) => entry.date === today) || { date: today, buckets: [] };
  return { running: tracker.running, connected: !!session, userId: session?.userId || null, syncMessage,
    analytics: analyzeActivity({ day, baseline: { days: days.filter((entry) => entry.date < today) } }),
    aiText, energy, plan: createWorkdayPlan({ days, energy }), credentialsSaved: secureCredentials() };
}
function publish() {
  if (win && !win.isDestroyed()) win.webContents.send('activity:state', state());
  tray?.setToolTip(`Predict 360 — ${tracker.running ? 'tracking activity' : 'paused'}`);
  tray?.setContextMenu(Menu.buildFromTemplate([
    { label: tracker.running ? 'Tracking is on' : 'Tracking is paused', enabled: false },
    { label: 'Open Predict 360', click: () => { win.show(); win.focus(); } },
    { label: 'Pause tracking', enabled: tracker.running, click: pause },
    { type: 'separator' }, { label: 'Quit and stop tracking', click: () => app.quit() },
  ]));
}
function pause() { tracker.pause(); hook?.stop(); persist(); publish(); }
async function start() {
  if (tracker.running) return;
  if (!session) throw new Error('Connect your website account first.');
  if (new Date(session.expiresAt).getTime() <= Date.now()) { await setAccount(null); publish(); throw new Error('Your connection expired. Sign in again.'); }
  if (process.platform === 'darwin' && !systemPreferences.isTrustedAccessibilityClient(true)) throw new Error('Allow Predict 360 in System Settings → Privacy & Security → Accessibility, then try again.');
  if (process.platform === 'linux' && (process.env.XDG_SESSION_TYPE === 'wayland' || !process.env.DISPLAY)) throw new Error('Global tracking requires Windows, macOS, or a Linux X11 desktop.');
  if (!hook) {
    hook = require('uiohook-napi').uIOhook;
    for (const type of ['keydown', 'keyup', 'mousedown', 'wheel', 'mousemove']) hook.on(type, (event) => tracker.input(type, type.startsWith('key') ? event.keycode : undefined));
  }
  hook.start(); tracker.start(); publish();
}
async function sync() {
  if (!session || syncing) return;
  syncing = true;
  const account = session;
  try {
    persist();
    await cloud('activity', 'PUT', { deviceId: store.deviceId, revision, days: tracker.snapshot() }, account.token);
    if (session === account) syncMessage = `Synced at ${new Date().toLocaleTimeString()}.`;
  } catch (error) {
    if (session === account) {
      if (error.status === 401) {
        pause(); store.clear(account.userId); await setAccount(null);
        syncMessage = 'Connection expired or was revoked. Reconnect to continue.';
      } else syncMessage = 'Offline — activity is saved on this computer and will retry automatically.';
    }
  } finally { syncing = false; publish(); }
}
async function connect() {
  const verifier = randomBytes(32).toString('base64url'), state = randomBytes(32).toString('base64url');
  pendingLogin = { verifier, state, createdAt: Date.now() };
  const url = new URL('/desktop/connect', site);
  url.searchParams.set('challenge', sha(verifier)); url.searchParams.set('state', state);
  await shell.openExternal(url.href);
  syncMessage = 'Finish signing in in your browser, then return here.'; publish();
}
async function handleLink(link) {
  try {
    const url = new URL(link), login = pendingLogin;
    if (url.protocol !== 'predict360:' || url.hostname !== 'auth' || (url.pathname && url.pathname !== '/') || !login || Date.now() - login.createdAt > 300000 || url.searchParams.get('state') !== login.state) return;
    pendingLogin = null;
    const account = await cloud('exchange', 'POST', { code: url.searchParams.get('code'), verifier: login.verifier }, null);
    const remote = await cloud('activity', 'GET', undefined, account.token);
    const own = remote.days.filter((row) => row.device_id === store.deviceId && validateDay(row.summary).length === 0);
    pause();
    store.save(account.userId, own.map((row) => row.summary), Math.max(0, ...own.map((row) => row.revision)));
    await setAccount(account);
    syncMessage = 'Connected. Choose Start tracking when you are ready.';
    win.show(); win.focus(); publish();
  } catch { syncMessage = 'Could not connect. Click Connect account and try again.'; publish(); }
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (event, argv) => {
    const link = argv.find((arg) => arg.startsWith('predict360://'));
    if (link) handleLink(link);
    if (win) { win.show(); win.focus(); }
  });
  app.on('open-url', (event, url) => { event.preventDefault(); handleLink(url); });
  app.whenReady().then(async () => {
    store = createStore(app.getPath('userData'), validateDay);
    credentialsAvailable = await safeStorage.isAsyncEncryptionAvailable();
    if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text') credentialsAvailable = false;
    if (secureCredentials()) {
      try { const saved = read(sessionFile(), {}), decrypted = await safeStorage.decryptStringAsync(Buffer.from(saved.encrypted, 'base64')), account = JSON.parse(decrypted.result); if (new Date(account.expiresAt).getTime() > Date.now()) await setAccount(account); } catch { }
    }
    if (process.defaultApp) app.setAsDefaultProtocolClient('predict360', process.execPath, [path.resolve(process.argv[1])]);
    else app.setAsDefaultProtocolClient('predict360');
    Menu.setApplicationMenu(null);
    win = new BrowserWindow({ width: 520, height: 800, minWidth: 420, minHeight: 600, title: 'Predict 360', icon: path.join(assets, 'icon.png'),
      backgroundColor: nativeTheme.shouldUseDarkColors ? '#121110' : '#f7f5f0', autoHideMenuBar: true, titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden', trafficLightPosition: { x: 18, y: 18 },
      // Windows/Linux: draw native window controls over the app's own title bar so there is one seamless header.
      ...(process.platform !== 'darwin' && { titleBarOverlay: { color: nativeTheme.shouldUseDarkColors ? '#121110' : '#f7f5f0', symbolColor: nativeTheme.shouldUseDarkColors ? '#f4f1ea' : '#1c1b19', height: 52 } }),
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event) => event.preventDefault());
    win.loadFile(path.join(__dirname, 'index.html'), { query: { platform: process.platform } });
    win.on('close', (event) => { if (tracker.running && !quitting) { event.preventDefault(); win.hide(); } else if (!quitting) app.quit(); });
    tray = new Tray(path.join(assets, 'icon.png'));
    tray.on('double-click', () => win.show());
    const action = (name, fn) => ipcMain.handle(name, async (event, ...args) => {
      if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error('Untrusted frame');
      try { await fn(...args); return { ok: true, state: state() }; } catch (error) { return { ok: false, message: error.message }; }
    });
    action('activity:get', () => {}); action('activity:start', start); action('activity:pause', pause);
    action('activity:connect', connect); action('activity:sync', sync);
    action('activity:energy', (value) => { if (![null, 'low', 'steady', 'good'].includes(value)) throw new Error('Choose an energy option.'); energy = value; publish(); });
    action('activity:explain', async () => {
      const days = tracker.snapshot(), today = localDate(Date.now());
      const day = days.find((entry) => entry.date === today);
      if (!day || !day.buckets.some((bucket) => bucket.trackedMs > 0)) throw new Error('Track some activity first.');
      if (!session) throw new Error('Connect your account to request an explanation.');
      const response = await fetch(new URL('/api/activity/explain', site), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ day, baseline: { days: days.filter((entry) => entry.date < today).slice(-3) } }), signal: AbortSignal.timeout(25000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Could not explain your day.');
      aiText = result.text; publish();
    });
    action('activity:website', () => shell.openExternal(new URL('/app', site).href));
    action('activity:disconnect', async () => { pause(); if (session) { await sync(); if (session) { await cloud('session', 'DELETE'); store.clear(session.userId); } } await setAccount(null); syncMessage = 'Disconnected. Synced history remains on the website.'; publish(); });
    action('activity:delete', async () => {
      const choice = await dialog.showMessageBox(win, { type: 'warning', buttons: ['Cancel', 'Delete activity'], defaultId: 0, cancelId: 0, message: 'Delete activity from this computer and your account?', detail: 'Tracking will stop on all connected desktops. They will need to reconnect.' });
      if (choice.response !== 1) return;
      pause(); if (session) { await cloud('activity', 'DELETE'); store.clear(session.userId); }
      tracker.clear(); await setAccount(null); syncMessage = 'Activity deleted. Reconnect to start again.'; publish();
    });
    powerMonitor.on('suspend', pause); powerMonitor.on('lock-screen', pause);
    setInterval(() => { if (tracker.running) { persist(); publish(); } }, 5000).unref();
    setInterval(sync, 60000).unref();
    publish(); if (session) sync();
  });
  app.on('before-quit', () => { quitting = true; tracker.pause(); hook?.stop(); if (store) persist(); });
}
