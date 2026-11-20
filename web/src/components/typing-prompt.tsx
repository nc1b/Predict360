import * as React from 'react';
import { MousePointerClick } from 'lucide-react';
import type { KeystrokeRecorder } from '@/lib/capture';
import { cn } from '@/lib/utils';

export interface TypingStats {
  /** Words per minute from correctly typed characters (5 characters = 1 word). */
  wpm: number;
  /** Share of letter keypresses that matched the prompt, 0..100. */
  accuracy: number;
  /** Seconds from the first keypress to the last. */
  seconds: number;
}

const MAX_EXTRA = 8;

/**
 * Copy-typing view for the daily check-in. The prompt sits in place, letters light up
 * as they are typed, mistakes turn red, and a smooth caret leads the way. Key timing
 * goes to the shared KeystrokeRecorder; the typed text never leaves this component.
 */
export function TypingPrompt({
  text,
  recorder,
  disabled,
  onCount,
  onComplete,
  onRestart,
}: {
  text: string;
  recorder: KeystrokeRecorder;
  disabled?: boolean;
  onCount?: (count: number) => void;
  onComplete?: (stats: TypingStats) => void;
  /** Tab pressed: the parent should reset the recorder and remount this component. */
  onRestart?: () => void;
}) {
  const words = React.useMemo(() => text.split(' '), [text]);
  const [typed, setTypedState] = React.useState<string[]>(['']);
  const typedRef = React.useRef<string[]>(['']);
  const [focused, setFocused] = React.useState(false);
  const [idle, setIdle] = React.useState(true);
  const [started, setStarted] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [, setTick] = React.useState(0);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const caretRef = React.useRef<HTMLSpanElement>(null);
  const startedAt = React.useRef<number | null>(null);
  const lastAt = React.useRef(0);
  const presses = React.useRef({ total: 0, correct: 0 });
  const idleTimer = React.useRef<number | undefined>(undefined);
  const keyHandled = React.useRef(false);
  const doneRef = React.useRef(false);

  const setTyped = (next: string[]) => {
    typedRef.current = next;
    setTypedState(next);
  };

  const wordIndex = typed.length - 1;
  const current = typed[wordIndex];

  const measure = React.useCallback(
    (at: number, list: string[]): TypingStats => {
      let correctChars = 0;
      list.forEach((w, i) => {
        if (w === words[i]) correctChars += w.length + (i < list.length - 1 ? 1 : 0);
      });
      const seconds = startedAt.current === null ? 0 : (at - startedAt.current) / 1000;
      const { total, correct } = presses.current;
      return {
        wpm: seconds > 1 ? Math.round(correctChars / 5 / (seconds / 60)) : 0,
        accuracy: total ? Math.round((correct / total) * 100) : 100,
        seconds: Math.max(1, Math.round(seconds)),
      };
    },
    [words]
  );

  const focus = React.useCallback(() => inputRef.current?.focus({ preventScroll: true }), []);

  React.useEffect(() => {
    if (!disabled) focus();
  }, [disabled, focus]);

  // "Press any key to focus": a letter typed while focus is elsewhere in the dialog
  // pulls focus back to the prompt (Space and Enter still work on buttons).
  React.useEffect(() => {
    if (focused || done || disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) focus();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [focused, done, disabled, focus]);

  // Refresh the live WPM a few times a second once typing has started.
  React.useEffect(() => {
    if (!started || done) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [started, done]);

  React.useEffect(() => () => window.clearTimeout(idleTimer.current), []);

  // Place the caret before the next letter, or just after the last one.
  React.useLayoutEffect(() => {
    const box = boxRef.current;
    const caret = caretRef.current;
    if (!box || !caret) return;
    const word = box.querySelector<HTMLElement>(`[data-word="${wordIndex}"]`);
    const letters = word?.querySelectorAll<HTMLElement>('[data-letter]');
    if (!word || !letters?.length) return;
    const i = current.length;
    const el = letters[Math.min(i, letters.length - 1)];
    const x = word.offsetLeft + (i < letters.length ? el.offsetLeft : el.offsetLeft + el.offsetWidth);
    const h = el.offsetHeight * 0.66;
    const y = word.offsetTop + el.offsetTop + (el.offsetHeight - h) / 2;
    caret.style.transform = `translate(${x - 1.5}px, ${y}px)`;
    caret.style.height = `${h}px`;
  }, [current, wordIndex, focused, words]);

  const markActive = () => {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), 700);
  };

  const finish = (list: string[]) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    recorder.releaseAll();
    onComplete?.(measure(lastAt.current, list));
  };

  const insert = (ch: string) => {
    if (doneRef.current) return;
    const list = typedRef.current;
    const wi = list.length - 1;
    const cur = list[wi];
    const t = performance.now();
    if (startedAt.current === null) {
      startedAt.current = t;
      setStarted(true);
    }
    lastAt.current = t;
    markActive();

    if (ch === ' ' || ch === '\n') {
      if (cur.length === 0) return; // A space before any letters does nothing.
      if (wi === words.length - 1) return finish(list);
      setTyped([...list, '']);
      return;
    }
    const target = words[wi] ?? '';
    if (cur.length >= target.length + MAX_EXTRA) return;
    presses.current.total += 1;
    if (target[cur.length] === ch) presses.current.correct += 1;
    const next = [...list.slice(0, -1), cur + ch];
    setTyped(next);
    if (wi === words.length - 1 && cur + ch === target) finish(next);
  };

  const erase = (wholeWord: boolean) => {
    if (doneRef.current) return;
    markActive();
    const list = typedRef.current;
    const cur = list[list.length - 1];
    if (cur.length > 0) setTyped([...list.slice(0, -1), wholeWord ? '' : cur.slice(0, -1)]);
    else if (list.length > 1) setTyped(wholeWord ? [...list.slice(0, -2), ''] : list.slice(0, -1));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || doneRef.current) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      onRestart?.();
      return;
    }
    if (e.key === 'Escape') return; // Let the dialog handle it.
    recorder.keyDown(e.nativeEvent);
    onCount?.(recorder.count);
    keyHandled.current = true;
    if (e.key === 'Backspace') {
      e.preventDefault();
      erase(e.ctrlKey || e.altKey || e.metaKey);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      insert(e.key);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      insert(' ');
    } else {
      // Phone keyboards report "Unidentified"/"Process"; the input event handles those.
      keyHandled.current = false;
    }
  };

  // Fallback for virtual keyboards: read what was inserted, then clear the field.
  const onInput = (e: React.FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const value = el.value;
    el.value = '';
    if (keyHandled.current || disabled) return;
    const ev = e.nativeEvent as InputEvent;
    if (ev.inputType?.startsWith('delete')) erase(false);
    else for (const ch of value) insert(ch);
  };

  const live = measure(performance.now(), typed);
  const showOverlay = !focused && !done && !disabled;
  const wordsDone = Math.min(done ? words.length : wordIndex, words.length);

  return (
    <div className="relative">
      <div className="mb-3 flex h-8 items-end gap-5 tabular-nums">
        <span className="text-2xl font-semibold leading-none text-emerald-700 dark:text-emerald-400">
          {wordsDone}
          <span className="text-muted-foreground/50">/{words.length}</span>
        </span>
        {started ? (
          <>
            <span className="text-sm text-muted-foreground">
              <span className="text-lg font-semibold text-foreground">{live.wpm}</span> wpm
            </span>
            <span className="text-sm text-muted-foreground">
              <span className="text-lg font-semibold text-foreground">{live.accuracy}%</span> acc
            </span>
          </>
        ) : (
          <span className="pb-0.5 text-sm text-muted-foreground">Start typing when you&apos;re ready</span>
        )}
      </div>

      <div
        ref={boxRef}
        aria-hidden="true"
        onMouseDown={(e) => {
          e.preventDefault();
          focus();
        }}
        className={cn(
          'relative flex cursor-text select-none flex-wrap text-[1.45rem] font-medium leading-[1.7] tracking-[-0.01em] transition-[filter,opacity] duration-200 sm:text-[1.7rem]',
          showOverlay && 'opacity-35 blur-[3px]'
        )}
      >
        {words.map((word, wi) => {
          const input = typed[wi];
          const isPast = wi < wordIndex || (done && wi === wordIndex);
          const extra = input && input.length > word.length ? input.slice(word.length) : '';
          const missed = isPast && input !== word;
          return (
            <span
              key={wi}
              data-word={wi}
              className={cn(
                'relative mr-[0.3em] inline-flex',
                missed && 'underline decoration-destructive/70 decoration-2 underline-offset-[0.3em]'
              )}
            >
              {Array.from(word).map((ch, ci) => {
                const got = input?.[ci];
                return (
                  <span
                    key={ci}
                    data-letter
                    className={cn(
                      'transition-colors duration-75',
                      got === undefined ? 'text-muted-foreground/45' : got === ch ? 'text-foreground' : 'text-destructive'
                    )}
                  >
                    {ch}
                  </span>
                );
              })}
              {Array.from(extra).map((ch, ci) => (
                <span key={`x${ci}`} data-letter className="text-destructive/60">
                  {ch}
                </span>
              ))}
            </span>
          );
        })}

        {!done && (
          <span
            ref={caretRef}
            className={cn(
              'pointer-events-none absolute left-0 top-0 w-[3px] rounded-full bg-emerald-600 shadow-[0_0_14px_rgba(52,165,134,0.75)] transition-transform duration-100 ease-out dark:bg-emerald-400',
              idle && 'animate-[caretBlink_1.05s_ease-in-out_infinite]',
              !focused && 'opacity-0'
            )}
          />
        )}
      </div>

      {showOverlay && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            focus();
          }}
          onClick={focus}
          className="absolute inset-x-0 bottom-0 top-11 flex cursor-pointer items-center justify-center gap-2 text-sm font-medium text-foreground focus-visible:outline-none"
        >
          <MousePointerClick className="size-4" aria-hidden="true" />
          Click here or press any key to focus
        </button>
      )}

      <input
        ref={inputRef}
        aria-label={`Type this: ${text}`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={disabled}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => {
          recorder.keyUp(e.nativeEvent);
          keyHandled.current = false;
        }}
        onInput={onInput}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          recorder.releaseAll();
        }}
        className="absolute left-0 top-0 size-px opacity-0"
      />
    </div>
  );
}
