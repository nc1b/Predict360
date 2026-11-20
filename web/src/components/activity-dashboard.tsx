import * as React from 'react';
import { useAuth } from '@/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cloud } from '@/lib/cloud';
import { DownloadDesktop } from '@/components/download-desktop';
import { WorkdayPlan } from '@/components/workday-plan';
import type { Energy } from '../../../src/workday.mjs';

interface Bucket { hour: number; clicks: number; keyPresses: number; scrollEvents: number; trackedMs: number; activeMs: number }
interface ActivityRecord { device_id: string; day: string; summary: { date: string; buckets: Bucket[] }; updated_at: string }
const duration = (ms: number) => { const minutes = Math.floor(ms / 60000); return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`; };
export function ActivityDashboard({ energy, onEnergy }: { energy: Energy; onEnergy: (energy: Energy) => void }) {
  const { getToken } = useAuth();
  const [records, setRecords] = React.useState<ActivityRecord[]>([]);
  const [selected, setSelected] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [updated, setUpdated] = React.useState('');
  const refresh = React.useCallback(async () => {
    setBusy(true);
    try {
      const token = await getToken(); if (!token) return;
      const result = await cloud<{ days: ActivityRecord[] }>('activity', token);
      setRecords(result.days); setError(''); setUpdated(new Date().toLocaleTimeString());
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not load activity.'); }
    finally { setBusy(false); }
  }, [getToken]);
  React.useEffect(() => { void refresh(); const interval = setInterval(refresh, 60000); return () => clearInterval(interval); }, [refresh]);
  const dates = [...new Set(records.map((record) => record.day))].sort().reverse();
  const date = dates.includes(selected) ? selected : dates[0];
  const rows = records.filter((record) => record.day === date);
  const buckets = rows.flatMap((record) => record.summary.buckets);
  const total = (field: keyof Omit<Bucket, 'hour'>) => buckets.reduce((sum, bucket) => sum + bucket[field], 0);
  const active = Array.from({ length: 24 }, (_, hour) => buckets.filter((bucket) => bucket.hour === hour).reduce((sum, bucket) => sum + bucket.activeMs, 0));
  const peak = Math.max(3600000, ...active);
  const planningDays = dates.slice(0, 8).map((date) => ({ date, buckets: records.filter((record) => record.day === date).flatMap((record) => record.summary.buckets) }));
  async function deleteActivity() {
    if (!window.confirm('Delete your saved activity and disconnect all desktops?')) return;
    try { const token = await getToken(); if (!token) return; await cloud('activity', token, 'DELETE'); setRecords([]); setError(''); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not delete activity.'); }
  }
  return <Card className="p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Your daily activity</h2><p className="mt-1 text-sm text-muted-foreground">Recorded by Predict 360 desktop, across your applications.</p></div><Button variant="outline" size="sm" onClick={refresh} disabled={busy}>{busy ? 'Syncing…' : 'Refresh'}</Button></div>
    {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
    {!records.length ? <div className="mt-6 rounded-xl border border-dashed p-6"><h3 className="font-semibold">Connect your computer</h3><p className="mt-2 max-w-xl text-sm text-muted-foreground">Download the desktop app, choose Connect account, and sign in here. Then choose Start tracking in the app. Your daily totals will appear here automatically.</p><div className="mt-4"><DownloadDesktop /></div></div> : <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><label className="text-sm">Day <select aria-label="Activity day" className="ml-2 rounded-lg border bg-background p-2" value={date} onChange={(event) => setSelected(event.target.value)}>{dates.map((value) => <option key={value}>{value}</option>)}</select></label><p className="text-xs text-muted-foreground">{new Set(rows.map((record) => record.device_id)).size} computer(s) · checked {updated}</p></div>
      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">{[['Clicks', total('clicks').toLocaleString()], ['Key presses', total('keyPresses').toLocaleString()], ['Active time', duration(total('activeMs'))], ['Idle time', duration(total('trackedMs') - total('activeMs'))]].map(([label, value]) => <div key={label} className="rounded-xl border p-4"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 text-2xl font-bold tabular-nums">{value}</dd></div>)}</dl>
      <div className="mt-6 flex h-28 items-end gap-1" aria-label="Active time by hour">{active.map((value, hour) => <div key={hour} title={`${hour}:00 — ${duration(value)} active`} className="min-h-1 flex-1 rounded-t bg-foreground transition-[height] duration-500 motion-reduce:transition-none" style={{ height: `${Math.max(2, value / peak * 100)}%` }} />)}</div><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>12 am</span><span>6 am</span><span>12 pm</span><span>6 pm</span><span>11 pm</span></div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><p className="max-w-xl text-xs text-muted-foreground">Times are combined across connected computers; overlapping use is counted on each. These totals describe computer use, not productivity or health.</p><Button variant="destructive" size="sm" onClick={deleteActivity}>Delete activity</Button></div>
    </>}
    <WorkdayPlan days={planningDays} energy={energy} onEnergy={onEnergy} />
  </Card>;
}
