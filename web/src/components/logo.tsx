import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className={cn('size-9', className)}
      aria-hidden="true"
    >
      <path d="M38.6 13.8A18 18 0 1 0 42 24" />
      <path d="M17 20v8M24 15v18M31 21v6" className="stroke-emerald-700 dark:stroke-emerald-400" />
    </svg>
  );
}

export function Logo({ to = '/', tagline = 'Daily typing rhythm', className }: { to?: string; tagline?: string; className?: string }) {
  return (
    <Link
      to={to}
      aria-label="Predict 360 home"
      className={cn(
        'flex shrink-0 items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <LogoMark />
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight">Predict 360</span>
        <span className="block text-[11px] text-muted-foreground">{tagline}</span>
      </span>
    </Link>
  );
}
