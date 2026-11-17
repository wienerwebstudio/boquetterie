import type { LandingPage } from "@/types";

/**
 * Groups for the "Weitere Anlässe & Themen" links under every landing page, so each
 * landing page is reachable through ordinary links (not only through the sitemap).
 * Landing pages created in the admin that are not listed here form the group "weitere".
 */
export const LANDING_GROUPS: { id: string; label: string; slugs: string[] }[] = [
  {
    id: "anlaesse",
    label: "Feste & Anlässe",
    slugs: [
      "blumen-zum-geburtstag", "valentinstag-blumen-wien", "galentinstag", "weltfrauentag-blumen", "ostern-blumen",
      "muttertag-blumen-wien", "tag-der-pflege-blumen", "vatertag-blumen", "blumen-zum-schulschluss", "danke-kindergarten",
      "tag-der-freundschaft", "herbststraeusse", "adventskranz-liefern-wien", "nikolo-blumen", "blumen-zu-weihnachten",
      "weihnachtsfeier-blumen", "silvester-neujahr-blumen",
    ],
  },
  {
    id: "fuer-wen",
    label: "Für wen",
    slugs: [
      "blumen-fuer-mama", "blumen-fuer-oma", "blumen-fuer-die-freundin", "blumen-fuer-die-ehefrau", "blumen-fuer-maenner",
      "blumen-fuer-die-beste-freundin", "blumen-fuer-die-schwester", "blumen-fuer-kollegen", "blumen-fuer-den-chef",
      "blumen-fuer-die-lehrerin", "blumen-fuer-aerzte-und-praxisteam", "blumen-fuer-die-nachbarin",
    ],
  },
  {
    id: "firmen",
    label: "Für Firmen",
    slugs: ["mitarbeitergeschenke-blumen", "kundengeschenke-blumen", "blumen-ins-buero-liefern", "blumen-zur-eroeffnung"],
  },
  {
    id: "lieferung",
    label: "Lieferung & Preis",
    slugs: [
      "blumenversand-wien", "blumen-heute-liefern-wien", "blumen-am-abend-liefern", "blumen-am-wochenende-liefern",
      "gratis-blumenlieferung-wien", "guenstige-blumen-wien", "blumen-anonym-verschicken", "rosen-liefern",
    ],
  },
];

const OTHER_GROUP = "weitere";

export function landingGroupOf(slug: string) {
  return LANDING_GROUPS.find((g) => g.slugs.includes(slug))?.id ?? OTHER_GROUP;
}

/**
 * Up to `count` other landing pages: first the following pages of the same group (cyclic,
 * so every page of a group is linked from its neighbours), then one page per other group in
 * turn. Deterministic – the same page always links to the same pages.
 */
export function relatedLandingPages(pages: LandingPage[], slug: string, count = 8): LandingPage[] {
  const groupIds = [...LANDING_GROUPS.map((g) => g.id), OTHER_GROUP];
  const byGroup = new Map(groupIds.map((id) => [id, pages.filter((p) => landingGroupOf(p.slug) === id)]));
  const own = landingGroupOf(slug);
  const ownPages = byGroup.get(own) ?? [];
  const at = Math.max(0, ownPages.findIndex((p) => p.slug === slug));

  // Leave room for at least two pages from other groups.
  const sameMax = Math.max(0, count - 2);
  const picked: LandingPage[] = [];
  for (let i = 1; i < ownPages.length && picked.length < sameMax; i++) picked.push(ownPages[(at + i) % ownPages.length]);

  const others = groupIds.filter((id) => id !== own).map((id) => byGroup.get(id) ?? []).filter((list) => list.length > 0);
  for (let round = 0; picked.length < count && others.some((list) => round < list.length); round++) {
    for (const list of others) {
      if (picked.length >= count) break;
      if (round >= list.length) continue;
      const page = list[(at + round) % list.length];
      if (!picked.includes(page)) picked.push(page);
    }
  }
  return picked.filter((p) => p.slug !== slug).slice(0, count);
}
