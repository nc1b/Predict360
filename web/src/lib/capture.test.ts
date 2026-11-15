import { describe, expect, it } from 'vitest';
import { classifyKey, KeystrokeRecorder, MAX_EVENTS } from './capture';

function recorderAt() {
  let t = 1000;
  const rec = new KeystrokeRecorder(() => t);
  return { rec, at: (ms: number) => (t = 1000 + ms) };
}

describe('classifyKey', () => {
  it('maps keys to kinds', () => {
    expect(classifyKey({ key: 'a' })).toBe('character');
    expect(classifyKey({ key: 'A' })).toBe('character');
    expect(classifyKey({ key: ',' })).toBe('character');
    expect(classifyKey({ key: ' ' })).toBe('space');
    expect(classifyKey({ key: 'Enter' })).toBe('space');
    expect(classifyKey({ key: '.' })).toBe('sentence_end');
    expect(classifyKey({ key: '?' })).toBe('sentence_end');
    expect(classifyKey({ key: '!' })).toBe('sentence_end');
    expect(classifyKey({ key: 'Backspace' })).toBe('edit');
    expect(classifyKey({ key: 'Delete' })).toBe('edit');
  });

  it('ignores modifiers, navigation, shortcuts and IME composition', () => {
    for (const key of ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'ArrowLeft', 'Escape', 'Unidentified']) {
      expect(classifyKey({ key })).toBeNull();
    }
    expect(classifyKey({ key: 'v', ctrlKey: true })).toBeNull();
    expect(classifyKey({ key: 'c', metaKey: true })).toBeNull();
    expect(classifyKey({ key: 'a', isComposing: true })).toBeNull();
  });

  it('keeps AltGr characters (Ctrl+Alt)', () => {
    expect(classifyKey({ key: '@', ctrlKey: true, altKey: true })).toBe('character');
  });
});

describe('KeystrokeRecorder', () => {
  it('pairs keydown and keyup with times relative to the first key', () => {
    const { rec, at } = recorderAt();
    at(0);
    rec.keyDown({ key: 'h', code: 'KeyH' });
    at(90);
    rec.keyUp({ key: 'h', code: 'KeyH' });
    at(150);
    rec.keyDown({ key: '.', code: 'Period' });
    at(240);
    rec.keyUp({ key: '.', code: 'Period' });
    expect(rec.finish()).toEqual([
      { kind: 'character', downMs: 0, upMs: 90 },
      { kind: 'sentence_end', downMs: 150, upMs: 240 },
    ]);
  });

  it('handles overlapping holds', () => {
    const { rec, at } = recorderAt();
    at(0);
    rec.keyDown({ key: 'a', code: 'KeyA' });
    at(100);
    rec.keyDown({ key: 's', code: 'KeyS' });
    at(160);
    rec.keyUp({ key: 'a', code: 'KeyA' });
    at(220);
    rec.keyUp({ key: 's', code: 'KeyS' });
    expect(rec.finish()).toEqual([
      { kind: 'character', downMs: 0, upMs: 160 },
      { kind: 'character', downMs: 100, upMs: 220 },
    ]);
  });

  it('drops auto-repeat and modifier keys', () => {
    const { rec, at } = recorderAt();
    at(0);
    rec.keyDown({ key: 'Shift', code: 'ShiftLeft' });
    at(50);
    rec.keyDown({ key: 'A', code: 'KeyA' });
    at(600);
    rec.keyDown({ key: 'A', code: 'KeyA', repeat: true });
    at(650);
    rec.keyDown({ key: 'A', code: 'KeyA', repeat: true });
    at(700);
    rec.keyUp({ key: 'A', code: 'KeyA' });
    rec.keyUp({ key: 'Shift', code: 'ShiftLeft' });
    expect(rec.finish()).toEqual([{ kind: 'character', downMs: 0, upMs: 650 }]);
  });

  it('pairs by physical key when Shift is released before the letter', () => {
    const { rec, at } = recorderAt();
    at(0);
    rec.keyDown({ key: 'A', code: 'KeyA' });
    at(80);
    rec.keyUp({ key: 'a', code: 'KeyA' });
    expect(rec.finish()).toEqual([{ kind: 'character', downMs: 0, upMs: 80 }]);
  });

  it('closes held keys on releaseAll and on finish', () => {
    const { rec, at } = recorderAt();
    at(0);
    rec.keyDown({ key: 'a', code: 'KeyA' });
    at(300);
    rec.releaseAll();
    at(500);
    rec.keyDown({ key: 'b', code: 'KeyB' });
    at(620);
    expect(rec.finish()).toEqual([
      { kind: 'character', downMs: 0, upMs: 300 },
      { kind: 'character', downMs: 500, upMs: 620 },
    ]);
  });

  it('closes a stale hold when the same key goes down again', () => {
    const { rec, at } = recorderAt();
    at(0);
    rec.keyDown({ key: 'a', code: 'KeyA' });
    at(400);
    rec.keyDown({ key: 'a', code: 'KeyA' });
    at(480);
    rec.keyUp({ key: 'a', code: 'KeyA' });
    expect(rec.finish()).toEqual([
      { kind: 'character', downMs: 0, upMs: 400 },
      { kind: 'character', downMs: 400, upMs: 480 },
    ]);
  });

  it('output always satisfies the API rules', () => {
    const { rec, at } = recorderAt();
    const keys = 'It was fine. Now I am ready!'.split('');
    let t = 0;
    for (const ch of keys) {
      at(t);
      rec.keyDown({ key: ch, code: `K${ch}${t}` });
      at(t + 130);
      rec.keyUp({ key: ch, code: `K${ch}${t}` });
      t += 90;
    }
    const out = rec.finish();
    expect(out).toHaveLength(keys.length);
    let prev = -1;
    for (const e of out) {
      expect(Object.keys(e).sort()).toEqual(['downMs', 'kind', 'upMs']);
      expect(Number.isInteger(e.downMs) && Number.isInteger(e.upMs)).toBe(true);
      expect(e.upMs).toBeGreaterThanOrEqual(e.downMs);
      expect(e.downMs).toBeGreaterThanOrEqual(prev);
      prev = e.downMs;
    }
    expect(out.filter((e) => e.kind === 'sentence_end')).toHaveLength(2);
  });

  it('stops at the API event limit and resets cleanly', () => {
    const { rec, at } = recorderAt();
    for (let i = 0; i < MAX_EVENTS + 10; i++) {
      at(i);
      rec.keyDown({ key: 'a', code: `K${i}` });
    }
    expect(rec.count).toBe(MAX_EVENTS);
    rec.reset();
    expect(rec.count).toBe(0);
    at(99999);
    rec.keyDown({ key: 'a', code: 'KeyA' });
    expect(rec.finish()[0].downMs).toBe(0);
  });
});
