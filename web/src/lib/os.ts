import * as React from 'react';

export type OS = 'mac' | 'windows' | 'linux' | 'other';

/** Best-effort OS detection from the browser. */
export function detectOS(): OS {
  if (typeof navigator === 'undefined') return 'other';
  const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  const p = (data?.platform || navigator.platform || navigator.userAgent || '').toLowerCase();
  if (p.includes('mac') || p.includes('iphone') || p.includes('ipad') || p.includes('ios')) return 'mac';
  if (p.includes('win')) return 'windows';
  if (p.includes('linux') || p.includes('android')) return 'linux';
  return 'other';
}

/** Reactive OS (resolves after mount; 'other' during SSR/first paint). */
export function useOS(): OS {
  const [os, setOs] = React.useState<OS>('other');
  React.useEffect(() => setOs(detectOS()), []);
  return os;
}

/** The device word for copy: "Mac", "PC", or "computer". */
export function deviceNoun(os: OS): string {
  return os === 'mac' ? 'Mac' : os === 'windows' ? 'PC' : 'computer';
}

/** Download button label for the current OS. */
export function downloadLabel(os: OS): string {
  return os === 'mac' ? 'Download for Mac' : os === 'windows' ? 'Download for Windows' : 'Download the desktop app';
}
