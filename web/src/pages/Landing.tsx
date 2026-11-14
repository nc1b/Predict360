import { HeroSection } from '@/components/blocks/hero-section';
import {
  AboutSection,
  EvidenceSection,
  FaqSection,
  HowItWorksSection,
  SignalsSection,
} from '@/components/blocks/landing-sections';
import { SiteFooter } from '@/components/blocks/site-footer';
import { SiteNav } from '@/components/blocks/site-nav';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main>
        <HeroSection />
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
