'use strict';

const { EventEmitter } = require('node:events');
const HOUR = 3600000;
const IDLE_MS = 60000;
const localDate = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

class ActivityTracker extends EventEmitter {
  constructor({ now = Date.now, days = [] } = {}) {
    super();
    this.now = now;
    this.days = structuredClone(days);
    this.running = false;
    this.cursor = 0;
    this.activeUntil = 0;
    this.held = new Set();
  }
  bucket(ms) {
    const date = localDate(ms);
    let day = this.days.find((entry) => entry.date === date);
    if (!day) {
      day = { date, buckets: [] };
      this.days.push(day);
      this.days.sort((a, b) => a.date.localeCompare(b.date));
      this.days = this.days.slice(-30);
    }
    const hour = new Date(ms).getHours();
    let bucket = day.buckets.find((entry) => entry.hour === hour);
    if (!bucket) {
      bucket = { hour, clicks: 0, keyPresses: 0, scrollEvents: 0, trackedMs: 0, activeMs: 0 };
      day.buckets.push(bucket);
    }
    return bucket;
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.cursor = this.now();
    this.activeUntil = 0;
    this.held.clear();
  }
  tick() {
    if (!this.running) return;
    const now = this.now();
    // Sleep and clock changes never become hours of fake monitored time.
    if (now < this.cursor || now - this.cursor > 30000) {
      this.cursor = now;
      this.activeUntil = 0;
      this.held.clear();
      return;
    }
    while (this.cursor < now) {
      const date = new Date(this.cursor);
      const boundary = new Date(date);
      boundary.setMinutes(60, 0, 0);
      const end = Math.min(now, boundary.getTime());
      const bucket = this.bucket(this.cursor);
      bucket.trackedMs += end - this.cursor;
      bucket.activeMs += Math.max(0, Math.min(end, this.activeUntil) - this.cursor);
      this.cursor = end;
    }
  }
  input(type, keycode) {
    if (!this.running) return;
    this.tick();
    const now = this.now();
    if (type === 'keyup') { this.held.delete(keycode); return; }
    this.activeUntil = now + IDLE_MS;
    if (type === 'keydown') {
      if (this.held.has(keycode)) return;
      this.held.add(keycode); // used only to discard repeat; never persisted
      this.bucket(now).keyPresses++;
    } else if (type === 'mousedown') this.bucket(now).clicks++;
    else if (type === 'wheel') this.bucket(now).scrollEvents++;
    // mousemove marks activity but neither coordinates nor event histories survive.
  }
  pause() {
    this.tick();
    this.running = false;
    this.activeUntil = 0;
    this.held.clear();
  }
  snapshot() { this.tick(); return structuredClone(this.days); }
  clear() { this.pause(); this.days = []; }
}

module.exports = { ActivityTracker, localDate, IDLE_MS };
