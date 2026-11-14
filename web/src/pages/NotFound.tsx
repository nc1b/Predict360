// Minimal 404: status code and message on one line with a divider, and one
// outline button home.

import { Link } from 'react-router-dom';
import { SiteNav } from '@/components/blocks/site-nav';
import { buttonClass } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteNav />
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="animate-element flex items-center gap-5">
          <h1 className="text-4xl font-bold tabular-nums tracking-tight">404</h1>
          <span aria-hidden="true" className="h-10 w-px bg-border" />
          <p className="text-muted-foreground">This page doesn&apos;t exist.</p>
        </div>
        <Link to="/" className={buttonClass({ variant: 'outline', className: 'animate-element animate-delay-100 mt-8' })}>
          Back to home
        </Link>
      </main>
    </div>
  );
}
