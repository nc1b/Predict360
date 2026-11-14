// Navigation and hero, adapted from the 21st.dev "SaaS template" component to the
// Predict 360 palette (light linen instead of black) and real product content.

import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { useAuth } from '@/auth-context';

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#evidence', label: 'Evidence' },
  { href: '#faq', label: 'FAQ' },
];

export const Navigation = React.memo(() => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { user } = useAuth();
  const close = () => setMobileMenuOpen(false);

  const actions = user ? (
    <Link to="/app" className={buttonClass({ size: 'sm' })} onClick={close}>
      Open check-in
    </Link>
  ) : (
    <>
      <Link to="/login" className={buttonClass({ variant: 'ghost', size: 'sm' })} onClick={close}>
        Sign in
      </Link>
      <Link to="/signup" className={buttonClass({ size: 'sm' })} onClick={close}>
        Sign up
      </Link>
    </>
  );

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
      <nav className="relative mx-auto max-w-6xl px-6 py-3.5" aria-label="Main">
        <div className="flex items-center justify-between">
          <Logo />

          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">{actions}</div>

          <button
            type="button"
            className="rounded-md p-1 text-foreground md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="animate-slide-down border-t border-border/70 bg-background/95 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-1 px-6 py-4">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={close} className="py-2 text-sm text-muted-foreground hover:text-foreground">
                {l.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-border/70 pt-4">{actions}</div>
          </div>
        </div>
      )}
    </header>
  );
});
Navigation.displayName = 'Navigation';

/** A static sample of the product, in place of the template's screenshot. */
function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 left-1/2 h-64 w-[80%] -translate-x-1/2 rounded-full bg-accent/35 blur-3xl"
      />
      <div className="relative rounded-2xl border border-border bg-muted/60 p-3 shadow-[0_24px_60px_-28px_rgba(43,43,43,0.35)] sm:p-5">
        <div className="mb-3 flex items-center gap-1.5 px-1" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="ml-3 text-xs text-muted-foreground">Sample check-in</span>
        </div>
        <div className="grid gap-3 text-left sm:grid-cols-2 sm:gap-5">
          <Card className="p-5">
            <p className="text-base font-medium">Morning check-in</p>
            <p className="mt-1 text-sm text-muted-foreground">Write two sentences about how your morning is going.</p>
            <div className="mt-4 h-24 rounded-md border border-border px-3 py-2.5 text-sm text-muted-foreground">
              Slept okay, a bit slow to get going. Coffee is helping and I have a plan for the day
              <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-foreground" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className={buttonClass({ size: 'sm', className: 'pointer-events-none' })}>Finish check-in</span>
              <span className="text-xs text-muted-foreground">84 keystrokes timed</span>
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Compared with your usual typing</p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-5xl font-medium leading-none tracking-tight tabular-nums">65</span>
              <span className="rounded-md bg-some px-2.5 py-1 text-xs font-medium text-some-foreground">Some difference</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-track">
              <div className="h-2 w-[65%] rounded-full bg-accent" />
            </div>
            <p className="mt-4 text-sm leading-relaxed">The pause between sentences was longer than your usual.</p>
            <p className="mt-3 text-xs text-muted-foreground">Prototype, not medical advice.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export const Hero = React.memo(() => {
  const { user } = useAuth();
  return (
    <section className="relative flex animate-fade-in flex-col items-center px-6 pb-20 pt-32 md:pt-40">
      <aside className="mb-8 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 backdrop-blur-sm">
        <span className="text-xs text-muted-foreground">Hackathon prototype, not medical advice</span>
        <a
          href="#faq"
          className="flex items-center gap-1 text-xs font-medium text-foreground transition-all hover:opacity-70 active:scale-95"
        >
          Read why
          <ArrowRight className="size-3" aria-hidden="true" />
        </a>
      </aside>

      <h1 className="mb-6 max-w-3xl text-balance text-center text-4xl font-medium leading-[1.08] tracking-[-0.04em] text-foreground md:text-5xl lg:text-6xl">
        A two-sentence <span className="whitespace-nowrap">check-in</span> for your morning
      </h1>

      <p className="mb-10 max-w-xl text-pretty text-center text-base leading-relaxed text-muted-foreground md:text-lg">
        Type two sentences about how your morning is going. Predict 360 compares your typing rhythm with your own usual.
        It never reads your words.
      </p>

      <div className="relative z-10 mb-16 flex flex-wrap items-center justify-center gap-3">
        <Link to={user ? '/app' : '/signup'} className={buttonClass({ size: 'lg' })}>
          Start a check-in
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <a href="#how-it-works" className={buttonClass({ variant: 'outline', size: 'lg' })}>
          See how it works
        </a>
      </div>

      <ProductPreview />
    </section>
  );
});
Hero.displayName = 'Hero';
