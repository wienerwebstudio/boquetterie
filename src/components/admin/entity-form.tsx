"use client";

import Link from "next/link";
import { useCallback, useId, useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Braces, ExternalLink, Plus, Save, Trash, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUi } from "@/store/ui";
import { cn } from "@/lib/format";
import { deleteEntity, saveEntity, saveSingleton, type ActionResult } from "@/app/admin/actions";
import { getPath, setPath, type Json } from "./paths";
import type { FieldDef, FieldOption, FieldSection } from "./schemas";
import type { OptionMap } from "./options";
import { Banner, Card, Field, inputCls, readonlyCls } from "./controls";
import { ImageField } from "./image-field";

export interface EntityFormProps {
  title: string;
  sections: FieldSection[];
  initial: Json;
  options: OptionMap;
  collection: string;
  kind: "entity" | "singleton";
  /** entity: id/slug/code when the form was opened, null when creating. */
  originalId?: string | null;
  /** entity: back link and target after delete. */
  listHref?: string;
  /** entity: base for the edit URL after create/rename, e.g. /admin/produkte. */
  editHrefBase?: string;
  /** Optional storefront preview link. */
  storefrontHref?: string | null;
  singular?: string;
  /** Message shown on mount (e.g. after a redirect following create/rename). */
  initialMessage?: string | null;
}

const spanCls = { third: "md:col-span-2", half: "md:col-span-3", full: "md:col-span-6" } as const;

export function EntityForm(props: EntityFormProps) {
  const { title, sections, initial, options, collection, kind, originalId = null, listHref, editHrefBase, storefrontHref, singular, initialMessage } = props;
  const { toast } = useUi();
  const [data, setData] = useState<Json>(initial);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(
    initialMessage ? { tone: "success", text: initialMessage } : null,
  );
  const [pending, startTransition] = useTransition();
  const isNew = kind === "entity" && originalId === null;

  const update = useCallback((path: string, value: unknown) => {
    setData((d) => setPath(d, path, value));
  }, []);

  const toggleJson = () => {
    if (!jsonMode) {
      setJsonText(JSON.stringify(data, null, 2));
      setJsonError(null);
      setJsonMode(true);
    } else {
      // leaving JSON mode: try to take the edited JSON over
      const parsed = parseJson();
      if (parsed === null) return;
      setData(parsed);
      setJsonMode(false);
    }
  };

  const parseJson = (): Json | null => {
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Es wird ein JSON-Objekt erwartet ({ … }).");
      setJsonError(null);
      return parsed as Json;
    } catch (e) {
      setJsonError(e instanceof Error ? `Ungültiges JSON: ${e.message}` : "Ungültiges JSON.");
      return null;
    }
  };

  const submit = () => {
    const payload = jsonMode ? parseJson() : data;
    if (!payload) return;
    setMessage(null);
    startTransition(async () => {
      // For create/rename the action redirects to the new edit URL itself.
      const res: ActionResult = kind === "entity" ? await saveEntity(collection, originalId, payload, editHrefBase) : await saveSingleton(collection, payload);
      if (!res.ok) {
        setMessage({ tone: "error", text: res.error });
        return;
      }
      if (res.data) {
        setData(res.data);
        if (jsonMode) setJsonText(JSON.stringify(res.data, null, 2));
      }
      setMessage({ tone: "success", text: "Gespeichert. Der Shop zeigt die Änderung sofort." });
      toast({ title: "Gespeichert", description: title });
      // No router.refresh() needed: revalidatePath() inside the action already
      // returns the re-rendered tree with this response.
    });
  };

  const remove = () => {
    if (!originalId || !listHref) return;
    if (!window.confirm(`${singular ?? "Eintrag"} „${originalId}“ wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) return;
    startTransition(async () => {
      // On success the action redirects to the list itself.
      const res = await deleteEntity(collection, originalId, listHref);
      if (!res.ok) setMessage({ tone: "error", text: res.error });
    });
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {listHref && (
            <Link href={listHref} className="text-[13px] font-semibold text-forest underline-offset-4 hover:underline">← Zur Liste</Link>
          )}
          {storefrontHref && !isNew && (
            <a href={storefrontHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-forest underline-offset-4 hover:underline">
              Im Shop ansehen <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={toggleJson}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold transition-colors",
            jsonMode ? "border-forest bg-forest text-ivory" : "border-line bg-white text-ink hover:border-forest",
          )}
          aria-pressed={jsonMode}
        >
          <Braces className="size-4" aria-hidden /> JSON-Modus
        </button>
      </div>

      {message && <Banner tone={message.tone}>{message.text}</Banner>}

      {jsonMode ? (
        <Card title="JSON" description="Für Power-User: Rohdaten direkt bearbeiten. Beim Speichern wird geprüft, ob das JSON gültig ist.">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
            className={cn(inputCls, "h-auto min-h-[480px] resize-y py-3 font-mono text-[13px] leading-relaxed")}
            aria-label="JSON"
          />
          {jsonError && <p className="mt-2 text-[13px] text-danger">{jsonError}</p>}
        </Card>
      ) : (
        sections.map((section) => (
          <Card key={section.title} title={section.title} description={section.description}>
            <div className="grid gap-4 md:grid-cols-6">
              {section.fields.map((field) => (
                <FieldRenderer
                  key={field.key}
                  field={field}
                  value={getPath(data, field.key)}
                  onChange={(v) => update(field.key, v)}
                  options={options}
                />
              ))}
            </div>
          </Card>
        ))
      )}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white/95 px-4 py-3 shadow-soft backdrop-blur">
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" loading={pending} icon={<Save className="size-4" aria-hidden />}>
            {isNew ? "Anlegen" : "Speichern"}
          </Button>
          {listHref && (
            <Button type="button" variant="ghost" size="sm" href={listHref}>Abbrechen</Button>
          )}
        </div>
        {kind === "entity" && !isNew && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-[13px] font-semibold text-danger transition-colors hover:bg-[#f8ecec] disabled:opacity-50"
          >
            <Trash className="size-4" aria-hidden /> Löschen
          </button>
        )}
      </div>
    </form>
  );
}

/* ---------------- field renderers ---------------- */

interface RendererProps {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  options: OptionMap;
  compact?: boolean;
}

function resolveOptions(field: FieldDef, options: OptionMap): FieldOption[] {
  return field.options ?? (field.optionsFrom ? options[field.optionsFrom] ?? [] : []);
}

function FieldRenderer({ field, value, onChange, options, compact }: RendererProps) {
  const id = useId();
  const span = spanCls[field.span ?? "half"];
  const wrap = (children: React.ReactNode, extra?: { noLabel?: boolean }) =>
    extra?.noLabel ? (
      <div className={span}>{children}</div>
    ) : (
      <Field label={field.label} hint={field.hint} required={field.required} htmlFor={id} className={span}>{children}</Field>
    );

  switch (field.type) {
    case "text":
    case "date":
    case "time":
      return wrap(
        <input
          id={id}
          type={field.type === "text" ? "text" : field.type}
          value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          readOnly={field.readonly}
          className={cn(inputCls, field.readonly && readonlyCls)}
        />,
      );
    case "textarea":
      return wrap(
        <textarea
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          readOnly={field.readonly}
          rows={field.rows ?? 4}
          className={cn(inputCls, "h-auto resize-y py-2 leading-relaxed", field.readonly && readonlyCls)}
        />,
      );
    case "lines":
      return wrap(
        <textarea
          id={id}
          value={Array.isArray(value) ? value.join("\n") : typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value.split("\n"))}
          placeholder={field.placeholder}
          rows={field.rows ?? 4}
          className={cn(inputCls, "h-auto resize-y py-2 leading-relaxed")}
        />,
      );
    case "number":
      return wrap(
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return onChange(undefined);
            const n = Number(raw);
            onChange(Number.isFinite(n) ? n : raw);
          }}
          placeholder={field.placeholder}
          readOnly={field.readonly}
          min={field.min}
          max={field.max}
          step={field.step ?? "any"}
          className={cn(inputCls, field.readonly && readonlyCls)}
        />,
      );
    case "boolean":
      return wrap(
        <label className={cn("flex cursor-pointer items-center gap-3 rounded-md border border-line bg-white px-3 text-[14px] text-ink", compact ? "h-10" : "h-10")}>
          <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-forest" disabled={field.readonly} />
          <span>{field.label}</span>
        </label>,
        { noLabel: true },
      );
    case "select": {
      const opts = resolveOptions(field, options);
      return wrap(
        <select
          id={id}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? undefined : field.valueType === "number" ? Number(e.target.value) : e.target.value)}
          disabled={field.readonly}
          className={cn(inputCls, "appearance-none pr-8")}
        >
          <option value="">{field.required ? "Bitte wählen …" : "– keine –"}</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>,
      );
    }
    case "multiselect":
      return wrap(<MultiSelect field={field} value={value} onChange={onChange} options={resolveOptions(field, options)} />);
    case "tags":
      return wrap(
        <input
          id={id}
          type="text"
          value={Array.isArray(value) ? value.join(", ") : typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          placeholder={field.placeholder ?? "wert1, wert2, …"}
          className={inputCls}
        />,
      );
    case "image":
      return wrap(<ImageField id={id} value={value} onChange={onChange} placeholder={field.placeholder} readonly={field.readonly} compact={compact} />);
    case "stringlist":
      return wrap(<StringList field={field} value={value} onChange={onChange} />);
    case "list":
      return wrap(<ListField field={field} value={value} onChange={onChange} options={options} />);
    default:
      return null;
  }
}

function MultiSelect({ field, value, onChange, options }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; options: FieldOption[] }) {
  const selected = useMemo(() => (Array.isArray(value) ? value.map(String) : []), [value]);
  const emit = (next: string[]) => onChange(field.valueType === "number" ? next.map(Number) : next);
  const toggle = (v: string) => emit(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= selected.length) return;
    const next = [...selected];
    [next[i], next[j]] = [next[j], next[i]];
    emit(next);
  };
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  return (
    <div className="space-y-3">
      {field.ordered && selected.length > 0 && (
        <ol className="flex flex-wrap gap-2">
          {selected.map((v, i) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-md border border-line bg-ivory-100 py-1 pl-3 pr-1 text-[13px]">
              <span className="text-ink-soft">{i + 1}.</span> {labelOf(v)}
              <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-ink-muted hover:bg-white" aria-label="nach vorne"><ArrowUp className="size-3.5" /></button>
              <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-ink-muted hover:bg-white" aria-label="nach hinten"><ArrowDown className="size-3.5" /></button>
              <button type="button" onClick={() => toggle(v)} className="rounded p-1 text-ink-muted hover:bg-white hover:text-danger" aria-label="entfernen"><X className="size-3.5" /></button>
            </li>
          ))}
        </ol>
      )}
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.length === 0 && <p className="text-[13px] text-ink-soft">Keine Optionen vorhanden.</p>}
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 text-[14px] text-ink">
            <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} className="size-4 accent-forest" />
            <span className="truncate">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function StringList({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const items = Array.isArray(value) ? value.map(String) : [];
  const set = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  const removeAt = (i: number) => onChange(items.filter((_, j) => j !== i));
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type={field.itemType ?? "text"} value={item} onChange={(e) => set(i, e.target.value)} className={cn(inputCls, "max-w-xs")} />
          <button type="button" onClick={() => removeAt(i)} className="rounded-md p-2 text-ink-muted hover:bg-ivory-100 hover:text-danger" aria-label="Eintrag entfernen">
            <X className="size-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[13px] font-semibold text-forest hover:border-forest">
        <Plus className="size-4" aria-hidden /> Hinzufügen
      </button>
    </div>
  );
}

function ListField({ field, value, onChange, options }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; options: OptionMap }) {
  const rows: Json[] = Array.isArray(value) ? (value as Json[]) : [];
  const subFields = field.fields ?? [];
  const label = field.itemLabel ?? "Eintrag";

  const setRow = (i: number, row: Json) => onChange(rows.map((r, j) => (j === i ? row : r)));
  const removeRow = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const addRow = () => {
    const empty: Json = {};
    for (const f of subFields) {
      if (f.type === "boolean") Object.assign(empty, setPath(empty, f.key, false));
    }
    onChange([...rows, empty]);
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 && <p className="text-[13px] text-ink-soft">Noch keine Einträge.</p>}
      {rows.map((row, i) => (
        <div key={i} className="rounded-md border border-line bg-ivory-100/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{label} {i + 1}</p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1.5 text-ink-muted hover:bg-white disabled:opacity-30" aria-label="nach oben"><ArrowUp className="size-4" /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded p-1.5 text-ink-muted hover:bg-white disabled:opacity-30" aria-label="nach unten"><ArrowDown className="size-4" /></button>
              {!field.fixedLength && (
                <button type="button" onClick={() => removeRow(i)} className="rounded p-1.5 text-ink-muted hover:bg-white hover:text-danger" aria-label={`${label} entfernen`}><X className="size-4" /></button>
              )}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-6">
            {subFields.map((sub) => (
              <FieldRenderer
                key={sub.key}
                field={sub}
                value={getPath(row, sub.key)}
                onChange={(v) => setRow(i, setPath(row, sub.key, v))}
                options={options}
                compact
              />
            ))}
          </div>
        </div>
      ))}
      {!field.fixedLength && (
        <button type="button" onClick={addRow} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[13px] font-semibold text-forest hover:border-forest">
          <Plus className="size-4" aria-hidden /> {label} hinzufügen
        </button>
      )}
    </div>
  );
}
