import type { Metadata } from "next";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { peekPartnerLoginToken } from "@/lib/partner-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anmelden", referrer: "no-referrer" };

/**
 * Landing page of the login link. A GET never logs in (mail scanners open links) –
 * the partner presses the button, which POSTs the token to /api/partner/verify.
 */
export default async function PartnerSignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const valid = (await peekPartnerLoginToken(token)).status === "valid";
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-20 pt-10 sm:px-6">
      <p className="font-serif text-[26px] leading-none tracking-[0.02em] text-forest">Blumora</p>
      <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Partner-Portal</p>
      <main className="mt-10">
        {valid ? (
          <>
            <h1 className="display-2 text-ink">Willkommen</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">Ein Klick, und du bist angemeldet – auf diesem Gerät für 90 Tage.</p>
            <form action="/api/partner/verify" method="post" className="mt-8">
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-forest px-6 text-[16px] font-semibold text-ivory hover:bg-forest-700">
                <LogIn className="size-5" aria-hidden />Jetzt anmelden
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="display-2 text-ink">Link nicht gültig</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">Der Link ist abgelaufen oder wurde schon verwendet. Fordere einfach einen neuen an.</p>
            <Link href="/partner" className="mt-8 inline-flex h-12 items-center justify-center rounded-md border border-forest px-6 text-[15px] font-semibold text-forest hover:bg-forest hover:text-ivory">Zum Login</Link>
          </>
        )}
      </main>
    </div>
  );
}
