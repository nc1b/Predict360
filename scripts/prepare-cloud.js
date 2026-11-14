'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const target = path.join(root, 'supabase/functions/predict360-sync');
for (const name of ['activity', 'validate', 'config']) {
  const source = fs.readFileSync(path.join(root, `src/${name}.js`), 'utf8')
    .replace(/const (\{[^}]+\}) = require\('\.\/config'\);/, "import $1 from './config.mjs';")
    .replace('module.exports = ', 'export ');
  fs.writeFileSync(path.join(target, `${name}.mjs`), source);
  fs.rmSync(path.join(target, `${name}.cjs`), { force: true });
}
fs.copyFileSync(path.join(root, 'src/cloud-core.mjs'), path.join(target, 'cloud-core.mjs'));
