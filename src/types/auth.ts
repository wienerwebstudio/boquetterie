/**
 * Runtime data types for the passwordless customer account.
 * Both documents live in `data/*.json` (git-ignored) and are accessed only via
 * `readData`/`writeData` from `src/lib/cms.ts`.
 */

/** One row in `data/customers.json`. Keyed by e-mail (lower-cased). */
export interface Customer {
  id: string; // "cus_" + 16 hex chars
  email: string; // lower-cased, trimmed
  createdAt: string; // ISO datetime
  lastLoginAt: string; // ISO datetime
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/** One row in `data/auth-tokens.json`. The raw token never touches the disk. */
export interface AuthTokenRecord {
  /** sha256(rawToken) as hex. */
  tokenHash: string;
  email: string;
  createdAt: string; // ISO datetime
  expiresAt: string; // ISO datetime
}

/** What is signed into the `bq_session` cookie – nothing sensitive, only a reference. */
export interface SessionPayload {
  customerId: string;
  /** Unix seconds. */
  exp: number;
}

/** Result of the profile Server Function on /konto. */
export interface ProfileActionState {
  ok: boolean;
  message?: string;
  errors?: Partial<Record<"firstName" | "lastName" | "phone", string>>;
}
