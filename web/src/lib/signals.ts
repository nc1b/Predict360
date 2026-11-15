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
    evidence: 'Holds 1.3x longer were flagged in 300 of 300 simulated sessions; 1.05x in none.',
    limits: 'A different keyboard changes it. Compare check-ins from the same device only.',
    flag: 'Keys held longer than your usual',
    research: {
      conditions: "Parkinson's disease (motor slowing)",
      finding:
        "Longer and more variable key-hold times were reported in early Parkinson's. In the public Tappy data we checked, people with and without Parkinson's overlap heavily, so it cannot tell them apart.",
      cite: 'Giancardo et al., Scientific Reports 2016; Adams, PLoS ONE 2017 (Tappy)',
      href: 'https://www.nature.com/articles/srep34468',
    },
  },
  {
    id: 'pause',
    name: 'Sentence pause',
    signal: 'Inter-sentence pause',
    icon: SentencePauseIcon,
    measures: 'The gap from the period, question mark or exclamation point to the first letter of your next sentence.',
    why: 'It captures the moment of deciding what to say next, separately from how you type.',
    evidence: 'A pause 1.6x your usual was flagged every time; a four-second pause cost 35 points.',
    limits: 'Two sentences give exactly one pause, so one doorbell decides the result.',
    flag: 'A longer pause between sentences',
    research: {
      conditions: 'Depression and mood changes (psychomotor slowing); mental workload',
      finding:
        'Slower, more hesitant typing has been associated with mood symptoms in phone-keyboard studies, and pauses grow with harder thinking. A single pause is also explained by everyday distractions.',
      cite: 'Zulueta et al., J Med Internet Res 2018 (BiAffect)',
      href: 'https://www.jmir.org/2018/7/e241/',
    },
  },
  {
    id: 'rhythm',
    name: 'Rhythm variation',
    signal: 'Flight-time volatility',
    icon: RhythmIcon,
    measures: 'How uneven the gaps between key presses are inside a sentence. The pause between sentences is left out.',
    why: 'Even typing and stop-start typing can have the same speed. This tells them apart.',
    evidence: 'Reliable from about 1.4x more variation (295 of 300); only 83 of 300 at 1.2x.',
    limits: 'The least sensitive signal. Small changes are often missed.',
    flag: 'A less even typing rhythm',
    research: {
      conditions: 'Stress, time pressure and fatigue',
      finding:
        'Keystroke timing changes under stress and time pressure. Our own model on SWELL-KW office-work data finds only a weak signal (ROC-AUC about 0.6).',
      cite: 'Vizer et al., Int J Human-Computer Studies 2009; Koldijk et al. 2014 (SWELL-KW)',
      href: 'https://doi.org/10.1016/j.ijhcs.2009.07.005',
    },
  },
];
