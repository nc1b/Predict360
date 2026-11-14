'use strict';

// Writes the synthetic fixtures as JSON so they can be sent with curl or loaded
// by the future frontend. Output is deterministic; rerunning produces identical files.

const fs = require('node:fs');
const path = require('node:path');
const { fixtures, baselineSessions, requestFor } = require('../fixtures/synthetic');

const outDir = path.join(__dirname, '..', 'fixtures', 'json');
fs.mkdirSync(outDir, { recursive: true });

const write = (file, data) => {
  fs.writeFileSync(path.join(outDir, file), JSON.stringify(data) + '\n');
  console.log(`wrote fixtures/json/${file}`);
};

write('baseline.json', { sessions: baselineSessions() });
for (const f of fixtures()) {
  write(`${f.name}.request.json`, requestFor(f.name));
}
