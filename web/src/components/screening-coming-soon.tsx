import { FlaskConical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatusDot, type Tone } from '@/components/dashboard/kit';
import { cn } from '@/lib/utils';
import tappy from '../../../research/condition-screening-eval.json';
import nq from '../../../research/neuroqwerty-eval.json';
import swell from '../../../research/swell-strain-metrics.json';

interface Row {
  condition: string;
  data: string;
  result: string;
  detail: string;
  stage: string;
  tone: Tone;
}

const auc = (v: number) => v.toFixed(2);

const ROWS: Row[] = [
  {
    condition: "Parkinson's disease (early)",
    data: `neuroQWERTY · ${nq.participants} people, clinician-diagnosed`,
    result: `${auc(nq.models.random_forest.roc_auc_mean)} → ${auc(nq.external_test_on_tappy!.roc_auc)}`,
    detail: `${auc(nq.models.random_forest.roc_auc_mean)} on held-out people in the same study; ${auc(nq.short_sample_roc_auc['70_keystrokes'])} from one check-in's worth of typing; ${auc(nq.external_test_on_tappy!.roc_auc)} on ${nq.external_test_on_tappy!.participants} different people and devices.`,
    stage: 'Most promising · needs external validation',
    tone: 'warn',
  },
  {
    condition: "Parkinson's disease (self-reported)",
    data: `Tappy · ${tappy.participants} people`,
    result: auc(tappy.models.logistic_regression.roc_auc_mean),
    detail: 'Self-reported labels and mixed devices. No better than chance.',
    stage: 'Not working yet',
    tone: 'bad',
  },
  {
    condition: 'Stress and time pressure',
    data: `SWELL-KW · ${swell.participants} people`,
    result: auc(swell.models.logistic_regression.roc_auc),
    detail: 'Keyboard and mouse activity per minute in office tasks. Only slightly better than chance.',
    stage: 'Not working yet',
    tone: 'bad',
  },
  { condition: 'Sleep loss', data: 'MIT sleep-inertia study', result: '–', detail: 'The public dataset was offline when we tried, so nothing could be trained.', stage: 'Waiting for data', tone: 'idle' },
  { condition: 'Depression and bipolar mood', data: 'No public keystroke data', result: '–', detail: 'Published studies used private phone-keyboard data.', stage: 'Needs a research partner', tone: 'idle' },
  { condition: 'Multiple sclerosis', data: 'No public keystroke data', result: '–', detail: 'Published studies used private smartphone data.', stage: 'Needs a research partner', tone: 'idle' },
  { condition: 'Mild cognitive impairment', data: 'No public keystroke data', result: '–', detail: 'Published studies were small and their data is not public.', stage: 'Needs a research partner', tone: 'idle' },
];

/** Where condition screening stands. Models are trained and tested offline; none is shown to users. */
export function ScreeningComingSoon({ className }: { className?: string }) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-amber-400" aria-hidden="true" />
          <h2 className="text-xl font-bold tracking-tight">Condition screening</h2>
        </div>
        <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-500 dark:text-amber-300">Coming soon · in research</span>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        We trained and tested a model for every condition with public labelled typing data. Scores are ROC-AUC on people the model never saw (0.50 is a coin
        flip, 1.00 is perfect). None is accurate enough on new people to show anyone, so screening is not in the app yet.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Condition</th>
              <th className="py-2 pr-4 font-medium">Data</th>
              <th className="py-2 pr-4 text-right font-medium">ROC-AUC</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.condition} className="border-b border-border/60 align-top last:border-0">
                <td className="py-3 pr-4">
                  <p className="font-semibold">{r.condition}</p>
                  <p className="mt-0.5 max-w-sm text-xs text-muted-foreground">{r.detail}</p>
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">{r.data}</td>
                <td className="py-3 pr-4 text-right font-semibold tabular-nums">{r.result}</td>
                <td className="py-3"><span className="inline-flex items-center gap-2 text-xs font-medium"><StatusDot tone={r.tone} />{r.stage}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Reproduce with <code>python scripts/neuroqwerty-eval.py</code> and <code>python scripts/condition-screening-eval.py</code>. Data: PhysioNet (ODC-By 1.0) and SWELL-KW (CC BY-NC-SA 4.0).
        Release needs clinician-confirmed labels from the same check-in task and independent clinical validation.
      </p>
    </Card>
  );
}
