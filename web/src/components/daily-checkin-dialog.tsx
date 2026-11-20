import * as React from 'react';
import { ArrowLeft, ArrowRight, BatteryFull, BatteryLow, BatteryMedium, Check, Flame, Gauge, Keyboard, Lock, RotateCcw, Target, X } from 'lucide-react';
import type { Energy } from '../../../src/workday.mjs';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/result-card';
import { TypingPrompt, type TypingStats } from '@/components/typing-prompt';
import { KeystrokeRecorder, type Keystroke } from '@/lib/capture';
import { sentencesFor } from '@/lib/daily-sentences';
import { MIN_BASELINE_SESSIONS } from '@/lib/history';
import type { AnalyzeResponse } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface CheckInOutcome {
  result: AnalyzeResponse;
  saved: boolean;
  baselineCount: number;
  streak: number;
}

type Step = 'feel' | 'type' | 'done';

const ENERGY_OPTIONS = [
  { value: 'low', label: 'Running low', icon: BatteryLow },
  { value: 'steady', label: 'About usual', icon: BatteryMedium },
  { value: 'good', label: 'Feeling good', icon: BatteryFull },
] as const;

const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

export function DailyCheckInDialog({
  open,
  name,
  streak,
  energy,
  onEnergy,
  onSubmit,
  onClose,
}: {
  open: boolean;
  name: string;
  streak: number;
  energy: Energy;
  onEnergy: (energy: Energy) => void;
  onSubmit: (keystrokes: Keystroke[]) => Promise<CheckInOutcome>;
  /** `finished` is true when the user completed the flow rather than choosing "Not now". */
  onClose: (finished: boolean) => void;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const recorder = React.useRef(new KeystrokeRecorder());
  const [step, setStep] = React.useState<Step>('feel');
  const [prompt, setPrompt] = React.useState(() => sentencesFor());
  const [attempt, setAttempt] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [outcome, setOutcome] = React.useState<CheckInOutcome | null>(null);
  const [typing, setTyping] = React.useState<TypingStats | null>(null);

  const reset = () => {
    recorder.current.reset();
    setCount(0);
    setAttempt((a) => a + 1); // Remounts the prompt with a clean slate.
  };

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setStep('feel');
      setOutcome(null);
      setTyping(null);
      setError('');
      setPrompt(sentencesFor()); // Picks up a new day's pair if the tab stayed open overnight.
      reset();
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && dialog.open) dialog.close();
  }, [open]);

  async function finish(stats?: TypingStats) {
    if (stats) setTyping(stats);
    const keystrokes = recorder.current.finish();
    if (keystrokes.length === 0) {
      setError('No typing was timed. Type on a physical keyboard; pasted or dictated text has no key timing.');
      reset();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const next = await onSubmit(keystrokes);
      reset();
      if (!next.saved) {
        setError(
          next.result.features.sentencePauseMs.samples === 0
            ? 'That needs both sentences: type through the period and on into the second one.'
            : 'That was too short to measure. Type both sentences through to the end.'
        );
        return;
      }
      setOutcome(next);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const finished = step === 'done';
  const close = () => onClose(finished);

  return (
    <dialog
      ref={ref}
      aria-labelledby="daily-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-[2rem] border border-border/70 bg-card p-0 text-card-foreground shadow-2xl transition-[max-width] duration-300 backdrop:bg-[#0f0f0f]/60 backdrop:backdrop-blur-sm open:animate-[dialogIn_0.25s_ease-out]',
        step === 'type' ? 'max-w-3xl' : 'max-w-lg'
      )}
    >
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          {(['feel', 'type', 'done'] as const).map((s, i) => (
            <span
              key={s}
              aria-hidden="true"
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                s === step ? 'w-6 bg-foreground' : i < ['feel', 'type', 'done'].indexOf(step) ? 'w-1.5 bg-foreground' : 'w-1.5 bg-track'
              )}
            />
          ))}
          <span className="ml-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Daily check-in</span>
        </div>
        <button
          type="button"
          onClick={close}
          disabled={busy}
          aria-label="Close"
          className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-6 py-6">
        {step === 'feel' && (
          <>
            <p className="text-sm text-muted-foreground">{dayFormat.format(new Date())}</p>
            <h2 id="daily-title" className="mt-1 font-display text-4xl leading-tight">
              Hi {name}, how&apos;s your energy?
            </h2>
            {streak > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Flame className="size-4 text-some-foreground" aria-hidden="true" />
                {streak}-day streak. Check in today to keep it going.
              </p>
            )}
            <div className="mt-5 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Your energy right now">
              {ENERGY_OPTIONS.map(({ value, label, icon: Icon }) => {
                const on = energy === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onEnergy(on ? null : value)}
                    className={cn(
                      'flex cursor-pointer flex-col items-center gap-2 rounded-3xl border px-2 py-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      on ? 'border-foreground bg-foreground text-background' : 'hover:bg-accent'
                    )}
                  >
                    <Icon className="size-6" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Optional. Your answer stays on this device and is never shared.</p>
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={close}>
                Not now
              </Button>
              <Button variant="brand" data-autofocus onClick={() => setStep('type')}>
                Next <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </>
        )}

        {step === 'type' && (
          <>
            <p className="text-sm text-muted-foreground">{dayFormat.format(new Date())}</p>
            <h2 id="daily-title" className="mt-1 font-display text-3xl leading-tight">
              Today&apos;s two sentences
            </h2>
            <p id="daily-help" className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Type them at your usual pace. Typos are fine; only your key timing is measured. Takes about 30 seconds.
            </p>
            <div className="mt-6 rounded-3xl border border-border/70 bg-background/60 px-5 py-5 sm:px-7 sm:py-6">
              <TypingPrompt
                key={attempt}
                text={prompt}
                recorder={recorder.current}
                disabled={busy}
                onCount={setCount}
                onComplete={(stats) => void finish(stats)}
                onRestart={reset}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span id="daily-privacy" className="inline-flex items-center gap-1.5">
                <Lock className="size-3.5" aria-hidden="true" /> Only key timing is kept. Nothing you type is stored.
              </span>
              <span className="inline-flex items-center gap-3 tabular-nums">
                <span className="hidden items-center gap-1.5 sm:inline-flex">
                  <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-semibold text-foreground">tab</kbd>
                  restart
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Keyboard className="size-3.5" aria-hidden="true" /> {count} timed
                </span>
              </span>
            </div>
            {error && (
              <p role="alert" className="mt-3 rounded-xl bg-some px-3 py-2 text-sm text-some-foreground">
                {error}
              </p>
            )}
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => setStep('feel')} disabled={busy}>
                <ArrowLeft className="size-4" aria-hidden="true" /> Back
              </Button>
              <div className="flex gap-2">
                {count > 0 && (
                  <Button variant="ghost" onClick={reset} disabled={busy}>
                    <RotateCcw className="size-4" aria-hidden="true" /> Start over
                  </Button>
                )}
                <Button variant="brand" onClick={() => void finish()} disabled={busy || count === 0}>
                  {busy ? 'Analyzing…' : 'Finish check-in'}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'done' && outcome && (
          <div className="text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-near text-near-foreground">
              <Check className="size-7" aria-hidden="true" />
            </span>
            <h2 id="daily-title" className="mt-4 font-display text-4xl">
              You&apos;re checked in
            </h2>
            {outcome.result.readinessScore !== null ? (
              <div className="mt-4 flex items-center justify-center gap-3">
                <span className="font-display text-6xl tabular-nums">{outcome.result.readinessScore}</span>
                <StatusBadge status={outcome.result.status} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {outcome.baselineCount >= MIN_BASELINE_SESSIONS
                  ? 'Your baseline is ready. Tomorrow’s check-in gets a score.'
                  : `Baseline ${Math.min(outcome.baselineCount, MIN_BASELINE_SESSIONS)} of ${MIN_BASELINE_SESSIONS}. Scores start once it has ${MIN_BASELINE_SESSIONS} check-ins.`}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium">
                <Flame className="size-4 text-some-foreground" aria-hidden="true" />
                {outcome.streak}-day streak
              </p>
              {typing && (
                <>
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium tabular-nums">
                    <Gauge className="size-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    {typing.wpm} wpm
                  </p>
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium tabular-nums">
                    <Target className="size-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                    {typing.accuracy}% accuracy
                  </p>
                </>
              )}
            </div>
            <div className="mt-6">
              <Button variant="brand" className="w-full" size="lg" onClick={close}>
                See my dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
