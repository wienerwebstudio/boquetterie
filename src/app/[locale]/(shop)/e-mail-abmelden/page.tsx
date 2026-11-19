import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/content/page-header";
import { outreachSecret, verifyUnsubscribeToken } from "@/lib/outreach/tokens";

/**
 * /e-mail-abmelden?t=<token> – opt-out from personal outreach mails (admin → Outreach).
 * German and English on one page (recipients are businesses, partly international).
 * The address is only removed by the button (POST) – link scanners change nothing.
 */
export const metadata: Metadata = {
  title: "Keine weiteren E-Mails · Unsubscribe",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const OUTCOMES: Record<string, { ok: boolean; de: string; en: string }> = {
  removed: {
    ok: true,
    de: "Erledigt. Wir schicken Ihnen keine weiteren E-Mails dieser Art.",
    en: "Done. We will not send you any further e-mails of this kind.",
  },
  invalid: {
    ok: false,
    de: "Dieser Link ist leider ungültig oder unvollständig. Antworten Sie einfach auf unsere E-Mail mit „Keine weiteren E-Mails“ – wir tragen Sie dann von Hand aus.",
    en: "Unfortunately this link is invalid or incomplete. Simply reply to our e-mail with “unsubscribe” and we will remove you by hand.",
  },
  error: {
    ok: false,
    de: "Das hat leider nicht geklappt. Bitte versuchen Sie es später noch einmal oder antworten Sie auf unsere E-Mail.",
    en: "Something went wrong. Please try again later or reply to our e-mail.",
  },
};

function mask(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(6, local.length - 2)))}@${domain}`;
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const token = str(sp.t).slice(0, 600);
  const outcome = OUTCOMES[str(sp.status)];
  const email = token ? verifyUnsubscribeToken(token, outreachSecret()) : null;
  const shown = outcome ?? (email ? null : OUTCOMES.invalid);

  return (
    <article>
      <PageHeader
        eyebrow="E-Mails · E-mails"
        title="Keine weiteren E-Mails erhalten"
        intro={shown ? undefined : "Sie möchten keine weiteren persönlichen E-Mails von Blumora erhalten? Bestätigen Sie es hier mit einem Klick. — Don’t want any further personal e-mails from Blumora? Confirm with one click."}
      />
      <div className="container-x py-14 sm:py-20">
        {shown ? (
          <div role="status" className="max-w-xl rounded-md border border-line bg-white/70 p-8">
            {shown.ok && <span className="inline-flex size-10 items-center justify-center rounded-full bg-success text-ivory"><Check className="size-5" strokeWidth={2.5} aria-hidden /></span>}
            <p className="mt-4 text-[15px] leading-relaxed text-ink">{shown.de}</p>
            <p lang="en" className="mt-3 text-[15px] leading-relaxed text-ink-muted">{shown.en}</p>
          </div>
        ) : (
          <form method="post" action="/api/outreach/unsubscribe" className="max-w-xl">
            <input type="hidden" name="t" value={token} />
            {email && (
              <p className="mb-5 text-[15px] text-ink-muted">
                Adresse · Address: <span className="font-semibold text-ink">{mask(email)}</span>
              </p>
            )}
            <button type="submit" className="inline-flex h-12 items-center rounded-md bg-forest px-6 text-[15px] font-semibold text-ivory transition-colors hover:bg-forest-700">
              Abmelden · Unsubscribe
            </button>
          </form>
        )}
      </div>
    </article>
  );
}
