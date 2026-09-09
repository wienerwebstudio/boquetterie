"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readCollection, writeCollection } from "@/lib/cms";
import { requireAdmin } from "@/lib/admin-session";
import { slugify } from "@/lib/format";
import { cleanEmpty, getPath, isPlainObject, setPath, type Json } from "@/components/admin/paths";
import {
  schemaByCollection, singletonByCollection,
  type EntitySchema, type FieldDef, type FieldSection, type SingletonSchema,
} from "@/components/admin/schemas";

export type ActionResult = { ok: true; id?: string; data?: Json } | { ok: false; error: string };

/* ---------------- coercion & validation (schema driven) ---------------- */

function coerceValue(field: FieldDef, raw: unknown, errors: string[], label: string): unknown {
  const empty = raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "");
  switch (field.type) {
    case "number": {
      if (empty) {
        if (field.nullable) return null;
        if (field.required) errors.push(`${label}: Pflichtfeld.`);
        return undefined;
      }
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
      if (!Number.isFinite(n)) { errors.push(`${label}: Keine gültige Zahl.`); return undefined; }
      if (field.min !== undefined && n < field.min) errors.push(`${label}: Mindestens ${field.min}.`);
      if (field.max !== undefined && n > field.max) errors.push(`${label}: Höchstens ${field.max}.`);
      return n;
    }
    case "boolean":
      return raw === true || raw === "true" || raw === "on" || raw === 1;
    case "tags": {
      const arr = Array.isArray(raw) ? raw : String(raw ?? "").split(",");
      const out = arr.map((s) => String(s).trim()).filter(Boolean);
      if (field.required && !out.length) errors.push(`${label}: Pflichtfeld.`);
      return out;
    }
    case "lines": {
      const arr = Array.isArray(raw) ? raw : String(raw ?? "").split("\n");
      return arr.map((s) => String(s).trim()).filter(Boolean);
    }
    case "stringlist": {
      const arr = Array.isArray(raw) ? raw : [];
      const out = arr.map((s) => String(s).trim()).filter(Boolean);
      if (field.itemType === "date") out.forEach((d) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) errors.push(`${label}: „${d}“ ist kein Datum (JJJJ-MM-TT).`); });
      return out;
    }
    case "multiselect": {
      const arr = Array.isArray(raw) ? raw : [];
      const out = field.valueType === "number" ? arr.map(Number).filter((n) => Number.isFinite(n)) : arr.map(String).filter(Boolean);
      if (field.required && !out.length) errors.push(`${label}: Bitte mindestens einen Eintrag wählen.`);
      return out;
    }
    case "select": {
      if (empty) { if (field.required) errors.push(`${label}: Pflichtfeld.`); return undefined; }
      return field.valueType === "number" ? Number(raw) : String(raw);
    }
    case "list": {
      const rows = Array.isArray(raw) ? raw : [];
      const coerced = rows.map((row, i) => {
        if (!isPlainObject(row)) return {};
        return coerceObject(field.fields ?? [], row, errors, `${field.itemLabel ?? field.label} ${i + 1}`);
      });
      if (field.required && !coerced.length) errors.push(`${label}: Mindestens ein Eintrag.`);
      return coerced;
    }
    case "date": {
      if (empty) { if (field.required) errors.push(`${label}: Pflichtfeld.`); return undefined; }
      const s = String(raw).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) errors.push(`${label}: Datum im Format JJJJ-MM-TT.`);
      return s;
    }
    case "time": {
      if (empty) { if (field.required) errors.push(`${label}: Pflichtfeld.`); return undefined; }
      const s = String(raw).trim();
      if (!/^\d{2}:\d{2}$/.test(s)) errors.push(`${label}: Uhrzeit im Format HH:MM.`);
      return s;
    }
    default: {
      // text, textarea, image
      if (empty) { if (field.required) errors.push(`${label}: Pflichtfeld.`); return undefined; }
      return String(raw).trim();
    }
  }
}

function coerceObject(fields: FieldDef[], input: Json, errors: string[], prefix = ""): Json {
  let out: Json = { ...input };
  for (const f of fields) {
    const label = prefix ? `${prefix} – ${f.label}` : f.label;
    const value = coerceValue(f, getPath(input, f.key), errors, label);
    out = setPath(out, f.key, value);
  }
  return out;
}

function coerceBySchema(sections: FieldSection[], input: Json) {
  const errors: string[] = [];
  const fields = sections.flatMap((s) => s.fields);
  const data = coerceObject(fields, input, errors);
  return { data, errors };
}

/* ---------------- collection specific preparation ---------------- */

function uniqueId(base: string, taken: Set<string>) {
  let id = base;
  let i = 2;
  while (taken.has(id)) id = `${base}-${i++}`;
  return id;
}

function prepareEntity(schema: EntitySchema, data: Json, isNew: boolean, others: Json[]): Json {
  const d: Json = { ...data };
  const taken = new Set(others.map((o) => String(o[schema.idKey] ?? "")));
  const str = (k: string) => (typeof d[k] === "string" ? (d[k] as string).trim() : "");

  switch (schema.collection) {
    case "products": {
      if (!str("slug")) d.slug = slugify(str("name"));
      if (!str("id")) d.id = isNew ? uniqueId(`p-${d.slug}`, taken) : `p-${d.slug}`;
      const sizes = Array.isArray(d.sizes) ? (d.sizes as Json[]) : [];
      const prices = sizes.map((s) => Number(s.price)).filter((n) => Number.isFinite(n));
      d.basePrice = prices.length ? Math.min(...prices) : 0;
      if (d.stock === undefined) d.stock = null;
      for (const k of ["flowers", "care", "images", "occasions", "colors", "styles", "seasons", "tags", "sizes"]) {
        if (!Array.isArray(d[k])) d[k] = [];
      }
      break;
    }
    case "categories":
    case "occasions": {
      if (!str("slug")) d.slug = slugify(str("name"));
      break;
    }
    case "extras": {
      if (!str("slug")) d.slug = slugify(str("name"));
      if (!str("id")) d.id = isNew ? uniqueId(`x-${d.slug}`, taken) : `x-${d.slug}`;
      break;
    }
    case "delivery-zones": {
      if (!str("id")) d.id = isNew ? uniqueId(slugify(str("name")), taken) : slugify(str("name"));
      if (d.freeFrom === undefined) d.freeFrom = null;
      if (!Array.isArray(d.windows)) d.windows = [];
      if (!Array.isArray(d.deliveryDays)) d.deliveryDays = [];
      break;
    }
    case "coupons": {
      d.code = str("code").toUpperCase().replace(/\s+/g, "");
      break;
    }
    case "faqs": {
      if (!str("id")) d.id = uniqueId(`f-${slugify(str("question")).split("-").slice(0, 3).join("-") || "frage"}`, taken);
      break;
    }
    case "reviews": {
      if (!str("id")) d.id = uniqueId(`r-${Date.now().toString(36)}`, taken);
      break;
    }
    case "landing-pages": {
      if (!str("slug")) d.slug = slugify(str("title"));
      if (!Array.isArray(d.sections)) d.sections = [];
      if (!Array.isArray(d.faqIds)) d.faqIds = [];
      if (!isPlainObject(d.productFilter)) d.productFilter = {};
      break;
    }
    case "pages": {
      if (!str("slug")) d.slug = slugify(str("title"));
      if (!Array.isArray(d.sections)) d.sections = [];
      break;
    }
  }
  return d;
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

/* ---------------- public actions ---------------- */

/**
 * Create or update one entity. `originalId` is the id/slug/code the entity had when
 * the form was opened (null when creating) so renaming ids keeps working. When the id
 * changes (create/rename) and `redirectBase` is given, the action redirects to the new
 * edit URL – a client-side navigation would be cancelled by the re-render of the old URL.
 */
export async function saveEntity(collection: string, originalId: string | null, input: unknown, redirectBase?: string): Promise<ActionResult> {
  let result: ActionResult;
  try {
    await requireAdmin();
    const schema = schemaByCollection(collection);
    if (!schema) return { ok: false, error: "Unbekannte Sammlung." };
    if (!isPlainObject(input)) return { ok: false, error: "Ungültige Daten." };

    const { data, errors } = coerceBySchema(schema.sections, input);
    if (errors.length) return { ok: false, error: errors.join(" ") };

    const list = await readCollection<Json[]>(schema.collection);
    const isNew = originalId === null;
    const idx = isNew ? -1 : list.findIndex((item) => String(item[schema.idKey]) === originalId);
    if (!isNew && idx === -1) return { ok: false, error: "Eintrag nicht gefunden – vielleicht wurde er inzwischen gelöscht." };

    const others = list.filter((_, i) => i !== idx);
    const prepared = cleanEmpty(prepareEntity(schema, data, isNew, others), schema.removeEmptyObjectsAt);
    const id = String(prepared[schema.idKey] ?? "").trim();
    if (!id) return { ok: false, error: `${schema.singular}: ID/Slug fehlt.` };
    if (others.some((o) => String(o[schema.idKey]) === id)) return { ok: false, error: `Es gibt bereits einen Eintrag (${schema.singular}) mit „${id}“.` };

    if (isNew) list.push(prepared);
    else list[idx] = prepared;
    await writeCollection(schema.collection, list);
    revalidateAll();
    result = { ok: true, id, data: prepared };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
  if (result.ok && result.id && result.id !== originalId && redirectBase && redirectBase.startsWith("/admin")) {
    redirect(`${redirectBase}/${encodeURIComponent(result.id)}?saved=1`);
  }
  return result;
}

/**
 * Delete one entity. When `redirectTo` is given the action redirects after the
 * write (a client-side push would be cancelled by the re-render of the deleted page).
 */
export async function deleteEntity(collection: string, id: string, redirectTo?: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const schema = schemaByCollection(collection);
    if (!schema) return { ok: false, error: "Unbekannte Sammlung." };
    const list = await readCollection<Json[]>(schema.collection);
    const next = list.filter((item) => String(item[schema.idKey]) !== id);
    if (next.length === list.length) return { ok: false, error: "Eintrag nicht gefunden." };
    await writeCollection(schema.collection, next);
    revalidateAll();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Löschen fehlgeschlagen." };
  }
  if (redirectTo && redirectTo.startsWith("/admin")) redirect(redirectTo);
  return { ok: true };
}

/** Save a whole singleton document (settings, homepage, subscription). */
export async function saveSingleton(collection: string, input: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
    const schema: SingletonSchema | null = singletonByCollection(collection);
    if (!schema) return { ok: false, error: "Unbekannter Bereich." };
    if (!isPlainObject(input)) return { ok: false, error: "Ungültige Daten." };
    const { data, errors } = coerceBySchema(schema.sections, input);
    if (errors.length) return { ok: false, error: errors.join(" ") };
    const current = await readCollection<Json>(schema.collection);
    // Keep keys the form does not know about (e.g. `currency`).
    const merged = cleanEmpty({ ...current, ...data }, schema.removeEmptyObjectsAt);
    await writeCollection(schema.collection, merged);
    revalidateAll();
    return { ok: true, data: merged };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." };
  }
}
