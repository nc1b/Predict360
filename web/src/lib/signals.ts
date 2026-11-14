import { AudioLines, Hourglass, Keyboard, type LucideIcon } from 'lucide-react';

export interface Signal {
  id: string;
  name: string;
  signal: string;
  icon: LucideIcon;
  measures: string;
  why: string;
  evidence: string;
  limits: string;
  flag: string;
}

/** The three typing signals. Numbers quoted here come from the repo's test results. */
export const SIGNALS: Signal[] = [
  {
    id: 'dwell',
    name: 'Key hold',
    signal: 'Dwell time',
    icon: Keyboard,
    measures: 'How long each key stays pressed, taken as the middle value across your whole check-in.',
    why: 'It is the steadiest of the three: one slow key barely moves a median.',
    evidence: 'Holds 1.3x longer were flagged in 300 of 300 simulated sessions; 1.05x in none.',
    limits: 'A different keyboard changes it. Compare check-ins from the same device only.',
    flag: 'Keys held longer than your usual',
  },
  {
    id: 'pause',
    name: 'Sentence pause',
    signal: 'Inter-sentence pause',
    icon: Hourglass,
    measures: 'The gap from the period, question mark or exclamation point to the first letter of your next sentence.',
    why: 'It captures the moment of deciding what to say next, separately from how you type.',
    evidence: 'A pause 1.6x your usual was flagged every time; a four-second pause cost 35 points.',
    limits: 'Two sentences give exactly one pause, so one doorbell decides the result.',
    flag: 'A longer pause between sentences',
  },
  {
    id: 'rhythm',
    name: 'Rhythm variation',
    signal: 'Flight-time volatility',
    icon: AudioLines,
    measures: 'How uneven the gaps between key presses are inside a sentence. The pause between sentences is left out.',
    why: 'Even typing and stop-start typing can have the same speed. This tells them apart.',
    evidence: 'Reliable from about 1.4x more variation (295 of 300); only 83 of 300 at 1.2x.',
    limits: 'The least sensitive signal. Small changes are often missed.',
    flag: 'A less even typing rhythm',
  },
];
