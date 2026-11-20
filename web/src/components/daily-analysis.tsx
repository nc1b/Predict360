import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Renders the model's "headline + '- ' bullets" format without trusting it as HTML. */
export function AnalysisText({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[-•*]\s+/.test(l)).map((l) => l.replace(/^[-•*]\s+/, ''));
  const prose = lines.filter((l) => !/^[-•*]\s+/.test(l));
  const [headline, ...rest] = prose;
  return (
    <div className="mt-4">
      {headline && <p className="text-lg font-semibold leading-snug">{headline}</p>}
      {bullets.length > 0 && (
        <ul className="mt-3 space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/60" />
              {b}
            </li>
          ))}
        </ul>
      )}
      {rest.map((l, i) => (
        <p key={i} className="mt-3 text-xs text-muted-foreground">{l}</p>
      ))}
    </div>
  );
}

export function DailyAnalysisCard({
  text,
  busy,
  error,
  canRun,
  onRun,
}: {
  text: string | null;
  busy: boolean;
  error: string | null;
  canRun: boolean;
  onRun: () => void;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Sparkles className="size-3.5" aria-hidden="true" /> Daily analysis
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Written by Claude Opus 5.5 from your numbers only</p>
        </div>
        {(text || canRun) && (
          <Button variant="outline" size="sm" className="rounded-full" onClick={onRun} disabled={busy || !canRun}>
            <RefreshCw className={cn('size-3.5', busy && 'animate-spin')} aria-hidden="true" />
            {busy ? 'Analyzing…' : text ? 'Refresh' : 'Analyze today'}
          </Button>
        )}
      </div>
      {busy && !text ? (
        <div className="mt-5 space-y-2.5" aria-label="Writing your analysis">
          <div className="h-6 w-4/5 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-full animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : text ? (
        <AnalysisText text={text} />
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {canRun
            ? 'Compare today with your recent check-ins, energy and computer activity.'
            : 'Finish today’s check-in and your analysis appears here.'}
        </p>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </Card>
  );
}
