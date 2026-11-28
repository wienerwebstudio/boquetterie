import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/format";

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>(function IconButton({ label, className, children, ...rest }, ref) {
  return (
    <button ref={ref} aria-label={label} title={label} className={cn("inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-ivory-200 hover:text-forest", className)} {...rest}>
      {children}
    </button>
  );
});
