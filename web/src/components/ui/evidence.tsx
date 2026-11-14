// One spotlight quote with three supporting numbers, in the layout of the
// 21st.dev "Single Voice Spotlight Testimonial". Predict 360 has no users yet,
// so instead of a customer quote this shows the main finding from our own tests.
// Every number here is measured output from the repo (see README "Measured results").

import { QRCode } from '@/components/ui/qr-code';
import { REPO_URL } from '@/components/ui/faqs';

const METRICS = [
  { value: '5 of 5', label: 'scripted typing changes flagged correctly, against 0 for a comparator that always answers 100' },
  { value: '0 of 900', label: 'ordinary simulated sessions flagged by mistake, across fast, average and slow typists' },
  { value: '3,600', label: 'seeded simulated sessions in the stress test. No real people have been tested yet' },
];

export function Evidence() {
  const siteUrl = typeof window === 'undefined' ? REPO_URL : window.location.origin;
  return (
    <section id="evidence" className="scroll-mt-20 border-y border-border bg-card px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">What our tests show</p>
        <figure className="mt-6">
          <blockquote className="text-balance text-2xl font-medium leading-snug tracking-tight md:text-4xl md:leading-[1.2]">
            A typist distracted for six seconds and a deliberate four-second pause got the same flag and the same score. A
            flag means your timing differed from your usual, and nothing more.
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
            <span aria-hidden="true" className="h-px w-8 bg-border" />
            From the confounder test in our published results
          </figcaption>
        </figure>

        <dl className="mt-14 grid gap-8 border-t border-border pt-10 md:grid-cols-3">
          {METRICS.map((m) => (
            <div key={m.value}>
              <dt className="text-4xl font-medium tracking-tight tabular-nums">{m.value}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.label}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-14 flex flex-col items-start gap-5 rounded-xl border border-border bg-background p-5 sm:flex-row sm:items-center">
          <QRCode value={siteUrl} size={104} aria-label="QR code linking to this site" className="shrink-0 rounded-lg" />
          <div>
            <p className="text-base font-medium">Try it on your own laptop</p>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              Scan to send yourself the link, then open it on a computer. Key timing needs a physical keyboard, so phones
              can't run a check-in.
            </p>
            <a
              href={`${REPO_URL}#measured-results`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-medium underline underline-offset-4 hover:opacity-70"
            >
              Read the full test results
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
