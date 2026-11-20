import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserButton } from '@clerk/react';
import { Activity, CalendarDays, Check, ChevronDown, Flame, History as HistoryIcon, PenLine, Sparkles, Sun, Target } from 'lucide-react';
import type { Energy } from '../../../src/workday.mjs';
import { clerkEnabled, useAuth } from '@/auth-context';
import { Logo } from '@/components/logo';
import { Chat } from '@/components/chat';
import { ReferenceContext } from '@/components/reference-context';
import { ResultCard, StatusBadge } from '@/components/result-card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/blocks/theme-toggle';
import { NotificationStack, useNotices } from '@/components/ui/notifications';
import { ActivityDashboard } from '@/components/activity-dashboard';
import { WeatherContextPanel, type WeatherContext } from '@/components/weather-context';
import { DailyCheckInDialog, type CheckInOutcome } from '@/components/daily-checkin-dialog';
import { analyze, ApiError, AiUnconfiguredError, explain } from '@/lib/api';
import type { Keystroke } from '@/lib/capture';
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
import { checkedInOn, daysThisWeek, dismissDaily, loadEnergy, localDay, saveEnergy, shouldPromptDaily, streak as streakOf } from '@/lib/daily';
import type { AnalyzeResponse } from '@/lib/types';
import { cloud, clearPending, queueCheckin, syncCheckins } from '@/lib/cloud';
import { cn } from '@/lib/utils';

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const ENERGY_LABEL = { low: 'Running low', steady: 'About usual', good: 'Feeling good' } as const;

const TABS = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'history', label: 'History', icon: HistoryIcon },
  { id: 'activity', label: 'Activity', icon: Activity },
] as const;
type Tab = (typeof TABS)[number]['id'];

interface Shown {
  result: AnalyzeResponse;
  baselineCount: number;
  caption: string;
}

export default function CheckIn() {
  const { user, getToken, sessionId } = useAuth();
  const userId = user!.id;
  const [deviceId] = React.useState(() => checkinDeviceId(localStorage));
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.some((t) => t.id === params.get('tab')) ? (params.get('tab') as Tab) : 'today';
  const setTab = (next: Tab) => setParams(next === 'today' ? {} : { tab: next }, { replace: true });

  const [busy, setBusy] = React.useState(false);
  const [shown, setShown] = React.useState<Shown | null>(null);
  const [history, setHistory] = React.useState<HistoryEntry[]>(() => loadHistory(localStorage, userId));
  const { notices, push, dismiss } = useNotices();
  const [aiText, setAiText] = React.useState<string | null>(null);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [historySync, setHistorySync] = React.useState('');
  const [weather, setWeather] = React.useState<WeatherContext | null>(null);
  const [energy, setEnergyState] = React.useState<Energy>(() => loadEnergy(localStorage, userId));
  const setEnergy = (next: Energy) => {
    setEnergyState(next);
    saveEnergy(localStorage, userId, next);
  };

  // "Not now" lasts for this sign-in only; a new login asks again until today's check-in is done.
  const dismissStore = sessionId ? localStorage : sessionStorage;
  const sessionKey = sessionId ?? 'tab';
  const [dailyOpen, setDailyOpen] = React.useState(() => shouldPromptDaily(history, dismissStore, userId, sessionKey));

  const busyRef = React.useRef(false);
  busyRef.current = busy;

  React.useEffect(() => {
    let mounted = true;
    async function sync() {
      try {
        const token = await getToken(); if (!token) return;
        const next = await syncCheckins(userId, token);
        if (!mounted) return;
        setHistory(next);
        setHistorySync('Check-ins synced to your account.');
        // A check-in made on another device today counts too.
        if (checkedInOn(next, localDay())) setDailyOpen((open) => (open && !busyRef.current ? false : open));
      } catch { if (mounted) setHistorySync('Offline — new check-ins will retry syncing when you return.'); }
    }
    void sync();
    return () => { mounted = false; };
  }, [userId, getToken]);
  const usableCount = history.filter((h) => h.deviceId === deviceId && isUsable(h.features)).length;
  const baselineReady = usableCount >= MIN_BASELINE_SESSIONS;
  const today = localDay();
  const doneToday = checkedInOn(history, today);
  const streak = streakOf(history);
  const week = daysThisWeek(history);
  const lastToday = [...history].reverse().find((h) => localDay(h.at) === today && h.status !== 'insufficient_samples');

  const fail = (err: unknown) =>
    push({
      id: 'error',
      kind: 'error',
      title: "Couldn't analyze that",
      description: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
    });

  async function submitCheckIn(keystrokes: Keystroke[]): Promise<CheckInOutcome> {
    setAiText(null);
    setBusy(true);
    try {
      const result = await analyze({ keystrokes, baseline: baselineFrom(history, deviceId) });
      dismiss('error');
      if (result.status === 'insufficient_samples') return { result, saved: false, baselineCount: usableCount, streak };
      const next = addEntry(localStorage, userId, result);
      queueCheckin(userId, next[next.length - 1]);
      const nextUsable = next.filter((h) => h.deviceId === deviceId && isUsable(h.features)).length;
      setHistory(next);
      setShown({ result, baselineCount: nextUsable, caption: 'Today’s check-in, compared with your usual typing' });
      void (async () => {
        try {
          const token = await getToken();
          if (token) { await syncCheckins(userId, token); setHistorySync('Check-ins synced to your account.'); }
        } catch { setHistorySync('Saved on this device. Cloud sync will retry when you return.'); }
      })();
      return { result, saved: true, baselineCount: nextUsable, streak: streakOf(next) };
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : 'Could not analyze that. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  function closeDaily(finished: boolean) {
    if (!finished) dismissDaily(dismissStore, userId, sessionKey);
    setDailyOpen(false);
    if (finished) setTab('today');
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
      setAiText(await explain(shown.result, weather, token));
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
    try { const token = await getToken(); if (token) await cloud('checkins', token, 'DELETE'); }
    catch { push({ id: 'error', kind: 'error', title: 'Could not delete history', description: 'Check your connection and try again.' }); return; }
    clearPending(userId);
    clearHistory(localStorage, userId);
    setHistory([]);
    setShown(null);
    push({ id: 'saved', kind: 'success', title: 'History deleted', description: 'Your baseline starts again from zero.' });
  }

  const stats = [
    {
      label: 'Today',
      value: doneToday ? 'Checked in' : 'Not yet',
      sub: lastToday ? `at ${timeFormat.format(new Date(lastToday.at))}` : 'About 30 seconds',
      icon: doneToday ? Check : PenLine,
      accent: doneToday ? 'bg-near text-near-foreground' : 'bg-muted text-muted-foreground',
    },
    { label: 'Streak', value: `${streak} ${streak === 1 ? 'day' : 'days'}`, sub: streak ? 'Keep it going' : 'Start one today', icon: Flame, accent: 'bg-some text-some-foreground' },
    { label: 'This week', value: `${week} of 7`, sub: 'days checked in', icon: CalendarDays, accent: 'bg-muted text-foreground' },
    {
      label: 'Baseline',
      value: baselineReady ? 'Ready' : `${usableCount} of ${MIN_BASELINE_SESSIONS}`,
      sub: baselineReady ? 'Check-ins get a score' : 'Scores start at 3',
      icon: Target,
      accent: baselineReady ? 'bg-near text-near-foreground' : 'bg-muted text-foreground',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo to="/app" />
          <nav aria-label="Dashboard" className="hidden items-center gap-1 rounded-xl bg-muted p-1 sm:flex">
            {TABS.map((t) => <TabButton key={t.id} tab={t} active={tab === t.id} onClick={() => setTab(t.id)} />)}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {clerkEnabled() && <UserButton />}
          </div>
        </div>
        <nav aria-label="Dashboard" className="mx-auto flex max-w-6xl gap-1 px-4 pb-3 sm:hidden">
          {TABS.map((t) => <TabButton key={t.id} tab={t} active={tab === t.id} onClick={() => setTab(t.id)} className="flex-1" />)}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {greeting()}, {user!.name}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {doneToday
                ? 'You’ve checked in today. Nice work.'
                : baselineReady
                  ? 'Your daily check-in is waiting: two sentences, about 30 seconds.'
                  : `Building your baseline: ${usableCount} of ${MIN_BASELINE_SESSIONS} check-ins done.`}
            </p>
          </div>
          <Button size="lg" variant={doneToday ? 'outline' : 'default'} onClick={() => setDailyOpen(true)} disabled={busy}>
            <PenLine className="size-4" aria-hidden="true" />
            {doneToday ? 'Check in again' : 'Start daily check-in'}
          </Button>
        </div>

        <NotificationStack notices={notices} onDismiss={dismiss} className="mt-6 max-w-xl" />

        {tab === 'today' && (
          <div className="mt-8 space-y-6">
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map(({ label, value, sub, icon: Icon, accent }) => (
                <Card key={label} className="flex items-start gap-3 p-4">
                  <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', accent)}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 text-lg font-semibold leading-tight">{value}</dd>
                    <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
                  </div>
                </Card>
              ))}
            </dl>

            <div className="grid items-start gap-6 lg:grid-cols-5">
              <div className="space-y-6 lg:col-span-3">
                {shown ? (
                  <ResultCard result={shown.result} baselineCount={shown.baselineCount} caption={shown.caption} />
                ) : (
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground">Today’s result</p>
                    {lastToday ? (
                      <>
                        <div className="mt-3 flex flex-wrap items-baseline gap-3">
                          <span className="text-6xl font-bold leading-none tabular-nums">{lastToday.readinessScore ?? '–'}</span>
                          <StatusBadge status={lastToday.status} />
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                          Checked in at {timeFormat.format(new Date(lastToday.at))}.
                          {lastToday.readinessScore === null && ' This one added to your baseline.'} Check in again after your next shift or break to compare.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 text-xl font-bold">You haven’t checked in today</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {baselineReady
                            ? 'Type two sentences to see how today compares with your usual typing.'
                            : 'Each check-in adds to your personal baseline. Scores start after 3.'}
                        </p>
                        <div className="mt-5 h-2 rounded-full bg-track" aria-hidden="true">
                          <div
                            className="h-2 rounded-full bg-foreground transition-[width] duration-500"
                            style={{ width: `${(Math.min(usableCount, MIN_BASELINE_SESSIONS) / MIN_BASELINE_SESSIONS) * 100}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Baseline: {Math.min(usableCount, MIN_BASELINE_SESSIONS)} of {MIN_BASELINE_SESSIONS}</p>
                        <Button className="mt-5" onClick={() => setDailyOpen(true)} disabled={busy}>Start daily check-in</Button>
                      </>
                    )}
                  </Card>
                )}
                {shown && <ReferenceContext result={shown.result} />}
              </div>

              <div className="space-y-6 lg:col-span-2">
                <Card className="p-6">
                  <h2 className="text-lg font-semibold">Your energy today</h2>
                  <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Your energy today">
                    {(Object.keys(ENERGY_LABEL) as (keyof typeof ENERGY_LABEL)[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={energy === value}
                        onClick={() => setEnergy(energy === value ? null : value)}
                        className={cn(
                          'cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                          energy === value ? 'border-foreground bg-foreground text-background' : 'hover:bg-accent'
                        )}
                      >
                        {ENERGY_LABEL[value]}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Stays on this device. Used for suggestions on the Activity tab.</p>
                </Card>

                {shown && (
                  <Card className="p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold">Explain in plain words</h2>
                      <Button variant="outline" size="sm" className="rounded-full" onClick={explainResult} disabled={aiBusy}>
                        <Sparkles className="size-4" aria-hidden="true" />
                        {aiBusy ? 'Thinking…' : aiText ? 'Again' : 'Explain'}
                      </Button>
                    </div>
                    <p className={cn('mt-3 text-sm leading-relaxed', !aiText && 'text-muted-foreground')}>
                      {aiText ?? 'A short, plain summary of your numbers. The AI sees only the timing figures, never your words.'}
                    </p>
                    <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                      AI-generated from your numbers and public research. <a href="/sources" target="_blank" rel="noreferrer" className="underline">Sources & limits</a>. Not medical advice.
                    </p>
                    <WeatherContextPanel onChange={setWeather} />
                  </Card>
                )}

                <details className="group rounded-2xl border bg-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-6 [&::-webkit-details-marker]:hidden">
                    <span>
                      <span className="block text-lg font-semibold">See how scoring works</span>
                      <span className="mt-1 block text-sm text-muted-foreground">Try a simulated session. Nothing is saved.</span>
                    </span>
                    <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="flex flex-wrap gap-2 px-6 pb-6">
                    {DEMO_SESSIONS.map((d) => (
                      <Button key={d.name} variant="outline" size="sm" className="rounded-full" disabled={busy} title={d.note} onClick={() => runDemo(d.name, d.label)}>
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Your check-ins</h2>
                {history.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={deleteData} disabled={busy}>
                    Delete history
                  </Button>
                )}
              </div>
              <Calendar className="mt-4" events={history.map((h) => ({ at: h.at, status: h.status }))} />
              {history.length === 0 ? (
                <p className="mt-4 border-t pt-4 text-sm leading-relaxed text-muted-foreground">
                  No check-ins yet. Your first one starts your baseline.
                </p>
              ) : (
                <ul className="mt-4 max-h-80 divide-y divide-border overflow-y-auto border-t border-border">
                  {[...history].reverse().map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-sm text-muted-foreground">{dateFormat.format(new Date(h.at))}</span>
                      <span className="flex items-center gap-3">
                        <StatusBadge status={h.status} />
                        <span className="w-8 text-right text-sm font-medium tabular-nums">{h.readinessScore ?? '–'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {historySync && <p className="mt-3 text-xs text-muted-foreground" role="status">{historySync}</p>}
              <p className="mt-2 text-xs text-muted-foreground">Scores use check-ins from this browser so different keyboards are not mixed.</p>
            </Card>
            <div className="space-y-6">
              <ScoreTrend history={history} />
              <Chat history={history} getToken={getToken} />
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div className="mt-8">
            <ActivityDashboard energy={energy} onEnergy={setEnergy} />
            <p className="mt-4 text-xs text-muted-foreground">
              Tracking starts paused · Your words are never recorded · <a href="/privacy" className="underline">Privacy Policy</a> · <a href="/terms" className="underline">Terms of Use</a>
            </p>
          </div>
        )}
      </main>

      <DailyCheckInDialog
        open={dailyOpen}
        name={user!.name}
        streak={streak}
        energy={energy}
        onEnergy={setEnergy}
        onSubmit={submitCheckIn}
        onClose={closeDaily}
      />
    </div>
  );
}

function TabButton({
  tab,
  active,
  onClick,
  className,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {tab.label}
    </button>
  );
}

function ScoreTrend({ history }: { history: HistoryEntry[] }) {
  const scored = history.filter((h) => h.readinessScore !== null).slice(-14);
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Score trend</h2>
      <p className="mt-1 text-sm text-muted-foreground">Similarity to your usual timing across your recent scored check-ins (100 = same as usual).</p>
      {scored.length < 2 ? (
        <p className="mt-6 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Your trend appears after two scored check-ins.
        </p>
      ) : (
        <TrendChart points={scored.map((h) => ({ at: h.at, score: h.readinessScore as number }))} />
      )}
    </Card>
  );
}

function TrendChart({ points }: { points: { at: string; score: number }[] }) {
  const w = 320, h = 120, pad = 6;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (s: number) => pad + (1 - s / 100) * (h - pad * 2);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return (
    <div className="mt-5">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full overflow-visible" role="img" aria-label={`Scores from ${points[0].score} to ${last.score}`}>
        {[0, 50, 100].map((g) => (
          <line key={g} x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} className="stroke-border" strokeDasharray="3 4" />
        ))}
        <path d={`${line} L${x(points.length - 1)},${h - pad} L${x(0)},${h - pad} Z`} className="fill-foreground/5" />
        <path d={line} fill="none" className="stroke-foreground" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={p.at} cx={x(i)} cy={y(p.score)} r="3" className="fill-background stroke-foreground" strokeWidth="2" vectorEffect="non-scaling-stroke">
            <title>{`${dateFormat.format(new Date(p.at))}: ${p.score}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{dateFormat.format(new Date(points[0].at))}</span>
        <span>Latest: <span className="font-medium text-foreground tabular-nums">{last.score}</span></span>
      </div>
    </div>
  );
}
