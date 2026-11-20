import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'brand' | 'chip';
  size?: 'default' | 'sm' | 'lg';
}

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50';

const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/85',
  outline: 'border border-input bg-background text-foreground hover:bg-accent',
  ghost: 'text-foreground hover:bg-accent',
  destructive: 'border border-input bg-background text-destructive hover:bg-accent',
  brand:
    'border border-emerald-400/30 bg-gradient-to-b from-emerald-500 to-emerald-700 text-[#f3f0ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_6px_20px_-8px_rgba(4,95,75,0.85)] hover:brightness-110',
  chip: 'border border-border bg-secondary/80 text-foreground hover:bg-accent',
};

const sizes = {
  default: 'h-10 px-4',
  sm: 'h-9 px-3',
  lg: 'h-12 px-7 text-base',
};

export function buttonClass({
  variant = 'default',
  size = 'default',
  className,
}: Pick<ButtonProps, 'variant' | 'size' | 'className'> = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, className, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClass({ variant, size, className })} {...props} />
  )
);
Button.displayName = 'Button';
