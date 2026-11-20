import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Tone = 'good' | 'warn' | 'bad' | 'idle';

const DOT: Record<Tone, string> = {
  good: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]',
  warn: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]',
  bad: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.55)]',
  idle: 'bg-muted-foreground/50',
};

export function StatusDot({ tone, className }: { tone: Tone; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block size-2 shrink-0 rounded-full', DOT[tone], className)} />;
}

/** A status line: coloured dot, bold label, optional muted detail underneath. */
export function StatusLine({ tone, label, detail }: { tone: Tone; label: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <StatusDot tone={tone} className="mt-1.5" />
      <div>
        <p className="text-sm font-semibold leading-snug">{label}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

/** Ring gauge with an open bottom, like a speedometer. `value` is 0..1. */
export function Gauge({ value, label, sub, size = 96, className }: { value: number | null; label: string; sub?: string; size?: number; className?: string }) {
  const r = 40, c = 2 * Math.PI * r, arc = 0.75;
  const v = value === null ? 0 : Math.max(0, Math.min(1, value));
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }} role="img" aria-label={`${label}${sub ? ` ${sub}` : ''}`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-[225deg]">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-track" strokeDasharray={`${c * arc} ${c}`} />
        <circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="7" strokeLinecap="round"
          className="stroke-gauge transition-[stroke-dasharray] duration-700 ease-out"
          strokeDasharray={`${c * arc * v} ${c}`}
          style={{ filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--gauge) 45%, transparent))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums leading-none">{label}</span>
        {sub && <span className="mt-1 text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

/** Labelled thin progress bar. `value` is 0..1. */
export function Meter({ label, value, display, className }: { label: string; value: number; display: string; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{display}</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-track">
        <div className="h-1 rounded-full bg-foreground transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
      </div>
    </div>
  );
}

/** Small "Action >" chip button. */
export function ChipButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-secondary/80 px-3.5 py-2 text-sm font-semibold backdrop-blur transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="size-4" aria-hidden="true" />
    </button>
  );
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (next: boolean) => void; label: string; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        checked ? 'bg-emerald-500' : 'bg-track'
      )}
    >
      <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left] duration-200', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

/** Smooth area chart for a short series of 0..max values. */
export function AreaChart({ values, max, className, label }: { values: number[]; max: number; className?: string; label: string }) {
  const id = React.useId();
  const w = 300, h = 90;
  if (values.length < 2) return null;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - 4 - (Math.max(0, Math.min(max, v)) / max) * (h - 12);
  const pts = values.map((v, i) => [x(i), y(v)] as const);
  // Catmull-Rom to cubic Bézier for a soft line.
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn('h-24 w-full overflow-visible', className)} role="img" aria-label={label}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--chart)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--chart)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke="var(--chart)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Decorative rotated-square wireframe, drawn behind hero content. */
export function WirePattern({ className }: { className?: string }) {
  const squares = Array.from({ length: 18 }, (_, i) => i);
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className={cn('pointer-events-none', className)}>
      <defs>
        <linearGradient id="wire" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--chart)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {squares.map((i) => (
        <rect key={i} x={100 - 70 + i * 1.5} y={100 - 70 + i * 1.5} width={140 - i * 3} height={140 - i * 3} fill="none" stroke="url(#wire)" strokeWidth="0.5" transform={`rotate(${i * 5} 100 100)`} />
      ))}
    </svg>
  );
}

/** Decorative dotted wave, used on action cards. */
export function DotWave({ className, hue = 'var(--chart)' }: { className?: string; hue?: string }) {
  const dots: React.ReactNode[] = [];
  for (let row = 0; row < 14; row++) {
    for (let col = 0; col < 28; col++) {
      const x = col * 8 + 4;
      const y = 60 + Math.sin(col / 4 + row / 3) * 22 + row * 5 - 30;
      dots.push(<circle key={`${row}-${col}`} cx={x} cy={y} r={0.9 + (row / 14) * 0.6} fill={hue} opacity={0.12 + (col / 28) * 0.55} />);
    }
  }
  return (
    <svg viewBox="0 0 224 120" aria-hidden="true" className={cn('pointer-events-none', className)}>
      {dots}
    </svg>
  );
}
