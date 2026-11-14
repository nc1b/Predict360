// Two-column FAQ: sticky intro and a card on the left, accordion on the right.
// Modeled on the 21st.dev "Two-Column FAQ" section.

import { ArrowRight, BookOpen } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const REPO_URL = 'https://github.com/nc1b/Predict360';

const FAQS = [
  {
    q: 'Is this medical advice?',
    a: 'No. This project is a prototype and is not medical advice. It has only been tested on simulated typing. It cannot detect or rule out any condition, and it cannot tell you whether you are ready to work.',
  },
  {
    q: 'What exactly is measured?',
    a: 'Three things about timing: how long each key is held down, how long you pause between your two sentences, and how uneven the gaps between keys are inside a sentence.',
  },
  {
    q: 'Do you read what I type?',
    a: 'No. Each key is reduced to one of four labels (character, space, sentence end, or edit) plus two timestamps. Your words stay in the text box and are cleared when you finish. The backend rejects any request that includes text or key values.',
  },
  {
    q: 'Where is my data stored?',
    a: 'On this device, in your browser. Your account and your check-in history (three numbers per check-in) never leave it, and the backend keeps nothing after it answers. You can delete everything from the check-in page.',
  },
  {
    q: 'Why do I need three check-ins before I get a score?',
    a: 'The score compares you with yourself, not with other people. Three earlier check-ins is the minimum for a usable picture of your usual typing.',
  },
  {
    q: 'My score dropped. What does that mean?',
    a: 'Only that your typing timing differed from your usual. A doorbell, a different keyboard, or stopping to think produces the same result as anything else. In our tests a simulated distraction and a deliberate pause were flagged identically.',
  },
  {
    q: 'Does it work on a phone?',
    a: 'Not reliably. Most on-screen keyboards do not report when individual keys go down and up, so there is nothing to time. Use a physical keyboard.',
  },
];

export function Faqs() {
  return (
    <section id="faq" className="scroll-mt-20 px-6 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <span className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            FAQs
          </span>
          <h2 className="mt-5 text-balance text-3xl font-medium tracking-tight md:text-4xl">Your questions answered</h2>
          <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
            What Predict 360 measures, what it can't tell you, and where your data lives.
          </p>

          <Card id="privacy" className="mt-8 max-w-md scroll-mt-28 p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <BookOpen className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium">Check the rules yourself</p>
                <p className="text-xs text-muted-foreground">Scoring, thresholds and test results are public</p>
              </div>
            </div>
            <a
              href={`${REPO_URL}#scoring-rules`}
              target="_blank"
              rel="noreferrer"
              className={buttonClass({ className: 'mt-4 w-full' })}
            >
              Read the scoring rules
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </Card>
        </div>

        <Accordion type="single" collapsible defaultValue="item-0" className="border-t border-border">
          {FAQS.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
