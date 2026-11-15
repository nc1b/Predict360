import { Link } from 'react-router-dom';
import { Logo } from '@/components/logo';
import { Card } from '@/components/ui/card';
import metrics from '../../../research/swell-strain-metrics.json';

const pct = (v: number) => `${Math.round(v * 100)}%`;

type Row = { tn: number; fp: number; fn: number; tp: number; accuracy: number; recall_strain: number; false_positive_rate: number; false_negative_rate: number; roc_auc?: number };

const ROWS: { name: string; data: Row }[] = [
  { name: 'Baseline (always "strained")', data: metrics.baseline_majority_class as Row },
  { name: 'Logistic regression', data: metrics.models.logistic_regression as Row },
  { name: 'Random forest', data: metrics.models.random_forest as Row },
];

const GRAPHS = [
  { src: '/eval/confusion-matrix.png', title: 'Confusion matrix', caption: 'Logistic regression on held-out people. Plenty of calm minutes are still flagged (false positives) and strained minutes missed (false negatives).' },
  { src: '/eval/roc.png', title: 'ROC curve', caption: 'Both models sit just above the diagonal — a real but weak signal (AUC ≈ 0.60). Perfect would hug the top-left.' },
  { src: '/eval/pr.png', title: 'Precision–recall', caption: 'Precision barely rises above the 62% strain prevalence, so the model is only a little better than guessing "strained".' },
  { src: '/eval/feature-importance.png', title: 'What the model uses', caption: 'Standardised logistic-regression weights: which activity counts push a minute toward "strained".' },
  { src: '/eval/by-condition.png', title: 'Where it fails', caption: 'It flags time-pressure minutes most and neutral least, but 42% of calm minutes are still flagged — it cannot cleanly tell them apart.' },
];

export default function Evaluation() {
  const lr = metrics.models.logistic_regression;
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Logo />
      <Link to="/" className="mt-6 inline-block text-sm underline">
        Back to home
      </Link>

      <p className="mt-8 text-sm font-medium uppercase tracking-widest text-muted-foreground">Evaluation</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">Does the model actually work?</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        We trained a classifier to tell a <strong className="text-foreground">strained</strong> work minute (interrupted or
        under time pressure) from a <strong className="text-foreground">neutral</strong> one, using one minute of keyboard
        and mouse activity from the public{' '}
        <a href={metrics.source} target="_blank" rel="noreferrer" className="underline">
          SWELL-KW dataset
        </a>{' '}
        ({metrics.participants} participants, {metrics.rows.toLocaleString()} minutes). We tested it on people it never
        trained on (leave-participants-out). This is work context, not a diagnosis — a prototype, and not medical advice.
      </p>

      <Card className="mt-8 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-4 font-medium">Model</th>
              <th className="p-4 text-right font-medium">Accuracy</th>
              <th className="p-4 text-right font-medium">Catches strain</th>
              <th className="p-4 text-right font-medium">False alarms (FPR)</th>
              <th className="p-4 text-right font-medium">Missed strain (FNR)</th>
              <th className="p-4 text-right font-medium">ROC-AUC</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.name} className="border-b last:border-0">
                <td className="p-4 font-medium">{r.name}</td>
                <td className="p-4 text-right tabular-nums">{pct(r.data.accuracy)}</td>
                <td className="p-4 text-right tabular-nums">{pct(r.data.recall_strain)}</td>
                <td className="p-4 text-right tabular-nums">{pct(r.data.false_positive_rate)}</td>
                <td className="p-4 text-right tabular-nums">{pct(r.data.false_negative_rate)}</td>
                <td className="p-4 text-right tabular-nums">{r.data.roc_auc?.toFixed(2) ?? '0.50'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-6 space-y-3 text-sm leading-relaxed">
        <p>
          <strong>The honest headline.</strong> The signal is real but weak. Across unseen people the model reaches an
          ROC-AUC of about {lr.roc_auc.toFixed(2)} — better than chance, but nowhere near reliable.
        </p>
        <p>
          <strong>Why accuracy is the wrong score here.</strong> The “always strained” baseline looks more accurate (
          {pct(metrics.baseline_majority_class.accuracy)}) only because most minutes are strained. It never catches a single
          calm minute — a {pct(metrics.baseline_majority_class.false_positive_rate)} false-alarm rate. Our model gives up a
          little accuracy to actually tell the two apart, which is why we report false positives and false negatives
          separately, not one accuracy number.
        </p>
        <p className="text-muted-foreground">
          Reported honestly, including the weak parts, per the hackathon brief. The live check-in still compares you only
          with your own usual typing. This project is a prototype and is not medical advice.{' '}
          <Link to="/sources" className="underline">
            Sources &amp; limits
          </Link>
          .
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {GRAPHS.map((g) => (
          <figure key={g.src} className="rounded-2xl border bg-card p-4">
            <img src={g.src} alt={g.title} className="w-full rounded-lg bg-white" loading="lazy" />
            <figcaption className="mt-3">
              <p className="text-sm font-medium">{g.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{g.caption}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
