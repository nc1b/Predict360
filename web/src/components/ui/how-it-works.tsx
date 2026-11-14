// Three numbered steps joined by a connector line, with a centered call to action.
// Modeled on the 21st.dev "How It Works Steps" section; typography does the work.

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { useAuth } from '@/auth-context';

const STEPS = [
  {
    title: 'Write two sentences',
    body: 'Open the check-in and type how your morning is going. It takes about a minute.',
  },
  {
    title: 'Only timing is measured',
    body: 'How long keys are held, the pause between sentences, and how even your rhythm is.',
  },
  {
    title: 'Compare with your usual',
    body: 'After three check-ins you get a score from 0 to 100 against your own baseline.',
  },
];

export function HowItWorks() {
  const { user } = useAuth();
  return (
    <section id="how-it-works" className="scroll-mt-20 px-6 py-24">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">How it works</p>
        <h2 className="mt-4 text-balance text-3xl font-medium tracking-tight md:text-4xl">Three steps from typing to a score</h2>

        <ol className="relative mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
          <div aria-hidden="true" className="absolute left-[16.67%] right-[16.67%] top-6 hidden h-px bg-border md:block" />
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex flex-col items-center">
              <span className="flex size-12 items-center justify-center rounded-full border border-border bg-background text-sm font-medium tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-6 text-lg font-medium">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-14">
          <Link to={user ? '/app' : '/signup'} className={buttonClass({ size: 'lg' })}>
            Start a check-in
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
