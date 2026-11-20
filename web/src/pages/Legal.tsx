import { Link } from 'react-router-dom';
import { ArrowUp, FileText, Printer, ShieldCheck } from 'lucide-react';
import { SiteNav } from '@/components/blocks/site-nav';
import { SiteFooter } from '@/components/blocks/site-footer';
import { PRIVACY, SUPPORT_URL, TERMS, type LegalDoc } from '@/lib/legal';
import { cn } from '@/lib/utils';

export default function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  const doc: LegalDoc = kind === 'privacy' ? PRIVACY : TERMS;
  const other = kind === 'privacy' ? { to: '/terms', label: 'Terms of Service', icon: FileText } : { to: '/privacy', label: 'Privacy Policy', icon: ShieldCheck };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="print:hidden"><SiteNav /></div>
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-28 print:pt-0">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Legal</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">{doc.title}</h1>
          {doc.alsoKnownAs && <p className="mt-2 text-sm text-muted-foreground">Also referred to as our {doc.alsoKnownAs}.</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">Effective {doc.effective}</span>
            <Link to={other.to} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 hover:bg-accent print:hidden">
              <other.icon className="size-3.5" aria-hidden="true" /> {other.label}
            </Link>
            <button type="button" onClick={() => window.print()} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1 hover:bg-accent print:hidden">
              <Printer className="size-3.5" aria-hidden="true" /> Print or save as PDF
            </button>
          </div>
        </header>

        <section aria-labelledby="summary" className="panel mt-10 max-w-3xl rounded-2xl border border-border p-6">
          <h2 id="summary" className="font-semibold">The short version</h2>
          <p className="mt-1 text-xs text-muted-foreground">A plain-language summary. The full text below is what applies.</p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed">
            {doc.summary.map((s) => (
              <li key={s} className="flex gap-2.5"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-400" />{s}</li>
            ))}
          </ul>
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-[15rem_1fr]">
          <nav aria-label="Contents" className="print:hidden lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Contents</p>
            <ol className="mt-3 space-y-1 text-sm">
              {doc.sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex gap-2 rounded-lg px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                    <span className="w-5 shrink-0 tabular-nums">{i + 1}.</span>{s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="max-w-3xl">
            {doc.sections.map((s, i) => (
              <section key={s.id} id={s.id} className={cn('scroll-mt-24 border-t border-border py-8', i === 0 && 'border-t-0 pt-0')}>
                <h2 className="text-xl font-semibold tracking-tight">
                  <span className="mr-2 text-muted-foreground tabular-nums">{i + 1}.</span>{s.title}
                </h2>
                {s.intro && <p className="mt-2 text-sm font-medium text-amber-500 dark:text-amber-300">{s.intro}</p>}
                <ol className="mt-4 space-y-3">
                  {s.clauses.map((c, j) => (
                    <li key={j} className="flex gap-3 text-[15px] leading-7 text-muted-foreground">
                      <span className="w-9 shrink-0 font-medium tabular-nums text-foreground/70">{i + 1}.{j + 1}</span>
                      <div>
                        <p>{c.text}</p>
                        {c.points && (
                          <ul className="mt-2 space-y-1.5">
                            {c.points.map((p) => (
                              <li key={p} className="flex gap-2.5"><span aria-hidden="true" className="mt-3 size-1 shrink-0 rounded-full bg-muted-foreground" />{p}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-5 text-sm print:hidden">
              <p className="text-muted-foreground">
                Questions? <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="text-foreground underline">Project support</a>. Public, so no personal or health details.
              </p>
              <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <ArrowUp className="size-4" aria-hidden="true" /> Back to top
              </a>
            </div>
          </article>
        </div>
      </main>
      <div className="print:hidden"><SiteFooter /></div>
    </div>
  );
}
