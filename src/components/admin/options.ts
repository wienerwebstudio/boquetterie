import "server-only";
import { getAllProducts, getCategories, getExtras, getFaqs, getOccasions } from "@/lib/cms";
import { walkFields, type FieldOption, type FieldSection, type OptionSource } from "./schemas";

export type OptionMap = Partial<Record<OptionSource, FieldOption[]>>;

/** Resolve every `optionsFrom` reference of a schema on the server. */
export async function loadOptions(sections: FieldSection[]): Promise<OptionMap> {
  const sources = new Set(walkFields(sections).map((f) => f.optionsFrom).filter((s): s is OptionSource => Boolean(s)));
  const map: OptionMap = {};
  await Promise.all(
    Array.from(sources).map(async (source) => {
      switch (source) {
        case "categories":
          map.categories = (await getCategories()).map((c) => ({ value: c.slug, label: `${c.name} (${c.slug})` }));
          break;
        case "occasions":
          map.occasions = (await getOccasions()).map((o) => ({ value: o.slug, label: o.name }));
          break;
        case "products":
          map.products = (await getAllProducts(true)).map((p) => ({ value: p.slug, label: `${p.name}${p.active ? "" : " (inaktiv)"}` }));
          break;
        case "faqs":
          map.faqs = (await getFaqs()).map((f) => ({ value: f.id, label: f.question }));
          break;
        case "extras":
          map.extras = (await getExtras(false)).map((e) => ({ value: e.id, label: e.name }));
          break;
      }
    }),
  );
  return map;
}
