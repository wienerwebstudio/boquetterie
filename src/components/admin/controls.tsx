import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";

/** Compact, utilitarian form controls for the admin (sans-serif, dense). */

export const inputCls =
  "w-full rounded-md border border-line bg-white px-3 text-[14px] text-ink placeholder:text-ink-soft transition-colors focus:border-forest focus:outline-none disabled:bg-ivory-100 disabled:text-ink-muted read-only:bg-ivory-100 h-10";

export function Field({
  label, hint, error, required, children, className, htmlFor,
}: { label: ReactNode; hint?: string; error?: string; required?: boolean; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {label} {required && <span className="text-danger" aria-hidden>*</span>}
      </label>
      {children}
      {error ? <p className="text-[12px] text-danger">{error}</p> : hint ? <p className="text-[12px] text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export function Banner({ tone = "info", children, className }: { tone?: "info" | "success" | "error" | "warn"; children: ReactNode; className?: string }) {
  const tones = {
    info: "border-line bg-white text-ink",
    success: "border-[#cfe3d6] bg-[#eaf3ee] text-success",
    error: "border-[#e6c4c4] bg-[#f8ecec] text-danger",
    warn: "border-[#ead6bd] bg-[#f8f0e4] text-warn",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-md border px-4 py-3 text-[14px] leading-relaxed", tones[tone], className)}>
      {children}
    </div>
  );
}

export function Card({ title, description, children, className, actions }: { title?: ReactNode; description?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-lg border border-line bg-white", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-1 text-[13px] text-ink-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-[13px] font-semibold text-forest underline-offset-4 hover:underline">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[14px] text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-line bg-white", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("whitespace-nowrap border-b border-line px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-line px-4 py-3 align-middle text-ink", className)}>{children}</td>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line bg-white px-6 py-12 text-center text-[14px] text-ink-muted">{children}</div>;
}

export function Stat({ label, value, hint, href }: { label: string; value: ReactNode; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-[13px] text-ink-soft">{hint}</p>}
    </>
  );
  const cls = "block rounded-lg border border-line bg-white p-5";
  return href ? <Link href={href} className={cn(cls, "transition-colors hover:border-forest")}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function YesNo({ value }: { value: unknown }) {
  return value ? (
    <span className="inline-flex items-center rounded-sm bg-[#e6f0ea] px-2 py-0.5 text-[12px] font-semibold text-success">Ja</span>
  ) : (
    <span className="inline-flex items-center rounded-sm bg-ivory-200 px-2 py-0.5 text-[12px] font-semibold text-ink-muted">Nein</span>
  );
}
