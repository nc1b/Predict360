'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const config = require('../config/public.json');
async function main() {
  const oidc = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
  oidc.searchParams.set('audience', 'predict360-releases');
  const response = await fetch(oidc, { headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` } });
  if (!response.ok) throw new Error('Could not get the release identity.');
  const { value: token } = await response.json();
  const directory = path.join(__dirname, '../desktop/release');
  const files = fs.readdirSync(directory).filter((name) => /^Predict360-.*\.exe$/.test(name));
  if (files.length !== 1) throw new Error('Expected one Windows installer.');
  const filename = files[0], bytes = fs.readFileSync(path.join(directory, filename));
  const version = `${require('../desktop/package.json').version}-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`;
  const parts = [];
  async function upload(key, data, contentType) {
    const res = await fetch(`${config.cloudUrl}?route=release&path=${encodeURIComponent(key)}`, { method: 'PUT', headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}`, 'Content-Type': contentType }, body: data, signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error(`Release upload failed (${res.status}).`);
  }
  for (let offset = 0, index = 0; offset < bytes.length; offset += 40 * 1024 * 1024, index++) {
    const chunk = bytes.subarray(offset, offset + 40 * 1024 * 1024), key = `windows/${version}/part-${index}`;
    await upload(key, chunk, 'application/octet-stream'); parts.push({ path: key, size: chunk.length });
  }
  const manifest = { filename, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), parts };
  await upload('windows/latest.json', JSON.stringify(manifest), 'application/json');
  console.log(`Published ${filename} to Supabase Storage (${parts.length} parts).`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
