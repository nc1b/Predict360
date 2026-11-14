import * as React from 'react';
import { Button } from '@/components/ui/button';
export interface WeatherContext { date: string; city: string; meanHpa: number; minHpa: number; maxHpa: number; changeHpa: number; kind: string; source: string }
export function WeatherContextPanel({ onChange }: { onChange: (value: WeatherContext | null) => void }) {
  const [city, setCity] = React.useState('');
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [context, setContext] = React.useState<WeatherContext | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  async function load(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/weather/context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city, date }), signal: AbortSignal.timeout(20000) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error?.message || 'Could not load weather.');
      setContext(result); onChange(result);
    } catch (error) { setContext(null); onChange(null); setError(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <details className="mt-4 rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">Optional weather context</summary>
    <p className="mt-2 text-xs text-muted-foreground">Choose a city to look up modeled pressure from Open-Meteo. This adds context to an explanation; it does not predict migraines or change your score. Your city is not saved in activity history.</p>
    <form onSubmit={load} className="mt-3 flex flex-wrap items-end gap-2"><label className="flex-1 text-xs">City<input className="mt-1 w-full rounded-lg border bg-background p-2 text-sm" value={city} onChange={(event) => setCity(event.target.value)} maxLength={80} required minLength={2} placeholder="e.g. Boston" /></label><label className="text-xs">Date (UTC)<input className="mt-1 block rounded-lg border bg-background p-2 text-sm" type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} required /></label><Button type="submit" size="sm" variant="outline" disabled={busy}>{busy ? 'Loading…' : 'Add context'}</Button></form>
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    {context && <div className="mt-3 text-xs text-muted-foreground"><p>{context.city}: {context.meanHpa} hPa mean, {context.minHpa}–{context.maxHpa} hPa range, {context.changeHpa > 0 ? '+' : ''}{context.changeHpa} hPa change.</p><p>Modeled {context.kind === 'modeled_reanalysis' ? 'historical reanalysis' : 'weather'} · <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline">Open-Meteo</a> · CC BY 4.0</p><button type="button" className="mt-2 underline" onClick={() => { setContext(null); onChange(null); }}>Remove context</button></div>}
  </details>;
}
