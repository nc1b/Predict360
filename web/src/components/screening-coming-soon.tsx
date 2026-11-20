import { FlaskConical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import screening from '../../../research/condition-screening-eval.json';

/** Status of the condition-screening research model. It is trained and evaluated, but not released. */
export function ScreeningComingSoon({ className }: { className?: string }) {
  const lr = screening.models.logistic_regression;
  return (
    <Card className={cn('relative overflow-hidden p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-amber-400" aria-hidden="true" />
          <h2 className="text-xl font-bold tracking-tight">Condition screening</h2>
        </div>
        <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300">Coming soon · in research</span>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        We trained a model to tell self-reported Parkinson&apos;s from no Parkinson&apos;s using typing timing alone, on public data from{' '}
        {screening.participants} people ({screening.with_parkinsons} with, {screening.without} without). Tested on people it never saw, it scored a ROC-AUC
        of <strong className="text-foreground">{lr.roc_auc_mean.toFixed(2)}</strong>, where 0.50 is a coin flip. That is not good enough to show anyone, so it is
        not in the app.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ['Accuracy so far', `ROC-AUC ${lr.roc_auc_mean.toFixed(2)}`, 'Chance level on held-out people'],
          ['Next step', 'Better labelled data', 'Clinician-confirmed diagnoses, the same typing task'],
          ['Release bar', 'Clinical validation', 'Only with independent testing and review'],
        ].map(([label, value, sub]) => (
          <div key={label} className="rounded-xl border border-border bg-secondary/40 p-3">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm font-semibold">{value}</p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Data: Tappy Keystroke Data (PhysioNet, ODC-By 1.0). Reproduce with <code>python scripts/condition-screening-eval.py</code>.
      </p>
    </Card>
  );
}
