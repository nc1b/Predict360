import * as React from 'react';
import { UserButton } from '@clerk/react';
import { Keyboard, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '@/auth-context';
import { Logo } from '@/components/logo';
import { Chat } from '@/components/chat';
import { ReferenceContext } from '@/components/reference-context';
import { ResultCard, StatusBadge } from '@/components/result-card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/blocks/theme-toggle';
import { NotificationStack, useNotices } from '@/components/ui/notifications';
import { analyze, ApiError, AiUnconfiguredError, explain } from '@/lib/api';
import { KeystrokeRecorder } from '@/lib/capture';
import { DEMO_SESSIONS, loadDemoRequest, type DemoName } from '@/lib/demo';
import {
  addEntry,
  checkinDeviceId,
  baselineFrom,
  clearHistory,
  isUsable,
  loadHistory,
  MIN_BASELINE_SESSIONS,
  type HistoryEntry,
} from '@/lib/history';
import type { AnalyzeResponse } from '@/lib/types';
import { ActivityDashboard } from '@/components/activity-dashboard';
import { cloud, clearPending, queueCheckin, syncCheckins } from '@/lib/cloud';
import { WeatherContextPanel, type WeatherContext } from '@/components/weather-context';
import { DownloadDesktop } from '@/components/download-desktop';

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

interface Shown {
  result: AnalyzeResponse;
  baselineCount: number;
  caption: string;
}

export default function CheckIn() {
  const { user, getToken } = useAuth();
  const userId = user!.id;
  const [deviceId] = React.useState(() => checkinDeviceId(localStorage));

  const recorder = React.useRef(new KeystrokeRecorder());
  const textRef = React.useRef<HTMLTextAreaElement>(null);
  const [text, setText] = React.useState(''); // lives only in this component; never stored or sent
  const [count, setCount] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [shown, setShown] = React.useState<Shown | null>(null);
  const [history, setHistory] = React.useState<HistoryEntry[]>(() => loadHistory(localStorage, userId));
  const { notices, push, dismiss } = useNotices();
  const [aiText, setAiText] = React.useState<string | null>(null);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [historySync, setHistorySync] = React.useState('');
  const [weather, setWeather] = React.useState<WeatherContext | null>(null);

  React.useEffect(() => {
    let mounted = true;
    async function sync() {
      try {
        const token = await getToken(); if (!token) return;
        const next = await syncCheckins(userId, token);
        if (mounted) { setHistory(next); setHistorySync('Check-ins synced to your account.'); }
      } catch { if (mounted) setHistorySync('Offline — new check-ins will retry syncing when you return.'); }
    }
    void sync();
    return () => { mounted = false; };
  }, [userId, getToken]);

  const usableCount = history.filter((h) => h.deviceId === deviceId && isUsable(h.features)).length;
  const baselineReady = usableCount >= MIN_BASELINE_SESSIONS;

  const resetField = () => {
    recorder.current.reset();
    setText('');
    setCount(0);
  };

  const fail = (err: unknown) =>
    push({
      id: 'error',
      kind: 'error',
      title: "Couldn't analyze that",
      description: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
    });

  async function finish() {
    const keystrokes = recorder.current.finish();
    if (keystrokes.length === 0) {
      push({
        id: 'empty',
        kind: 'warning',
        title: 'No typing was timed',
        description: 'Type your two sentences on a physical keyboard. Pasted or dictated text has no key timing.',
      });
      return;
    }
    setAiText(null);
    setBusy(true);
    try {
      const result = await analyze({ keystrokes, baseline: baselineFrom(history, deviceId) });
      dismiss('error');
      dismiss('empty');
      if (result.status === 'insufficient_samples') {
        // Not saved: a too-short session would weaken the baseline.
        setShown({ result, baselineCount: usableCount, caption: 'This check-in' });
        push({ id: 'saved', kind: 'warning', title: 'Check-in not saved', description: 'It was too short to measure. Try again with two full sentences.' });
      } else {
        const next = addEntry(localStorage, userId, result);
        queueCheckin(userId, next[next.length - 1]);
        const nextUsable = next.filter((h) => h.deviceId === deviceId && isUsable(h.features)).length;
        setHistory(next);
        try {
          const token = await getToken();
          if (token) { await syncCheckins(userId, token); setHistorySync('Check-ins synced to your account.'); }
        } catch { setHistorySync('Saved on this device. Cloud sync will retry when you return.'); }
        setShown({ result, baselineCount: nextUsable, caption: 'Compared with your usual typing' });
        push(
          result.readinessScore === null
            ? {
                id: 'saved',
                kind: 'info',
                title: `Check-in saved (${Math.min(nextUsable, MIN_BASELINE_SESSIONS)} of ${MIN_BASELINE_SESSIONS})`,
                description:
                  nextUsable >= MIN_BASELINE_SESSIONS
                    ? 'Your baseline is ready. Your next check-in gets a score.'
                    : 'Scores start once your baseline has 3 check-ins.',
              }
            : { id: 'saved', kind: 'success', title: 'Check-in saved', description: 'Only timing summaries are saved. Your words stay private.' }
        );
      }
      resetField();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function runDemo(name: DemoName, label: string) {
    setAiText(null);
    setBusy(true);
    try {
      const result = await analyze(await loadDemoRequest(name));
      dismiss('error');
      setShown({ result, baselineCount: 5, caption: `Simulated session: ${label}` });
      push({
        id: 'saved',
        kind: 'info',
        title: 'Showing a simulated session',
        description: 'Generated typing scored against a generated baseline. It is not you and was not saved.',
      });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function explainResult() {
    if (!shown) return;
    setAiBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new ApiError('Sign in again to request an explanation.');
      const text = await explain(shown.result, weather, token);
      setAiText(text);
      dismiss('error');
    } catch (err) {
      setAiText(null);
      push({
        id: 'error',
        kind: err instanceof AiUnconfiguredError ? 'info' : 'error',
        title: err instanceof AiUnconfiguredError ? 'AI explanations are off' : "Couldn't explain that",
        description:
          err instanceof AiUnconfiguredError
            ? 'This server has no AI key set, so the plain-words summary is unavailable.'
            : err instanceof ApiError
              ? err.message
              : 'Something went wrong. Try again.',
      });
    } finally {
      setAiBusy(false);
    }
  }

  async function deleteData() {
    if (!window.confirm('Delete your check-in history from this device and your account?')) return;
    try { const token = await getToken(); if (!token) return; await cloud('checkins', token, 'DELETE'); }
    catch { push({ id: 'error', kind: 'error', title: 'Could not delete history', description: 'Check your connection and try again.' }); return; }
    clearPending(userId);
    clearHistory(localStorage, userId);
    setHistory([]);
    setShown(null);
    push({ id: 'saved', kind: 'success', title: 'History deleted', description: 'Your baseline starts again from zero.' });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-3 pt-4 sm:px-6">
        <div className="flex h-14 items-center justify-between rounded-2xl border bg-background/80 px-2 shadow-sm backdrop-blur-xl">
          <Logo />
          <div className="flex items-center gap-1.5 pr-1">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Your dashboard</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
          {greeting()}, {user!.name}
        </h1>
        <p className="mt-4 text-muted-foreground">
          {baselineReady
            ? 'Write two sentences to see how today compares with your usual.'
            : `Building your baseline: ${usableCount} of ${MIN_BASELINE_SESSIONS} check-ins done.`}
        </p>

        <NotificationStack notices={notices} onDismiss={dismiss} className="mt-6 max-w-xl" />

        <Card id="desktop-download" className="animate-element mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-5"><div className="max-w-xl"><p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Start tracking your day</p><h2 className="mt-2 text-2xl font-bold">Download the Windows app</h2><p className="mt-2 text-sm text-muted-foreground">Install Predict 360 to track clicks and keyboard activity across your applications. Sign in with this account, then choose Start tracking. Your totals will appear below.</p></div><DownloadDesktop primary /></div>
          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">Windows installer · Tracking starts paused · Your words are never recorded · <a href="/privacy" className="underline">Privacy Policy</a> · <a href="/terms" className="underline">Terms of Use</a></p>
        </Card>
        <div className="mt-6"><ActivityDashboard /></div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card className="p-6">
              <label htmlFor="journal" className="text-xl font-bold">
                Today&apos;s two sentences
              </label>
              <p id="journal-help" className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Write two sentences about how your morning is going. End the first with a period, then keep typing.
              </p>
              <textarea
                id="journal"
                ref={textRef}
                value={text}
                rows={5}
                aria-describedby="journal-help journal-privacy"
                placeholder="Slept okay, a bit slow to get going. Coffee is helping and I have a plan for the day."
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={busy}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  recorder.current.keyDown(e.nativeEvent);
                  setCount(recorder.current.count);
                }}
                onKeyUp={(e) => recorder.current.keyUp(e.nativeEvent)}
                onBlur={() => recorder.current.releaseAll()}
                className="mt-4 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-base leading-relaxed placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <Button onClick={finish} disabled={busy || count === 0}>
                    {busy ? 'Analyzing…' : 'Finish check-in'}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy || (count === 0 && text === '')}
                    onClick={() => {
                      resetField();
                      textRef.current?.focus();
                    }}
                  >
                    Start over
                  </Button>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                  <Keyboard className="size-3.5" aria-hidden="true" />
                  {count} {count === 1 ? 'keystroke' : 'keystrokes'} timed
                </span>
              </div>
              <p id="journal-privacy" className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Your words never leave this box. Only key timing is sent, and the text is cleared when you finish.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold">Try a simulated session</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Generated typing against a generated baseline, to show how each change moves the score.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {DEMO_SESSIONS.map((d) => (
                  <Button key={d.name} variant="outline" size="sm" className="rounded-full" disabled={busy} title={d.note} onClick={() => runDemo(d.name, d.label)}>
                    {d.label}
                  </Button>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            {shown ? (
              <>
                <ResultCard result={shown.result} baselineCount={shown.baselineCount} caption={shown.caption} />
                <Card className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">Explain this in plain words</h2>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={explainResult} disabled={aiBusy}>
                      <Sparkles className="size-4" aria-hidden="true" />
                      {aiBusy ? 'Thinking…' : aiText ? 'Again' : 'Explain'}
                    </Button>
                  </div>
                  {aiText ? (
                    <p className="mt-3 text-sm leading-relaxed">{aiText}</p>
                  ) : (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      A short, plain summary of your numbers. The AI sees only the timing figures above, never your words.
                    </p>
                  )}
                  <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                    AI-generated from your numbers and public research references. <a href="/sources" target="_blank" rel="noreferrer" className="underline">Sources & limits</a>. Not medical advice.
                  </p>
                  <WeatherContextPanel onChange={setWeather} />
                </Card>
                <ReferenceContext result={shown.result} />
              </>
            ) : (
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">Compared with your usual typing</p>
                <p className="mt-3 text-xl font-bold">Your result appears here</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {baselineReady
                    ? 'Finish a check-in to get a score from 0 to 100.'
                    : 'Scores start after 3 check-ins. Until then each one adds to your baseline.'}
                </p>
                <div className="mt-5 h-2 rounded-full bg-track" aria-hidden="true">
                  <div
                    className="h-2 rounded-full bg-foreground transition-[width] duration-500"
                    style={{ width: `${(Math.min(usableCount, MIN_BASELINE_SESSIONS) / MIN_BASELINE_SESSIONS) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Baseline: {Math.min(usableCount, MIN_BASELINE_SESSIONS)} of {MIN_BASELINE_SESSIONS}
                </p>
              </Card>
            )}

            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Recent check-ins</h2>
                {history.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={deleteData} disabled={busy}>
                    Delete history
                  </Button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Your first check-in starts your baseline. Timing summaries sync with your account.
                </p>
              ) : (
                <>
                <Calendar className="mt-4" events={history.map((h) => ({ at: h.at, status: h.status }))} />
                <ul className="mt-4 divide-y divide-border border-t border-border">
                  {[...history].reverse().slice(0, 4).map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-sm text-muted-foreground">{dateFormat.format(new Date(h.at))}</span>
                      <span className="flex items-center gap-3">
                        <StatusBadge status={h.status} />
                        <span className="w-8 text-right text-sm font-medium tabular-nums">{h.readinessScore ?? '–'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                </>
              )}
              {historySync && <p className="mt-3 text-xs text-muted-foreground" role="status">{historySync}</p>}
              <p className="mt-2 text-xs text-muted-foreground">Scores use check-ins from this browser so different keyboards are not mixed.</p>
            </Card>
          </div>
        </div>

        <div className="mt-6">
          <Chat history={history} getToken={getToken} />
        </div>
      </main>
    </div>
  );
}
