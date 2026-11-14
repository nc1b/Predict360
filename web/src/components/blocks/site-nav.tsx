// Floating navbar in the style of the Iris Checks site: brand block on the left,
// a segmented section switcher in the middle with a sliding active pill, and
// theme toggle plus account actions on the right. A thin bar shows scroll progress.

import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Activity, ArrowRight, CircleHelp, FlaskConical, Home, ListChecks, Menu, X } from 'lucide-react';
import { useAuth } from '@/auth-context';
import { ThemeToggle } from '@/components/blocks/theme-toggle';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { id: 'home', name: 'Home', icon: Home },
  { id: 'signals', name: 'Signals', icon: Activity },
  { id: 'how-it-works', name: 'How it works', icon: ListChecks },
  { id: 'evidence', name: 'Evidence', icon: FlaskConical },
  { id: 'faq', name: 'FAQ', icon: CircleHelp },
] as const;

function useScrollState(enabled: boolean) {
  const [state, setState] = React.useState({ section: 'home', progress: 0, scrolled: false });
  React.useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      let section = 'home';
      if (enabled) {
        for (const s of SECTIONS) {
          const el = document.getElementById(s.id);
          if (el && el.getBoundingClientRect().top <= 140) section = s.id;
        }
      }
      setState({ section, progress: max > 0 ? Math.min(1, y / max) : 0, scrolled: y > 8 });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [enabled]);
  return state;
}

export function SiteNav() {
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  const { user } = useAuth();
  const { section, progress, scrolled } = useScrollState(onHome);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const active = onHome ? section : null;
  const href = (id: string) => (id === 'home' ? '/#home' : `/#${id}`);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const signedIn = user && !user.guest;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-foreground transition-opacity duration-300"
        style={{ transform: `scaleX(${progress})`, opacity: scrolled ? 1 : 0 }}
      />
      <header className="fixed inset-x-0 top-0 z-50">
        <div className={cn('mx-auto max-w-6xl px-3 transition-[padding] duration-500 sm:px-6', scrolled ? 'pt-2' : 'pt-4')}>
          <nav
            aria-label="Main"
            className={cn(
              'flex h-14 items-center gap-2 rounded-2xl border bg-background/80 px-2 backdrop-blur-xl transition-shadow duration-500',
              scrolled ? 'shadow-lg shadow-black/5 dark:shadow-black/40' : 'shadow-sm'
            )}
          >
            <Logo />

            <div className="mx-auto hidden items-center gap-1 rounded-xl border bg-muted/50 p-1 lg:flex">
              {SECTIONS.map((item) => {
                const isActive = active === item.id;
                return (
                  <a
                    key={item.id}
                    href={href(item.id)}
                    aria-current={isActive ? 'location' : undefined}
                    className={cn(
                      'relative flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-lg border bg-background shadow-sm"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <item.icon className="relative hidden size-4 xl:block" aria-hidden="true" />
                    <span className="relative whitespace-nowrap">{item.name}</span>
                  </a>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
              <ThemeToggle />
              {!signedIn && (
                <Link
                  to="/login"
                  className="hidden h-10 items-center whitespace-nowrap rounded-xl border px-4 text-sm font-medium transition-colors hover:bg-accent sm:flex"
                >
                  Sign in
                </Link>
              )}
              <Link
                to={user ? '/app' : '/signup'}
                className="hidden h-10 items-center gap-2 whitespace-nowrap rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85 sm:flex"
              >
                {user ? 'Open check-in' : 'Start check-in'}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                className="flex size-10 cursor-pointer items-center justify-center rounded-xl border transition-colors hover:bg-accent lg:hidden"
              >
                {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </button>
            </div>
          </nav>

          {menuOpen && (
            <div className="animate-element mt-2 rounded-2xl border bg-background/95 p-2 shadow-xl shadow-black/10 backdrop-blur-xl [animation-duration:250ms] lg:hidden">
              {SECTIONS.map((item) => (
                <a
                  key={item.id}
                  href={href(item.id)}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  {item.name}
                </a>
              ))}
              <div className="mt-2 grid gap-2 border-t pt-2 sm:hidden">
                {!signedIn && (
                  <Link to="/login" className="flex h-10 items-center justify-center rounded-xl border text-sm font-medium hover:bg-accent">
                    Sign in
                  </Link>
                )}
                <Link
                  to={user ? '/app' : '/signup'}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-medium text-background"
                >
                  {user ? 'Open check-in' : 'Start check-in'}
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
