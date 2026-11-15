import * as React from 'react';
import { HeroSection } from '@/components/blocks/hero-section';
import {
  AboutSection,
  EvidenceSection,
  FaqSection,
  HowItWorksSection,
  SignalsSection,
} from '@/components/blocks/landing-sections';
import { ProjectVideo } from '@/components/blocks/project-video';
import { ModesSection, ResearchMapSection } from '@/components/blocks/landing-sections';
import { SiteFooter } from '@/components/blocks/site-footer';
import { SiteNav } from '@/components/blocks/site-nav';

/**
 * A soft glow on the page background that follows your scroll position, so the
 * backdrop shifts depending on where you are. Subtle and theme-aware (it tints
 * with the foreground colour), and disabled under prefers-reduced-motion. It
 * paints on <body>, which shows through the transparent landing sections.
 */
function useScrollBackdrop() {
  React.useEffect(() => {
    const body = document.body;
    const previous = body.style.cssText;
    const paint = (y: number) => {
      body.style.backgroundImage = `radial-gradient(60rem 42rem at 50% ${y}%, color-mix(in oklab, var(--foreground) 8%, transparent), transparent 62%)`;
      body.style.backgroundAttachment = 'fixed';
      body.style.backgroundRepeat = 'no-repeat';
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      paint(28);
      return () => {
        body.style.cssText = previous;
      };
    }

    body.style.transition = 'background-position 0.25s linear';
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      paint(8 + p * 82);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      body.style.cssText = previous;
    };
  }, []);
}

export default function Landing() {
  useScrollBackdrop();
  return (
    <div className="min-h-screen text-foreground">
      <SiteNav />
      <main>
        <HeroSection />
        <ModesSection />
        <ResearchMapSection />
        <ProjectVideo />
        <SignalsSection />
        <HowItWorksSection />
        <EvidenceSection />
        <FaqSection />
        <AboutSection />
      </main>
      <SiteFooter />
    </div>
  );
}
