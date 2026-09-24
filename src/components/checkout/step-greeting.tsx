"use client";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/format";
import type { FieldErrors } from "@/lib/order-payload";
import { ChoiceTile } from "./choice-tile";
import { GreetingCardPreview } from "./greeting-card-preview";
import { fieldId, type CheckoutData } from "./checkout-state";

type Greeting = CheckoutData["greeting"];

export function StepGreeting({ data, set, errors, onBlur, maxChars, freeCardIncluded }: {
  data: Greeting;
  set: (patch: Partial<Greeting>) => void;
  errors: FieldErrors;
  onBlur: (field: keyof Greeting) => void;
  maxChars: number;
  freeCardIncluded: boolean;
}) {
  const id = (f: keyof Greeting) => fieldId(3, f);
  const remaining = maxChars - data.message.length;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <Textarea
            id={id("message")} label="Deine Nachricht" optional
            placeholder="Alles Liebe zum Geburtstag – ich denk an dich."
            value={data.message}
            onChange={(e) => set({ message: e.target.value.slice(0, maxChars + 50) })}
            onBlur={() => onBlur("message")}
            error={errors.message}
            rows={5}
            aria-describedby={`${id("message")}-count`}
          />
          <p id={`${id("message")}-count`} className={cn("text-right text-[12px] tabular-nums", remaining < 0 ? "text-danger" : remaining < 20 ? "text-warn" : "text-ink-soft")} aria-live="polite">
            {remaining < 0 ? `${-remaining} Zeichen zu viel` : `${remaining} Zeichen übrig`}
          </p>
        </div>

        <fieldset>
          <legend className="mb-3 text-[13px] font-semibold text-ink">Absender</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceTile name="greeting-anon" value="named" checked={!data.anonymous} onChange={() => set({ anonymous: false })} title="Absender anzeigen" description="Dein Name steht auf der Karte." compact />
            <ChoiceTile name="greeting-anon" value="anon" checked={data.anonymous} onChange={() => set({ anonymous: true })} title="Ohne Namen senden" description="Die Karte bleibt anonym." compact />
          </div>
          {!data.anonymous && (
            <div className="mt-4 animate-fade-in">
              <Input
                id={id("senderName")} label="Name auf der Karte" optional
                placeholder="z. B. Anna & Paul"
                value={data.senderName} onChange={(e) => set({ senderName: e.target.value })} onBlur={() => onBlur("senderName")} error={errors.senderName}
              />
            </div>
          )}
        </fieldset>

        <p className="text-[13px] text-ink-muted">
          {freeCardIncluded ? "Die Grußkarte ist inklusive. " : ""}Wir schreiben deine Worte auf unsere Karte – ohne Preis, ohne Rechnung. Der Strauß enthält nichts, was den Empfänger auf den Preis schließen lässt.
        </p>
      </div>

      <div className="lg:pt-6">
        <p className="eyebrow mb-3">Vorschau</p>
        <GreetingCardPreview message={data.message} senderName={data.senderName} anonymous={data.anonymous} />
      </div>
    </div>
  );
}
