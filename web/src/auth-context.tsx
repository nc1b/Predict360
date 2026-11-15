
import * as React from 'react';
import { ClerkProvider, useUser, useSession } from '@clerk/react';
import { useNavigate } from 'react-router-dom';

export const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export interface AppUser {
  id: string;
  name: string;
}

interface AuthState {
  user: AppUser | null;
  loaded: boolean;
  getToken: () => Promise<string | null>;
}

const signedOut: AuthState = { user: null, loaded: true, getToken: async () => null };
const AuthContext = React.createContext<AuthState>(signedOut);

export function useAuth(): AuthState {
  return React.useContext(AuthContext);
}

function ClerkBridge({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { session } = useSession();
  const value = React.useMemo<AuthState>(
    () => ({
      loaded: isLoaded,
      getToken: async () => session?.getToken() ?? null,
      user:
        isLoaded && isSignedIn && user
          ? { id: user.id, name: user.firstName || user.username || user.primaryEmailAddress?.emailAddress || 'there' }
          : null,
    }),
    [isLoaded, isSignedIn, user, session]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const clerkAppearance = {
  variables: {
    colorPrimary: 'var(--primary)',
    colorPrimaryForeground: 'var(--primary-foreground)',
    colorBackground: 'var(--card)',
    colorForeground: 'var(--foreground)',
    colorMuted: 'var(--muted)',
    colorMutedForeground: 'var(--muted-foreground)',
    colorInput: 'var(--card)',
    colorInputForeground: 'var(--foreground)',
    colorBorder: 'var(--border)',
    colorRing: 'var(--ring)',
    colorDanger: '#b3261e',
    fontFamily: 'var(--font-sans)',
    borderRadius: '0.75rem',
  },
} as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  if (!CLERK_KEY) {
    return <AuthContext.Provider value={signedOut}>{children}</AuthContext.Provider>;
  }
  return (
    <ClerkProvider
      publishableKey={CLERK_KEY}
      routerPush={(to: string) => navigate(to)}
      routerReplace={(to: string) => navigate(to, { replace: true })}
      signInUrl="/login"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/app"
      signUpFallbackRedirectUrl="/app"
      afterSignOutUrl="/"
      appearance={clerkAppearance}
    >
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  );
}
