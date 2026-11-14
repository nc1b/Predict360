// Footer with link columns and a light/dark theme toggle.
// Modeled on the 21st.dev "Footer section" component.

import * as React from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { Logo } from '@/components/logo';
import { REPO_URL } from '@/components/ui/faqs';

function useTheme() {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('p360.theme', next ? 'dark' : 'light');
    } catch {
      // The theme just won't be remembered.
    }
    setDark(next);
  };
  return { dark, toggle };
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      onClick={toggle}
      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {dark ? <Moon className="size-4" aria-hidden="true" /> : <Sun className="size-4" aria-hidden="true" />}
      {dark ? 'Dark' : 'Light'}
    </button>
  );
}

const linkClass = 'text-sm text-muted-foreground transition-colors hover:text-foreground';

export function FooterSection() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A two-sentence morning check-in that compares your typing rhythm with your own usual.
            </p>
          </div>

          <nav aria-label="Product">
            <h3 className="text-sm font-medium">Product</h3>
            <ul className="mt-4 space-y-2.5">
              <li><a href="/#how-it-works" className={linkClass}>How it works</a></li>
              <li><a href="/#faq" className={linkClass}>FAQ</a></li>
              <li><Link to="/app" className={linkClass}>Check-in</Link></li>
            </ul>
          </nav>

          <nav aria-label="Project">
            <h3 className="text-sm font-medium">Project</h3>
            <ul className="mt-4 space-y-2.5">
              <li><a href={REPO_URL} target="_blank" rel="noreferrer" className={linkClass}>Source code</a></li>
              <li><a href={`${REPO_URL}#scoring-rules`} target="_blank" rel="noreferrer" className={linkClass}>Scoring rules</a></li>
              <li><a href={`${REPO_URL}#measured-results`} target="_blank" rel="noreferrer" className={linkClass}>Test results</a></li>
            </ul>
          </nav>

          <div>
            <h3 className="text-sm font-medium">Appearance</h3>
            <div className="mt-4">
              <ThemeToggle />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>This project is a prototype and is not medical advice.</p>
          <p>Built for the Veritas AI High School Hackathon 2026.</p>
        </div>
      </div>
    </footer>
  );
}
