// Thin wrapper around Clerk so pages depend on one small hook.
// Clerk handles accounts and sessions. The Predict 360 backend never receives a
// user identifier: the Clerk user id is only used as a key for history stored in
// this browser.

import * as React from 'react';
import { ClerkProvider, useUser } from '@clerk/react';
import { useNavigate } from 'react-router-dom';

export const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export interface AppUser {
  id: string;
  name: string;
  /** Guest mode: no account, history kept in this browser under a shared "guest" key. */
  guest: boolean;
}

interface AuthState {
  user: AppUser | null;
  loaded: boolean;
  enterGuest: () => void;
  exitGuest: () => void;
}

const GUEST_KEY = 'p360.guest';
const GUEST_USER: AppUser = { id: 'guest', name: 'there', guest: true };

const AuthContext = React.createContext<AuthState>({
  user: null,
  loaded: true,
  enterGuest: () => {},
  exitGuest: () => {},
});

function useGuest() {
  const [guest, setGuest] = React.useState(() => {
    try {
      return localStorage.getItem(GUEST_KEY) === '1';
    } catch {
      return false;
    }
  });
  const set = React.useCallback((on: boolean) => {
    try {
      if (on) localStorage.setItem(GUEST_KEY, '1');
      else localStorage.removeItem(GUEST_KEY);
    } catch {
      // Guest mode then lasts for this page view only.
    }
    setGuest(on);
  }, []);
  return { guest, enterGuest: () => set(true), exitGuest: () => set(false) };
}

export function useAuth(): AuthState {
  return React.useContext(AuthContext);
}

function ClerkBridge({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { guest, enterGuest, exitGuest } = useGuest();
  const value = React.useMemo<AuthState>(
    () => ({
      loaded: isLoaded,
      user:
        isLoaded && isSignedIn && user
          ? {
              id: user.id,
              name: user.firstName || user.username || user.primaryEmailAddress?.emailAddress || 'there',
              guest: false,
            }
          : guest
            ? GUEST_USER
            : null,
      enterGuest,
      exitGuest,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoaded, isSignedIn, user, guest]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Clerk's components, themed with the same CSS variables as the rest of the site. */
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

function GuestOnlyProvider({ children }: { children: React.ReactNode }) {
  const { guest, enterGuest, exitGuest } = useGuest();
  return (
    <AuthContext.Provider value={{ user: guest ? GUEST_USER : null, loaded: true, enterGuest, exitGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  if (!CLERK_KEY) {
    // No key configured: the site still works in guest mode.
    return <GuestOnlyProvider>{children}</GuestOnlyProvider>;
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
