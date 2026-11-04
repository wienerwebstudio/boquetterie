import Image from "next/image";
import { cn } from "@/lib/format";

/**
 * Blumora-Schriftzug (das „o“ ist eine Rose) als Bilddatei unter `public/images/brand/`.
 * `horizontal` – Kopfzeile und Menü. `stacked` – größer, für die Fußzeile.
 * Das Rosenzeichen allein liegt als `logo-mark.png` daneben (Icons, Social Media).
 */
export function Logo({
  className,
  variant = "horizontal",
  priority = false,
}: {
  className?: string;
  variant?: "horizontal" | "stacked";
  priority?: boolean;
}) {
  const stacked = variant === "stacked";
  return (
    <Image
      src="/images/brand/logo-horizontal.png"
      alt="Blumora"
      width={1200}
      height={247}
      priority={priority}
      sizes={stacked ? "200px" : "180px"}
      className={cn("w-auto", stacked ? "h-10" : "h-7 lg:h-8", className)}
    />
  );
}
