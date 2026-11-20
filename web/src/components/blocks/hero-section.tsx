import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/auth-context';
import { cn } from '@/lib/utils';

/** Tilts the product shot back slightly and flattens it as the page scrolls. */
function useScrollTilt() {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const p = Math.min(1, window.scrollY / 500);
      el.style.transform = `perspective(1800px) rotateX(${(1 - p) * 14}deg) scale(${0.94 + p * 0.06})`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); };
  }, []);
  return ref;
}

export function HeroSection() {
  const { user } = useAuth();
  const tilt = useScrollTilt();

  return (
    <section id="home" className="relative overflow-hidden px-6 pb-16 pt-32 md:pt-40">
      {/* Soft background glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem]">
        <div className="absolute left-1/2 top-[-12rem] h-[40rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(52,211,153,0.16),transparent)]" />
        <div className="absolute left-[60%] top-[6rem] h-[28rem] w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(167,139,250,0.14),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,var(--background))]" />
      </div>

      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
        <a
          href="#signals"
          className="hero-in group inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
        >
          <Sparkles className="size-3.5 text-emerald-400" aria-hidden="true" />
          New: daily check-ins with Claude analysis
          <span className="inline-flex items-center gap-1 text-foreground">
            Read more <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </a>

        <h1 className="hero-in hero-delay-1 mt-8 max-w-4xl bg-gradient-to-b from-foreground via-foreground to-foreground/55 bg-clip-text text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-transparent md:text-6xl lg:text-7xl">
          A 30-second typing check-in
          <br className="hidden md:block" /> for the end of a long shift
        </h1>

        <p className="hero-in hero-delay-2 mt-6 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
          Type two sentences on a break. Predict 360 compares your typing rhythm with your own usual, using a model trained on real
          typing, and your words never leave the browser.
        </p>

        <div className="hero-in hero-delay-3 mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={user ? '/app' : '/signup'}
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-b from-white via-white/95 to-white/70 px-7 text-base font-semibold text-black shadow-[0_8px_30px_-8px_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            {user ? 'Open your dashboard' : 'Get started free'}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <a href="#how-it-works" className="inline-flex h-12 items-center rounded-xl border border-border bg-secondary/50 px-6 text-base font-medium backdrop-blur transition-colors hover:bg-accent">
            See how it works
          </a>
        </div>

        <ul className="hero-in hero-delay-3 mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1.5"><Lock className="size-3.5" aria-hidden="true" />Words never leave your device</li>
          <li className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5" aria-hidden="true" />No employer dashboard</li>
          <li className="inline-flex items-center gap-1.5"><Sparkles className="size-3.5" aria-hidden="true" />Prototype, not medical advice</li>
        </ul>
      </div>

      {/* Product shot */}
      <div className="hero-in hero-delay-4 relative mx-auto mt-16 max-w-6xl">
        <div aria-hidden="true" className="absolute inset-x-[8%] -top-10 bottom-10 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,rgba(52,211,153,0.28),rgba(167,139,250,0.12),transparent)] blur-2xl" />
        <div ref={tilt} className="origin-top will-change-transform" style={{ transform: 'perspective(1800px) rotateX(14deg) scale(0.94)' }}>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)] backdrop-blur md:rounded-3xl md:p-2">
            <img
              src="/app-dashboard.webp"
              alt="The Predict 360 dashboard: similarity score and key-hold gauges, streak, score trend, a Claude daily analysis and preferences"
              width={2880}
              height={1800}
              className={cn('h-auto w-full rounded-xl md:rounded-2xl')}
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-background" />
      </div>
    </section>
  );
}
