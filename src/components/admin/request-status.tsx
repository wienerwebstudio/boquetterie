import type { CustomRequestStatus } from "@/types";
import { STATUS_LABELS, TOPIC_LABELS, type CustomRequestTopic } from "@/lib/custom-requests-core";
import { cn } from "@/lib/format";

/** Chip colours per request status (admin → Anfragen). */
export const REQUEST_STATUS_TONES: Record<CustomRequestStatus, string> = {
  new: "bg-[#fdf2db] text-[#8a5000] [--dot:#c27400]",
  answered: "bg-[#e4f1fd] text-[#175c9c] [--dot:#2f80d0]",
  offer: "bg-[#efe9fe] text-[#5b36c2] [--dot:#7c4ff0]",
  done: "bg-[#e2f6ec] text-[#0a6644] [--dot:#0f9466]",
};

export function RequestStatusBadge({ status }: { status: CustomRequestStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold", REQUEST_STATUS_TONES[status])}>
      <span className="size-1.5 shrink-0 rounded-full bg-(--dot)" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}

/** "Anfrage" (from /anfrage) or "Kontakt" (contact form). */
export function RequestTypeBadge({ type }: { type: "request" | "contact" }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-[0.06em]", type === "request" ? "bg-[#fbe4ec] text-[#a92a52]" : "bg-[#eef0f2] text-[#4a5160]")}>
      {type === "request" ? "Anfrage" : "Kontakt"}
    </span>
  );
}

/** Topics of a request ("Bestimmte Uhrzeit" …) – or the contact subject – as badges. */
export function TopicBadges({ tags, type, large }: { tags: string[]; type: "request" | "contact"; large?: boolean }) {
  if (!tags.length) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span key={t} className={cn("inline-flex rounded-full border border-[#e7d3b4] bg-[#fff8ec] font-semibold text-[#7a4a00]", large ? "px-3 py-1 text-[13.5px]" : "px-2 py-0.5 text-[12px]")}>
          {type === "request" ? TOPIC_LABELS[t as CustomRequestTopic] ?? t : t}
        </span>
      ))}
    </span>
  );
}
