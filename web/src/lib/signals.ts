import type { ComponentType } from 'react';
import { KeyHoldIcon, RhythmIcon, SentencePauseIcon } from '@/components/signal-icons';

export interface Signal {
  id: string;
  name: string;
  signal: string;
  icon: ComponentType<{ className?: string }>;
  measures: string;
  why: string;
  evidence: string;
  limits: string;
  flag: string;
  research: { conditions: string; finding: string; cite: string; href: string };
}

export const SIGNALS: Signal[] = [
  {
    id: 'dwell',
    name: 'Key hold',
    signal: 'Dwell time',
    icon: KeyHoldIcon,
    measures: 'How long each key stays pressed, taken as the middle value across your whole check-in.',
    why: 'It is the steadiest of the three: one slow key barely moves a median.',
    evidence: 'On real typing from 51 people this was the steadiest measure (about 4% wobble for the same person). Holds 20% longer were detected about 90% of the time; 10% longer, about half.',
    limits: 'A different keyboard changes it. Compare check-ins from the same device only.',
    flag: 'Keys held longer than your usual',
    research: {
      conditions: 'Grogginess just after waking (sleep inertia)',
      finding:
        'Fourteen people typed while rested and again just after being woken at night. Key-hold times shifted enough for a classifier to tell the two states apart (AUC 0.91 to 0.93; 0.76 to 0.79 from median hold time alone).',
      cite: 'Giancardo et al., Scientific Reports 2015',
      href: 'https://doi.org/10.1038/srep09678',
    },
  },
  {
    id: 'pause',
    name: 'Sentence pause',
    signal: 'Inter-sentence pause',
    icon: SentencePauseIcon,
    measures: 'The gap from the period, question mark or exclamation point to the first letter of your next sentence.',
    why: 'It captures the moment of deciding what to say next, separately from how you type.',
    evidence: 'Simulated only: the public typing data has no sentences, so this measure has not been tested on real people.',
    limits: 'Two sentences give exactly one pause, so one doorbell decides the result.',
    flag: 'A longer pause between sentences',
    research: {
      conditions: 'Mental and physical stress',
      finding:
        'Pauses and other timing features changed after people did mentally or physically stressful tasks. A single pause is also explained by everyday distractions.',
      cite: 'Vizer et al., Int J Human-Computer Studies 2009',
      href: 'https://doi.org/10.1016/j.ijhcs.2009.07.005',
    },
  },
  {
    id: 'rhythm',
    name: 'Rhythm variation',
    signal: 'Flight-time volatility',
    icon: RhythmIcon,
    measures: 'How uneven the gaps between key presses are inside a sentence. The pause between sentences is left out.',
    why: 'Even typing and stop-start typing can have the same speed. This tells them apart.',
    evidence: 'On real typing this wobbled about 26% for the same person even when nothing changed, so the model gives it little weight and misses most rhythm changes.',
    limits: 'The least sensitive signal. Small changes are often missed.',
    flag: 'A less even typing rhythm',
    research: {
      conditions: 'Stress while multitasking',
      finding:
        'Stressed typing could be recognised for each individual, but no marker of stress held across everyone. That is the case for a personal baseline, and it matches how unsteady this measure was in our own test.',
      cite: 'Wetherell, Lau and Maxion (typing rhythms under multitasking stress)',
      href: 'https://researchportal.northumbria.ac.uk/en/publications/the-effect-of-socially-evaluated-multitasking-stress-on-typing-rh/',
    },
  },
];
