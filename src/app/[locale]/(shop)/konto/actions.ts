"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCustomer } from "@/lib/auth";
import { updateCustomerProfile } from "@/lib/auth/customers";
import { cleanString, isPhone, LIMITS } from "@/lib/order-payload";
import { routes } from "@/lib/urls";
import type { ProfileActionState } from "@/types/auth";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";
import { fmt } from "@/i18n/format";

/** Updates first name, last name and phone of the signed-in customer. */
export async function updateProfileAction(_prev: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  // The form sends its language; messages fall back to German.
  const requested = formData.get("locale");
  const t = (await loadMessages(isLocale(requested) ? requested : DEFAULT_LOCALE)).account.profile;
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, message: t.sessionExpired };

  const firstName = cleanString(formData.get("firstName"), LIMITS.name + 1);
  const lastName = cleanString(formData.get("lastName"), LIMITS.name + 1);
  const phone = cleanString(formData.get("phone"), LIMITS.phone + 1);

  const errors: NonNullable<ProfileActionState["errors"]> = {};
  if (firstName && firstName.length > LIMITS.name) errors.firstName = fmt(t.tooLong, { max: LIMITS.name });
  if (lastName && lastName.length > LIMITS.name) errors.lastName = fmt(t.tooLong, { max: LIMITS.name });
  if (phone && (phone.length > LIMITS.phone || !isPhone(phone))) errors.phone = t.phoneInvalid;
  if (Object.keys(errors).length) return { ok: false, message: t.checkFields, errors };

  const updated = await updateCustomerProfile(customer.id, { firstName, lastName, phone });
  if (!updated) return { ok: false, message: t.notFound };
  revalidatePath(routes.account);
  return { ok: true, message: t.saved };
}
