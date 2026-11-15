// Front-page product video (generated with Arcade). Renders nothing until a
// video URL is configured in site.ts, so the section never shows an empty frame.

import { PROJECT_VIDEO } from '@/lib/site';

export function ProjectVideo() {
  if (!PROJECT_VIDEO.src) return null;
  return (
    <section id="video" className="scroll-mt-24 border-t">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Watch</p>
        <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-5xl">
          See Predict 360 in 30 seconds
        </h2>
        <p className="mt-4 max-w-xl text-muted-foreground">
          What it measures, the score, the assistant, the desktop app and cloud sync — the whole project at a glance.
        </p>
        <div className="mt-10 overflow-hidden rounded-2xl border bg-card shadow-[0_24px_60px_-28px_rgba(0,0,0,0.35)]">
          <video
            className="aspect-video w-full"
            src={PROJECT_VIDEO.src}
            poster={PROJECT_VIDEO.poster || undefined}
            controls
            playsInline
            preload="metadata"
          >
            Your browser can&apos;t play this video.{' '}
            <a href={PROJECT_VIDEO.src} className="underline">
              Download it
            </a>
            .
          </video>
        </div>
      </div>
    </section>
  );
}
