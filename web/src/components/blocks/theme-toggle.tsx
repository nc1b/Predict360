import { Moon, Sun } from 'lucide-react';
import { setTheme, useIsDark } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useIsDark();
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={cn(
        'relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border bg-background/60 text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <Sun className={cn('absolute size-4 transition-all duration-300', dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100')} />
      <Moon className={cn('absolute size-4 transition-all duration-300', dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')} />
    </button>
  );
}
