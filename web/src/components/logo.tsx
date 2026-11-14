import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/** A sun rising over a horizon: the one place besides the score that uses amber. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M9 19a7 7 0 0 1 14 0Z" className="fill-accent" />
      <rect x="6" y="20.5" width="20" height="2" rx="1" className="fill-primary-foreground" />
    </svg>
  );
}

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-md text-lg font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <LogoMark />
      Predict 360
    </Link>
  );
}
