import { Video } from "lucide-react";
import type { ReviewVideo as ReviewVideoData } from "@/types";
import { cn } from "@/lib/format";
import { formatClipDuration } from "@/lib/review-video";
import { getI18n } from "@/i18n/server";

/**
 * A customer's short clip under a review: poster frame with the native play control.
 * `preload="none"` – nothing but the poster is loaded until the visitor presses play;
 * the `/media` route answers the Range requests the player sends.
 */
export async function ReviewVideo({ video, author, className, compact }: { video: ReviewVideoData | null; author: string; className?: string; /** Small thumbnail height for fixed-height tiles (homepage row). */ compact?: boolean }) {
  if (!video) return null;
  const { m, fmt } = await getI18n();
  const t = m.product.reviewVideo;
  const duration = video.duration ? formatClipDuration(video.duration) : "";
  return (
    <figure className={cn("flex flex-col items-start gap-1.5", className)}>
      <video
        controls
        playsInline
        preload="none"
        poster={video.poster}
        src={video.src}
        width={video.width}
        height={video.height}
        aria-label={`${fmt(t.videoOf, { author })} – ${video.alt}`}
        className={cn("h-auto w-auto max-w-full rounded-md border border-line bg-ink object-contain", compact ? "max-h-24" : "max-h-72")}
      />
      <figcaption className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
        <Video className="size-3.5" strokeWidth={1.5} aria-hidden />
        {duration ? fmt(t.caption, { duration }) : video.alt}
      </figcaption>
    </figure>
  );
}
