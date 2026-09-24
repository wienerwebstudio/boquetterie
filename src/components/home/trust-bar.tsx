import type { SiteSettings } from "@/types";
import { TrustIcon } from "@/components/icons/trust-icon";

export function TrustBar({ items }: { items: SiteSettings["trust"] }) {
  if (!items.length) return null;
  return (
    <section aria-label="Unsere Versprechen" className="border-y border-line bg-ivory-100/70">
      <div className="container-x">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-5 py-6 sm:py-7 lg:grid-cols-4 lg:gap-x-10">
          {items.map((t) => (
            <li key={t.title} className="flex items-start gap-3.5">
              <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-forest shadow-soft">
                <TrustIcon name={t.icon} className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold leading-snug text-ink sm:text-sm">{t.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-muted sm:text-[13px]">{t.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
