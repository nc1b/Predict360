import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** A key pressed down, with a timer bar showing how long it's held. */
export function KeyHoldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="3" width="14" height="11" rx="2.5" />
      <path d="M9 9.5h6" />
      <path d="M12 14v2.5" />
      <path d="M4 20h16" strokeOpacity="0.35" />
      <path d="M4 20h10" strokeWidth="2.6" />
    </svg>
  );
}

/** Two lines of text with a period and a gap before the next sentence. */
export function SentencePauseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 7h11" />
      <circle cx="16.5" cy="7" r="0.9" fill="currentColor" />
      <path d="M3 16h4" />
      <path d="M13 16h8" />
      <path d="M8.5 13.5v5M11.5 13.5v5" strokeOpacity="0.45" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

/** Uneven bars: keystroke intervals with irregular rhythm. */
export function RhythmIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 15v-3" />
      <path d="M7.5 15V7" />
      <path d="M11 15v-5" />
      <path d="M14.5 15V5" />
      <path d="M18 15v-2" />
      <path d="M3 19h18" strokeOpacity="0.35" />
    </svg>
  );
}
