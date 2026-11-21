import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { AlertTriangle, ArrowLeft, ArrowUpRight, CheckCircle2, Info, Inbox, XCircle } from "lucide-react";
import { cn } from "@/lib/format";

/** Compact, utilitarian form controls for the admin (sans-serif, dense, colour-coded by accent). */

/** Accent hues of the admin palette (defined in src/app/admin/admin.css). */
export type Accent = "emerald" | "sky" | "violet" | "amber" | "coral" | "rose" | "teal";
/** Order in which section cards cycle through the accents. */
export const ACCENT_CYCLE: Accent[] = ["emerald", "sky", "violet", "amber", "rose", "teal", "coral"];

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export const inputCls =
  "bl-input w-full rounded-md border border-line-strong bg-white px-3 text-[14px] text-ink placeholder:text-ink-soft disabled:bg-ivory-100 disabled:text-ink-muted h-10";
/** Extra classes for read-only inputs (`read-only:` would also match <select>). */
export const readonlyCls = "bg-ivory-100 text-ink-muted";

export function Field({
  label, hint, error, required, children, className, htmlFor,
}: { label: ReactNode; hint?: string; error?: string; required?: boolean; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#4f4c47]">
        {label} {required && <span className="text-[#b42318]" aria-hidden>*</span>}
      </label>
      {children}
      {error ? <p className="text-[12px] font-medium text-[#b42318]">{error}</p> : hint ? <p className="text-[12px] text-ink-soft">{hint}</p> : null}
    </div>
  );
}

const BANNER_TONES = {
  info: { cls: "border-[#bcd8f5] bg-[#eef6fe] text-[#174f86]", bar: "bg-[#2f80d0]", icon: Info },
  success: { cls: "border-[#b7e4cc] bg-[#ecf9f2] text-[#0a5e3f]", bar: "bg-[#0f9466]", icon: CheckCircle2 },
  error: { cls: "border-[#f3c4bf] bg-[#fdf0ee] text-[#a3201a]", bar: "bg-[#c0392b]", icon: XCircle },
  warn: { cls: "border-[#f2d9a6] bg-[#fef6e4] text-[#7d4800]", bar: "bg-[#c27400]", icon: AlertTriangle },
} as const;

export function Banner({ tone = "info", children, className }: { tone?: "info" | "success" | "error" | "warn"; children: ReactNode; className?: string }) {
  const t = BANNER_TONES[tone];
  const Icon = t.icon;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("relative flex gap-3 overflow-hidden rounded-xl border py-3 pl-5 pr-4 text-[14px] leading-relaxed shadow-[0_1px_2px_rgba(0,0,0,0.03)]", t.cls, className)}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", t.bar)} aria-hidden />
      <Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Card({
  title, description, children, className, actions, accent, icon: Icon,
}: { title?: ReactNode; description?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode; accent?: Accent; icon?: IconType }) {
  return (
    <section className={cn("bl-card", className)} data-accent={accent}>
      {(title || actions) && (
        <header className="bl-card-head flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span className="bl-tile-solid flex size-8 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-4" aria-hidden />
              </span>
            ) : (
              <span className="bl-card-bar mt-0.5 h-5 w-1 shrink-0 rounded-full" aria-hidden />
            )}
            <div className={cn("min-w-0", Icon && "pt-1")}>
              {title && <h2 className="text-[15px] font-semibold text-ink">{title}</h2>}
              {description && <p className="mt-1 text-[13px] leading-relaxed text-[#5f5c56]">{description}</p>}
            </div>
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
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="group mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#e7e2d9] bg-white px-3 py-1 text-[12.5px] font-semibold text-[#0a6644] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-[#0f9466]"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden /> {back.label}
          </Link>
        )}
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-[#5f5c56]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("bl-table-wrap overflow-x-auto lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto", className)}>
      <table className="bl-table w-full min-w-[640px] border-separate border-spacing-0 text-left text-[14px]">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("whitespace-nowrap px-3 py-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#4f4c47]", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-[#efebe4] px-3 py-3.5 align-middle text-ink", className)}>{children}</td>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#cfc6b8] bg-[linear-gradient(180deg,#ffffff,#fbfaf7)] px-6 py-12 text-center text-[14px] text-[#5f5c56]">
      <span className="flex size-11 items-center justify-center rounded-xl bg-[#e4f1fd] text-[#175c9c]">
        <Inbox className="size-5" aria-hidden />
      </span>
      <div>{children}</div>
    </div>
  );
}

export function Stat({
  label, value, hint, href, icon: Icon, accent = "emerald", children,
}: { label: string; value: ReactNode; hint?: string; href?: string; icon?: IconType; accent?: Accent; children?: ReactNode }) {
  const body = (
    <>
      <span className="bl-acc-soft pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-70 blur-2xl" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#4f4c47]">{label}</p>
        {Icon && (
          <span className="bl-tile-solid flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Icon className="size-5" aria-hidden />
          </span>
        )}
      </div>
      <p className="relative -mt-1 text-[34px] font-bold leading-none tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="relative mt-2 text-[13px] text-[#5f5c56]">{hint}</p>}
      {children && <div className="relative mt-3">{children}</div>}
      {href && <ArrowUpRight className="bl-acc-text absolute bottom-4 right-4 size-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />}
    </>
  );
  const cls = "bl-card group relative block overflow-hidden p-5";
  return href ? (
    <Link href={href} className={cn(cls, "bl-lift")} data-accent={accent}>{body}</Link>
  ) : (
    <div className={cls} data-accent={accent}>{body}</div>
  );
}

export function YesNo({ value }: { value: unknown }) {
  return value ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e2f6ec] px-2.5 py-0.5 text-[12px] font-semibold text-[#0a6644]">
      <span className="size-1.5 rounded-full bg-[#0f9466]" aria-hidden />Ja
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef0f2] px-2.5 py-0.5 text-[12px] font-semibold text-[#4a5160]">
      <span className="size-1.5 rounded-full bg-[#9aa1ad]" aria-hidden />Nein
    </span>
  );
}
