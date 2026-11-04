"use client";
import { useId, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/format";
import { COLOR_OPTIONS, FLOWER_OPTIONS, SEASON_OPTIONS, SIZE_OPTIONS, STYLE_OPTIONS } from "@/lib/catalog";
import {
  AVAILABILITY_OPTIONS, PRICE_PRESETS, toggleListValue,
  type FilterKey, type FilterOptions, type ListKey, type ShopParams,
} from "@/lib/shop-filters";

export type GroupId = "anlass" | "preis" | "blume" | "farbe" | "groesse" | "stil" | "saison" | "verfuegbarkeit" | "lieferdatum";

export const ALL_GROUPS: GroupId[] = ["anlass", "preis", "blume", "farbe", "groesse", "stil", "saison", "verfuegbarkeit", "lieferdatum"];

const GROUP_TITLES: Record<GroupId, string> = {
  anlass: "Anlass", preis: "Preis", blume: "Blumenart", farbe: "Farbe", groesse: "Größe",
  stil: "Stil", saison: "Saison", verfuegbarkeit: "Verfügbarkeit", lieferdatum: "Lieferdatum",
};

function groupCount(id: GroupId, p: ShopParams) {
  switch (id) {
    case "preis": return p.preis ? 1 : 0;
    case "verfuegbarkeit": return Number(p.sameday) + Number(p.lager);
    case "lieferdatum": return Number(Boolean(p.datum)) + Number(Boolean(p.plz));
    default: return p[id].length;
  }
}

/**
 * The full set of filter groups. Presentational + controlled: the parent decides
 * whether a change is pushed to the URL immediately (rail) or kept as a draft (sheet).
 */
export function FilterGroups({
  values, onChange, options, hide = [], defaultOpen = ["anlass", "preis", "farbe", "verfuegbarkeit"], dense,
}: {
  values: ShopParams;
  onChange: (next: ShopParams) => void;
  options: FilterOptions;
  hide?: FilterKey[];
  defaultOpen?: GroupId[];
  dense?: boolean;
}) {
  const [open, setOpen] = useState<GroupId[]>(defaultOpen);
  const toggleGroup = (id: GroupId) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const toggle = (key: ListKey, value: string) => onChange(toggleListValue(values, key, value));
  const groups = ALL_GROUPS.filter((g) => {
    if (g === "verfuegbarkeit") return !(hide.includes("sameday") && hide.includes("lager"));
    if (g === "lieferdatum") return !(hide.includes("datum") && hide.includes("plz"));
    return !hide.includes(g);
  });

  return (
    <div className={cn("divide-y divide-line", dense && "text-[15px]")}>
      {groups.map((id) => (
        <Group key={id} id={id} title={GROUP_TITLES[id]} count={groupCount(id, values)} open={open.includes(id)} onToggle={() => toggleGroup(id)}>
          {id === "anlass" && (
            <OptionList>
              {options.occasions.map((o) => (
                <CheckOption key={o.value} label={o.label} checked={values.anlass.includes(o.value)} onChange={() => toggle("anlass", o.value)} />
              ))}
            </OptionList>
          )}
          {id === "preis" && (
            <OptionList>
              <RadioOption name={`preis-${dense ? "sheet" : "rail"}`} label="Alle Preise" checked={values.preis === null} onChange={() => onChange({ ...values, preis: null })} />
              {PRICE_PRESETS.map((o) => (
                <RadioOption key={o.value} name={`preis-${dense ? "sheet" : "rail"}`} label={o.label} checked={values.preis === o.value} onChange={() => onChange({ ...values, preis: o.value })} />
              ))}
            </OptionList>
          )}
          {id === "blume" && (
            <OptionList>
              {FLOWER_OPTIONS.map((o) => (
                <CheckOption key={o.value} label={o.label} checked={values.blume.includes(o.value)} onChange={() => toggle("blume", o.value)} />
              ))}
            </OptionList>
          )}
          {id === "farbe" && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {COLOR_OPTIONS.map((o) => {
                const active = values.farbe.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle("farbe", o.value)}
                    className={cn("group flex items-center gap-2.5 rounded-sm py-1.5 text-left text-[14px] text-ink transition-colors hover:text-forest", active && "font-semibold text-forest")}
                  >
                    <span
                      aria-hidden
                      style={{ backgroundColor: o.swatch }}
                      className={cn("relative inline-flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-ink/10 transition-transform group-hover:scale-105", active && "ring-2 ring-forest ring-offset-2 ring-offset-ivory")}
                    />
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}
          {id === "groesse" && (
            <OptionList>
              {SIZE_OPTIONS.map((o) => (
                <CheckOption key={o.value} label={o.label} checked={values.groesse.includes(o.value)} onChange={() => toggle("groesse", o.value)} />
              ))}
            </OptionList>
          )}
          {id === "stil" && (
            <OptionList>
              {STYLE_OPTIONS.map((o) => (
                <CheckOption key={o.value} label={o.label} checked={values.stil.includes(o.value)} onChange={() => toggle("stil", o.value)} />
              ))}
            </OptionList>
          )}
          {id === "saison" && (
            <OptionList>
              {SEASON_OPTIONS.map((o) => (
                <CheckOption key={o.value} label={o.label} checked={values.saison.includes(o.value)} onChange={() => toggle("saison", o.value)} />
              ))}
            </OptionList>
          )}
          {id === "verfuegbarkeit" && (
            <OptionList>
              {AVAILABILITY_OPTIONS.filter((o) => !hide.includes(o.value)).map((o) => (
                <CheckOption
                  key={o.value}
                  label={o.label}
                  hint={o.hint}
                  checked={values[o.value]}
                  onChange={() => onChange({ ...values, [o.value]: !values[o.value] })}
                />
              ))}
            </OptionList>
          )}
          {id === "lieferdatum" && <DeliveryDateFields key={values.plz ?? "none"} values={values} onChange={onChange} options={options} hide={hide} />}
        </Group>
      ))}
    </div>
  );
}

function Group({ id, title, count, open, onToggle, children }: { id: string; title: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const panelId = `filter-${id}`;
  return (
    <section className="py-1">
      <h3 className="font-sans">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 py-3.5 text-left text-[12px] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:text-forest"
        >
          <span className="inline-flex items-center gap-2">
            {title}
            {count > 0 && <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-forest px-1 text-[10px] tracking-normal text-ivory">{count}</span>}
          </span>
          <ChevronDown className={cn("size-4 text-ink-soft transition-transform duration-300", open && "rotate-180")} aria-hidden />
        </button>
      </h3>
      <div
        id={panelId}
        className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-soft)]", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}
        {...(!open && { inert: true })}
      >
        <div className="overflow-hidden">
          <div className="pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

function OptionList({ children }: { children: React.ReactNode }) {
  return <ul className="flex flex-col">{children}</ul>;
}

function CheckOption({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: () => void }) {
  const id = useId();
  return (
    <li>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 py-1.5 text-[14px] text-ink">
        <input id={id} type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <span
          aria-hidden
          className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-xs border border-stone bg-white transition-colors peer-checked:border-forest peer-checked:bg-forest peer-checked:[&>svg]:opacity-100 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest"
        >
          <Check className="size-3 text-ivory opacity-0 transition-opacity" strokeWidth={3} />
        </span>
        <span className="flex flex-col">
          <span className={cn("leading-snug transition-colors", checked && "font-semibold text-forest")}>{label}</span>
          {hint && <span className="text-[12px] leading-snug text-ink-muted">{hint}</span>}
        </span>
      </label>
    </li>
  );
}

function RadioOption({ name, label, checked, onChange }: { name: string; label: string; checked: boolean; onChange: () => void }) {
  const id = useId();
  return (
    <li>
      <label htmlFor={id} className="flex cursor-pointer items-center gap-3 py-1.5 text-[14px] text-ink">
        <input id={id} type="radio" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
        <span
          aria-hidden
          className="flex size-[18px] shrink-0 items-center justify-center rounded-full border border-stone bg-white transition-colors peer-checked:border-forest peer-checked:[&>span]:scale-100 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest"
        >
          <span className="size-2.5 scale-0 rounded-full bg-forest transition-transform" />
        </span>
        <span className={cn("transition-colors", checked && "font-semibold text-forest")}>{label}</span>
      </label>
    </li>
  );
}

function DeliveryDateFields({ values, onChange, options, hide }: { values: ShopParams; onChange: (n: ShopParams) => void; options: FilterOptions; hide: FilterKey[] }) {
  const base = useId();
  const [plzDraft, setPlzDraft] = useState(values.plz ?? "");
  const commitPlz = () => {
    const clean = plzDraft.replace(/\D/g, "").slice(0, 4);
    if (/^[1-9]\d{3}$/.test(clean)) { if (clean !== values.plz) onChange({ ...values, plz: clean }); }
    else if (!clean && values.plz) onChange({ ...values, plz: null });
  };
  const fieldCls = "h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] text-ink placeholder:text-ink-soft focus:border-forest focus:outline-none";
  return (
    <div className="flex flex-col gap-3">
      {!hide.includes("plz") && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${base}-plz`} className="text-[13px] font-semibold text-ink">Postleitzahl</label>
          <div className="relative">
            <input
              id={`${base}-plz`}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={4}
              placeholder="z. B. 1010"
              value={plzDraft}
              onChange={(e) => setPlzDraft(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onBlur={commitPlz}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitPlz(); } }}
              className={cn(fieldCls, "tracking-[0.08em] placeholder:tracking-normal", values.plz && "pr-9")}
            />
            {values.plz && (
              <button type="button" onClick={() => { setPlzDraft(""); onChange({ ...values, plz: null }); }} aria-label="Postleitzahl entfernen" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-soft hover:text-ink">
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
      {!hide.includes("datum") && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${base}-datum`} className="text-[13px] font-semibold text-ink">Wunschdatum</label>
          <div className="relative">
            <input
              id={`${base}-datum`}
              type="date"
              min={options.today}
              max={options.maxDate}
              value={values.datum ?? ""}
              onChange={(e) => onChange({ ...values, datum: e.target.value || null })}
              className={cn(fieldCls, "appearance-none", values.datum && "pr-9")}
            />
            {values.datum && (
              <button type="button" onClick={() => onChange({ ...values, datum: null })} aria-label="Lieferdatum entfernen" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-white p-1.5 text-ink-soft hover:text-ink">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <p className="text-[12px] leading-snug text-ink-muted">Mit Postleitzahl zeigen wir nur Sträuße, die wir an diesem Tag zu dir liefern können.</p>
        </div>
      )}
    </div>
  );
}
