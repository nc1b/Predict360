// Stack of dismissible inline alerts (success, info, warning, error).
// Modeled on the 21st.dev "Dismissible Alert Stack" component.

import * as React from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NoticeKind = 'success' | 'info' | 'warning' | 'error';

export interface Notice {
  id: string;
  kind: NoticeKind;
  title: string;
  description?: string;
}

const ICONS: Record<NoticeKind, { icon: typeof Info; className: string }> = {
  success: { icon: CircleCheck, className: 'text-near-foreground' },
  info: { icon: Info, className: 'text-foreground' },
  warning: { icon: TriangleAlert, className: 'text-some-foreground' },
  error: { icon: CircleAlert, className: 'text-destructive' },
};

export function useNotices() {
  const [notices, setNotices] = React.useState<Notice[]>([]);
  const push = React.useCallback((notice: Omit<Notice, 'id'> & { id?: string }) => {
    const id = notice.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // A notice with a fixed id replaces the earlier one instead of stacking.
    setNotices((prev) => [{ ...notice, id }, ...prev.filter((n) => n.id !== id)].slice(0, 4));
  }, []);
  const dismiss = React.useCallback((id: string) => setNotices((prev) => prev.filter((n) => n.id !== id)), []);
  return { notices, push, dismiss };
}

export function NotificationStack({
  notices,
  onDismiss,
  className,
}: {
  notices: Notice[];
  onDismiss: (id: string) => void;
  className?: string;
}) {
  if (notices.length === 0) return null;
  return (
    <div className={cn('flex flex-col gap-2', className)} role="status" aria-live="polite">
      {notices.map((n) => {
        const { icon: Icon, className: iconClass } = ICONS[n.kind];
        return (
          <div
            key={n.id}
            role={n.kind === 'error' ? 'alert' : undefined}
            className="animate-element flex items-start [animation-duration:300ms] gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm"
          >
            <Icon className={cn('mt-0.5 size-[18px] shrink-0', iconClass)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{n.title}</p>
              {n.description && <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{n.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(n.id)}
              aria-label={`Dismiss: ${n.title}`}
              className="-mr-1 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
