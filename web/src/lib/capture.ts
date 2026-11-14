// Keystroke timing capture for the journal field.
//
// Only a coarse `kind` and two relative timestamps are kept per key. The key's
// value is read once to classify it and then discarded; it is never stored.

export type Kind = 'character' | 'space' | 'sentence_end' | 'edit';

export interface Keystroke {
  kind: Kind;
  downMs: number;
  upMs: number;
}

/** The parts of a KeyboardEvent the recorder needs. */
export interface KeyLike {
  key: string;
  code?: string;
  repeat?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
}

export const MAX_EVENTS = 5000;

/** Map a key to an event kind, or null for keys that are not recorded. */
export function classifyKey(e: KeyLike): Kind | null {
  if (e.isComposing) return null;
  // Shortcuts (Ctrl+C, Cmd+V). Ctrl+Alt together is AltGr, which types characters.
  if (e.metaKey || (e.ctrlKey && !e.altKey)) return null;
  const key = e.key;
  if (key === 'Backspace' || key === 'Delete') return 'edit';
  if (key === ' ' || key === 'Spacebar' || key === 'Enter') return 'space';
  if (key === '.' || key === '?' || key === '!') return 'sentence_end';
  // Printable keys have a one-character value; Shift, arrows, Tab etc. do not.
  if (key.length === 1) return 'character';
  return null;
}

export class KeystrokeRecorder {
  private events: Keystroke[] = [];
  private open = new Map<string, Keystroke>();
  private startedAt: number | null = null;
  private now: () => number;

  constructor(now: () => number = () => performance.now()) {
    this.now = now;
  }

  private elapsed(): number {
    const t = this.now();
    if (this.startedAt === null) this.startedAt = t;
    return Math.max(0, Math.round(t - this.startedAt));
  }

  private id(e: KeyLike): string {
    // `code` identifies the physical key, so a hold still pairs up when Shift is
    // released first and the keyup reports a different `key`.
    return e.code || e.key;
  }

  keyDown(e: KeyLike): void {
    if (e.repeat) return;
    const kind = classifyKey(e);
    if (kind === null || this.events.length >= MAX_EVENTS) return;
    const t = this.elapsed();
    const id = this.id(e);
    const stale = this.open.get(id);
    if (stale) stale.upMs = Math.max(stale.downMs, t); // its keyup was lost
    const event: Keystroke = { kind, downMs: t, upMs: t };
    this.events.push(event);
    this.open.set(id, event);
  }

  keyUp(e: KeyLike): void {
    const id = this.id(e);
    const event = this.open.get(id);
    if (!event) return;
    event.upMs = Math.max(event.downMs, this.elapsed());
    this.open.delete(id);
  }

  /** Close any keys still held, e.g. when the field loses focus. */
  releaseAll(): void {
    if (this.open.size === 0) return;
    const t = this.elapsed();
    for (const event of this.open.values()) event.upMs = Math.max(event.downMs, t);
    this.open.clear();
  }

  get count(): number {
    return this.events.length;
  }

  /** The session so far, ready to send as `keystrokes`. */
  finish(): Keystroke[] {
    this.releaseAll();
    return this.events.map((e) => ({ ...e }));
  }

  reset(): void {
    this.events = [];
    this.open.clear();
    this.startedAt = null;
  }
}
