"use client";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/format";
import type { FieldErrors } from "@/lib/order-payload";
import { ChoiceTile } from "./choice-tile";
import { GreetingCardPreview } from "./greeting-card-preview";
import { useI18n } from "@/i18n/client";
import { fieldId, type CheckoutData } from "./checkout-state";

type Greeting = CheckoutData["greeting"];

export function StepGreeting({ data, set, errors, onBlur, maxChars, freeCardIncluded, enabled = true }: {
  data: Greeting;
  set: (patch: Partial<Greeting>) => void;
  errors: FieldErrors;
  onBlur: (field: keyof Greeting) => void;
  maxChars: number;
  freeCardIncluded: boolean;
  /** Off: greeting cards are not offered yet – the step only says so. */
  enabled?: boolean;
}) {
  const { m, fmt } = useI18n();
  const t = m.checkout.greeting;
  if (!enabled) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-md border border-dashed border-line bg-white/40 p-5 sm:p-6">
        <Badge tone="rose">{t.soonBadge}</Badge>
        <p className="max-w-prose text-[15px] leading-relaxed text-ink">
          {t.soonText}
        </p>
        <p className="text-[13px] text-ink-muted">{t.soonNext}</p>
      </div>
    );
  }
  const id = (f: keyof Greeting) => fieldId(3, f);
  const remaining = maxChars - data.message.length;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <Textarea
            id={id("message")} label={t.message} optional
            placeholder={t.messagePlaceholder}
            value={data.message}
            onChange={(e) => set({ message: e.target.value.slice(0, maxChars + 50) })}
            onBlur={() => onBlur("message")}
            error={errors.message}
            rows={5}
            aria-describedby={`${id("message")}-count`}
          />
          <p id={`${id("message")}-count`} className={cn("text-right text-[12px] tabular-nums", remaining < 0 ? "text-danger" : remaining < 20 ? "text-warn" : "text-ink-soft")} aria-live="polite">
            {remaining < 0 ? fmt(t.charsOver, { count: -remaining }) : fmt(t.charsLeft, { count: remaining })}
          </p>
        </div>

        <fieldset>
          <legend className="mb-3 text-[13px] font-semibold text-ink">{t.sender}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceTile name="greeting-anon" value="named" checked={!data.anonymous} onChange={() => set({ anonymous: false })} title={t.showSender} description={t.showSenderText} compact />
            <ChoiceTile name="greeting-anon" value="anon" checked={data.anonymous} onChange={() => set({ anonymous: true })} title={t.anonymous} description={t.anonymousText} compact />
          </div>
          {!data.anonymous && (
            <div className="mt-4 animate-fade-in">
              <Input
                id={id("senderName")} label={t.senderName} optional
                placeholder={t.senderNamePlaceholder}
                value={data.senderName} onChange={(e) => set({ senderName: e.target.value })} onBlur={() => onBlur("senderName")} error={errors.senderName}
              />
            </div>
          )}
        </fieldset>

        <p className="text-[13px] text-ink-muted">
          {freeCardIncluded ? t.freeCard : ""}{t.noPrice}
        </p>
      </div>

      <div className="lg:pt-6">
        <p className="eyebrow mb-3">{t.preview}</p>
        <GreetingCardPreview message={data.message} senderName={data.senderName} anonymous={data.anonymous} />
      </div>
    </div>
  );
}
