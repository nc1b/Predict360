
import { SignIn, SignUp } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import { CLERK_KEY, useAuth } from '@/auth-context';
import { ThemeToggle } from '@/components/blocks/theme-toggle';
import { Logo } from '@/components/logo';
import { Card } from '@/components/ui/card';
import { HERO_IMAGES } from '@/lib/site';

function returnPath() {
  const target = new URLSearchParams(window.location.search).get('returnTo');
  return target?.startsWith('/desktop/connect?') ? target : '/app';
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { user, loaded } = useAuth();
  if (loaded && user) return <Navigate to={returnPath()} replace />;

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo tagline="Research prototype" />
          <ThemeToggle />
        </div>

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="animate-element text-4xl font-bold tracking-tight">{title}</h1>
          <p className="animate-element animate-delay-100 mt-3 text-muted-foreground">{subtitle}</p>

          <div className="animate-element animate-delay-200 mt-8">
            {CLERK_KEY ? (
              children
            ) : (
              <Card className="p-6 text-sm leading-relaxed">
                <p className="font-semibold">Sign-in isn&apos;t configured</p>
                <p className="mt-2 text-muted-foreground">
                  Add <code className="rounded bg-muted px-1 py-0.5">VITE_CLERK_PUBLISHABLE_KEY</code> to{' '}
                  <code className="rounded bg-muted px-1 py-0.5">web/.env.local</code> and restart the dev server.
                </p>
              </Card>
            )}
          </div>

          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            Accounts are handled by Clerk. Your timing summaries sync with your account. This project is a prototype and is not
            medical advice.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">By continuing, you agree to our <a href="/terms" className="underline">Terms of Service</a> and <a href="/privacy" className="underline">Privacy Policy</a>.</p>
        </main>
      </div>

      <div className="relative hidden p-4 lg:block">
        <div className="relative h-full overflow-hidden rounded-3xl border bg-muted">
          <img src={HERO_IMAGES.dark.src} alt={HERO_IMAGES.dark.alt} className="absolute inset-0 h-full w-full object-cover grayscale" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <figure className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/15 bg-black/50 p-5 text-white backdrop-blur-md">
            <blockquote className="text-lg font-semibold leading-snug">
              Two sentences during a break on your shift. Compared with your own usual, never with anyone else.
            </blockquote>
            <figcaption className="mt-2 text-sm text-white/70">Only key timing is measured. Your words stay on your device.</figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}

const flat = {
  elements: {
    rootBox: { width: '100%' },
    cardBox: { width: '100%', maxWidth: '100%', boxShadow: 'none', border: '1px solid var(--border)', borderRadius: '1rem' },
    card: { boxShadow: 'none', background: 'var(--card)' },
    header: { display: 'none' },
    socialButtonsBlockButton: { border: '1px solid var(--input)', color: 'var(--foreground)', boxShadow: 'none', height: '2.75rem' },
    socialButtonsBlockButtonText: { color: 'var(--foreground)' },
    formFieldInput: { border: '1px solid var(--input)', boxShadow: 'none', height: '2.75rem' },
    formButtonPrimary: { height: '2.75rem', boxShadow: 'none' },
    dividerLine: { background: 'var(--border)' },
  },
} as const;

export function Login() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to see your daily typing rhythm.">
      <SignIn routing="path" path="/login" signUpUrl={`/signup?returnTo=${encodeURIComponent(returnPath())}`} forceRedirectUrl={returnPath()} appearance={flat} />
    </AuthShell>
  );
}

export function Signup() {
  return (
    <AuthShell title="Create your account" subtitle="Three check-ins teach it your usual typing.">
      <SignUp routing="path" path="/signup" signInUrl={`/login?returnTo=${encodeURIComponent(returnPath())}`} forceRedirectUrl={returnPath()} appearance={flat} />
    </AuthShell>
  );
}
