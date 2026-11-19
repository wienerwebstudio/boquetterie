import type { OrderStatus } from "@/types";
import { cn } from "@/lib/format";
import { STATUS_TONES } from "./order-utils";

export function StatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold", STATUS_TONES[status] ?? "bg-[#eef0f2] text-[#4a5160] [--dot:#9aa1ad]")}>
      <span className="size-1.5 shrink-0 rounded-full bg-(--dot)" aria-hidden />
      {label}
    </span>
  );
}
