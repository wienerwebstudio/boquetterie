import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/format";

const fieldBase =
  "w-full rounded-md border bg-white/70 px-4 text-[15px] text-ink placeholder:text-ink-soft transition-colors focus:border-forest focus:bg-white focus:outline-none focus-visible:outline-none disabled:opacity-60";

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(function Input(
  { label, hint, error, optional, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-semibold text-ink">
          {label} {optional && <span className="font-normal text-ink-soft">(optional)</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(fieldBase, "h-12", error ? "border-danger" : "border-line")}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-[13px] text-danger">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[13px] text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(function Textarea(
  { label, hint, error, optional, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-semibold text-ink">
          {label} {optional && <span className="font-normal text-ink-soft">(optional)</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        className={cn(fieldBase, "min-h-28 resize-y py-3", error ? "border-danger" : "border-line")}
        {...rest}
      />
      {error ? <p role="alert" className="text-[13px] text-danger">{error}</p> : hint ? <p className="text-[13px] text-ink-soft">{hint}</p> : null}
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldProps>(function Select(
  { label, hint, error, className, id, children, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <label htmlFor={inputId} className="text-[13px] font-semibold text-ink">{label}</label>}
      <div className="relative">
        <select ref={ref} id={inputId} className={cn(fieldBase, "h-12 appearance-none pr-10", error ? "border-danger" : "border-line")} {...rest}>
          {children}
        </select>
        <svg aria-hidden className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      {error ? <p role="alert" className="text-[13px] text-danger">{error}</p> : hint ? <p className="text-[13px] text-ink-soft">{hint}</p> : null}
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
