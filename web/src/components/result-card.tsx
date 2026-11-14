import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AnalyzeResponse, FeatureName, Flag, Status } from '@/lib/types';

export const STATUS_LABEL: Record<Status, string> = {
  near_baseline: 'Close to your usual',
  some_deviation: 'Some difference',
  large_deviation: 'Large difference',
  insufficient_samples: 'Not enough typing',
  baseline_missing: 'Building your baseline',
  baseline_insufficient: 'Building your baseline',
};

const STATUS_CLASS: Record<Status, string> = {
  near_baseline: 'bg-near text-near-foreground',
  some_deviation: 'bg-some text-some-foreground',
  large_deviation: 'bg-large text-large-foreground',
  insufficient_samples: 'bg-muted text-muted-foreground',
  baseline_missing: 'bg-muted text-muted-foreground',
  baseline_insufficient: 'bg-muted text-muted-foreground',
};

const FLAG_TEXT: Record<Flag, string> = {
  long_key_hold: 'Keys were held down longer than your usual.',
  long_sentence_pause: 'The pause between sentences was longer than your usual.',
  uneven_typing_rhythm: 'Typing rhythm was less even than your usual.',
};

const FEATURE_LABEL: Record<FeatureName, { name: string; hint: string }> = {
  dwellMs: { name: 'Key hold', hint: 'Median time a key stays down' },
  sentencePauseMs: { name: 'Sentence pause', hint: 'Punctuation to the next sentence' },
  flightVolatilityMs: { name: 'Rhythm variation', hint: 'Unevenness between keys in a sentence' },
};

const FEATURES: FeatureName[] = ['dwellMs', 'sentencePauseMs', 'flightVolatilityMs'];

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', STATUS_CLASS[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const ms = (value: number | null) => (value === null ? 'n/a' : `${Math.round(value)} ms`);

function Explanation({ result, baselineCount }: { result: AnalyzeResponse; baselineCount: number }) {
  if (result.status === 'insufficient_samples') {
    const noPause = result.features.sentencePauseMs.samples === 0;
    return (
      <p className="text-sm leading-relaxed text-foreground">
        {noPause
          ? 'This check-in needs two sentences: end the first with a period, question mark, or exclamation point, then keep typing.'
          : 'This check-in was too short to measure. Type two full sentences, about 20 keystrokes or more.'}
      </p>
    );
  }
  if (result.readinessScore === null) {
    const left = Math.max(0, 3 - baselineCount);
    return (
      <p className="text-sm leading-relaxed text-foreground">
        Saved. A score compares you with your own usual typing, so it needs 3 earlier check-ins.{' '}
        {left > 0 ? `${left} more to go.` : 'Your next check-in gets a score.'}
      </p>
    );
  }
  if (result.flags.length === 0) {
    return <p className="text-sm leading-relaxed text-foreground">Your typing rhythm matched your usual check-ins.</p>;
  }
  return (
    <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
      {result.drivers.map((d) => (
        <li key={d.flag} className="flex gap-2">
          <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground" />
          <span>
            {FLAG_TEXT[d.flag]} <span className="text-muted-foreground">({d.ratio.toFixed(1)}x, -{Math.round(d.pointsDeducted)} points)</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ResultCard({
  result,
  baselineCount = 0,
  caption = 'Compared with your usual typing',
  className,
}: {
  result: AnalyzeResponse;
  /** Usable earlier check-ins, for the "n more to go" message. */
  baselineCount?: number;
  caption?: string;
  className?: string;
}) {
  const score = result.readinessScore;
  return (
    <Card className={cn('p-6', className)} aria-live="polite">
      <p className="text-sm text-muted-foreground">{caption}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-3">
        <span className="text-7xl font-bold leading-none tracking-tight tabular-nums text-foreground">
          {score === null ? '–' : score}
        </span>
        <StatusBadge status={result.status} />
      </div>

      <div
        className="mt-4 h-2 rounded-full bg-track"
        role="progressbar"
        aria-label="Score out of 100"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score ?? undefined}
      >
        <div className="h-2 rounded-full bg-foreground transition-[width] duration-700 ease-out" style={{ width: `${score ?? 0}%` }} />
      </div>

      <div className="mt-5">
        <Explanation result={result} baselineCount={baselineCount} />
      </div>

      <dl className="mt-5 divide-y divide-border border-t border-border">
        {FEATURES.map((name) => {
          const f = result.features[name];
          const c = result.comparisons[name];
          return (
            <div key={name} className="flex items-center justify-between gap-4 py-3">
              <div>
                <dt className="text-sm font-medium text-foreground">{FEATURE_LABEL[name].name}</dt>
                <p className="text-xs text-muted-foreground">{FEATURE_LABEL[name].hint}</p>
              </div>
              <dd className="text-right">
                <span className={cn('text-sm tabular-nums text-foreground', c?.flag && 'font-medium')}>{ms(f.value)}</span>
                <p className="text-xs tabular-nums text-muted-foreground">{c ? `usual ${ms(c.baselineMs)}` : 'no usual yet'}</p>
              </dd>
            </div>
          );
        })}
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        An experimental comparison with your own typing. A pause can come from a doorbell as easily as anything else. This
        project is a prototype and is not medical advice.
      </p>
    </Card>
  );
}
