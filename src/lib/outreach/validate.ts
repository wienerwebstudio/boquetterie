import {
  OUTREACH_CATEGORIES, OUTREACH_STATUSES,
  type OutreachCategory, type OutreachContact, type OutreachFile, type OutreachSalutation, type OutreachStatus,
  type OutreachTemplate, type OutreachTemplateCategory, type OutreachVideo,
} from "@/types/outreach";
import { isValidEmail, normalizeEmail } from "./format";

/**
 * Validation of admin input for outreach (pure). File references are only accepted
 * by their storage key; the URL is recomputed with `urlOf` (never taken from the client).
 */

const OUTREACH_KEY_RE = /^outreach\/\d{4}\/\d{2}\/[a-z0-9-]{1,80}-[a-f0-9]{8}\.(jpg|png|pdf|mp4|webm|mov)$/;
export const MAX_ATTACHMENTS_TOTAL = 20 * 1024 * 1024;
export const MAX_ATTACHMENTS = 8;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function file(raw: unknown, urlOf: (key: string) => string, kinds: RegExp): OutreachFile | null {
  const f = obj(raw);
  const key = str(f.key, 200);
  if (!OUTREACH_KEY_RE.test(key) || !kinds.test(key)) return null;
  const ext = key.slice(key.lastIndexOf(".") + 1);
  const contentType = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" }[ext] ?? "application/octet-stream";
  const bytes = Number(f.bytes);
  return {
    key,
    url: urlOf(key),
    name: str(f.name, 120).replace(/[\r\n"\\/]/g, "") || key.slice(key.lastIndexOf("/") + 1),
    bytes: Number.isFinite(bytes) && bytes > 0 ? Math.round(bytes) : 0,
    contentType,
  };
}

const httpUrl = (v: string) => /^https?:\/\/[^\s<>"']+$/i.test(v);

export function parseTemplateInput(input: unknown, urlOf: (key: string) => string): Result<Omit<OutreachTemplate, "id" | "createdAt" | "updatedAt">> {
  const t = obj(input);
  const name = str(t.name, 120);
  const subject = str(t.subject, 200).replace(/[\r\n]+/g, " ");
  const body = typeof t.body === "string" ? t.body.replace(/\r\n?/g, "\n").slice(0, 20_000).trim() : "";
  if (!name) return { ok: false, error: "Bitte einen Namen für die Vorlage angeben." };
  if (!subject) return { ok: false, error: "Bitte einen Betreff angeben." };
  if (!body) return { ok: false, error: "Bitte einen Text schreiben." };
  const categories: OutreachTemplateCategory[] = [...OUTREACH_CATEGORIES, "allgemein", "nachfassen"];
  const category = categories.find((c) => c === t.category) ?? "allgemein";
  const language = t.language === "en" ? "en" : "de";

  const attachments = (Array.isArray(t.attachments) ? t.attachments : [])
    .map((a) => file(a, urlOf, /\.(pdf|jpg|png)$/))
    .filter((a): a is OutreachFile => a !== null);
  if (attachments.length > MAX_ATTACHMENTS) return { ok: false, error: `Höchstens ${MAX_ATTACHMENTS} Anhänge pro Vorlage.` };
  const total = attachments.reduce((n, a) => n + a.bytes, 0);
  if (total > MAX_ATTACHMENTS_TOTAL) return { ok: false, error: "Die Anhänge sind zusammen größer als 20 MB – bitte einen Anhang entfernen (oder als Link einfügen)." };

  const headerImage = t.headerImage ? file(t.headerImage, urlOf, /\.(jpg|png)$/) ?? undefined : undefined;

  let video: OutreachVideo | undefined;
  const v = obj(t.video);
  const videoFile = v.file ? file(v.file, urlOf, /\.(mp4|webm|mov)$/) : null;
  const pastedUrl = str(v.url, 500);
  if (videoFile || pastedUrl) {
    if (!videoFile && !httpUrl(pastedUrl)) return { ok: false, error: "Der Video-Link muss mit https:// beginnen." };
    const posterKey = str(v.posterKey, 200) || keyOfUrl(str(v.posterUrl, 500));
    const posterPlayKey = str(v.posterPlayKey, 200) || keyOfUrl(str(v.posterPlayUrl, 500));
    video = {
      url: videoFile ? videoFile.url : pastedUrl,
      ...(videoFile ? { file: videoFile } : {}),
      ...(OUTREACH_KEY_RE.test(posterKey) ? { posterUrl: urlOf(posterKey) } : {}),
      ...(OUTREACH_KEY_RE.test(posterPlayKey) ? { posterPlayUrl: urlOf(posterPlayKey) } : {}),
      label: str(v.label, 80) || undefined,
    };
  }

  return {
    ok: true,
    value: {
      name, category, language, subject,
      headline: str(t.headline, 160) || undefined,
      body,
      attachments,
      ...(headerImage ? { headerImage } : {}),
      ...(video ? { video } : {}),
    },
  };
}

/** Storage key of a stored URL (`…/outreach/2026/11/x-1234abcd.jpg`) – lets the editor send keys back. */
export function keyOfUrl(url: string | undefined): string {
  if (!url) return "";
  const m = /(outreach\/\d{4}\/\d{2}\/[a-z0-9-]{1,80}-[a-f0-9]{8}\.(?:jpg|png|pdf|mp4|webm|mov))$/.exec(url);
  return m ? m[1] : "";
}

export type ContactInput = Pick<OutreachContact, "company" | "salutation" | "firstName" | "lastName" | "email" | "phone" | "district" | "category" | "website" | "notes" | "status" | "tags" | "language">;

export function parseContactInput(input: unknown): Result<ContactInput> {
  const c = obj(input);
  const email = normalizeEmail(str(c.email, 200));
  if (!email) return { ok: false, error: "Bitte eine E-Mail-Adresse angeben." };
  if (!isValidEmail(email)) return { ok: false, error: "Die E-Mail-Adresse ist ungültig." };
  const company = str(c.company, 200);
  const firstName = str(c.firstName, 100);
  const lastName = str(c.lastName, 100);
  const salutation: OutreachSalutation = c.salutation === "frau" || c.salutation === "herr" ? c.salutation : "";
  const category: OutreachCategory = OUTREACH_CATEGORIES.find((x) => x === c.category) ?? "sonstiges";
  const status: OutreachStatus = OUTREACH_STATUSES.find((x) => x === c.status) ?? "neu";
  let website = str(c.website, 300);
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  if (website && !httpUrl(website)) return { ok: false, error: "Die Website-Adresse ist ungültig." };
  const tags = (Array.isArray(c.tags) ? c.tags : String(c.tags ?? "").split(","))
    .map((s) => String(s).trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 20);
  return {
    ok: true,
    value: {
      company, salutation, firstName, lastName, email,
      phone: str(c.phone, 60),
      district: str(c.district, 80),
      category,
      website,
      notes: typeof c.notes === "string" ? c.notes.trim().slice(0, 4000) : "",
      status,
      tags: [...new Set(tags)],
      language: c.language === "en" ? "en" : "de",
    },
  };
}
