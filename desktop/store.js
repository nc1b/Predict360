'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
function atomicWrite(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  const temp = `${filename}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value), { mode: 0o600 });
  fs.renameSync(temp, filename);
}
function read(filename, fallback) { try { return JSON.parse(fs.readFileSync(filename, 'utf8')); } catch { return fallback; } }
function createStore(directory, validateDay) {
  const deviceFile = path.join(directory, 'device.json');
  let deviceId = read(deviceFile, {}).id;
  if (!/^[a-f0-9-]{36}$/.test(deviceId || '')) { deviceId = randomUUID(); atomicWrite(deviceFile, { id: deviceId }); }
  const filename = (user) => path.join(directory, `activity-${createHash('sha256').update(user).digest('hex').slice(0, 24)}.json`);
  return {
    deviceId,
    load(user) {
      const saved = read(filename(user), {});
      return { revision: Number.isSafeInteger(saved.revision) && saved.revision >= 0 ? saved.revision : 0,
        days: Array.isArray(saved.days) ? saved.days.filter((day) => validateDay(day).length === 0).slice(-30) : [] };
    },
    save(user, days, revision) { atomicWrite(filename(user), { days, revision }); },
    clear(user) { fs.rmSync(filename(user), { force: true }); },
  };
}
module.exports = { createStore, atomicWrite, read };
