"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { getReminders, saveReminders } from "@/lib/mail/reminders";

/** Deletes a reminder (form action with hidden `id`). */
export async function deleteReminder(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const list = await getReminders();
  if (!list.some((r) => r.id === id)) return;
  await saveReminders(list.filter((r) => r.id !== id));
  revalidatePath("/admin/erinnerungen");
}
