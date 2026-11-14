import { SignIn, SignUp } from '@clerk/react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/logo';
import { Card } from '@/components/ui/card';
import { CLERK_KEY, useAuth } from '@/auth-context';

function AuthShell({ children }: { children: React.ReactNode }) {
  const { user, loaded, enterGuest } = useAuth();
  const navigate = useNavigate();
  if (loaded && user && !user.guest) return <Navigate to="/app" replace />;
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-6 py-10">
      <Logo />
      <main className="flex w-full flex-1 flex-col items-center justify-center py-10">
        <div className="flex justify-center">
          {CLERK_KEY ? (
            children
          ) : (
            <Card className="max-w-sm p-6 text-sm leading-relaxed">
              <p className="font-medium">Sign-in isn't configured</p>
              <p className="mt-2 text-muted-foreground">
                Add <code className="rounded bg-muted px-1 py-0.5">VITE_CLERK_PUBLISHABLE_KEY</code> to{' '}
                <code className="rounded bg-muted px-1 py-0.5">web/.env.local</code> and restart the dev server.
              </p>
            </Card>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            enterGuest();
            navigate('/app');
          }}
          className="mt-6 cursor-pointer rounded-md text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Continue as a guest
        </button>
      </main>
      <p className="max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
        Your account is handled by Clerk. Your check-in history stays in this browser. This project is a prototype and is
        not medical advice.
      </p>
    </div>
  );
}

export function Login() {
  return (
    <AuthShell>
      <SignIn routing="path" path="/login" signUpUrl="/signup" fallbackRedirectUrl="/app" />
    </AuthShell>
  );
}

export function Signup() {
  return (
    <AuthShell>
      <SignUp routing="path" path="/signup" signInUrl="/login" fallbackRedirectUrl="/app" />
    </AuthShell>
  );
}
