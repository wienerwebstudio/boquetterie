import "server-only";
import { createDecipheriv } from "node:crypto";

/**
 * Starting values of the florist budgets ("Einkauf Dody (netto)" from the owners'
 * price calculation, Nov 2026), encrypted because this repository is public.
 * AES-256-GCM, `<iv>.<tag>.<ciphertext>` in base64; the key is the Netlify
 * secret FLORIST_BUDGET_KEY. Used until budgets are saved in the admin – then the
 * stored document wins. Without the key the shop simply has no default budgets.
 */
const ENCRYPTED_DEFAULT_BUDGETS =
  "e/uU+nYrjiZs/KTa.3jNwNHZ6GQn/UqmzMzhpBQ==.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";

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
