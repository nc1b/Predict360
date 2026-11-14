'use strict';

// Load a local .env (e.g. HACKCLUB_AI_KEY) when present. On Vercel the env vars
// come from the project settings instead, so this is a no-op there.
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (err) {
    // Missing local configuration is fine; malformed/unreadable files are not.
    if (err.code !== 'ENOENT') throw err;
  }
}

const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./app');

const port = process.env.PORT === undefined ? 3000 : Number(process.env.PORT);
if (!Number.isInteger(port) || port < 0 || port > 65535 || process.env.PORT === '') {
  throw new Error('PORT must be an integer between 0 and 65535.');
}

// If the frontend has been built (npm run build), serve it from the same port.
const dist = path.join(__dirname, '..', 'web', 'dist');
const staticDir = fs.existsSync(path.join(dist, 'index.html')) ? dist : null;

const app = createApp({ log: (line) => console.log(line), staticDir });

const server = app.listen(port, () => {
  console.log(`Predict 360 listening on http://localhost:${server.address().port}`);
  console.log(staticDir ? 'Serving the built frontend from web/dist.' : 'API only (run "npm run build" to serve the frontend too).');
});

server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.on('error', (err) => {
  console.error(`Predict 360 could not start (${err.code || 'server_error'}).`);
  process.exitCode = 1;
});

// Stop accepting requests on deploy/restart, then let active requests finish.
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const timer = setTimeout(() => server.closeAllConnections(), 10000);
  timer.unref();
  server.close(() => clearTimeout(timer));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
