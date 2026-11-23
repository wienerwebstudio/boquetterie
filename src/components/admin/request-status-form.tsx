"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CustomRequestStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Banner, Field, inputCls } from "@/components/admin/controls";
import { CUSTOM_REQUEST_STATUSES, STATUS_LABELS } from "@/lib/custom-requests-core";
import { saveRequestAction } from "@/app/admin/anfragen/actions";
import { cn } from "@/lib/format";

/** Status select + internal note of one inbox entry. */
export function RequestStatusForm({ id, status, note }: { id: string; status: CustomRequestStatus; note: string }) {
  const router = useRouter();
  const [s, setS] = useState(status);
  const [n, setN] = useState(note);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setBanner(null);
        start(async () => {
          const res = await saveRequestAction(id, { status: s, note: n });
          setBanner({ tone: res.ok ? "success" : "error", text: res.message });
          if (res.ok) router.refresh();
        });
      }}
      className="space-y-4"
    >
      {banner && <Banner tone={banner.tone}>{banner.text}</Banner>}
      <Field label="Status" htmlFor="req-status">
        <select id="req-status" className={cn(inputCls, "appearance-none")} value={s} onChange={(e) => setS(e.target.value as CustomRequestStatus)}>
          {CUSTOM_REQUEST_STATUSES.map((x) => <option key={x} value={x}>{STATUS_LABELS[x]}</option>)}
        </select>
      </Field>
      <Field label="Interne Notiz" htmlFor="req-note" hint="Nur für das Team.">
        <textarea id="req-note" rows={4} className={cn(inputCls, "h-auto min-h-[96px] py-2")} value={n} onChange={(e) => setN(e.target.value)} />
      </Field>
      <Button type="submit" size="sm" loading={pending}>Speichern</Button>
    </form>
  );
}
