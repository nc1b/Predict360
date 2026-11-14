import * as React from 'react';

const KEY = 'p360.theme';

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains('dark');

/** True while the page is in dark mode; updates when the theme changes anywhere. */
export function useIsDark(): boolean {
  return React.useSyncExternalStore(subscribe, isDark, () => false);
}

export function setTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // The choice just won't be remembered.
  }
}
