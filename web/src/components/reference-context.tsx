// Shows the user's typing features against the best available reference:
// - key-hold time: published public-dataset ranges (research/benchmarks.json)
// - sentence pause and rhythm: the user's OWN baseline, because no public
//   dataset measures a free two-sentence check-in's pause or rhythm.
// Context only — never a diagnosis, and no invented population numbers.

import benchmarks from '../../../research/benchmarks.json';
import { Card } from '@/components/ui/card';
import type { AnalyzeResponse, FeatureName } from '@/lib/types';

interface DwellRef {
  n: number;
  p10: number;
  median: number;
  p90: number;
}
type Dataset = { id: string; name: string; metrics?: { dwellMs?: DwellRef } };

const dwellDatasets = (benchmarks.datasets as unknown as Dataset[]).filter(
  (d): d is Dataset & { metrics: { dwellMs: DwellRef } } => !!d.metrics?.dwellMs
);

const ms = (v: number | null) => (v === null ? '—' : `${Math.round(v)} ms`);

const PERSONAL: { key: FeatureName; label: string }[] = [
  { key: 'sentencePauseMs', label: 'Sentence pause' },
  { key: 'flightVolatilityMs', label: 'Rhythm variation' },
];

export function ReferenceContext({ result }: { result: AnalyzeResponse }) {
  const dwell = result.features.dwellMs.value;
  const hasDwell = dwell !== null && dwellDatasets.length > 0;
  if (!hasDwell && PERSONAL.every((p) => result.features[p.key].value === null)) return null;

  const lo = hasDwell ? Math.min(dwell, ...dwellDatasets.map((d) => d.metrics.dwellMs.p10)) : 0;
  const hi = hasDwell ? Math.max(dwell, ...dwellDatasets.map((d) => d.metrics.dwellMs.p90)) : 1;
  const pad = (hi - lo) * 0.12 || 10;
  const min = lo - pad;
  const max = hi + pad;
  const at = (x: number) => `${((x - min) / (max - min)) * 100}%`;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">How your numbers compare</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Context only — not a diagnosis. Key-hold time sits against published public datasets; pause and rhythm compare with
        your own usual, since no public dataset measures a two-sentence check-in.
      </p>

      {hasDwell && (
        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Key hold · {Math.round(dwell)} ms vs public datasets
          </p>
          <div className="mt-3 space-y-5">
            {dwellDatasets.map((d) => {
              const m = d.metrics.dwellMs;
              const where = dwell < m.p10 ? 'below this range' : dwell > m.p90 ? 'above this range' : 'within this range';
              return (
                <div key={d.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{d.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      p10–p90 {Math.round(m.p10)}–{Math.round(m.p90)} ms · n={m.n}
                    </span>
                  </div>
                  <div
                    className="relative mt-2 h-2.5 rounded-full bg-track"
                    role="img"
                    aria-label={`Your ${Math.round(dwell)} ms is ${where} of ${d.name}`}
                  >
                    <div
                      className="absolute inset-y-0 rounded-full bg-muted-foreground/30"
                      style={{ left: at(m.p10), width: `${((m.p90 - m.p10) / (max - min)) * 100}%` }}
                    />
                    <div className="absolute inset-y-[-2px] w-px bg-muted-foreground" style={{ left: at(m.median) }} aria-hidden="true" />
                    <div className="absolute inset-y-[-4px] w-0.5 rounded bg-foreground" style={{ left: at(dwell) }} aria-hidden="true" />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    You are <span className="font-medium text-foreground">{where}</span> (median {Math.round(m.median)} ms).
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Pause &amp; rhythm · vs your own usual
        </p>
        <dl className="mt-3 divide-y divide-border">
          {PERSONAL.map(({ key, label }) => {
            const value = result.features[key].value;
            const c = result.comparisons[key];
            return (
              <div key={key} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-sm font-medium">{label}</dt>
                <dd className="text-right text-sm tabular-nums">
                  <span className="text-foreground">{ms(value)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {c && c.baselineMs !== null
                      ? `usual ${ms(c.baselineMs)}${c.ratio !== null ? ` (${c.ratio.toFixed(2)}× usual)` : ''}`
                      : 'no usual yet — needs 3 check-ins'}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
        No public dataset has labelled sentence-pause or free-typing rhythm for a task like this, so those use your own
        baseline, not a population. The dwell cohorts used different people, keyboards and tasks.{' '}
        <a href="/sources" target="_blank" rel="noreferrer" className="underline">
          Sources &amp; limits
        </a>
        .
      </p>
    </Card>
  );
}
