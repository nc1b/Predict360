import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserButton } from '@clerk/react';
import { Activity, BookOpen, Brain, ChevronDown, Download, FileText, Fingerprint, Flame, History as HistoryIcon, House, Keyboard, Lock, Moon, PenLine, Settings2, ShieldCheck, Sparkles, Sun, TrendingUp, Zap } from 'lucide-react';
import type { Energy } from '../../../src/workday.mjs';
import { clerkEnabled, useAuth } from '@/auth-context';
import { LogoMark } from '@/components/logo';
import { Chat } from '@/components/chat';
import { ReferenceContext } from '@/components/reference-context';
import { ResultCard, StatusBadge } from '@/components/result-card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { setTheme, useIsDark } from '@/lib/theme';
import { AreaChart, ChipButton, DotWave, Gauge, Meter, StatusDot, StatusLine, Toggle, WirePattern, type Tone } from '@/components/dashboard/kit';
import { STATUS_LABEL } from '@/components/result-card';
import { NotificationStack, useNotices } from '@/components/ui/notifications';
import { ActivityDashboard } from '@/components/activity-dashboard';
import { WeatherContextPanel, type WeatherContext } from '@/components/weather-context';
import { DailyCheckInDialog, type CheckInOutcome } from '@/components/daily-checkin-dialog';
import { CompactDownload } from '@/components/download-desktop';
import { analyze, ApiError, AiUnconfiguredError, dailyAnalysis, explain } from '@/lib/api';
import { AnalysisText } from '@/components/daily-analysis';
import { ResearchConditions, WhatItDetects } from '@/components/research-conditions';
import { SignalTracker } from '@/components/signal-tracker';
import { ScreeningComingSoon } from '@/components/screening-coming-soon';
import { toHistoryItems } from '@/components/chat';
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
import { checkedInOn, daysThisWeek, dismissDaily, loadPrefs, savePrefs, type DashboardPrefs, loadAnalysis, loadEnergy, localDay, saveAnalysis, saveEnergy, shouldPromptDaily, streak as streakOf } from '@/lib/daily';
import type { AnalyzeResponse } from '@/lib/types';
import { accountSync, cloud, clearPending, queueCheckin, syncCheckins } from '@/lib/cloud';
import { cn } from '@/lib/utils';

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const ENERGY_LABEL = { low: 'Running low', steady: 'About usual', good: 'Feeling good' } as const;

const TABS = [
  { id: 'today', label: 'Home', title: 'Today', icon: House },
  { id: 'history', label: 'History', title: 'Check-in history', icon: HistoryIcon },
  { id: 'activity', label: 'Activity', title: 'Computer activity', icon: Activity },
  { id: 'research', label: 'Research', title: 'Research & detection', icon: BookOpen },
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
  const [analysis, setAnalysis] = React.useState<string | null>(() => loadAnalysis(localStorage, userId));
  const [analysisBusy, setAnalysisBusy] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);
  const [analysisOff, setAnalysisOff] = React.useState(false);
  const todayResult = React.useRef<AnalyzeResponse | null>(null);
  const setEnergy = (next: Energy) => {
    setEnergyState(next);
    saveEnergy(localStorage, userId, next);
    void getToken().then((token) => token && accountSync.saveEnergy(token, localDay(), next)).catch(() => {});
  };

  // Record this sign-in on the account and pull today's energy and analysis from another device.
  React.useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        await accountSync.recordLogin(userId, sessionId, token, user!.name).catch(() => {});
        const row = await accountSync.today(token, localDay());
        if (!mounted || !row) return;
        if (row.energy && !loadEnergy(localStorage, userId)) { setEnergyState(row.energy); saveEnergy(localStorage, userId, row.energy); }
        if (row.analysis && !loadAnalysis(localStorage, userId)) { setAnalysis(row.analysis); saveAnalysis(localStorage, userId, row.analysis); }
      } catch { /* offline or not yet migrated: local data still works */ }
    })();
    return () => { mounted = false; };
  }, [userId, sessionId, getToken]);

  // "Not now" lasts for this sign-in only; a new login asks again until today's check-in is done.
  const dismissStore = sessionId ? localStorage : sessionStorage;
  const sessionKey = sessionId ?? 'tab';
  const [prefs, setPrefsState] = React.useState<DashboardPrefs>(() => loadPrefs(localStorage, userId));
  const setPrefs = (next: DashboardPrefs) => { setPrefsState(next); savePrefs(localStorage, userId, next); };
  const [dailyOpen, setDailyOpen] = React.useState(() => loadPrefs(localStorage, userId).promptAtLogin && shouldPromptDaily(history, dismissStore, userId, sessionKey));

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
      todayResult.current = result;
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
    if (finished) {
      setTab('today');
      // One automatic analysis per day; later check-ins can refresh it by hand.
      if (prefs.autoAnalysis && !loadAnalysis(localStorage, userId) && !analysisOff) void runAnalysis();
    }
  }

  async function activityForAnalysis(token: string) {
    try {
      const { days } = await cloud<{ days: { day: string; summary: { buckets: { activeMs: number; keyPresses: number }[] } }[] }>('activity', token);
      if (!days.length) return null;
      const minutes = (day: string) => days.filter((d) => d.day === day).flatMap((d) => d.summary.buckets).reduce((sum, b) => sum + b.activeMs, 0) / 60000;
      const todayKey = new Date().toISOString().slice(0, 10);
      const earlier = [...new Set(days.map((d) => d.day))].filter((d) => d !== todayKey).map(minutes).sort((a, b) => a - b);
      return {
        activeMinutesToday: minutes(todayKey),
        usualActiveMinutes: earlier.length >= 3 ? earlier[Math.floor(earlier.length / 2)] : null,
        keyPressesToday: days.filter((d) => d.day === todayKey).flatMap((d) => d.summary.buckets).reduce((sum, b) => sum + b.keyPresses, 0),
      };
    } catch {
      return null;
    }
  }

  async function runAnalysis() {
    setAnalysisBusy(true);
    setAnalysisError(null);
    try {
      const token = await getToken();
      if (!token) throw new ApiError('Sign in again to get your daily analysis.');
      const text = await dailyAnalysis(
        { today: todayResult.current, history: toHistoryItems(loadHistory(localStorage, userId)), energy, activity: await activityForAnalysis(token) },
        token
      );
      setAnalysis(text);
      saveAnalysis(localStorage, userId, text);
      void accountSync.saveAnalysis(token, localDay(), text).catch(() => {});
    } catch (err) {
      if (err instanceof AiUnconfiguredError) setAnalysisOff(true);
      else setAnalysisError(err instanceof Error ? err.message : 'Could not write your analysis.');
    } finally {
      setAnalysisBusy(false);
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

  const dark = useIsDark();
  const scored = history.filter((h) => h.readinessScore !== null);
  const lastScored = scored[scored.length - 1];
  const latest = shown && !shown.caption.startsWith('Simulated') ? shown.result : null;
  const scoreValue = latest?.readinessScore ?? lastToday?.readinessScore ?? null;
  const scoreStatus = latest?.status ?? lastToday?.status ?? null;
  const toneOf = (status: string | null): Tone =>
    status === 'near_baseline' ? 'good' : status === 'some_deviation' ? 'warn' : status === 'large_deviation' ? 'bad' : 'idle';
  const lastFeatures = latest?.features ?? lastToday?.features ?? history[history.length - 1]?.features ?? null;
  const dwell = lastFeatures?.dwellMs.value ?? null;
  const dwellUsual = latest?.comparisons.dwellMs?.baselineMs ?? null;
  const dwellRatio = dwell !== null && dwellUsual ? dwell / dwellUsual : null;
  const trend = scored.slice(-14).map((h) => h.readinessScore as number);
  const energyTone: Tone = energy === 'good' ? 'good' : energy === 'steady' ? 'good' : energy === 'low' ? 'warn' : 'idle';
  const current = TABS.find((t) => t.id === tab)!;
  const scrollTo = (id: string) => { setTab('today'); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); };

  return (
    <div className="min-h-screen bg-background text-foreground lg:p-4">
      <div className="lg:flex lg:gap-4">
        {/* Sidebar */}
        <aside className="panel sticky top-4 hidden max-h-[calc(100vh-2rem)] w-60 shrink-0 flex-col overflow-y-auto rounded-2xl border border-border p-4 [scrollbar-width:thin] lg:flex">
          <a href="/app" className="flex items-center gap-2 px-2 py-1">
            <LogoMark className="size-7" />
            <span className="text-lg font-bold tracking-tight">Predict 360</span>
            <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">beta</span>
          </a>
          <nav aria-label="Dashboard" className="mt-5 space-y-0.5">
            {TABS.map((t) => <SideItem key={t.id} icon={t.icon} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />)}
          </nav>
          <p className="mt-5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tools</p>
          <nav aria-label="Tools" className="mt-1.5 space-y-0.5">
            <SideItem icon={PenLine} label="Daily check-in" onClick={() => setDailyOpen(true)} />
            <SideItem icon={Brain} label="Daily analysis" onClick={() => scrollTo('daily-analysis')} />
            <SideItem icon={Settings2} label="Preferences" onClick={() => scrollTo('preferences')} />
            <SideItem icon={FileText} label="Sources & limits" href="/sources" />
            <SideItem icon={ShieldCheck} label="Privacy" href="/privacy" />
          </nav>
          <div className="mt-auto space-y-2.5 pt-5">
            <div className="rounded-xl border border-sky-500/20 bg-gradient-to-b from-sky-500/10 to-transparent p-3">
              <p className="flex items-center gap-2 text-sm font-semibold"><Download className="size-4 text-sky-400" aria-hidden="true" />Get the desktop app</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Tracks activity across all your apps, even when closed</p>
              <CompactDownload className="mt-3" />
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 to-transparent p-3">
              <p className="text-sm font-semibold">{doneToday ? 'Checked in today' : 'Daily check-in'}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{doneToday ? 'Check in again after a shift' : 'Two sentences · about 30 s'}</p>
              <Button variant="brand" size="sm" className="mt-3 w-full" onClick={() => setDailyOpen(true)} disabled={busy}>
                <PenLine className="size-4" aria-hidden="true" /> {doneToday ? 'Check in again' : 'Start check-in'}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setTheme(dark ? 'light' : 'dark')}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <span className="flex items-center gap-2">{dark ? <Moon className="size-4" aria-hidden="true" /> : <Sun className="size-4" aria-hidden="true" />}{dark ? 'Midnight theme' : 'Daylight theme'}</span>
              <span className="text-[11px]">Switch</span>
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-background/80 px-4 py-3 backdrop-blur-xl lg:static lg:bg-transparent lg:px-2 lg:py-2 lg:backdrop-blur-none">
            <div className="flex items-center gap-3">
              <LogoMark className="size-7 lg:hidden" />
              <div>
                <p className="text-xs text-muted-foreground">{greeting()}, {user!.name}</p>
                <h1 className="text-2xl font-bold tracking-tight">{current.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="panel hidden items-center gap-3 rounded-xl border border-border px-3 py-2 md:flex">
                <Lock className="size-4 text-emerald-400" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold">Private mode</p>
                  <p className="text-[11px] text-muted-foreground">Your words never leave this device</p>
                </div>
              </div>
              <button type="button" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="panel flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border lg:hidden">
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <div className="panel flex items-center gap-2.5 rounded-xl border border-border py-1.5 pl-1.5 pr-3">
                {clerkEnabled() ? <UserButton /> : <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 text-sm font-bold text-white">{user!.name.slice(0, 1).toUpperCase()}</span>}
                <span className="hidden text-sm font-semibold sm:block">{user!.name}</span>
              </div>
            </div>
          </header>

          <main className="px-4 pt-2 lg:px-2">
            <NotificationStack notices={notices} onDismiss={dismiss} className="mb-4 max-w-xl" />

            {tab === 'today' && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
                  {/* Welcome */}
                  <Card className="relative overflow-hidden p-6 md:row-span-2 xl:col-span-4">
                    <WirePattern className="absolute -right-20 -top-6 size-72 opacity-50" />
                    <div className="relative flex h-full flex-col">
                      <p className="text-sm text-muted-foreground">Welcome back</p>
                      <p className="text-4xl font-bold tracking-tight">{user!.name}</p>
                      <div className="mt-auto space-y-3 pt-10">
                        <StatusLine tone={doneToday ? 'good' : 'bad'} label="Today's check-in" detail={doneToday && lastToday ? `Done at ${timeFormat.format(new Date(lastToday.at))}` : 'Not done yet'} />
                        <StatusLine tone={baselineReady ? 'good' : 'warn'} label="Baseline" detail={baselineReady ? 'Ready: check-ins get a score' : `${usableCount} of ${MIN_BASELINE_SESSIONS} check-ins`} />
                        <StatusLine tone={streak > 0 ? 'good' : 'idle'} label="Streak" detail={`${streak} ${streak === 1 ? 'day' : 'days'} in a row`} />
                        <StatusLine tone={energyTone} label="Energy" detail={energy ? ENERGY_LABEL[energy] : 'Not set today'} />
                      </div>
                      <div className="mt-6 flex justify-end">
                        <ChipButton onClick={() => setDailyOpen(true)} disabled={busy}>{doneToday ? 'Check in again' : 'Check in'}</ChipButton>
                      </div>
                    </div>
                  </Card>

                  {/* Score */}
                  <Card className="p-5 xl:col-span-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight">Similarity score</h2>
                        <p className="text-xs text-muted-foreground">Today vs your usual typing</p>
                        <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
                          <StatusDot tone={toneOf(scoreStatus)} />
                          {scoreStatus ? STATUS_LABEL[scoreStatus] : 'No check-in yet'}
                        </p>
                      </div>
                      <Gauge value={scoreValue === null ? null : scoreValue / 100} label={scoreValue === null ? '–' : String(scoreValue)} sub="of 100" />
                    </div>
                    <Meter className="mt-4" label="Baseline" value={Math.min(usableCount, MIN_BASELINE_SESSIONS) / MIN_BASELINE_SESSIONS} display={`${Math.min(usableCount, MIN_BASELINE_SESSIONS)} / ${MIN_BASELINE_SESSIONS}`} />
                  </Card>

                  {/* Streak */}
                  <Card className="p-5 xl:col-span-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold tracking-tight">Streak</h2>
                      <Flame className="size-5 text-amber-400" aria-hidden="true" />
                    </div>
                    <p className="text-xs text-muted-foreground">Days in a row</p>
                    <p className="mt-3 flex items-center gap-2 text-sm font-semibold"><StatusDot tone={streak > 0 ? 'good' : 'idle'} />{streak} {streak === 1 ? 'day' : 'days'}</p>
                    <Meter className="mt-6" label="This week" value={week / 7} display={`${week}/7`} />
                  </Card>

                  {/* Check-ins */}
                  <Card className="p-5 xl:col-span-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold tracking-tight">Check-ins</h2>
                      <Fingerprint className="size-5 text-sky-400" aria-hidden="true" />
                    </div>
                    <p className="text-xs text-muted-foreground">Saved to your account</p>
                    <p className="mt-3 flex items-center gap-2 text-sm font-semibold"><StatusDot tone={history.length ? 'good' : 'idle'} />{history.length} total</p>
                    <Meter className="mt-6" label="Scored" value={history.length ? scored.length / history.length : 0} display={`${scored.length}`} />
                  </Card>

                  {/* Key hold */}
                  <Card className="p-5 xl:col-span-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight">Key hold</h2>
                        <p className="text-xs text-muted-foreground">Median time a key stays down</p>
                        <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
                          <StatusDot tone={dwellRatio === null ? 'idle' : dwellRatio <= 1.15 ? 'good' : dwellRatio <= 1.4 ? 'warn' : 'bad'} />
                          {dwellRatio === null ? (dwell === null ? 'No data yet' : 'No usual yet') : dwellRatio <= 1.15 ? 'Close to usual' : 'Longer than usual'}
                        </p>
                      </div>
                      <Gauge value={dwell === null ? null : dwell / 200} label={dwell === null ? '–' : String(Math.round(dwell))} sub="ms" />
                    </div>
                    <Meter className="mt-4" label="Compared with usual" value={dwellRatio === null ? 0 : Math.min(1, dwellRatio / 2)} display={dwellRatio === null ? '–' : `${dwellRatio.toFixed(2)}×`} />
                  </Card>

                  {/* Trend */}
                  <Card className="p-5 md:col-span-2 xl:col-span-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight">Score trend</h2>
                        <p className="text-xs text-muted-foreground">Last {Math.max(trend.length, 0)} scored check-ins</p>
                        <p className="mt-3 flex items-center gap-2 text-sm font-semibold"><StatusDot tone={trend.length >= 2 ? 'good' : 'idle'} />{trend.length >= 2 ? `Latest ${lastScored?.readinessScore}` : 'Needs 2 scored check-ins'}</p>
                      </div>
                      {trend.length >= 2 && (
                        <div className="flex gap-3 text-xs font-semibold tabular-nums">
                          <span className="inline-flex items-center gap-1"><TrendingUp className="size-3.5 text-emerald-400" />{Math.max(...trend)}</span>
                          <span className="inline-flex items-center gap-1 text-muted-foreground">low {Math.min(...trend)}</span>
                        </div>
                      )}
                    </div>
                    {trend.length >= 2 ? (
                      <AreaChart className="mt-3" values={trend} max={100} label={`Scores from ${trend[0]} to ${trend[trend.length - 1]}`} />
                    ) : (
                      <AreaChart className="mt-3 opacity-30" values={[40, 55, 48, 70, 62, 80, 74]} max={100} label="Sample trend shape" />
                    )}
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
                  {/* Daily analysis */}
                  {!analysisOff && (
                    <Card id="daily-analysis" className="relative overflow-hidden p-5 xl:col-span-4">
                      <DotWave className="absolute -right-6 bottom-0 h-32 w-64 opacity-80" />
                      <div className="relative">
                        <div className="flex items-center gap-2"><Brain className="size-5 text-violet-400" aria-hidden="true" /><h2 className="text-xl font-bold tracking-tight">Daily analysis</h2></div>
                        <p className="text-xs text-muted-foreground">Claude Opus 5.5 · numbers only</p>
                        <p className="mt-3 flex items-center gap-2 text-sm font-semibold"><StatusDot tone={analysis ? 'good' : analysisBusy ? 'warn' : 'idle'} />{analysis ? 'Written today' : analysisBusy ? 'Writing…' : 'Not run today'}</p>
                        {analysis && <div className="max-w-[90%] text-sm"><AnalysisText text={analysis} /></div>}
                        {analysisError && <p role="alert" className="mt-2 text-sm text-destructive">{analysisError}</p>}
                        <ChipButton className="mt-4" onClick={runAnalysis} disabled={analysisBusy || history.length === 0}>{analysisBusy ? 'Analyzing' : analysis ? 'Refresh' : 'Analyze'}</ChipButton>
                      </div>
                    </Card>
                  )}

                  {/* Explain */}
                  <Card className="relative overflow-hidden p-5 xl:col-span-4">
                    <DotWave className="absolute -right-6 bottom-0 h-32 w-64 opacity-60" hue="var(--gauge)" />
                    <div className="relative">
                      <div className="flex items-center gap-2"><Sparkles className="size-5 text-sky-400" aria-hidden="true" /><h2 className="text-xl font-bold tracking-tight">Explain my result</h2></div>
                      <p className="text-xs text-muted-foreground">Claude Opus 5.5 · plain words</p>
                      <p className="mt-3 flex items-center gap-2 text-sm font-semibold"><StatusDot tone={shown ? 'good' : 'idle'} />{shown ? 'Result ready' : 'Check in first'}</p>
                      {aiText && <p className="mt-3 max-w-[90%] text-sm leading-relaxed">{aiText}</p>}
                      <ChipButton className="mt-4" onClick={explainResult} disabled={!shown || aiBusy}>{aiBusy ? 'Thinking' : aiText ? 'Again' : 'Explain'}</ChipButton>
                      {shown && <WeatherContextPanel onChange={setWeather} />}
                    </div>
                  </Card>

                  {/* Preferences */}
                  <Card id="preferences" className="p-5 md:col-span-2 xl:col-span-4 xl:row-span-2">
                    <h2 className="text-xl font-bold tracking-tight">Preferences</h2>
                    <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">General</p>
                    <div className="mt-2 divide-y divide-border">
                      <PrefRow label="Daily check-in when I sign in">
                        <Toggle label="Daily check-in when I sign in" checked={prefs.promptAtLogin} onChange={(v) => setPrefs({ ...prefs, promptAtLogin: v })} />
                      </PrefRow>
                      <PrefRow label="Write my daily analysis automatically">
                        <Toggle label="Write my daily analysis automatically" checked={prefs.autoAnalysis} onChange={(v) => setPrefs({ ...prefs, autoAnalysis: v })} />
                      </PrefRow>
                      <PrefRow label="Dark mode">
                        <Toggle label="Dark mode" checked={dark} onChange={(v) => setTheme(v ? 'dark' : 'light')} />
                      </PrefRow>
                    </div>
                    <p className="mt-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Energy today</p>
                    <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Your energy today">
                      {(Object.keys(ENERGY_LABEL) as (keyof typeof ENERGY_LABEL)[]).map((value) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={energy === value}
                          onClick={() => setEnergy(energy === value ? null : value)}
                          className={cn(
                            'cursor-pointer rounded-xl border px-2 py-2 text-xs font-medium transition-colors',
                            energy === value ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300 dark:text-emerald-300' : 'border-border hover:bg-accent'
                          )}
                        >
                          {ENERGY_LABEL[value]}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Synced to your account. Never shared with an employer.</p>
                    <a href="/sources" className="mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/60 py-2.5 text-sm font-semibold hover:bg-accent">
                      Sources & limits <ChevronDown className="size-4 -rotate-90" aria-hidden="true" />
                    </a>
                  </Card>

                  {/* Research */}
                  <Card className="relative overflow-hidden p-5 xl:col-span-4">
                    <DotWave className="absolute -right-10 -bottom-4 h-28 w-60 opacity-50" hue="#f472b6" />
                    <div className="relative">
                      <div className="flex items-center gap-2"><BookOpen className="size-5 text-pink-400" aria-hidden="true" /><h2 className="text-xl font-bold tracking-tight">Research</h2></div>
                      <p className="text-xs text-muted-foreground">What the model can and cannot detect</p>
                      <p className="mt-3 flex items-center gap-2 text-sm font-semibold"><StatusDot tone="good" />6 conditions reviewed</p>
                      <ChipButton className="mt-4" onClick={() => setTab('research')}>Open</ChipButton>
                    </div>
                  </Card>

                  {/* Desktop */}
                  <Card className="relative overflow-hidden p-5 xl:col-span-4">
                    <DotWave className="absolute -right-10 -bottom-4 h-28 w-60 opacity-50" hue="#34d399" />
                    <div className="relative">
                      <div className="flex items-center gap-2"><Download className="size-5 text-emerald-400" aria-hidden="true" /><h2 className="text-xl font-bold tracking-tight">Desktop app</h2></div>
                      <p className="text-xs text-muted-foreground">Track activity across your apps</p>
                      <p className="mt-3 flex items-center gap-2 text-sm font-semibold"><StatusDot tone="good" />Windows · macOS · free</p>
                      <div className="mt-4 flex flex-wrap items-start gap-3">
                        <CompactDownload className="w-52" />
                        <ChipButton onClick={() => setTab('activity')}>Activity</ChipButton>
                      </div>
                    </div>
                  </Card>
                </div>

                <SignalTracker history={history} />

                {shown && (
                  <div className="grid items-start gap-4 xl:grid-cols-12">
                    <ResultCard className="xl:col-span-7" result={shown.result} baselineCount={shown.baselineCount} caption={shown.caption} />
                    <div className="xl:col-span-5"><ReferenceContext result={shown.result} /></div>
                  </div>
                )}

                <details className="group panel rounded-2xl border border-border">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-3">
                      <Zap className="size-5 text-amber-400" aria-hidden="true" />
                      <span>
                        <span className="block font-semibold">See how scoring works</span>
                        <span className="block text-xs text-muted-foreground">Run a simulated session. Nothing is saved.</span>
                      </span>
                    </span>
                    <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="flex flex-wrap gap-2 px-5 pb-5">
                    {DEMO_SESSIONS.map((d) => (
                      <Button key={d.name} variant="chip" size="sm" disabled={busy} title={d.note} onClick={() => runDemo(d.name, d.label)}>
                        <Keyboard className="size-3.5" aria-hidden="true" />{d.label}
                      </Button>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {tab === 'history' && (
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><HistoryIcon className="size-5 text-sky-400" aria-hidden="true" /><h2 className="text-xl font-bold tracking-tight">Your check-ins</h2></div>
                    {history.length > 0 && (
                      <Button variant="destructive" size="sm" onClick={deleteData} disabled={busy}>
                        Delete history
                      </Button>
                    )}
                  </div>
                  <Calendar className="mt-4" events={history.map((h) => ({ at: h.at, status: h.status }))} />
                  {history.length === 0 ? (
                    <p className="mt-4 border-t pt-4 text-sm leading-relaxed text-muted-foreground">No check-ins yet. Your first one starts your baseline.</p>
                  ) : (
                    <ul className="mt-4 max-h-80 divide-y divide-border overflow-y-auto border-t border-border">
                      {[...history].reverse().map((h) => (
                        <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                          <span className="flex items-center gap-2.5 text-sm text-muted-foreground"><StatusDot tone={toneOf(h.status)} />{dateFormat.format(new Date(h.at))}</span>
                          <span className="flex items-center gap-3">
                            <StatusBadge status={h.status} />
                            <span className="w-8 text-right text-sm font-semibold tabular-nums">{h.readinessScore ?? '–'}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {historySync && <p className="mt-3 text-xs text-muted-foreground" role="status">{historySync}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">Scores use check-ins from this browser so different keyboards are not mixed.</p>
                </Card>
                <div className="space-y-4">
                  <Card className="p-5">
                    <div className="flex items-center gap-2"><TrendingUp className="size-5 text-violet-400" aria-hidden="true" /><h2 className="text-xl font-bold tracking-tight">Score trend</h2></div>
                    <p className="text-xs text-muted-foreground">Similarity to your usual timing (100 = same as usual)</p>
                    {trend.length >= 2 ? (
                      <AreaChart className="mt-4 h-36" values={trend} max={100} label={`Scores from ${trend[0]} to ${trend[trend.length - 1]}`} />
                    ) : (
                      <p className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Your trend appears after two scored check-ins.</p>
                    )}
                  </Card>
                  <Chat history={history} getToken={getToken} />
                </div>
              </div>
            )}

            {tab === 'research' && (
              <div className="space-y-8">
                <SignalTracker history={history} />
                <ScreeningComingSoon />
                <WhatItDetects />
                <ResearchConditions />
              </div>
            )}

            {tab === 'activity' && (
              <div>
                <ActivityDashboard energy={energy} onEnergy={setEnergy} />
                <p className="mt-4 text-xs text-muted-foreground">
                  Your words are never recorded · <a href="/privacy" className="underline">Privacy Policy</a> · <a href="/terms" className="underline">Terms of Use</a>
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Dashboard" className="panel fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-border p-1.5 lg:hidden">
        {TABS.slice(0, 2).map((t) => <BottomItem key={t.id} icon={t.icon} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />)}
        <button type="button" onClick={() => setDailyOpen(true)} aria-label="Daily check-in" className="mx-auto flex size-11 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-lg">
          <PenLine className="size-5" />
        </button>
        {TABS.slice(2).map((t) => <BottomItem key={t.id} icon={t.icon} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />)}
      </nav>

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

function SideItem({ icon: Icon, label, active, onClick, href }: { icon: typeof House; label: string; active?: boolean; onClick?: () => void; href?: string }) {
  const cls = cn(
    'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active
      ? 'border border-emerald-500/25 bg-gradient-to-r from-emerald-500/15 to-transparent text-foreground'
      : 'border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
  );
  const body = (<><Icon className={cn('size-[18px]', active && 'text-emerald-400')} aria-hidden="true" />{label}</>);
  return href ? <a href={href} className={cls}>{body}</a> : <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={cls}>{body}</button>;
}

function BottomItem({ icon: Icon, label, active, onClick }: { icon: typeof House; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={cn('flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] font-medium', active ? 'text-emerald-400' : 'text-muted-foreground')}>
      <Icon className="size-5" aria-hidden="true" />{label}
    </button>
  );
}

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}
