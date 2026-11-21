import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/auth-context';
import { useIsDark } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { CompactDownload } from '@/components/download-desktop';

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
  const dark = useIsDark();

  return (
    <section id="home" className="relative overflow-hidden px-6 pb-16 pt-32 md:pt-40">
      {/* Soft background glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem]">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute left-1/2 top-[-12rem] h-[40rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(15,128,101,0.22),transparent)]" />
        <div className="absolute left-[62%] top-[4rem] h-[30rem] w-[44rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(97,62,152,0.30),transparent)] dark:bg-[radial-gradient(closest-side,rgba(74,45,120,0.55),transparent)]" />
        <div className="absolute left-[30%] top-[10rem] h-[22rem] w-[30rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(26,11,46,0.10),transparent)] dark:bg-[radial-gradient(closest-side,rgba(26,11,46,0.9),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,var(--background))]" />
      </div>

      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
        <a
          href="#model"
          className="hero-in gradient-border group inline-flex items-center gap-2 rounded-full bg-card/70 px-4 py-1.5 text-xs text-muted-foreground shadow-sm shadow-violet-950/5 backdrop-blur transition-colors hover:text-foreground"
        >
          <Sparkles className="size-3.5 text-emerald-400" aria-hidden="true" />
          All-day typing insights · Windows, Mac and web
          <span className="inline-flex items-center gap-1 text-foreground">
            Read more <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </a>

        <h1 className="hero-in hero-delay-1 mt-8 max-w-4xl bg-gradient-to-b from-foreground via-foreground to-violet-700 bg-clip-text dark:to-violet-300/80 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-transparent md:text-6xl lg:text-7xl">
          Your typing rhythm,
          <br className="hidden md:block" /> followed all day long
        </h1>

        <p className="hero-in hero-delay-2 mt-6 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
          Predict 360 tracks how you type across the whole day, from a quick 30-second check-in to quiet background tracking
          on your computer, and compares it only with your own usual. A model trained on real typing does the scoring, and your words never leave your device.
        </p>

        <div className="hero-in hero-delay-3 mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={user ? '/app' : '/signup'}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-emerald-400/30 bg-gradient-to-b from-emerald-500 to-emerald-700 px-7 text-base font-semibold text-[#f3f0ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_34px_-10px_rgba(4,95,75,0.9)] transition-transform hover:scale-[1.03] hover:brightness-110 active:scale-[0.98]"
          >
            {user ? 'Open your dashboard' : 'Get started free'}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <a href="#how-it-works" className="inline-flex h-12 items-center rounded-xl border border-border bg-card/70 px-6 text-base font-medium shadow-sm shadow-violet-950/5 backdrop-blur transition-colors hover:bg-accent dark:bg-secondary/50">
            See how it works
          </a>
        </div>

        <div className="hero-in hero-delay-3 mt-5 w-56">
          <CompactDownload />
        </div>

        <ul className="hero-in hero-delay-3 mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1.5"><Lock className="size-3.5" aria-hidden="true" />Words never leave your device</li>
          <li className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5" aria-hidden="true" />No employer dashboard</li>
          <li className="inline-flex items-center gap-1.5"><Sparkles className="size-3.5" aria-hidden="true" />Prototype, not medical advice</li>
        </ul>
      </div>

      {/* Product shot */}
      <div className="hero-in hero-delay-4 relative mx-auto mt-16 max-w-6xl">
        <div aria-hidden="true" className="absolute inset-x-[8%] -top-10 bottom-10 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,rgba(15,128,101,0.34),rgba(97,62,152,0.30),transparent)] blur-2xl" />
        <div ref={tilt} className="origin-top will-change-transform" style={{ transform: 'perspective(1800px) rotateX(14deg) scale(0.94)' }}>
          <div className="gradient-border rounded-2xl bg-card/60 p-1.5 shadow-[0_50px_120px_-40px_rgba(26,11,46,0.35)] backdrop-blur md:rounded-3xl md:p-2 dark:bg-white/[0.03] dark:shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)]">
            <img
              key={dark ? 'dark' : 'light'}
              src={dark ? '/app-dashboard.webp' : '/app-dashboard-light.webp'}
              alt="The Predict 360 dashboard: similarity score and key-hold gauges, streak, score trend, a Claude daily analysis and preferences"
              width={2880}
              height={1800}
              className={cn('h-auto w-full rounded-xl ring-1 ring-black/5 md:rounded-2xl dark:ring-white/5')}
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
