import { Check, Minus, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import real from '../../../research/real-typing-eval.json';
import benchmarks from '../../../research/benchmarks.json';
import swell from '../../../research/swell-strain-metrics.json';

const pct = (v: number) => `${Math.round(v * 100)}%`;

const live = real.results_at_10pct_false_alarm_budget.ratio_model;
const sizes = real.sensitivity.sizes;
const hold = real.sensitivity.hold.ratio_model;
const rhythm = real.sensitivity.rhythm.ratio_model;
const at = (series: number[], size: number) => series[sizes.indexOf(size)];
const tappy = benchmarks.datasets.find((d) => d.id === 'tappy') as unknown as {
  participants: number;
  offlineAudit: { selfReportedPd: { n: number; median: number; p10: number; p90: number }; selfReportedNoPd: { n: number; median: number; p10: number; p90: number }; central80PercentOverlapMs: number };
};
const swellAuc = (swell as unknown as { models?: Record<string, { roc_auc?: number }> }).models?.logistic_regression?.roc_auc;

type Level = 'yes' | 'partly' | 'no';

const CAN: { what: string; level: Level; detail: string }[] = [
  {
    what: 'Keys held down longer than your usual',
    level: 'yes',
    detail: `A 20% longer key hold is caught ${pct(at(hold, 1.2))} of the time; 10% longer, ${pct(at(hold, 1.1))}.`,
  },
  {
    what: 'A longer pause between your two sentences',
    level: 'partly',
    detail: 'Measured and flagged against your usual, but a doorbell and a deliberate pause look the same.',
  },
  {
    what: 'Less even typing rhythm',
    level: 'partly',
    detail: `Mostly missed: a 50% more uneven rhythm is caught ${pct(at(rhythm, 1.5))} of the time.`,
  },
  {
    what: 'Tiredness, stress or fitness to work',
    level: 'no',
    detail: 'No public dataset with fatigue labels was available to test this. A change is only a change.',
  },
  {
    what: 'Any illness or medical condition',
    level: 'no',
    detail: 'The model was never trained or tested on people with a diagnosis. It cannot detect or rule out any condition.',
  },
];

const STUDIES: { condition: string; found: string; cite: { label: string; href: string }[]; ourData?: string }[] = [
  {
    condition: "Parkinson's disease",
    found: 'Longer and more variable key-hold times were reported in people with early Parkinson’s typing naturally.',
    cite: [
      { label: 'Giancardo et al., Scientific Reports 2016', href: 'https://doi.org/10.1038/srep34468' },
      { label: 'Adams, PLOS ONE 2017 (Tappy data)', href: 'https://doi.org/10.1371/journal.pone.0188226' },
    ],
    ourData: `We checked the public Tappy data (${tappy.participants} people). Median key hold was ${tappy.offlineAudit.selfReportedPd.median} ms with self-reported Parkinson’s and ${tappy.offlineAudit.selfReportedNoPd.median} ms without, and the middle 80% of the two groups overlap by ${Math.round(tappy.offlineAudit.central80PercentOverlapMs)} ms. Most people cannot be told apart by key hold alone.`,
  },
  {
    condition: 'Sleep loss and sleep inertia',
    found: 'Key-hold time rose when 14 people typed just after being woken at night.',
    cite: [{ label: 'Giancardo et al., Scientific Reports 2015', href: 'https://doi.org/10.1038/srep09678' }],
    ourData: 'Key hold is the measure our model weights most heavily, because it is the steadiest in real typing. We could not obtain that study’s data to test against.',
  },
  {
    condition: 'Depression and bipolar mood changes',
    found: 'Phone-keyboard timing and typing patterns tracked mood-symptom scores in a digital phenotyping study.',
    cite: [{ label: 'Zulueta et al., J Med Internet Res 2018 (BiAffect)', href: 'https://doi.org/10.2196/jmir.9775' }],
  },
  {
    condition: 'Multiple sclerosis',
    found: 'Real-world smartphone typing speed and timing correlated with clinical disability scores.',
    cite: [{ label: 'Lam et al., Multiple Sclerosis Journal 2021', href: 'https://doi.org/10.1177/1352458520968797' }],
  },
  {
    condition: 'Mild cognitive impairment',
    found: 'Touchscreen typing timing, combined with language features, separated people with and without mild cognitive impairment in a small study.',
    cite: [{ label: 'Ntracha et al., Frontiers in Digital Health 2020', href: 'https://doi.org/10.3389/fdgth.2020.567158' }],
  },
  {
    condition: 'Stress and mental workload',
    found: 'Keystroke timing changed under cognitive and physical stress in a lab study.',
    cite: [{ label: 'Vizer, Zhou & Sears, Int J Human-Computer Studies 2009', href: 'https://doi.org/10.1016/j.ijhcs.2009.07.005' }],
    ourData: swellAuc
      ? `On the public SWELL-KW office-work data, our activity model told interrupted or time-pressured minutes from neutral ones only slightly better than chance (ROC-AUC ${swellAuc.toFixed(2)}).`
      : 'On the public SWELL-KW office-work data, our activity model was only slightly better than chance.',
  },
];

const LEVEL = {
  yes: { icon: Check, label: 'Detects', className: 'bg-near text-near-foreground' },
  partly: { icon: Minus, label: 'Partly', className: 'bg-some text-some-foreground' },
  no: { icon: X, label: 'No', className: 'bg-muted text-muted-foreground' },
} as const;

export function WhatItDetects({ className }: { className?: string }) {
  return (
    <Card className={cn('p-6', className)}>
      <h2 className="font-display text-2xl">What the model can detect</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tested on {real.scored_check_ins.toLocaleString()} real check-ins from {real.typists} people it never trained on. At {pct(live.false_positive_rate)} false alarms it detects{' '}
        {pct(live.detection_rate)} of changes (ROC-AUC {real.results_at_default_thresholds.ratio_model.roc_auc.toFixed(2)}).
      </p>
      <ul className="mt-4 divide-y divide-border border-t border-border">
        {CAN.map(({ what, level, detail }) => {
          const { icon: Icon, label, className: badge } = LEVEL[level];
          return (
            <li key={what} className="flex items-start gap-3 py-3">
              <span className={cn('mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', badge)}>
                <Icon className="size-3" aria-hidden="true" />
                {label}
              </span>
              <div>
                <p className="text-sm font-medium">{what}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function ResearchConditions({ className }: { className?: string }) {
  return (
    <section className={cn('space-y-4', className)} aria-labelledby="research-conditions-heading">
      <div>
        <h2 id="research-conditions-heading" className="font-display text-3xl">Conditions studied in typing research</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Researchers have linked changes in typing timing to the conditions below. These are published correlations in research groups, not tests. Predict 360 measures similar
          signals against your own usual, but it was <strong className="text-foreground">not trained or validated on any of these conditions and cannot detect them</strong>. If you
          notice a lasting change, or are worried about your health, talk to a doctor.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {STUDIES.map((s) => (
          <Card key={s.condition} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold">{s.condition}</h3>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">App detects: no</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed">{s.found}</p>
            {s.ourData && (
              <p className="mt-3 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed">
                <span className="font-medium">Compared with our data: </span>
                {s.ourData}
              </p>
            )}
            <p className="mt-auto pt-3 text-xs text-muted-foreground">
              {s.cite.map((c, i) => (
                <span key={c.href}>
                  {i > 0 && ' · '}
                  <a href={c.href} target="_blank" rel="noreferrer" className="underline">{c.label}</a>
                </span>
              ))}
            </p>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">This project is a prototype and is not medical advice.</p>
    </section>
  );
}
