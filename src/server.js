'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;

// If the frontend has been built (npm run build), serve it from the same port.
const dist = path.join(__dirname, '..', 'web', 'dist');
const staticDir = fs.existsSync(path.join(dist, 'index.html')) ? dist : null;

const app = createApp({ log: (line) => console.log(line), staticDir });

app.listen(port, () => {
  console.log(`Predict 360 listening on http://localhost:${port}`);
  console.log(staticDir ? 'Serving the built frontend from web/dist.' : 'API only (run "npm run build" to serve the frontend too).');
});
