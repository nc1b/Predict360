import * as React from 'react';
import { ArrowUp, Sparkles } from 'lucide-react';
import { AiUnconfiguredError, ApiError, chat, type ChatHistoryItem, type ChatMessage } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { HistoryEntry } from '@/lib/history';

const SUGGESTIONS = ['Summarise my check-ins', 'How has my sentence pause changed?', 'Any trend this week?'];

function toHistoryItems(history: HistoryEntry[]): ChatHistoryItem[] {
  return history.map((h) => ({
    date: h.at,
    readinessScore: h.readinessScore,
    features: {
      dwellMs: { value: h.features.dwellMs.value },
      sentencePauseMs: { value: h.features.sentencePauseMs.value },
      flightVolatilityMs: { value: h.features.flightVolatilityMs.value },
    },
  }));
}

export function Chat({ history, getToken }: { history: HistoryEntry[]; getToken: () => Promise<string | null> }) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [off, setOff] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setError(null);
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new ApiError('Sign in again to use the assistant.');
      const reply = await chat(next, toHistoryItems(history), token);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (err) {
      if (err instanceof AiUnconfiguredError) setOff(true);
      else setError(err instanceof Error ? err.message : 'The assistant could not reply. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (off) return null;

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b px-5 py-3.5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold leading-tight">Assistant</h2>
          <p className="text-xs text-muted-foreground">Sees only your numbers, never your words</p>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-80 min-h-[7rem] space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-wrap gap-2 py-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <p
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                  m.role === 'user' ? 'bg-foreground text-background' : 'bg-muted text-foreground'
                )}
              >
                {m.content}
              </p>
            </div>
          ))
        )}
        {busy && (
          <div className="flex justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-2xl bg-muted px-3.5 py-2.5 text-muted-foreground">
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current" />
            </span>
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your check-ins…"
          aria-label="Message the assistant"
          disabled={busy}
          className="h-10 flex-1 rounded-full border border-input bg-background px-4 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || input.trim().length === 0}
          aria-label="Send"
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-85 disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
      </form>
    </Card>
  );
}
