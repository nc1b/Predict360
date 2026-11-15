
import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, Keyboard } from 'lucide-react';
import { useAuth } from '@/auth-context';
import { buttonClass } from '@/components/ui/button';
import { SIGNALS } from '@/lib/signals';
import { HERO_IMAGES } from '@/lib/site';

export function HeroSection() {
  const { user } = useAuth();
  const imageRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.min(window.scrollY, 900);
      if (imageRef.current) imageRef.current.style.transform = `translate3d(0, ${y * 0.25}px, 0) scale(${1 + y * 0.0003})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <section id="home" className="overflow-hidden">
      <div className="relative mx-auto max-w-5xl px-6 py-28 lg:pb-24 lg:pt-36">
        <div className="lg:flex lg:items-center lg:gap-12">
          <div className="relative z-10 mx-auto max-w-xl text-center lg:ml-0 lg:w-1/2 lg:text-left">
            <a
              href="#signals"
              className="animate-element group mx-auto flex w-fit items-center gap-2 rounded-lg border bg-background p-1 pr-3 transition-colors hover:bg-accent lg:ml-0"
            >
              <span className="rounded-[calc(var(--radius)-0.25rem)] bg-muted px-2 py-1 text-xs">Research prototype</span>
              <span className="text-sm">Two-sentence check-in or all-day on Windows &amp; Mac</span>
              <span className="block h-4 w-px bg-border" />
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </a>

            <h1 className="animate-element animate-delay-100 mt-10 text-balance text-4xl font-bold tracking-tight md:text-6xl">
              A 30-second typing check-in <span className="text-muted-foreground">for the end of a long shift.</span>
            </h1>
            <p className="animate-element animate-delay-200 mt-8 text-muted-foreground">
              Built for nurses on 12-hour shifts. Type two sentences during a break and Predict 360 uses a model
              trained on real typing to tell you whether your timing differs from your own usual. Your words never leave
              the browser. It&apos;s a hackathon prototype, not a medical device, and it can&apos;t diagnose anything.
            </p>

            <div className="animate-element animate-delay-300 mx-auto my-10 max-w-sm lg:my-12 lg:ml-0 lg:mr-auto">
              <div className="relative grid grid-cols-[1fr_auto] items-center rounded-[1rem] border bg-background pr-1.5 shadow shadow-neutral-950/5">
                <Keyboard className="pointer-events-none absolute inset-y-0 left-5 my-auto size-5 text-muted-foreground" aria-hidden="true" />
                <p className="flex h-14 items-center pl-12 text-left text-sm text-muted-foreground">Prototype, not medical advice</p>
                <Link to={user ? '/app' : '/signup'} className={buttonClass()} aria-label="Try a Predict 360 check-in">
                  Try it
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <ul aria-label="The three typing signals" className="animate-element animate-delay-400 flex flex-wrap justify-center gap-2 lg:justify-start">
              {SIGNALS.map((s) => (
                <li key={s.id}>
                  <a
                    href="#signals"
                    className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-sm backdrop-blur transition-colors hover:bg-accent"
                  >
                    <s.icon className="size-4" aria-hidden="true" />
                    {s.name}
                    <span className="text-xs text-muted-foreground">· {s.signal.toLowerCase()}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="absolute inset-0 -mx-4 rounded-3xl p-3">
          <div
            aria-hidden="true"
            className="absolute inset-0 z-[1] rounded-3xl bg-background/80 lg:bg-transparent lg:bg-gradient-to-r lg:from-background lg:from-35% lg:to-transparent"
          />
          <div className="relative h-full overflow-hidden rounded-3xl">
            <div ref={imageRef} className="h-full w-full will-change-transform">
              <img
                className="hidden h-full w-full object-cover object-center grayscale dark:block"
                src={HERO_IMAGES.dark.src}
                alt={HERO_IMAGES.dark.alt}
                width={2000}
                height={1333}
              />
              <img
                className="h-full w-full object-cover object-center opacity-80 grayscale dark:hidden"
                src={HERO_IMAGES.light.src}
                alt={HERO_IMAGES.light.alt}
                width={2000}
                height={1333}
              />
            </div>
          </div>
        </div>

        <a
          href="#signals"
          aria-label="Scroll down"
          className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 rounded-full border bg-background/70 p-2 backdrop-blur transition-colors hover:bg-accent lg:block"
        >
          <ArrowDown className="size-4 animate-bounce motion-reduce:animate-none" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
