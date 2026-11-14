// Minimal 404: status code and message on one line with a divider, and one
// outline button home. In the layout of the 21st.dev "Inline 404 Line" page.

import { Link } from 'react-router-dom';
import { buttonClass } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-6 py-10 text-foreground">
      <Logo />
      <main className="flex flex-1 flex-col items-center justify-center">
        <div className="flex items-center gap-5">
          <h1 className="text-3xl font-medium tabular-nums tracking-tight">404</h1>
          <span aria-hidden="true" className="h-10 w-px bg-border" />
          <p className="text-base text-muted-foreground">This page doesn't exist.</p>
        </div>
        <Link to="/" className={buttonClass({ variant: 'outline', className: 'mt-8' })}>
          Back to home
        </Link>
      </main>
    </div>
  );
}
