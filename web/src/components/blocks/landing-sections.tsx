// Landing page sections, in the layout language of the Iris Checks site:
// uppercase eyebrow, bold heading, bordered cards that lift on hover.

import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Keyboard, Pause, PenLine, Play, ShieldCheck, Timer, UserRoundCheck } from 'lucide-react';
import { useAuth } from '@/auth-context';
import { buttonClass } from '@/components/ui/button';
import { QRCode } from '@/components/ui/qr-code';
import { SIGNALS } from '@/lib/signals';
import { REPO_URL } from '@/lib/site';
import { cn } from '@/lib/utils';

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">{children}</p>;
}

const cardHover = 'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5';

export function SignalsSection() {
  return (
    <section id="signals" className="scroll-mt-24 border-t">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <Eyebrow>Three signals</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-bold md:text-5xl">One check-in, three things measured</h2>
          <p className="mt-4 text-muted-foreground">
            Each signal comes from the same two sentences. None of them can diagnose anything. They tell you when your typing
            differed from your own usual, and we&apos;re honest about how well each one works.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {SIGNALS.map((s, i) => (
            <article key={s.id} className={cn('group flex h-full flex-col rounded-3xl border bg-card p-6', cardHover)}>
              <div className="flex items-start justify-between">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-background transition-transform duration-300 group-hover:scale-105">
                  <s.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-sm text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-2xl font-bold">{s.name}</h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{s.signal}</p>
              <p className="mt-4 text-sm">{s.measures}</p>

              <dl className="mt-5 space-y-3 border-t pt-5 text-sm">
                <div>
                  <dt className="font-medium">Why it matters</dt>
                  <dd className="mt-0.5 text-muted-foreground">{s.why}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 font-medium">
                    Evidence
                    <span className="rounded-full border px-2 py-0.5 text-[11px] font-normal text-muted-foreground">Simulated data only</span>
                  </dt>
                  <dd className="mt-0.5 text-muted-foreground">{s.evidence}</dd>
                </div>
                <div>
                  <dt className="font-medium">Limits</dt>
                  <dd className="mt-0.5 text-muted-foreground">{s.limits}</dd>
                </div>
              </dl>

              <p className="mt-auto pt-6 text-sm">
                <span className="text-muted-foreground">If flagged: </span>
                <span className="font-medium">{s.flag}</span>
              </p>
            </article>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          A flag describes typing, not health.{' '}
          <a
            href={`${REPO_URL}#scoring-rules`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4 hover:opacity-70"
          >
            See the scoring rules <ArrowRight className="size-3.5" aria-hidden="true" />
          </a>
        </p>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: UserRoundCheck, title: 'Open the check-in', body: 'Sign in, or continue as a guest. It works in any desktop browser.' },
  { icon: PenLine, title: 'Write two sentences', body: 'Say how your morning is going. End the first sentence with a period.' },
  { icon: Timer, title: 'Timing is measured', body: 'Key holds, the pause between sentences, and rhythm. The words are discarded.' },
  { icon: Keyboard, title: 'Compare with your usual', body: 'After three check-ins you get a score from 0 to 100 against your own baseline.' },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-t">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-3 max-w-xl text-balance text-3xl font-bold md:text-5xl">About a minute, any keyboard</h2>
        <ol className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div aria-hidden="true" className="absolute left-0 right-0 top-[2.6rem] hidden h-px bg-border lg:block" />
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className={cn('group relative h-full rounded-2xl border bg-card p-6', cardHover)}>
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full border bg-background transition-colors duration-300 group-hover:bg-foreground group-hover:text-background">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="text-sm text-muted-foreground">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const METRICS = [
  { value: '5 of 5', label: 'scripted typing changes flagged correctly. A comparator that always answers 100 caught none.' },
  { value: '0 of 900', label: 'ordinary simulated sessions flagged by mistake, across fast, average and slow typists.' },
  { value: '3,600', label: 'seeded simulated sessions in the stress test. No real people have been tested yet.' },
];

export function EvidenceSection() {
  const siteUrl = typeof window === 'undefined' ? REPO_URL : window.location.origin;
  return (
    <section id="evidence" className="scroll-mt-24 border-t bg-muted/40">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <Eyebrow>What our tests show</Eyebrow>
        <figure className="mt-6">
          <blockquote className="text-balance text-2xl font-bold leading-snug tracking-tight md:text-4xl md:leading-[1.2]">
            A typist distracted for six seconds and a deliberate four-second pause got the same flag and the same score.{' '}
            <span className="text-muted-foreground">A flag means your timing differed from your usual, and nothing more.</span>
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
            <span aria-hidden="true" className="h-px w-8 bg-border" />
            From the confounder test in our published results
          </figcaption>
        </figure>

        <dl className="mt-14 grid gap-4 md:grid-cols-3">
          {METRICS.map((m) => (
            <div key={m.value} className={cn('rounded-2xl border bg-card p-6', cardHover)}>
              <dt className="text-4xl font-bold tracking-tight tabular-nums">{m.value}</dt>
              <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.label}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex flex-col items-start gap-5 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center">
          <QRCode value={siteUrl} size={104} aria-label="QR code linking to this site" className="shrink-0 rounded-xl" />
          <div>
            <p className="font-semibold">Try it on your own laptop</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Scan to send yourself the link, then open it on a computer. Key timing needs a physical keyboard, so phones
              can&apos;t run a check-in.
            </p>
            <a
              href={`${REPO_URL}#measured-results`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4 hover:opacity-70"
            >
              Read the full test results <ArrowRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ROWS: { items: FaqItem[]; duration: number; reverse?: boolean }[] = [
  {
    duration: 70,
    items: [
      {
        question: 'Is this medical advice?',
        answer: 'No. This project is a prototype and is not medical advice. It cannot detect or rule out any condition, and it cannot tell you whether you are ready to work.',
      },
      {
        question: 'What exactly is measured?',
        answer: 'How long each key is held, how long you pause between your two sentences, and how uneven the gaps between keys are inside a sentence.',
      },
      {
        question: 'Do you read what I type?',
        answer: 'No. Each key becomes one of four labels (character, space, sentence end, edit) plus two timestamps. Your words stay in the text box and are cleared when you finish.',
      },
      {
        question: 'Where is my data stored?',
        answer: 'Numeric summaries are cached on your device and synced to your account in Supabase. Typed words are never saved. You can delete your activity and check-in history from your dashboard.',
      },
    ],
  },
  {
    duration: 80,
    reverse: true,
    items: [
      {
        question: 'Why three check-ins before a score?',
        answer: 'The score compares you with yourself, not with other people. Three earlier check-ins is the minimum for a usable picture of your usual typing.',
      },
      {
        question: 'My score dropped. What does that mean?',
        answer: 'Only that your typing timing differed from your usual. A doorbell, a new keyboard, or stopping to think looks the same as anything else.',
      },
      {
        question: 'Does it work on a phone?',
        answer: 'Not reliably. On-screen keyboards usually do not report when each key goes down and up, so there is nothing to time. Use a physical keyboard.',
      },
      {
        question: 'Has it been tested on people?',
        answer: 'Not yet. Every published result comes from seeded, simulated typing. Real typing is noisier, so expect it to do worse on people.',
      },
    ],
  },
];

function FaqCard({ item }: { item: FaqItem }) {
  return (
    <article className="flex w-[19rem] shrink-0 flex-col gap-3 rounded-2xl border bg-card p-6 text-card-foreground shadow-sm transition-colors hover:border-foreground/30 sm:w-[23rem]">
      <h3 className="text-base font-semibold leading-snug">{item.question}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
    </article>
  );
}

export function FaqSection() {
  const [paused, setPaused] = React.useState(false);
  return (
    <section id="faq" className="scroll-mt-24 overflow-hidden border-t">
      <div className="mx-auto max-w-5xl px-6 pt-24">
        <Eyebrow>FAQ</Eyebrow>
        <h2 className="mt-3 max-w-xl text-balance text-3xl font-bold md:text-5xl">Questions, answered plainly</h2>
      </div>
      <div className="mt-12 flex flex-col gap-3 pb-24">
        {FAQ_ROWS.map((row, i) => (
          <div
            key={i}
            className="faq-row relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
          >
            <div
              className="faq-track flex w-max items-stretch gap-4 py-2"
              data-reverse={row.reverse ? 'true' : 'false'}
              data-paused={paused ? 'true' : 'false'}
              style={{ '--faq-duration': `${row.duration}s` } as React.CSSProperties}
            >
              <div className="flex items-stretch gap-4 pr-4">
                {row.items.map((item) => (
                  <FaqCard key={item.question} item={item} />
                ))}
              </div>
              {/* Second copy makes the loop seamless; hidden from assistive tech. */}
              <div aria-hidden="true" inert className="flex items-stretch gap-4 pr-4">
                {row.items.map((item) => (
                  <FaqCard key={item.question} item={item} />
                ))}
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="mx-auto mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
          {paused ? 'Play' : 'Pause'} questions
        </button>
      </div>
    </section>
  );
}

const PRINCIPLES = [
  { icon: ShieldCheck, title: 'Timing only', body: 'The server rejects any request that contains text, key values or a user id.' },
  { icon: UserRoundCheck, title: 'You against you', body: 'Scores come from your own earlier check-ins, never from other people.' },
  { icon: BookOpen, title: 'Open rules', body: 'Every threshold, weight and test result is published in the repository.' },
];

export function AboutSection() {
  const { user } = useAuth();
  return (
    <section id="about" className="scroll-mt-24 overflow-hidden border-t bg-muted/40">
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-24 md:grid-cols-[1.1fr_1fr]">
        <div>
          <Eyebrow>About</Eyebrow>
          <h2 className="mt-3 text-balance text-3xl font-bold md:text-4xl">A student project with a simple goal</h2>
          <p className="mt-4 text-muted-foreground">
            Some mornings feel off before you can say why. Predict 360 explores whether a one-minute typing check-in can give
            you a quick, private way to notice that, by comparing today with your own usual.
          </p>
          <p className="mt-4 text-muted-foreground">
            It was built for the Veritas AI High School Hackathon 2026. This project is a prototype and is not medical advice.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={user ? '/app' : '/signup'} className={buttonClass({ size: 'lg' })}>
              Start a check-in <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'outline', size: 'lg' })}>
              View the code
            </a>
          </div>
        </div>
        <ul className="grid gap-3">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <li key={title} className={cn('flex gap-4 rounded-2xl border bg-card p-5', cardHover)}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
