// Front-page product video (generated with Arcade). Uses the HLS-capable video
// player so it works with a plain MP4 today and an .m3u8 stream later without a
// code change. Renders nothing until a video URL is configured in site.ts.

import { HLSVideoPlayer } from '@/components/ui/hls-video-player';
import { PROJECT_VIDEO } from '@/lib/site';

export function ProjectVideo() {
  if (!PROJECT_VIDEO.src) return null;
  return (
    <section id="video" className="scroll-mt-24 border-t">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Trailer</p>
        <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-5xl">Watch the trailer</h2>
        <p className="mt-4 max-w-xl text-muted-foreground">
          One person, one day: a morning check-in, switching modes, and all-day tracking with the pause control.
        </p>
        <div className="mt-10 overflow-hidden rounded-2xl border bg-card shadow-[0_24px_60px_-28px_rgba(0,0,0,0.35)]">
          <HLSVideoPlayer
            src={PROJECT_VIDEO.src}
            poster={PROJECT_VIDEO.poster || undefined}
            width={1920}
            height={1080}
            controls
            playsInline
            preload="metadata"
            className="block w-full"
          />
        </div>
      </div>
    </section>
  );
}
