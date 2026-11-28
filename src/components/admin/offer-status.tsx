import type { OfferStatus } from "@/types";
import { OFFER_STATUS_LABELS } from "@/lib/offers-core";
import { cn } from "@/lib/format";

/** Chip colours per offer status (same scheme as the order status chips). */
export const OFFER_STATUS_TONES: Record<OfferStatus, string> = {
  draft: "bg-[#eef0f2] text-[#4a5160] [--dot:#9aa1ad]",
  sent: "bg-[#e4f1fd] text-[#175c9c] [--dot:#2f80d0]",
  viewed: "bg-[#efe9fe] text-[#5b36c2] [--dot:#7c4ff0]",
  paid: "bg-[#e2f6ec] text-[#0a6644] [--dot:#0f9466]",
  expired: "bg-[#fdf2db] text-[#8a5000] [--dot:#c27400]",
  cancelled: "bg-[#fdecea] text-[#b42318] [--dot:#c0392b]",
};

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold", OFFER_STATUS_TONES[status])}>
      <span className="size-1.5 shrink-0 rounded-full bg-(--dot)" aria-hidden />
      {OFFER_STATUS_LABELS[status]}
    </span>
  );
}
