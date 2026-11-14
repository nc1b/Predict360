import * as React from 'react';
import { SignIn } from '@clerk/react';
import { useAuth, CLERK_KEY } from '@/auth-context';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cloud } from '@/lib/cloud';

export default function DesktopConnect() {
  const { user, loaded, getToken } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const challenge = params.get('challenge') || '', state = params.get('state') || '';
  const valid = /^[A-Za-z0-9_-]{43}$/.test(challenge) && /^[A-Za-z0-9_-]{43}$/.test(state);
  const [link, setLink] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const returnTo = `/desktop/connect?challenge=${encodeURIComponent(challenge)}&state=${encodeURIComponent(state)}`;
  async function connect() {
    setBusy(true); setError('');
    try {
      const token = await getToken(); if (!token) throw new Error('Please sign in again.');
      const { code } = await cloud<{ code: string }>('authorize', token, 'POST', { challenge });
      setLink(`predict360://auth?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
    } catch (error) { setError(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-lg px-6 py-12"><Logo /><Card className="mt-10 p-8">
    <h1 className="text-2xl font-bold">Connect Predict 360 desktop</h1>
    {!valid ? <p className="mt-4">Open the desktop app and choose Connect account to start.</p> : !loaded ? <p className="mt-4">Loading your account…</p> : !user ? <div className="mt-6">
      <p className="mb-4 text-sm text-muted-foreground">Sign in with your website account to sync desktop activity.</p>
      {CLERK_KEY ? <SignIn routing="hash" forceRedirectUrl={returnTo} signUpUrl={`/signup?returnTo=${encodeURIComponent(returnTo)}`} /> : <p>Sign-in is unavailable right now.</p>}
    </div> : <>
      <p className="mt-4 text-sm text-muted-foreground">Connect as {user.name}. The desktop will sync activity counts with this account. Recording stays paused until you choose Start tracking.</p>
      {link ? <a href={link} className="mt-6 inline-block rounded-xl bg-foreground px-5 py-3 text-sm text-background">Return to desktop</a> : <Button className="mt-6" disabled={busy} onClick={connect}>{busy ? 'Connecting…' : 'Connect this account'}</Button>}
      {link && <p className="mt-3 text-xs text-muted-foreground">Allow your browser to open Predict 360. This sign-in link expires in two minutes.</p>}
      {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
    </>}
  </Card></main>;
}
