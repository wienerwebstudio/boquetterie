"use client";
import { forwardRef, useId, useMemo, useState, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/format";
import { useI18n } from "@/i18n/client";
import { PHONE_COUNTRIES, joinPhone, normalizePhone, splitPhone } from "@/lib/phone";

/**
 * Shared look of text fields. The resting border (`line-strong`) has >= 3:1 against
 * the page backgrounds (WCAG 1.4.11); focus draws a 2px forest ring over the border,
 * so nothing shifts and nothing gets clipped by scroll containers.
 */
const fieldFocus = "focus:border-forest focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-forest";
const fieldBase =
  `w-full rounded-md border bg-white/70 px-4 text-[15px] text-ink placeholder:text-ink-soft transition-colors focus:bg-white ${fieldFocus} disabled:opacity-60`;
const fieldBorder = (error?: string) => (error ? "border-danger" : "border-line-strong");

/** Joins ids for aria-describedby, skipping empty ones. */
const ids = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join(" ") || undefined;

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(function Input(
  { label, hint, error, optional, className, id, "aria-describedby": describedBy, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const { m } = useI18n();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-semibold text-ink">
          {label}{rest.required && <span className="text-burgundy" aria-hidden> *</span>} {optional && <span className="font-normal text-ink-muted">{m.ui.optional}</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={ids(describedBy, error ? `${inputId}-error` : hint && `${inputId}-hint`)}
        className={cn(fieldBase, "h-12", fieldBorder(error))}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-[13px] text-danger">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[13px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(function Textarea(
  { label, hint, error, optional, className, id, "aria-describedby": describedBy, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const { m } = useI18n();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-semibold text-ink">
          {label}{rest.required && <span className="text-burgundy" aria-hidden> *</span>} {optional && <span className="font-normal text-ink-muted">{m.ui.optional}</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={ids(describedBy, error ? `${inputId}-error` : hint && `${inputId}-hint`)}
        className={cn(fieldBase, "min-h-28 resize-y py-3", fieldBorder(error))}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-[13px] text-danger">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[13px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldProps>(function Select(
  { label, hint, error, className, id, children, "aria-describedby": describedBy, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <label htmlFor={inputId} className="text-[13px] font-semibold text-ink">{label}</label>}
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={ids(describedBy, error ? `${inputId}-error` : hint && `${inputId}-hint`)}
          className={cn(fieldBase, "h-12 appearance-none pr-10", fieldBorder(error))}
          {...rest}
        >
          {children}
        </select>
        <svg aria-hidden className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-[13px] text-danger">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[13px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
});

export function Checkbox({ label, className, id, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className={cn("flex cursor-pointer items-start gap-3 text-[14px] text-ink", className)}>
      <input id={inputId} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-forest" {...rest} />
      <span>{label}</span>
    </label>
  );
}

function regionNames(locale: string): Intl.DisplayNames | null {
  for (const l of [locale, "de"]) {
    try { return new Intl.DisplayNames([l], { type: "region" }); } catch { /* unknown locale tag */ }
  }
  return null;
}

type PhoneInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type"> & FieldProps & {
  /** Controlled value ("+43 660 1234567"). */
  value?: string;
  onChange?: (value: string) => void;
  /** Uncontrolled forms: the joined value is submitted under `name` via a hidden input. */
  defaultValue?: string;
};

/**
 * Phone field with a country-code select (default Austria +43, see src/lib/phone.ts).
 * The select is a real native <select> (keyboard + screen readers) laid transparently over
 * a compact "AT +43" box; options show the localized country name. The value is one string.
 */
export function PhoneInput({ label, hint, error, optional, className, id, value, onChange, defaultValue, name, "aria-describedby": describedBy, ...rest }: PhoneInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const { m, locale } = useI18n();
  const [state, setState] = useState(() => {
    const start = splitPhone(value ?? defaultValue ?? "");
    return { dial: start.dial, typed: start.national };
  });
  const joined = joinPhone(state.dial, state.typed);
  // Parent replaced the value (restored draft, reset): show it.
  if (value !== undefined && normalizePhone(value) !== joined) {
    const next = splitPhone(value);
    setState({ dial: value.trim() ? next.dial : state.dial, typed: next.national });
  }
  const { dial, typed } = state;
  const names = useMemo(() => regionNames(locale), [locale]);
  const country = PHONE_COUNTRIES.find((c) => c.dial === dial) ?? PHONE_COUNTRIES[0];
  const update = (nextDial: string, nextTyped: string) => {
    setState({ dial: nextDial, typed: nextTyped });
    onChange?.(joinPhone(nextDial, nextTyped));
  };
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-semibold text-ink">
          {label}{rest.required && <span className="text-burgundy" aria-hidden> *</span>} {optional && <span className="font-normal text-ink-muted">{m.ui.optional}</span>}
        </label>
      )}
      <div className="flex gap-2" dir="ltr">
        <div className={cn("relative h-12 w-[6.75rem] shrink-0 rounded-md border bg-white/70 focus-within:border-forest focus-within:bg-white focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-forest", fieldBorder(error))}>
          <span aria-hidden className="pointer-events-none flex h-full items-center gap-1.5 pl-3 pr-7 text-[15px] text-ink">
            <span className="text-[12px] font-semibold text-ink-muted">{country.region}</span>{dial}
          </span>
          <svg aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <select
            aria-label={m.ui.phoneCountry}
            data-testid="phone-country"
            value={dial}
            disabled={rest.disabled}
            onChange={(e) => update(e.target.value, typed)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          >
            {PHONE_COUNTRIES.map((c) => (
              <option key={c.region} value={c.dial}>{(names?.of(c.region) ?? c.region)} ({c.dial})</option>
            ))}
          </select>
        </div>
        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={ids(describedBy, error ? `${inputId}-error` : hint && `${inputId}-hint`)}
          className={cn(fieldBase, "h-12 min-w-0 flex-1", fieldBorder(error))}
          value={typed}
          onChange={(e) => {
            const t = e.target.value;
            // A pasted international number ("+49 …", "0049 …") switches the code.
            if (/^\s*(\+|00)/.test(t)) { const p = splitPhone(t); update(p.dial, p.national); } else update(dial, t);
          }}
          {...rest}
        />
      </div>
      {name && <input type="hidden" name={name} value={joined} />}
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-[13px] text-danger">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[13px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
