import { enforceRateLimit } from "@/lib/rate-limit";
import { isValidTrackingToken } from "@/lib/outreach/queue";
import { recordOpen } from "@/lib/outreach/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Transparent 1×1 GIF. */
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/**
 * GET /api/o/o/<token> – open tracking pixel of an outreach mail (approximate: many
 * mail apps block or pre-load images). Always answers with the pixel.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const pixel = () => new Response(new Uint8Array(PIXEL), {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex" },
  });
  const limited = enforceRateLimit(req, { scope: "outreach-open", limit: 120, windowMs: 60 * 1000 });
  if (limited) return pixel();
  const { token: raw } = await params;
  const token = raw.replace(/\.gif$/, "");
  if (isValidTrackingToken(token)) {
    await recordOpen(token).catch((err: unknown) => console.error("[outreach] open tracking failed", err));
  }
  return pixel();
}
