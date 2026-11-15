
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ChevronDown, Keyboard, Laptop, PenLine, ShieldCheck, Timer, UserRoundCheck } from 'lucide-react';
import { useAuth } from '@/auth-context';
import { buttonClass } from '@/components/ui/button';
import { QRCode } from '@/components/ui/qr-code';
import { SIGNALS } from '@/lib/signals';
import { REPO_URL } from '@/lib/site';
import { DownloadDesktop } from '@/components/download-desktop';
import { cn } from '@/lib/utils';

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">{children}</p>;
}

const cardHover = 'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5';

function ModeFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm text-muted-foreground">
      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/60" />
      <span>{children}</span>
    </li>
  );
}

export function ModesSection() {
  const { user } = useAuth();
  return (
    <section id="modes" className="scroll-mt-24 border-t">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <Eyebrow>Two ways to track</Eyebrow>
        <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold md:text-5xl">Pick how you check in</h2>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Write two sentences during a break on your shift, or opt into all-day tracking on Windows or Mac. Switch whenever you want — each
          result is labelled by mode and compared with your own baseline.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <article className={cn('flex h-full flex-col rounded-3xl border bg-card p-6', cardHover)}>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-background">
              <PenLine className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-2xl font-bold">Two-sentence check-in</h3>
            <p className="mt-1 text-sm font-medium text-muted-foreground">One minute, in the browser</p>
            <p className="mt-4 text-sm">
              Type two sentences. Predict 360 reads the rhythm of that check-in and shows your result right away.
            </p>
            <ul className="mt-5 space-y-2 border-t pt-5">
              <ModeFeature>Nothing to install — works in any desktop browser.</ModeFeature>
              <ModeFeature>Timing only; your words never leave the box.</ModeFeature>
              <ModeFeature>No background permission needed.</ModeFeature>
            </ul>
            <Link to={user ? '/app' : '/signup'} className={buttonClass({ className: 'mt-6 w-fit' })}>
              Start a check-in <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>

          <article className={cn('flex h-full flex-col rounded-3xl border bg-card p-6', cardHover)}>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-background">
              <Laptop className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-2xl font-bold">All-day tracking</h3>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Opt-in desktop app for Windows and Mac</p>
            <p className="mt-4 text-sm">
              Install the app and opt in. It builds your typing-rhythm trend through the day, on Windows or Mac.
            </p>
            <ul className="mt-5 space-y-2 border-t pt-5">
              <ModeFeature>Opt-in, asks permission, and starts paused — pause anytime.</ModeFeature>
              <ModeFeature>Counts only: clicks, key presses, focus. Never words, key values, or screenshots.</ModeFeature>
              <ModeFeature>A daily trend appears once there&apos;s enough data.</ModeFeature>
            </ul>
            <div className="mt-6">
              <DownloadDesktop />
            </div>
          </article>
        </div>

        <p className="mt-6 max-w-2xl text-xs text-muted-foreground">
          A &ldquo;Gathering data&rdquo; state shows when there isn&apos;t enough input yet. Predict 360 is a prototype and
          not a medical device.
        </p>
      </div>
    </section>
  );
}

export function ResearchMapSection() {
  return (
    <section id="research-map" className="scroll-mt-24 border-t">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <Eyebrow>What research says</Eyebrow>
        <h2 className="mt-3 max-w-2xl text-balance text-3xl font-bold md:text-5xl">Typing timing changes when people are worn down</h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Researchers have measured how typing timing shifts when people are groggy, stressed or overloaded. Predict 360
          tracks the same three signals against your own usual, so a change is easier to notice at the end of a long shift.
        </p>

        <ol className="mt-12 space-y-3">
          {SIGNALS.map((s) => (
            <li
              key={s.id}
              className={cn('grid items-center gap-4 rounded-2xl border bg-card p-5 md:grid-cols-[1fr_auto_1fr]', cardHover)}
            >
              <div className="flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
                  <s.icon className="size-6" />
                </span>
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.flag}</p>
                </div>
              </div>
              <ArrowRight className="hidden size-5 text-muted-foreground md:block" aria-hidden="true" />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Studied under</p>
                <p className="mt-0.5 font-semibold">{s.research.conditions}</p>
                <a
                  href={s.research.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  {s.research.cite}
                </a>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-6 max-w-2xl rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Important:</span> these studies were run on other people
          under controlled conditions. Predict 360 has not been tested on nurses, and it cannot tell why your typing
          changed. A change is a prompt to notice how you are doing, not a result. This project is a prototype and is not
          medical advice.
        </p>
      </div>
    </section>
  );
}

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
                    <span className="rounded-full border px-2 py-0.5 text-[11px] font-normal text-muted-foreground">What we measured</span>
                  </dt>
                  <dd className="mt-0.5 text-muted-foreground">{s.evidence}</dd>
                </div>
                <div>
                  <dt className="font-medium">Limits</dt>
                  <dd className="mt-0.5 text-muted-foreground">{s.limits}</dd>
                </div>
              </dl>

              <div className="mt-5 rounded-2xl border bg-muted/50 p-4 text-sm">
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Studied under</p>
                <p className="mt-1.5 font-semibold">{s.research.conditions}</p>
                <p className="mt-1.5 text-muted-foreground">{s.research.finding}</p>
                <a
                  href={s.research.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-medium underline underline-offset-4 hover:opacity-70"
                >
                  {s.research.cite}
                </a>
                <p className="mt-2 text-[11px] text-muted-foreground">Correlation in published studies, not a diagnosis. Predict 360 is not validated to detect it.</p>
              </div>

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
  { icon: UserRoundCheck, title: 'Open the check-in', body: 'Sign in on a laptop or desktop. It works in any browser with a physical keyboard.' },
  { icon: PenLine, title: 'Write two sentences', body: 'Say how your shift is going. End the first sentence with a period.' },
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
  { value: '59% vs 37%', label: 'of injected typing changes detected by the model trained on real typing versus a hand-set rule, both held to 10% false alarms.' },
  { value: '51 people', label: 'whose real typing was used. Every result is from typists the model never trained on. The changes were injected, since no fatigue-labelled typing data was available.' },
  { value: '41% missed', label: 'of injected changes still go undetected, including most changes in rhythm. Small changes hide inside normal variation.' },
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

const FAQS: FaqItem[] = [
  {
    question: 'Is this medical advice?',
    answer:
      'No. This project is a prototype and is not medical advice. It cannot detect or rule out any condition, and it cannot tell you whether you are ready to work.',
  },
  {
    question: 'What exactly is measured?',
    answer:
      'How long each key is held, how long you pause between your two sentences, and how uneven the gaps between keys are inside a sentence.',
  },
  {
    question: 'Do you read what I type?',
    answer:
      'No. Each key becomes one of four labels (character, space, sentence end, edit) plus two timestamps. Your words stay in the text box and are cleared when you finish.',
  },
  {
    question: 'Where is my data stored?',
    answer:
      'Numeric summaries are cached on your device and synced to your account in Supabase. Typed words are never saved. You can delete your activity and check-in history from your dashboard.',
  },
  {
    question: 'Why three check-ins before a score?',
    answer:
      'The score compares you with yourself, not with other people. Three earlier check-ins is the minimum for a usable picture of your usual typing.',
  },
  {
    question: 'My score dropped. What does that mean?',
    answer:
      'Only that your typing timing differed from your usual. A doorbell, a new keyboard, or stopping to think looks the same as anything else.',
  },
  {
    question: 'Does it work on a phone?',
    answer:
      'Not reliably. On-screen keyboards usually do not report when each key goes down and up, so there is nothing to time. Use a physical keyboard.',
  },
  {
    question: 'Has it been tested on people?',
    answer:
      'Partly. The model is trained and tested on real typing from 51 people in a public dataset, but the changes it detects there were injected by us. It has not been tested on nurses, and nothing shows that a flagged change means tiredness.',
  },
];

function FaqRow({ item, open, onToggle }: { item: FaqItem; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl border bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left text-base font-medium transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {item.question}
        <ChevronDown
          className={cn('size-5 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      <div className={cn('grid transition-all duration-200 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-24 border-t bg-background">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <div className="flex flex-col gap-5 lg:sticky lg:top-24">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm shadow-black/5">
              FAQs
            </span>
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">Your questions answered</h2>
            <p className="text-sm text-muted-foreground">
              What Predict 360 measures, what it can&apos;t tell you, and where your data lives.
            </p>

            <div className="mt-2 flex flex-col gap-3 rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background">
                  <BookOpen className="size-4" aria-hidden="true" />
                </span>
                <div className="flex flex-col leading-tight">
                  <p className="text-sm font-medium">Check the rules yourself</p>
                  <p className="text-xs text-muted-foreground">Scoring, thresholds and results are public</p>
                </div>
              </div>
              <a
                href={`${REPO_URL}#scoring-rules`}
                target="_blank"
                rel="noreferrer"
                className={buttonClass({ size: 'sm', className: 'mt-1 w-full rounded-full' })}
              >
                Read the scoring rules
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="space-y-3">
            {FAQS.map((item, i) => (
              <FaqRow key={item.question} item={item} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
            ))}
          </div>
        </div>
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
            Some days feel off before you can say why. Predict 360 explores whether your typing rhythm — from a quick
            two-sentence check-in or opt-in tracking through the day — can give you a private way to notice that, by comparing
            today with your own usual.
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
