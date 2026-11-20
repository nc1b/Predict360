import * as React from 'react';
import { BarChart3, Brain, CheckCircle2, Database, FlaskConical, Layers, Lock, ShieldCheck, Sparkles, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import real from '../../../../research/real-typing-eval.json';
import nq from '../../../../research/neuroqwerty-eval.json';
import tappy from '../../../../research/condition-screening-eval.json';
import swell from '../../../../research/swell-strain-metrics.json';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const live = real.results_at_10pct_false_alarm_budget.ratio_model;
const rule = real.results_at_10pct_false_alarm_budget.hand_set_rule;
const liveAuc = real.results_at_default_thresholds.ratio_model.roc_auc;
const totalPeople = real.typists + nq.participants + tappy.participants + swell.participants;

/** Counts up from 0 the first time it scrolls into view. */
function CountUp({ to, decimals = 0, suffix = '' }: { to: number; decimals?: number; suffix?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [value, setValue] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { setValue(to); return; }
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1400);
        setValue(to * (1 - (1 - p) ** 3));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [to]);
  return <span ref={ref} className="tabular-nums">{decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString()}{suffix}</span>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">{children}</p>;
}

const STEPS = [
  { icon: Database, title: 'Collect real typing', body: `Public, licensed research datasets only: ${totalPeople} people across 4 datasets, checksum-verified. No app user's data is ever used for training.` },
  { icon: Layers, title: 'Build features', body: 'Key hold time, the pause between sentences, rhythm unevenness, plus hold-time histograms for the research models. Timing only, never the words.' },
  { icon: Brain, title: 'Train models', body: 'Logistic regression, random forest and gradient boosting, compared against a hand-set rule and a "do nothing" baseline.' },
  { icon: Users, title: 'Test on new people', body: 'Every score comes from people the model never saw: cross-validation split by person, repeated many times, with 95% intervals.' },
  { icon: ShieldCheck, title: 'Ship only what works', body: 'The check-in model beat the rule, so it is live. Condition models did not hold up on new people, so they stay in research.' },
];

const BARS = [
  { label: 'Hand-set rule', value: rule.detection_rate, tone: 'bg-muted-foreground/40' },
  { label: 'Model trained on simulated typists', value: real.results_at_10pct_false_alarm_budget.live_model_trained_on_simulation.detection_rate, tone: 'bg-muted-foreground/40' },
  { label: 'Live model, trained on real typing', value: live.detection_rate, tone: 'bg-gradient-to-r from-emerald-500 to-emerald-300' },
];

const CONDITIONS = [
  { name: "Early Parkinson's (clinician-diagnosed)", within: nq.models.random_forest.roc_auc_mean, external: nq.external_test_on_tappy!.roc_auc, note: `${nq.participants} people · ${nq.short_sample_roc_auc['70_keystrokes'].toFixed(2)} from one 70-keystroke check-in` },
  { name: "Parkinson's (self-reported)", within: tappy.models.logistic_regression.roc_auc_mean, external: null, note: `${tappy.participants} people · mixed devices` },
  { name: 'Stress and time pressure', within: swell.models.logistic_regression.roc_auc, external: null, note: `${swell.participants} people · office tasks` },
];

function AucBar({ value, muted = false }: { value: number; muted?: boolean }) {
  // 0.5 (chance) to 1.0 (perfect) mapped across the bar.
  const w = Math.max(0, Math.min(1, (value - 0.5) / 0.5));
  return (
    <div className="relative h-2 rounded-full bg-track">
      <div className={cn('h-2 rounded-full transition-[width] duration-1000', muted ? 'bg-sky-400/70' : 'bg-gradient-to-r from-violet-500 to-violet-300')} style={{ width: `${Math.max(2, w * 100)}%` }} />
    </div>
  );
}

export function ModelSection() {
  return (
    <section id="model" className="scroll-mt-24 border-t px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-500 dark:text-amber-300">
            <Trophy className="size-3.5" aria-hidden="true" /> Finalist · Veritas AI International High School Hackathon 2026
          </span>
          <Eyebrow><span className="mt-6 block">How we built the AI</span></Eyebrow>
          <h2 className="mt-3 text-balance bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-semibold tracking-[-0.035em] text-transparent md:text-5xl">
            Trained on real typing. Tested on people it had never seen.
          </h2>
          <p className="mt-5 text-pretty text-muted-foreground">
            Two kinds of AI work together. Our own models, trained and evaluated on public research data, measure your typing. Anthropic&apos;s latest Claude
            models turn those numbers into plain-language explanations and a daily analysis.
          </p>
        </div>

        {/* Headline stats */}
        <dl className="mt-14 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Real check-ins tested', value: <CountUp to={real.scored_check_ins} />, sub: `from ${real.typists} typists the model never trained on` },
            { label: 'Changes detected', value: <CountUp to={live.detection_rate * 100} suffix="%" />, sub: `at ${pct(live.false_positive_rate)} false alarms, vs ${pct(rule.detection_rate)} for a hand-set rule` },
            { label: 'ROC-AUC, live model', value: <CountUp to={liveAuc} decimals={2} />, sub: '0.50 is a coin flip, 1.00 is perfect' },
            { label: 'People in our research data', value: <CountUp to={totalPeople} />, sub: '4 public datasets, checksum-verified' },
          ].map((s) => (
            <div key={s.label} className="panel rounded-2xl border border-border p-5">
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="mt-2 text-4xl font-semibold tracking-tight">{s.value}</dd>
              <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </dl>

        {/* Pipeline */}
        <div className="mt-16">
          <Eyebrow>Our training pipeline</Eyebrow>
          <ol className="relative mt-6 grid gap-3 md:grid-cols-5">
            <div aria-hidden="true" className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent md:block" />
            {STEPS.map((s, i) => (
              <li key={s.title} className="panel relative rounded-2xl border border-border p-5">
                <span className="relative flex size-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <s.icon className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Step {i + 1}</p>
                <h3 className="mt-1 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-16 grid gap-4 lg:grid-cols-2">
          {/* Live model result */}
          <div className="panel rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2"><BarChart3 className="size-5 text-emerald-400" aria-hidden="true" /><h3 className="text-lg font-semibold">The check-in model (live)</h3></div>
            <p className="mt-1 text-sm text-muted-foreground">
              Logistic regression trained on the CMU Keystroke Dynamics Benchmark. Share of injected typing changes caught at the same 10% false-alarm rate:
            </p>
            <div className="mt-6 space-y-4">
              {BARS.map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-sm"><span>{b.label}</span><span className="font-semibold tabular-nums">{pct(b.value)}</span></div>
                  <div className="mt-2 h-2.5 rounded-full bg-track"><div className={cn('h-2.5 rounded-full', b.tone)} style={{ width: pct(b.value) }} /></div>
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">What we learned:</strong> our first model, trained on simulated typists, scored 88% in simulation but was no better than the rule on real
              people. Retraining on real typing raised detection from {pct(rule.detection_rate)} to {pct(live.detection_rate)}.
            </p>
          </div>

          {/* Condition research */}
          <div className="panel rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2"><FlaskConical className="size-5 text-violet-400" aria-hidden="true" /><h3 className="text-lg font-semibold">Condition research (coming soon)</h3></div>
            <p className="mt-1 text-sm text-muted-foreground">ROC-AUC on held-out people. Violet: same study. Blue: a different dataset the model never saw.</p>
            <div className="mt-6 space-y-5">
              {CONDITIONS.map((c) => (
                <div key={c.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{c.within.toFixed(2)}{c.external !== null && <span className="text-sky-400"> → {c.external.toFixed(2)}</span>}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.note}</p>
                  <div className="mt-2 space-y-1.5"><AucBar value={c.within} />{c.external !== null && <AucBar value={c.external} muted />}</div>
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Why it isn&apos;t live yet:</strong> the Parkinson&apos;s model matched the published 0.81 within its study, but fell to{' '}
              {nq.external_test_on_tappy!.roc_auc.toFixed(2)} on new people and devices. We only ship what holds up on new people.
            </p>
          </div>
        </div>

        {/* Claude */}
        <div className="mt-16">
          <Eyebrow>Powered by Claude</Eyebrow>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { icon: Brain, name: 'Claude Opus 5.5', role: 'Daily analysis', body: "Anthropic's most capable Opus model compares today with your recent check-ins, energy and computer activity, and writes a short daily read-out.", tone: 'text-violet-400 border-violet-500/30 bg-violet-500/10' },
              { icon: Sparkles, name: 'Claude Sonnet 5.5', role: 'Explanations and chat', body: 'Fast and capable: explains each result in plain words, answers questions about your trend, and summarises the desktop app’s activity.', tone: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
              { icon: Lock, name: 'Privacy by design', role: 'Numbers only', body: 'Claude receives timing figures, never the words you type. Instructions forbid diagnosis, and refusals fall back safely to another model.', tone: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
            ].map((m) => (
              <div key={m.name} className="panel rounded-2xl border border-border p-6">
                <span className={cn('flex size-11 items-center justify-center rounded-xl border', m.tone)}><m.icon className="size-5" aria-hidden="true" /></span>
                <h3 className="mt-4 text-lg font-semibold">{m.name}</h3>
                <p className="text-xs font-medium text-muted-foreground">{m.role}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
              </div>
            ))}
          </div>
        </div>

        <ul className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          {['Reproducible: every number comes from a script in the repo', 'Split by person, never by row', 'No app-user data used for training', 'Prototype, not a medical device'].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-400" aria-hidden="true" />{t}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
