import "server-only";
import { NextResponse } from "next/server";
import { getSettings, readData, writeData } from "@/lib/cms";

/**
 * Shared delivery for inbound messages (contact form, business inquiry,
 * subscription request). A message counts as delivered when it was stored in
 * the datastore OR mailed to the admin address – one of the two is enough, so
 * a read-only filesystem (serverless hosting without DATABASE_URL) or a missing
 * mail provider alone does not lose it.
 *
 * When neither worked the caller answers with `inquiryUnavailable()`: the form
 * then offers a pre-filled e-mail link instead of pretending success.
 */
export async function deliverInquiry<T>(opts: {
  /** Log prefix, e.g. "contact". */
  scope: string;
  /** Runtime document the entry is appended to. */
  dataFile: string;
  entry: T;
  /** Newest first instead of appending. */
  prepend?: boolean;
  /** Sends the admin notification; resolves to true when a mail really went out. */
  notify: () => Promise<boolean>;
}): Promise<{ stored: boolean; mailed: boolean }> {
  let stored = false;
  try {
    const current = await readData<unknown>(opts.dataFile, []);
    const list = Array.isArray(current) ? (current as T[]) : [];
    if (opts.prepend) list.unshift(opts.entry);
    else list.push(opts.entry);
    await writeData(opts.dataFile, list);
    stored = true;
  } catch (err) {
    console.error(`[${opts.scope}] could not store entry`, err);
  }

  let mailed = false;
  try {
    mailed = await opts.notify();
  } catch (err) {
    console.error(`[${opts.scope}] admin notification failed`, err);
  }
  return { stored, mailed };
}

/** Operator placeholders in settings start with "[" (see content/settings.json). */
const isPlaceholder = (v: string | undefined) => !v || v.trim() === "" || v.trim().startsWith("[");

/**
 * 503 for a message that could neither be stored nor mailed. Carries the public
 * contact address (when one is set) so the form can offer a `mailto:` fallback.
 */
export async function inquiryUnavailable() {
  const { brand } = await getSettings();
  const email = isPlaceholder(brand.email) ? undefined : brand.email;
  return NextResponse.json(
    {
      ok: false,
      code: "unavailable",
      message: email
        ? "Das Formular ist gerade nicht erreichbar. Bitte schick uns deine Nachricht direkt per E-Mail."
        : "Das Formular ist gerade nicht erreichbar. Bitte versuch es später noch einmal.",
      ...(email && { email }),
    },
    { status: 503 },
  );
}
