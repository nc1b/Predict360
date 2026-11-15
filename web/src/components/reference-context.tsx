// Shows the user's key-hold time against published public-dataset reference
// ranges (from research/benchmarks.json). Context only — never a diagnosis.
// Only dwell time has public reference percentiles; the other two features say
// so honestly rather than inventing numbers.

import benchmarks from '../../../research/benchmarks.json';
import { Card } from '@/components/ui/card';
import type { Features } from '@/lib/types';

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

export function ReferenceContext({ features }: { features: Features }) {
  const dwell = features.dwellMs.value;
  if (dwell === null || dwellDatasets.length === 0) return null;

  const lo = Math.min(dwell, ...dwellDatasets.map((d) => d.metrics.dwellMs.p10));
  const hi = Math.max(dwell, ...dwellDatasets.map((d) => d.metrics.dwellMs.p90));
  const pad = (hi - lo) * 0.12 || 10;
  const min = lo - pad;
  const max = hi + pad;
  const at = (x: number) => `${((x - min) / (max - min)) * 100}%`;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Compared with public datasets</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Your key-hold time of <span className="font-medium text-foreground">{Math.round(dwell)} ms</span> next to published
        reference ranges. Context only — not a diagnosis.
      </p>

      <div className="mt-5 space-y-5">
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
              <div className="relative mt-2 h-2.5 rounded-full bg-track" role="img" aria-label={`Your ${Math.round(dwell)} ms is ${where} of ${d.name}`}>
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

      <p className="mt-5 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
        Sentence pause and typing rhythm have no public reference range yet. These cohorts used different people, keyboards
        and tasks, so the ranges can&apos;t tell you anything about your health.{' '}
        <a href="/sources" target="_blank" rel="noreferrer" className="underline">
          Sources &amp; limits
        </a>
        .
      </p>
    </Card>
  );
}
