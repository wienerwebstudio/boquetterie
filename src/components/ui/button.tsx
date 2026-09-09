import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/format";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "light" | "link";
type Size = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
  loading?: boolean;
  full?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-semibold tracking-wide transition-all duration-300 ease-[var(--ease-soft)] select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.985]";

const variants: Record<Variant, string> = {
  primary: "bg-forest text-ivory hover:bg-forest-700 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset]",
  secondary: "bg-ink text-ivory hover:bg-black",
  outline: "border border-forest text-forest hover:bg-forest hover:text-ivory",
  ghost: "text-forest hover:bg-ivory-200",
  light: "bg-ivory text-forest hover:bg-white",
  link: "text-forest underline-offset-4 hover:underline px-0 h-auto",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px] rounded-md",
  md: "h-11 px-6 text-sm rounded-md",
  lg: "h-13 px-7 text-[15px] rounded-md",
  xl: "h-14 px-8 text-base rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", href, loading, full, icon, iconRight, className, children, ...rest },
  ref,
) {
  const cls = cn(base, variants[variant], variant !== "link" && sizes[size], full && "w-full", className);
  const content = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {iconRight}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls} aria-disabled={rest.disabled}>
        {content}
      </Link>
    );
  }
  return (
    <button ref={ref} className={cls} disabled={loading || rest.disabled} {...rest}>
      {content}
    </button>
  );
});
