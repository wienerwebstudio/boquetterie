import { NextResponse } from "next/server";
import type { Reminder } from "@/types/reminders";
import { getOccasions } from "@/lib/cms";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendReminderConfirmation } from "@/lib/mail";
import { getReminders, newReminderId, newToken, parseReminderInput, pruneUnconfirmed, saveReminders } from "@/lib/mail/reminders";

export const dynamic = "force-dynamic";

/**
 * POST /api/reminders
 * Body: { email, occasion, customOccasion?, personName?, day, month, yearly, leadDays, consent, website? }
 * Stores an unconfirmed reminder and sends the double-opt-in mail. The reminder
 * only becomes active via GET /api/reminders/confirm?id&token.
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { scope: "reminders", limit: 5, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object") throw new Error("bad body");
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }

  // Honeypot – bots fill the hidden field; pretend success without storing anything.
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });

  const parsed = parseReminderInput(body, await getOccasions());
  if (!parsed.ok) return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 422 });
  const input = parsed.input;

  try {
    const list = pruneUnconfirmed(await getReminders());
    const existing = list.find((r) => r.email === input.email && r.occasionSlug === input.occasionSlug && r.day === input.day && r.month === input.month && (r.occasionLabel === input.occasionLabel));

    if (existing?.confirmed) {
      // Already active – nothing to send, but do not reveal that to the caller.
      return NextResponse.json({ ok: true });
    }

    let reminder: Reminder;
    if (existing) {
      reminder = { ...existing, ...input, createdAt: new Date().toISOString() };
      list[list.indexOf(existing)] = reminder;
    } else {
      reminder = { id: newReminderId(), createdAt: new Date().toISOString(), ...input, confirmed: false, unsubscribeToken: newToken() };
      list.push(reminder);
    }
    await saveReminders(list);
    await sendReminderConfirmation(reminder).catch((err) => console.error("[reminders] confirmation mail failed", err));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reminders] create failed", err);
    return NextResponse.json({ ok: false, message: "Die Erinnerung konnte gerade nicht gespeichert werden. Bitte versuch es in einem Moment noch einmal." }, { status: 500 });
  }
}
