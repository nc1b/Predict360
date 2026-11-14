// Inline month calendar with event dots, in the style of the 21st.dev "Calendar"
// component. Read-only: it shows which days have a check-in and how each compared.

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Status } from '@/lib/types';

export interface CalendarEvent {
  at: string; // ISO timestamp
  status: Status;
}

const DOT: Record<Status, string> = {
  near_baseline: 'bg-near-foreground',
  some_deviation: 'bg-accent',
  large_deviation: 'bg-large-foreground',
  insufficient_samples: 'bg-muted-foreground/50',
  baseline_missing: 'bg-muted-foreground/50',
  baseline_insufficient: 'bg-muted-foreground/50',
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function Calendar({ events, className }: { events: CalendarEvent[]; className?: string }) {
  const today = new Date();
  const [month, setMonth] = React.useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const byDay = React.useMemo(() => {
    const map = new Map<string, Status>();
    // Later check-ins on the same day win.
    for (const e of events) map.set(dayKey(new Date(e.at)), e.status);
    return map;
  }, [events]);

  const firstWeekday = month.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const title = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month);
  const shift = (by: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));
  const atCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();

  const navButton =
    'flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40';

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" aria-live="polite">
          {title}
        </p>
        <div className="flex gap-1">
          <button type="button" className={navButton} onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className={navButton} onClick={() => shift(1)} disabled={atCurrentMonth} aria-label="Next month">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center" role="grid" aria-label={title}>
        {WEEKDAYS.map((d) => (
          <span key={d} className="pb-1 text-xs text-muted-foreground" role="columnheader">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} role="gridcell" />;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const status = byDay.get(dayKey(date));
          const isToday = dayKey(date) === dayKey(today);
          return (
            <span
              key={day}
              role="gridcell"
              aria-label={`${date.toDateString()}${status ? ', check-in recorded' : ''}`}
              className={cn(
                'relative mx-auto flex size-9 items-center justify-center rounded-md text-sm tabular-nums',
                isToday ? 'bg-primary font-medium text-primary-foreground' : status ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {day}
              {status && (
                <span
                  aria-hidden="true"
                  className={cn('absolute bottom-1 size-1.5 rounded-full', DOT[status], isToday && 'ring-1 ring-primary-foreground')}
                />
              )}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-near-foreground" />Close to usual</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-accent" />Some difference</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-large-foreground" />Large difference</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-muted-foreground/50" />Baseline</span>
      </div>
    </div>
  );
}
