import type { Review } from "@/types";
import { getI18n } from "@/i18n/server";
import { LOCALE_INFO } from "@/i18n/config";

/** Our locale code → ISO code for `Intl.DisplayNames` (BKS = Serbo-Croatian). */
const ISO: Record<string, string> = { bks: "sh" };

/**
 * Note under a review shown in another language than it was written in:
 * "Übersetzt aus: Deutsch" plus the original text behind "Original anzeigen",
 * or "Originalsprache: Deutsch" when there is no translation yet. Server only
 * (language names come from Intl on the server, so nothing to hydrate).
 */
export async function ReviewLanguageNote({ review, className }: { review: Review; className?: string }) {
  const d = review.display;
  if (!d) return null;
  const { m, fmt, locale } = await getI18n();
  let language = d.lang;
  try {
    language = new Intl.DisplayNames(LOCALE_INFO[locale].intl, { type: "language" }).of(ISO[d.lang] ?? d.lang) ?? d.lang;
  } catch { /* unknown code – show it as is */ }
  if (!d.translated) return <p className={`text-[12px] text-ink-soft ${className ?? ""}`}>{fmt(m.common.reviewOriginalLanguage, { language })}</p>;
  return (
    <details className={`text-[12px] text-ink-soft ${className ?? ""}`}>
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        {fmt(m.common.reviewTranslatedFrom, { language })} · <span className="underline underline-offset-2 hover:text-forest">{m.common.reviewShowOriginal}</span>
      </summary>
      <p lang={d.lang === "bks" ? "hr" : d.lang} dir="auto" className="mt-2 border-s-2 border-line ps-3 font-serif text-[15px] italic leading-snug text-ink-muted">{d.original}</p>
    </details>
  );
}
