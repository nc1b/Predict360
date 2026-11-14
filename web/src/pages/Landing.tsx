import { Navigation, Hero } from '@/components/ui/saa-s-template';
import { HowItWorks } from '@/components/ui/how-it-works';
import { Evidence } from '@/components/ui/evidence';
import { Faqs } from '@/components/ui/faqs';
import { FooterSection } from '@/components/ui/footer-section';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main>
        <Hero />
        <HowItWorks />
        <Evidence />
        <Faqs />
      </main>
      <FooterSection />
    </div>
  );
}
