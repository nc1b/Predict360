'use strict';
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
async function main() {
  const root = path.join(__dirname, '..'), target = path.join(root, 'desktop/assets');
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(path.join(root, 'web/public/logo.svg'), path.join(target, 'logo.svg'));
  fs.copyFileSync(path.join(root, 'config/public.json'), path.join(target, 'public.json'));
  fs.copyFileSync(path.join(root, 'src/activity.js'), path.join(target, 'activity-analyzer.cjs'));
  const workday = fs.readFileSync(path.join(root, 'src/workday.mjs'), 'utf8').replace('export function createWorkdayPlan', 'function createWorkdayPlan');
  fs.writeFileSync(path.join(target, 'workday.cjs'), workday + '\nmodule.exports = { createWorkdayPlan };\n');
  const svg = fs.readFileSync(path.join(root, 'web/public/icon.svg'), 'utf8').replace(/<style>.*?<\/style>/s, '').replace('<g stroke-width', '<g stroke="#000" stroke-width');
  const png = path.join(target, 'icon.png');
  await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(png);
  const pngToIco = (await import('png-to-ico')).default;
  fs.writeFileSync(path.join(target, 'icon.ico'), await pngToIco(png));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
