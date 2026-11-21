import { AT, BA, BG, ES, FR, GB, HR, HU, IT, PL, RO, RS, RU, SK, TR, UA } from "country-flag-icons/react/3x2";
import { Languages } from "lucide-react";
import type { Locale } from "@/i18n/config";

type Flag = typeof AT;

/**
 * Flag(s) shown next to a language in the language menu. Languages spoken in many countries
 * or with a politically disputed flag (Arabic, Persian, Chechen – owners' choice) get a neutral
 * language icon instead. BKS shows the flags of Bosnia and Herzegovina, Croatia and Serbia.
 */
const FLAGS: Record<Locale, Flag[]> = {
  de: [AT], en: [GB], tr: [TR], bks: [BA, HR, RS], uk: [UA], ru: [RU], pl: [PL], ro: [RO], hu: [HU],
  ar: [], bg: [BG], fa: [], sk: [SK], it: [IT], fr: [FR], es: [ES], ce: [],
};

export function LanguageFlag({ locale }: { locale: Locale }) {
  const flags = FLAGS[locale];
  if (!flags.length) {
    return (
      <span aria-hidden className="inline-flex h-[14px] w-[21px] shrink-0 items-center justify-center text-ink-soft">
        <Languages className="size-4" strokeWidth={1.6} />
      </span>
    );
  }
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center gap-0.5" dir="ltr">
      {flags.map((F, i) => (
        <F key={i} className={`${flags.length > 1 ? "h-[11px] w-[16px]" : "h-[14px] w-[21px]"} rounded-[2px] shadow-[0_0_0_1px_rgba(35,35,31,0.12)]`} />
      ))}
    </span>
  );
}
