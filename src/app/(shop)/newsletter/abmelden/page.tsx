import type { Metadata } from "next";
import { NewsletterActionPage } from "@/components/content/newsletter-action-page";

export const metadata: Metadata = { title: "Newsletter abmelden", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const OUTCOMES: Record<string, { ok: boolean; title: string; text: string }> = {
  removed: { ok: true, title: "Abgemeldet.", text: "Deine Adresse ist gelöscht. Du bekommst keinen Newsletter mehr von uns." },
  invalid: { ok: true, title: "Nichts mehr zu tun.", text: "Diese Adresse ist nicht (mehr) für unseren Newsletter angemeldet." },
  fehler: { ok: false, title: "Das hat nicht geklappt.", text: "Die Abmeldung ist gerade nicht möglich. Bitte versuch es später noch einmal oder schreib uns an office@blumora.at." },
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const id = str(sp.id);
  const token = str(sp.token);
  return (
    <NewsletterActionPage
      title="Vom Newsletter abmelden"
      intro="Mit einem Klick löschen wir deine Adresse aus dem Newsletter."
      action="/api/newsletter/unsubscribe"
      button="Abmelden"
      hidden={id && token ? { id, token } : undefined}
      outcome={OUTCOMES[str(sp.status)]}
    />
  );
}
