import Image from "next/image";
import { cn } from "@/lib/format";

/**
 * Bloomery-Logo als Bilddatei unter `public/images/brand/`.
 * `horizontal` – Zeichen und Schriftzug nebeneinander, für Kopf- und Fußzeile.
 * `stacked` – die vollständige Marke wie geliefert, für Flächen mit Höhe.
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
      src={stacked ? "/images/brand/logo.png" : "/images/brand/logo-horizontal.png"}
      alt="Bloomery"
      width={stacked ? 600 : 719}
      height={stacked ? 601 : 254}
      priority={priority}
      sizes={stacked ? "120px" : "180px"}
      className={cn("w-auto", stacked ? "h-[72px]" : "h-8 lg:h-9", className)}
    />
  );
}
