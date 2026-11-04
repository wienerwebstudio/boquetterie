import type { OrderStatus } from "@/types";
import { cn } from "@/lib/format";
import { STATUS_TONES } from "./order-utils";

export function StatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-sm px-2 py-0.5 text-[12px] font-semibold", STATUS_TONES[status] ?? "bg-ivory-200 text-ink")}>
      {label}
    </span>
  );
}
