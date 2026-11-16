import { confirmNewsletter } from "@/lib/newsletter";
import { redirectLocal } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** POST /api/newsletter/confirm – form fields id, token (from the button on /newsletter/bestaetigen). */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "newsletter-confirm", limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  const form = await req.formData().catch(() => null);
  const id = String(form?.get("id") ?? "").slice(0, 40);
  const token = String(form?.get("token") ?? "").slice(0, 80);
  let status: string;
  try {
    status = await confirmNewsletter(id, token);
  } catch (err) {
    console.error("[newsletter] confirm failed", err);
    status = "fehler";
  }
  return redirectLocal(`/newsletter/bestaetigen?status=${status}`);
}
