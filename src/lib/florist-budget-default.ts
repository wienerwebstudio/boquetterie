import "server-only";
import { createDecipheriv } from "node:crypto";

/**
 * Starting values of the florist budgets ("Einkauf Dody (Liste)" from the owners'
 * price calculation, Nov 2026 – the price the florist binds for; their discount is settled separately), encrypted because this repository is public.
 * AES-256-GCM, `<iv>.<tag>.<ciphertext>` in base64; the key is the Netlify
 * secret FLORIST_BUDGET_KEY. Used until budgets are saved in the admin – then the
 * stored document wins. Without the key the shop simply has no default budgets.
 */
const ENCRYPTED_DEFAULT_BUDGETS =
  "4rjy8ZZFXCNGOgng.6kFIDsdDxVj4dMrAHvf/mw==.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";

export function decryptBudgetBlob(blob: string, keyBase64: string | undefined): unknown | null {
  if (!keyBase64) return null;
  try {
    const key = Buffer.from(keyBase64, "base64");
    const [iv, tag, data] = blob.split(".").map((p) => Buffer.from(p, "base64"));
    if (key.length !== 32 || !iv || !tag || !data) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8"));
  } catch {
    return null;
  }
}

export function defaultFloristBudgets(): unknown | null {
  return decryptBudgetBlob(ENCRYPTED_DEFAULT_BUDGETS, process.env.FLORIST_BUDGET_KEY);
}
