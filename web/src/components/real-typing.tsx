import { Card } from '@/components/ui/card';
import real from '../../../research/real-typing-eval.json';

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

const ROWS = [
  { name: 'Hand-set rule (fixed thresholds)', key: 'hand_set_rule' },
  { name: 'Earlier model, trained on simulated typists', key: 'live_model_trained_on_simulation' },
  { name: 'Live model: logistic regression trained on real typing', key: 'ratio_model' },
  { name: 'Gradient boosting, all inputs (not deployed)', key: 'gradient_boosting_all_inputs' },
] as const;

export function RealTyping() {
  const budget = real.results_at_10pct_false_alarm_budget;
  const defaults = real.results_at_default_thresholds;
  const rule = real.false_alarm_sources.hand_set_rule;
  return (
    <section className="mt-10 space-y-4" aria-labelledby="real-typing-heading">
      <h2 id="real-typing-heading" className="text-2xl font-semibold">Tested on real people’s typing</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        We split the public{' '}
        <a href="https://www.cs.cmu.edu/~keystroke/" target="_blank" rel="noreferrer" className="underline">
          CMU Keystroke Dynamics Benchmark
        </a>{' '}
        ({real.typists} people, 8 sittings each) into {real.check_ins_per_typist} real check-ins per person and compared
        each one with that person’s previous five, as the app does.{' '}
        <strong className="text-foreground">What is real:</strong> every check-in and all of its natural variation.{' '}
        <strong className="text-foreground">What is injected:</strong> the change. We stretched key holds or made rhythm
        more uneven by 10–60% in a copy of each check-in, because we could not obtain public typing data with fatigue
        labels. Every number is from typists the model never trained on (5 folds split by person;{' '}
        {real.scored_check_ins.toLocaleString()} scored check-ins).
      </p>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-4 font-medium">Method (each set to about 10% false alarms)</th>
              <th className="p-4 text-right font-medium">False alarms</th>
              <th className="p-4 text-right font-medium">Changes detected</th>
              <th className="p-4 text-right font-medium">Missed</th>
              <th className="p-4 text-right font-medium">ROC-AUC</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-4 font-medium">Always “usual”</td>
              <td className="p-4 text-right tabular-nums">0%</td>
              <td className="p-4 text-right tabular-nums">0%</td>
              <td className="p-4 text-right tabular-nums">100%</td>
              <td className="p-4 text-right tabular-nums">0.50</td>
            </tr>
            {ROWS.map(({ name, key }) => (
              <tr key={key} className="border-b last:border-0">
                <td className="p-4 font-medium">{name}</td>
                <td className="p-4 text-right tabular-nums">{pct(budget[key].false_positive_rate)}</td>
                <td className="p-4 text-right tabular-nums">
                  {pct(budget[key].detection_rate)}{' '}
                  <span className="text-muted-foreground">
                    ({pct(budget[key].detection_rate_95ci[0])}–{pct(budget[key].detection_rate_95ci[1])})
                  </span>
                </td>
                <td className="p-4 text-right tabular-nums">{pct(budget[key].false_negative_rate)}</td>
                <td className="p-4 text-right tabular-nums">{defaults[key].roc_auc.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="space-y-3 text-sm leading-relaxed">
        <p>
          <strong>What we found.</strong> At the same false-alarm rate, the model trained on real typing detects{' '}
          {pct(budget.ratio_model.detection_rate)} of injected changes and the hand-set rule detects{' '}
          {pct(budget.hand_set_rule.detection_rate)}. A more flexible model gains almost nothing, so we kept the simple
          one, whose four weights anyone can read. Brackets are 95% intervals from resampling whole typists.
        </p>
        <p>
          <strong>Why the rule struggles.</strong> With its original thresholds the rule flagged{' '}
          {pct(defaults.hand_set_rule.false_positive_rate)} of untouched real check-ins, and{' '}
          {pct(rule.first_check_in_of_a_new_session)} of the first check-ins after a break between sittings. For one
          typist it was {pct(rule.per_typist_false_alarm_rate.highest)}. Our simulated typists had suggested about 4%.
        </p>
        <p>
          <strong>Where it still fails.</strong> The live model misses {pct(budget.ratio_model.false_negative_rate)} of
          injected changes: many of the small key-hold changes, and most rhythm changes. And a detected change is only
          a change. Nothing here shows that it means tiredness.
        </p>
      </div>

      <h3 className="pt-2 text-lg font-semibold">Which timing measures can be trusted?</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        A measure is only useful if it stays steady when nothing has changed. We measured how much each candidate wobbles
        for the same person across real check-ins.
      </p>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-4 font-medium">Measure</th>
              <th className="p-4 text-right font-medium">Wobble within a sitting</th>
              <th className="p-4 text-right font-medium">Across sittings</th>
              <th className="p-4 text-right font-medium">Untouched check-ins over 15% above usual</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(real.measure_reliability).map(([name, m]) => (
              <tr key={name} className="border-b last:border-0">
                <td className="p-4 font-medium">{name}</td>
                <td className="p-4 text-right tabular-nums">{m.wobble_within_a_sitting_pct}%</td>
                <td className="p-4 text-right tabular-nums">{m.wobble_across_sittings_pct}%</td>
                <td className="p-4 text-right tabular-nums">{pct(m.untouched_check_ins_more_than_15pct_above_usual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-sm leading-relaxed">
        Median key hold is the steadiest measure. It is also the one a{' '}
        <a href="https://doi.org/10.1038/srep09678" target="_blank" rel="noreferrer" className="underline">
          2015 MIT study
        </a>{' '}
        found changed when 14 people typed just after being woken at night. The rhythm measure the app started with is
        the least steady, which is why the trained model weights key hold about five times more heavily than rhythm.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <figure className="rounded-2xl border bg-card p-4">
          <img src="/eval/real-sensitivity.png" alt="Detection rate by size of injected change" className="w-full rounded-lg bg-white" loading="lazy" />
          <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
            How large must a change be? Key holds 20% longer are caught most of the time. Rhythm changes are mostly
            missed.
          </figcaption>
        </figure>
        <figure className="rounded-2xl border bg-card p-4">
          <img src="/eval/real-cold-start.png" alt="False alarms and detection by number of earlier check-ins" className="w-full rounded-lg bg-white" loading="lazy" />
          <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Week one: results change little between one and twenty earlier check-ins, so a short baseline is enough.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
