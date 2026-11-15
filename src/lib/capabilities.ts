import "server-only";
import { canPersistData } from "@/lib/cms";
import { mailProvider } from "@/lib/mail";

/**
 * What the current deployment can really do. Features that need both a
 * persistent datastore and real mail delivery (reminders, magic-link login)
 * are shown as "not available yet" instead of collecting data that would be
 * lost or promising mails that are never sent.
 *
 * Must be evaluated at request time (dynamic pages / route handlers): during
 * the build the filesystem is writable even when it is not at runtime.
 */
export interface Capabilities {
  /** Runtime data survives (Postgres, or a writable /data directory). */
  persist: boolean;
  /** Mails are really delivered. The console provider only counts outside production builds. */
  mail: boolean;
  /** Occasion reminders: stored, confirmed by mail, sent by cron. */
  reminders: boolean;
  /** Customer login by magic link. */
  accountLogin: boolean;
}

export async function getCapabilities(): Promise<Capabilities> {
  const persist = await canPersistData();
  const mail = mailProvider() === "resend" || process.env.NODE_ENV !== "production";
  return { persist, mail, reminders: persist && mail, accountLogin: persist && mail };
}
