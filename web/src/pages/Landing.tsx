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
import { ScreeningComingSoon } from '@/components/screening-coming-soon';

/** Fades each section below the hero in as it scrolls into view. */
function useRevealSections() {
  React.useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>('main > section:not(#home), main > div > section')];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    sections.forEach((el) => el.classList.add('reveal'));
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in-view'); observer.unobserve(e.target); } }),
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export default function Landing() {
  useRevealSections();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main>
        <HeroSection />
        <ModesSection />
        <ResearchMapSection />
        <section id="screening" className="scroll-mt-24 px-6 py-12">
          <ScreeningComingSoon className="mx-auto max-w-5xl" />
        </section>
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
