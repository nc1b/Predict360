import * as React from 'react';
import { ArrowLeft, ArrowRight, BatteryFull, BatteryLow, BatteryMedium, Check, Flame, Keyboard, Lock, X } from 'lucide-react';
import type { Energy } from '../../../src/workday.mjs';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/result-card';
import { KeystrokeRecorder, type Keystroke } from '@/lib/capture';
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
  const textRef = React.useRef<HTMLTextAreaElement>(null);
  const [step, setStep] = React.useState<Step>('feel');
  const [text, setText] = React.useState('');
  const [count, setCount] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [outcome, setOutcome] = React.useState<CheckInOutcome | null>(null);

  const reset = () => {
    recorder.current.reset();
    setText('');
    setCount(0);
  };

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setStep('feel');
      setOutcome(null);
      setError('');
      reset();
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && dialog.open) dialog.close();
  }, [open]);

  React.useEffect(() => {
    if (step === 'type') textRef.current?.focus();
  }, [step]);

  async function finish() {
    const keystrokes = recorder.current.finish();
    if (keystrokes.length === 0) {
      setError('No typing was timed. Type on a physical keyboard; pasted or dictated text has no key timing.');
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
            ? 'That needs two sentences: end the first with a period, then keep typing.'
            : 'That was too short to measure. Try two full sentences (about 20 keystrokes or more).'
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
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-[2rem] border border-border/70 bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-[#1c1b19]/40 backdrop:backdrop-blur-sm open:animate-[dialogIn_0.25s_ease-out]"
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
            <h2 id="daily-title" className="font-display text-4xl leading-tight">
              Type two sentences
            </h2>
            <p id="daily-help" className="mt-1 text-sm leading-relaxed text-muted-foreground">
              About how your day or shift is going. End the first with a period, then keep typing. Takes about 30 seconds.
            </p>
            <textarea
              ref={textRef}
              value={text}
              rows={4}
              aria-label="Your two sentences"
              aria-describedby="daily-help daily-privacy"
              placeholder="Slept okay, a bit slow to get going. Coffee is helping and I have a plan for the day."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                recorder.current.keyDown(e.nativeEvent);
                setCount(recorder.current.count);
              }}
              onKeyUp={(e) => recorder.current.keyUp(e.nativeEvent)}
              onBlur={() => recorder.current.releaseAll()}
              className="mt-4 w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-base leading-relaxed placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span id="daily-privacy" className="inline-flex items-center gap-1.5">
                <Lock className="size-3.5" aria-hidden="true" /> Your words never leave this box.
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Keyboard className="size-3.5" aria-hidden="true" /> {count} timed
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
                  <Button variant="ghost" onClick={() => { reset(); textRef.current?.focus(); }} disabled={busy}>
                    Start over
                  </Button>
                )}
                <Button variant="brand" onClick={finish} disabled={busy || count === 0}>
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
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium">
              <Flame className="size-4 text-some-foreground" aria-hidden="true" />
              {outcome.streak}-day streak
            </p>
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
