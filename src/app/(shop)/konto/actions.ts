"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCustomer } from "@/lib/auth";
import { updateCustomerProfile } from "@/lib/auth/customers";
import { cleanString, isPhone, LIMITS } from "@/lib/order-payload";
import { routes } from "@/lib/urls";
import type { ProfileActionState } from "@/types/auth";

/** Updates first name, last name and phone of the signed-in customer. */
export async function updateProfileAction(_prev: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, message: "Deine Sitzung ist abgelaufen. Bitte melde dich neu an." };

  const firstName = cleanString(formData.get("firstName"), LIMITS.name + 1);
  const lastName = cleanString(formData.get("lastName"), LIMITS.name + 1);
  const phone = cleanString(formData.get("phone"), LIMITS.phone + 1);

  const errors: NonNullable<ProfileActionState["errors"]> = {};
  if (firstName && firstName.length > LIMITS.name) errors.firstName = `Höchstens ${LIMITS.name} Zeichen.`;
  if (lastName && lastName.length > LIMITS.name) errors.lastName = `Höchstens ${LIMITS.name} Zeichen.`;
  if (phone && (phone.length > LIMITS.phone || !isPhone(phone))) errors.phone = "Bitte gib eine gültige Telefonnummer ein.";
  if (Object.keys(errors).length) return { ok: false, message: "Bitte prüfe deine Angaben.", errors };

  const updated = await updateCustomerProfile(customer.id, { firstName, lastName, phone });
  if (!updated) return { ok: false, message: "Dein Konto wurde nicht gefunden. Bitte melde dich neu an." };
  revalidatePath(routes.account);
  return { ok: true, message: "Gespeichert." };
}
