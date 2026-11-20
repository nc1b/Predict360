
import { HLSVideoPlayer } from '@/components/ui/hls-video-player';
import { PROJECT_VIDEO } from '@/lib/site';
import { useIsDark } from '@/lib/theme';

export function ProjectVideo() {
  const dark = useIsDark();
  if (!PROJECT_VIDEO.src) return null;
  const poster = (dark ? PROJECT_VIDEO.poster : PROJECT_VIDEO.posterLight) || PROJECT_VIDEO.poster;
  return (
    <section id="video" className="scroll-mt-24 border-t">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Trailer</p>
        <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-5xl">Watch the trailer</h2>
        <p className="mt-4 max-w-xl text-muted-foreground">
          One person, one day: a check-in, switching modes, and all-day tracking with the pause control.
        </p>
        <div className="gradient-border mt-10 overflow-hidden rounded-3xl bg-card p-1.5 shadow-[0_40px_100px_-40px_rgba(26,11,46,0.35)] dark:shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]">
          <HLSVideoPlayer
            src={PROJECT_VIDEO.src}
            poster={poster || undefined}
            width={1920}
            height={1080}
            controls
            playsInline
            preload="metadata"
            className="block w-full overflow-hidden rounded-[1.15rem]"
          />
        </div>
      </div>
    </section>
  );
}
