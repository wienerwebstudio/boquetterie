import { buildLlmsTxt } from "@/lib/llms";
import { loadLlmsData } from "@/lib/llms-data";

/** Rebuilt from the live CMS content at most once per hour. */
export const revalidate = 3600;

export async function GET() {
  const body = buildLlmsTxt(await loadLlmsData());
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
