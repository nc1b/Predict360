import { Activity, Info, Keyboard, Timer } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatusDot, type Tone } from '@/components/dashboard/kit';
import { signalTrends, MIN_USUAL, type TrendState } from '@/lib/signal-trends';
import type { HistoryEntry } from '@/lib/history';
import type { FeatureName } from '@/lib/types';
import { cn } from '@/lib/utils';

const ICON: Record<FeatureName, typeof Keyboard> = { dwellMs: Keyboard, sentencePauseMs: Timer, flightVolatilityMs: Activity };

const STATE: Record<TrendState, { tone: Tone; label: string }> = {
  gathering: { tone: 'idle', label: 'Gathering data' },
  steady: { tone: 'good', label: 'Steady' },
  lower: { tone: 'good', label: 'Lower than usual' },
  raised: { tone: 'warn', label: 'Raised recently' },
  lasting: { tone: 'bad', label: 'Raised for 3 check-ins' },
};

function Sparkline({ values, usual }: { values: number[]; usual: number | null }) {
  if (values.length < 2) return <div className="h-10" />;
  const w = 160, h = 40, lo = Math.min(...values, usual ?? Infinity) * 0.9, hi = Math.max(...values, usual ?? 0) * 1.1;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - ((v - lo) / (hi - lo || 1)) * h;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-10 w-full overflow-visible" aria-hidden="true">
      {usual !== null && <line x1="0" x2={w} y1={y(usual)} y2={y(usual)} stroke="currentColor" className="text-muted-foreground/40" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
      <path d={d} fill="none" stroke="var(--chart)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="3" fill="var(--chart)" />
    </svg>
  );
}

/** Your trend in each measure that research examined, with the conditions it was studied in. */
export function SignalTracker({ history, compact = false, className }: { history: HistoryEntry[]; compact?: boolean; className?: string }) {
  const trends = signalTrends(history);
  const lasting = trends.filter((t) => t.state === 'lasting');
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Research signals</h2>
          <p className="text-xs text-muted-foreground">Your typing measures that published studies examined, against your own usual</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
          <Info className="size-3" aria-hidden="true" /> Not a diagnosis
        </span>
      </div>

      <div className={cn('mt-4 grid gap-3', compact ? 'grid-cols-1' : 'md:grid-cols-3')}>
        {trends.map((t) => {
          const Icon = ICON[t.def.key];
          const s = STATE[t.state];
          const pct = t.ratio === null ? null : Math.round((t.ratio - 1) * 100);
          return (
            <div key={t.def.key} className="rounded-xl border border-border bg-secondary/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-violet-400" aria-hidden="true" />{t.def.name}</span>
                <span className="text-sm font-semibold tabular-nums">{pct === null ? '–' : `${pct > 0 ? '+' : ''}${pct}%`}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.def.hint}</p>
              <p className="mt-2 flex items-center gap-2 text-xs font-medium"><StatusDot tone={s.tone} />{s.label}</p>
              {!compact && <div className="mt-2"><Sparkline values={t.series} usual={t.usual} /></div>}
              {!compact && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t.usual === null ? `Needs ${MIN_USUAL + 1} check-ins` : `Usual ${Math.round(t.usual)} ms · recent ${Math.round(t.recent!)} ms`}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {t.def.studiedIn.map((c) => (
                  <span key={c} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Studied in: {c}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className={cn('mt-4 rounded-xl p-3 text-xs leading-relaxed', lasting.length ? 'bg-some text-some-foreground' : 'bg-muted/60 text-muted-foreground')}>
        {lasting.length
          ? `${lasting.map((t) => t.def.name).join(' and ')} has been above your usual for your last 3 check-ins. Ordinary causes include tiredness, a different keyboard or distraction. If it continues and you've noticed other changes in how you feel, it's worth mentioning to a doctor.`
          : 'Predict 360 was not trained or tested on any condition and cannot detect or rule one out. These measures only show change from your own usual typing.'}
      </p>
    </Card>
  );
}
