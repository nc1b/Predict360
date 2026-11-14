// Footer in the layout of the Iris Checks site: a call to action, link columns,
// round icon buttons and a sun/moon theme switch.

import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Code, FlaskConical, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/auth-context';
import { LogoMark } from '@/components/logo';
import { buttonClass } from '@/components/ui/button';
import { REPO_URL } from '@/lib/site';
import { setTheme, useIsDark } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { DownloadDesktop } from '@/components/download-desktop';

const linkClass = 'block text-muted-foreground transition-colors hover:text-foreground';

const EXPLORE = [
  { label: 'Source code', icon: Code, href: REPO_URL },
  { label: 'Scoring rules', icon: BookOpen, href: `${REPO_URL}#scoring-rules` },
  { label: 'Test results', icon: FlaskConical, href: `${REPO_URL}#measured-results` },
];

export function SiteFooter() {
  const { user } = useAuth();
  const dark = useIsDark();
  return (
    <footer className="relative overflow-hidden border-t bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">Ready to check in?</h2>
            <p className="mb-6 text-muted-foreground">Two sentences, about a minute. Your words never leave your browser.</p>
            <Link to={user ? '/app' : '/signup'} className={buttonClass({ className: 'rounded-full px-5' })}>
              Start a check-in <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <div aria-hidden="true" className="pointer-events-none absolute -right-4 top-0 size-24 rounded-full bg-primary/10 blur-2xl" />
          </div>

          <nav aria-label="Quick links">
            <h3 className="mb-4 text-lg font-semibold">Quick links</h3>
            <div className="space-y-2 text-sm">
              <a href="/#signals" className={linkClass}>Signals</a>
              <a href="/#how-it-works" className={linkClass}>How it works</a>
              <a href="/#evidence" className={linkClass}>Evidence</a>
              <a href="/#faq" className={linkClass}>FAQ</a>
              <Link to="/sources" className={linkClass}>Sources & research limits</Link>
            </div>
          </nav>

          <nav aria-label="Account">
            <h3 className="mb-4 text-lg font-semibold">Account</h3>
            <div className="space-y-2 text-sm">
              <Link to="/app" className={linkClass}>Check-in</Link>
              <Link to="/login" className={linkClass}>Sign in</Link>
              <Link to="/signup" className={linkClass}>Create an account</Link>
            </div>
          </nav>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Explore</h3>
            <div className="mb-6 flex flex-wrap gap-3">
              {EXPLORE.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  title={label}
                  className="flex size-10 items-center justify-center rounded-full border border-input transition-colors hover:bg-accent"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </a>
              ))}
            </div>
            <div className="mb-5"><DownloadDesktop /></div>
            <div className="flex items-center gap-2">
              <Sun className="size-4" aria-hidden="true" />
              <button
                type="button"
                role="switch"
                aria-checked={dark}
                aria-label="Dark mode"
                onClick={() => setTheme(dark ? 'light' : 'dark')}
                className={cn(
                  'relative h-6 w-11 cursor-pointer rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  dark ? 'bg-foreground' : 'bg-muted'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 size-[18px] rounded-full transition-all',
                    dark ? 'left-[22px] bg-background' : 'left-0.5 bg-foreground'
                  )}
                />
              </button>
              <Moon className="size-4" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-center text-sm text-muted-foreground md:flex-row">
          <p className="flex items-center gap-2">
            <LogoMark className="size-5" />
            Predict 360. This project is a prototype and is not medical advice.
          </p>
          <p>Built for the Veritas AI High School Hackathon 2026.</p>
        </div>
      </div>
    </footer>
  );
}
