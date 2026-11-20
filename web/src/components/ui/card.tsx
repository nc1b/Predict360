import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-3xl border border-border/70 bg-card text-card-foreground shadow-[0_1px_2px_rgba(28,27,25,0.04),0_12px_32px_-16px_rgba(28,27,25,0.10)] dark:shadow-none', className)} {...props} />;
}
