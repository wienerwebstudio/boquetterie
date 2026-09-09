import { NextResponse } from "next/server";
import { addNewsletterSubscriber, getSettings } from "@/lib/cms";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** POST /api/newsletter { email } */
export async function POST(req: Request) {
  const settings = await getSettings();
  if (!settings.newsletterEnabled) {
    return NextResponse.json({ ok: false, message: "Der Newsletter ist derzeit nicht verfügbar." }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }
  const email = typeof body === "object" && body !== null && "email" in body && typeof (body as { email: unknown }).email === "string"
    ? (body as { email: string }).email.trim()
    : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, message: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 });
  }
  await addNewsletterSubscriber(email);
  return NextResponse.json({ ok: true });
}
