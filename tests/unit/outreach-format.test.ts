import { describe, expect, it } from "vitest";
import {
  bodyLinks, bodyToHtml, bodyToText, escapeHtml, fillPlaceholders, inlineHtml, isSafeUrl, missingPlaceholders, parseBody, placeholderValues, salutationLine,
} from "@/lib/outreach/format";
import { outreachBrand, renderOutreachMail } from "@/lib/outreach/render";
import { starterTemplates } from "@/lib/outreach/starter-templates";
import type { SiteSettings } from "@/types";
import type { OutreachTemplate } from "@/types/outreach";

const huber = { salutation: "frau" as const, firstName: "Anna", lastName: "Huber", company: "Huber & Söhne", district: "1070" };

describe("salutation", () => {
  it("builds the German opening line from salutation and last name", () => {
    expect(salutationLine({ salutation: "frau", lastName: "Huber" })).toBe("Sehr geehrte Frau Huber,");
    expect(salutationLine({ salutation: "herr", lastName: "Gruber" })).toBe("Sehr geehrter Herr Gruber,");
    expect(salutationLine({ salutation: "", lastName: "Huber" })).toBe("Guten Tag,");
    expect(salutationLine({ salutation: "frau", lastName: " " })).toBe("Guten Tag,");
  });
  it("has English variants", () => {
    expect(salutationLine({ salutation: "frau", lastName: "Huber" }, "en")).toBe("Dear Ms Huber,");
    expect(salutationLine({ salutation: "herr", lastName: "Huber" }, "en")).toBe("Dear Mr Huber,");
    expect(salutationLine({ salutation: "", lastName: "" }, "en")).toBe("Hello,");
  });
});

describe("placeholders", () => {
  it("fills all placeholders and reports missing values", () => {
    const v = placeholderValues({ ...huber, district: "" });
    expect(fillPlaceholders("{Anrede} {Vorname} {Nachname}, {Firma} in {Bezirk}", v)).toBe("Sehr geehrte Frau Huber, Anna Huber, Huber & Söhne in ");
    expect(missingPlaceholders(["Hallo {Firma}", "{Bezirk}"], v)).toEqual(["Bezirk"]);
    expect(fillPlaceholders("{Unbekannt}", v)).toBe("{Unbekannt}");
  });
  it("escapes placeholder values in HTML – contact data cannot inject markup or links", () => {
    const v = placeholderValues({ ...huber, company: "<script>x</script> [klick](https://evil.example) **fett**" });
    const html = inlineHtml("An {Firma}", { values: v });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<strong>");
  });
});

describe("body syntax", () => {
  it("escapes everything else", () => {
    expect(escapeHtml(`<a href="x">'&`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
    expect(bodyToHtml("<img src=x onerror=alert(1)>")).toBe("<p>&lt;img src=x onerror=alert(1)&gt;</p>");
  });
  it("renders paragraphs, line breaks, bold, links and lists", () => {
    const html = bodyToHtml("Erste Zeile\nzweite **fett**\n\nWir bieten:\n- eins\n- [Shop](https://blumora.at)");
    expect(html).toBe('<p>Erste Zeile<br>zweite <strong>fett</strong></p>\n<p>Wir bieten:</p>\n<ul><li>eins</li><li><a href="https://blumora.at">Shop</a></li></ul>');
    expect(parseBody("a\n\n\n\nb")).toHaveLength(2);
  });
  it("only links safe URLs", () => {
    expect(isSafeUrl("https://blumora.at/x?y=1")).toBe(true);
    expect(isSafeUrl("mailto:office@blumora.at")).toBe(true);
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(inlineHtml("[x](javascript:alert(1))")).toBe("[x](javascript:alert(1))");
    expect(inlineHtml('[x](https://a.at/"onmouseover=)')).not.toContain('"onmouseover');
  });
  it("wraps http links for tracking but not mailto", () => {
    const html = inlineHtml("[Shop](https://blumora.at) [Mail](mailto:a@b.at)", { link: (u) => `https://t/${encodeURIComponent(u)}` });
    expect(html).toContain('href="https://t/https%3A%2F%2Fblumora.at"');
    expect(html).toContain('href="mailto:a@b.at"');
  });
  it("has a plain-text version and lists its links", () => {
    expect(bodyToText("{Anrede}\n\n**Hallo** [Shop](https://blumora.at)\n\n- a\n- b", placeholderValues(huber))).toBe("Sehr geehrte Frau Huber,\n\nHallo Shop (https://blumora.at)\n\n• a\n• b");
    expect(bodyLinks("[a](https://x.at) [b](https://x.at) [c](https://y.at) [d](mailto:a@b.at)")).toEqual(["https://x.at", "https://y.at"]);
  });
});

const settings = {
  brand: { name: "Blumora", claim: "", legalName: "[Firmenname]", email: "office@blumora.at", phone: "[Telefon]", address: { street: "Am Langen Felde 51/18", zip: "1220", city: "Wien", country: "Österreich" }, openingHours: [], social: {} },
  seo: { siteUrl: "https://blumora.at/", defaultTitle: "", defaultDescription: "" },
} as unknown as SiteSettings;

const template: OutreachTemplate = {
  id: "t", name: "T", category: "hotel", language: "de", subject: "Blumen für {Firma}", headline: "Hallo {Firma}",
  body: "{Anrede}\n\nSchauen Sie [hier](https://blumora.at/firmenkunden).",
  attachments: [{ key: "outreach/2026/11/preise-1a2b3c4d.pdf", url: "/media/outreach/2026/11/preise-1a2b3c4d.pdf", name: "Preise.pdf", bytes: 120_000, contentType: "application/pdf" }],
  video: { url: "https://youtube.com/watch?v=1", posterPlayUrl: "/media/outreach/2026/11/poster-play-1a2b3c4d.jpg" },
  createdAt: "", updatedAt: "",
};

describe("outreach mail", () => {
  const brand = outreachBrand(settings);
  it("skips placeholder brand values", () => {
    expect(brand.phone).toBeUndefined();
    expect(brand.email).toBe("office@blumora.at");
    expect(brand.address).toBe("Am Langen Felde 51/18, 1220 Wien");
    expect(brand.logoUrl).toBe("https://blumora.at/images/brand/logo-horizontal.png");
  });

  it("renders a personalised, tracked mail with signature, chips, video and unsubscribe link", () => {
    const links: string[] = [];
    const mail = renderOutreachMail({
      template, contact: huber, brand, pixelUrl: "https://blumora.at/api/o/o/TOKEN", unsubscribeUrl: "https://blumora.at/e-mail-abmelden?t=abc",
      link: (u) => { links.push(u); return `https://blumora.at/api/o/c/TOKEN?i=${links.length - 1}`; },
    });
    expect(mail.subject).toBe("Blumen für Huber & Söhne");
    expect(mail.html).toContain("Sehr geehrte Frau Huber,");
    expect(mail.html).toContain("Huber &amp; Söhne");
    expect(mail.html).toContain("Herzliche Grüße");
    expect(mail.html).toContain("Ihr Blumora-Team");
    expect(mail.html).toContain("Keine weiteren E-Mails erhalten");
    expect(mail.html).toContain("https://blumora.at/e-mail-abmelden?t=abc");
    expect(mail.html).toContain("https://blumora.at/media/outreach/2026/11/poster-play-1a2b3c4d.jpg");
    expect(mail.html).toContain("Preise.pdf");
    expect(mail.html).toContain('src="https://blumora.at/api/o/o/TOKEN"');
    expect(mail.html).not.toContain("[Telefon]");
    expect(links).toEqual(["https://blumora.at/firmenkunden", "https://youtube.com/watch?v=1", "https://blumora.at/media/outreach/2026/11/preise-1a2b3c4d.pdf"]);
    expect(mail.text).toContain("Keine weiteren E-Mails erhalten: https://blumora.at/e-mail-abmelden?t=abc");
    expect(mail.text).toContain("hier (https://blumora.at/firmenkunden)");
  });

  it("uses English greetings and signature for English templates", () => {
    const mail = renderOutreachMail({ template: { ...template, language: "en" }, contact: huber, brand, unsubscribeUrl: "u", subjectPrefix: "[TEST] " });
    expect(mail.subject).toBe("[TEST] Blumen für Huber & Söhne");
    expect(mail.html).toContain("Dear Ms Huber,");
    expect(mail.html).toContain("Kind regards");
    expect(mail.html).toContain("The Blumora team");
  });
});

describe("starter templates", () => {
  const all = starterTemplates("2026-11-19T00:00:00.000Z");
  it("cover the requested cases", () => {
    expect(all.map((t) => t.name)).toEqual(expect.arrayContaining([
      "Partneranfrage Florist", "B2B Bestattungshaus", "B2B Hotel", "B2B Büro & Firmen", "B2B Restaurant & Café", "Nachfass-Mail (kurz)",
    ]));
    expect(all.filter((t) => t.language === "en").map((t) => t.category).sort()).toEqual(["buero", "hotel"]);
    expect(new Set(all.map((t) => t.id)).size).toBe(all.length);
  });
  it("invent no prices, discounts or partner names and start with the salutation", () => {
    for (const t of all) {
      const text = `${t.subject} ${t.headline ?? ""} ${t.body}`;
      expect(text, t.name).not.toMatch(/€|EUR|\d+\s?%|Rabatt|discount|Provision|commission|Dody|garantier|guarantee/i);
      expect(t.body.startsWith("{Anrede}"), t.name).toBe(true);
      for (const url of bodyLinks(t.body)) expect(url, t.name).toMatch(/^https:\/\/blumora\.at(\/|$)/);
    }
  });
});
