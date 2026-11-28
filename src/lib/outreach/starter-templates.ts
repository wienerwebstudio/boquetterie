import type { OutreachTemplate } from "@/types/outreach";

/**
 * Starter templates, seeded once into `outreach-templates` (then freely editable).
 *
 * Only facts that are true for Blumora (content/faqs.json, the Firmenkunden page,
 * content/delivery-zones.json, settings): delivery to all 23 Vienna districts,
 * Monday–Sunday, one-hour windows 9–22, same day for orders until 18:30 (Sundays
 * 17:45) while a window is free, hand-tied by a Vienna partner florist for each
 * order, courier straight to the address. No prices, discounts, billing terms,
 * volumes, references or guarantees – those are offered as a conversation.
 */

type Starter = Omit<OutreachTemplate, "createdAt" | "updatedAt" | "attachments"> & { attachments?: OutreachTemplate["attachments"] };

const STARTERS: Starter[] = [
  {
    id: "tpl_partner_florist",
    name: "Partneranfrage Florist",
    category: "florist",
    language: "de",
    subject: "Partnerschaft mit Blumora – Aufträge für {Firma} in Wien",
    headline: "Ihre Floristik, unsere Bestellungen aus ganz Wien.",
    body: `{Anrede}

wir sind Blumora, ein Blumenversand nur für Wien. Kundinnen und Kunden bestellen bei uns online, wir liefern in alle 23 Bezirke – Montag bis Sonntag, in einstündigen Zeitfenstern zwischen 9 und 22 Uhr. Jeder Strauß wird für die einzelne Bestellung von einer Wiener Partner-Floristik gebunden.

Für unser Netz suchen wir weitere Floristiken, die verbindlich mit uns zusammenarbeiten möchten – und {Firma} würde sehr gut dazu passen.

**So läuft eine Zusammenarbeit ab:**
- Sie bekommen jeden Auftrag per E-Mail: mit Foto des Straußes, Größe, Abholzeit und allen Details.
- Mit einem Klick bestätigen Sie, dass Sie den Auftrag übernehmen.
- Unser Kurier holt den fertigen Strauß bei Ihnen ab und bringt ihn direkt zur Empfängerin oder zum Empfänger.
- Bestellung, Bezahlung und Zustellung organisieren wir – Sie konzentrieren sich aufs Binden.

Konditionen, Sortiment und Abholzeiten besprechen wir gerne persönlich mit Ihnen – bei Ihnen im Geschäft oder am Telefon, wie es Ihnen lieber ist.

Hätten Sie in den nächsten Tagen kurz Zeit? Antworten Sie einfach auf diese E-Mail. Unseren Shop finden Sie unter [blumora.at](https://blumora.at).`,
    starter: true,
  },
  {
    id: "tpl_b2b_bestattung",
    name: "B2B Bestattungshaus",
    category: "bestattung",
    language: "de",
    subject: "Trauerfloristik in ganz Wien – für die Familien von {Firma}",
    headline: "Blumen zum Abschied, mit Ruhe und Sorgfalt.",
    body: `{Anrede}

wir sind Blumora, ein Blumenversand für Wien. Wir möchten uns Ihnen kurz vorstellen, weil Angehörige in Ihrem Haus oft auch nach Blumen für den Abschied fragen.

Bei uns gibt es Trauerkränze und Trauerbuketts in mehreren Größen. Jedes Stück bindet eine Wiener Partner-Floristik frisch für die einzelne Bestellung, ein Kurier bringt es direkt an die gewünschte Adresse.

- Lieferung in alle 23 Wiener Bezirke, Montag bis Sonntag
- Einstündige Zeitfenster zwischen 9 und 22 Uhr
- Bestellungen bis 18:30 Uhr (sonntags bis 17:45 Uhr) liefern wir noch am selben Tag, solange ein Zeitfenster frei ist

Ob eine Zustellung an eine bestimmte Aufbahrungshalle möglich ist, klären wir gerne im Einzelfall. Und ob und wie eine Zusammenarbeit mit {Firma} sinnvoll ist, besprechen wir gerne in einem kurzen Gespräch.

Wenn Sie mögen, antworten Sie einfach auf diese E-Mail. Unsere Trauerfloristik finden Sie unter [blumora.at/blumen/trauer](https://blumora.at/blumen/trauer).`,
    starter: true,
  },
  {
    id: "tpl_b2b_hotel",
    name: "B2B Hotel",
    category: "hotel",
    language: "de",
    subject: "Blumen für {Firma} – frisch gebunden, in ganz Wien geliefert",
    headline: "Blumen für Ihre Gäste und Ihr Haus.",
    body: `{Anrede}

wir sind Blumora, ein Blumenversand für Wien, und möchten {Firma} gerne als Partner für Blumen gewinnen.

**Wobei wir Sie unterstützen können:**
- **Für Ihre Gäste:** ein Strauß zum Geburtstag, zum Hochzeitstag oder als Willkommen im Zimmer – zugestellt an Ihre Rezeption, im gewünschten einstündigen Zeitfenster zwischen 9 und 22 Uhr.
- **Für Ihr Haus:** regelmäßig frische Blumen für Lobby oder Empfang. Ob und in welchem Rhythmus das bei Ihnen möglich ist, klären wir gerne gemeinsam.
- **Für Veranstaltungen:** Blumen für Feiern und Events in Wien – auf Anfrage.

Jeder Strauß wird von einer Wiener Partner-Floristik frisch gebunden und per Kurier direkt geliefert, Montag bis Sonntag. Bestellungen bis 18:30 Uhr (sonntags bis 17:45 Uhr) kommen noch am selben Tag, solange ein Zeitfenster frei ist.

Gerne besprechen wir, wie eine Zusammenarbeit für {Firma} aussehen könnte – auch Bestellweg und Abrechnung. Antworten Sie einfach auf diese E-Mail. Mehr über uns: [blumora.at/firmenkunden](https://blumora.at/firmenkunden).`,
    starter: true,
  },
  {
    id: "tpl_b2b_buero",
    name: "B2B Büro & Firmen",
    category: "buero",
    language: "de",
    subject: "Blumen für {Firma} – fürs Büro, für Kunden und fürs Team",
    headline: "Blumen fürs Büro, für Kunden und fürs Team.",
    body: `{Anrede}

wir sind Blumora, ein Blumenversand für Wien. Für Unternehmen wie {Firma} liefern wir Blumen dorthin, wo sie Freude machen – an den Empfang, ins Büro oder direkt zu Ihren Kundinnen und Kunden.

**Wofür Firmen uns anfragen:**
- Regelmäßig frische Blumen für Empfang oder Besprechungsraum – Rhythmus und Umfang klären wir gemeinsam.
- Geschenke für Mitarbeitende und Kund:innen: zum Jubiläum, Geburtstag, Abschied oder als Danke – auch an mehrere Adressen in Wien.
- Blumen für Eröffnungen, Feiern und Veranstaltungen.

Wir liefern in alle 23 Wiener Bezirke, Montag bis Sonntag, in einstündigen Zeitfenstern zwischen 9 und 22 Uhr. Jeder Strauß wird von einer Wiener Partner-Floristik frisch gebunden und per Kurier direkt zugestellt. Einzelne Sträuße können Sie jederzeit online bestellen und dabei den Firmennamen angeben.

Gerne besprechen wir, was für {Firma} passt – auch, wie Bestellung und Abrechnung bei mehreren Lieferungen am einfachsten laufen. Antworten Sie einfach auf diese E-Mail oder schauen Sie auf [blumora.at/firmenkunden](https://blumora.at/firmenkunden) vorbei.`,
    starter: true,
  },
  {
    id: "tpl_b2b_restaurant",
    name: "B2B Restaurant & Café",
    category: "restaurant",
    language: "de",
    subject: "Frische Blumen für {Firma}",
    headline: "Frische Blumen für Ihre Tische und Ihre Gäste.",
    body: `{Anrede}

wir sind Blumora, ein Blumenversand für Wien – und wir lieben Lokale, in denen frische Blumen auf dem Tisch stehen.

**Was wir {Firma} anbieten können:**
- Regelmäßig frische Blumen für Tische, Bar oder Eingang – ob und in welchem Rhythmus das bei Ihnen möglich ist, klären wir gerne gemeinsam.
- Blumen für Feiern, Eröffnungen und besondere Abende in Ihrem Lokal – auf Anfrage.
- Einzelne Sträuße, zum Beispiel als Überraschung für Stammgäste, bestellen Sie einfach online.

Jeder Strauß wird von einer Wiener Partner-Floristik frisch gebunden und per Kurier direkt geliefert – in alle 23 Bezirke, Montag bis Sonntag, in einstündigen Zeitfenstern zwischen 9 und 22 Uhr.

Gerne besprechen wir in einem kurzen Gespräch, was zu {Firma} passt. Antworten Sie einfach auf diese E-Mail. Mehr über uns: [blumora.at](https://blumora.at).`,
    starter: true,
  },
  {
    id: "tpl_followup",
    name: "Nachfass-Mail (kurz)",
    category: "nachfassen",
    language: "de",
    subject: "Kurze Nachfrage – Blumora",
    body: `{Anrede}

vor ein paar Tagen haben wir Ihnen geschrieben und wollten nur kurz nachfragen, ob unsere Nachricht angekommen ist.

Falls eine Zusammenarbeit mit Blumora für {Firma} interessant ist, besprechen wir gerne alles Weitere – per E-Mail, am Telefon oder persönlich. Eine kurze Antwort auf diese E-Mail genügt.

Und falls es gerade nicht passt: kein Problem, dann melden wir uns nicht wieder.`,
    starter: true,
  },
  {
    id: "tpl_b2b_hotel_en",
    name: "B2B Hotel (English)",
    category: "hotel",
    language: "en",
    subject: "Fresh flowers for {Firma} – hand-tied and delivered across Vienna",
    headline: "Flowers for your guests and your house.",
    body: `{Anrede}

we are Blumora, a flower delivery service for Vienna, and we would love to work with {Firma}.

**How we can help:**
- **For your guests:** a bouquet for a birthday, an anniversary or as a welcome in the room – delivered to your reception in the one-hour window you choose between 9 am and 10 pm.
- **For your house:** fresh flowers for the lobby or reception on a regular basis. Whether and how often this is possible for you is something we are happy to work out together.
- **For events:** flowers for celebrations and events in Vienna – on request.

Every bouquet is hand-tied by a Viennese partner florist and taken straight to the address by courier, Monday to Sunday. Orders placed by 6:30 pm (Sundays by 5:45 pm) arrive the same day while a delivery window is free.

We would be glad to talk about what a collaboration could look like for {Firma}, including how ordering and billing would work. Simply reply to this e-mail. More about us: [blumora.at/en/business](https://blumora.at/en/business).`,
    starter: true,
  },
  {
    id: "tpl_b2b_buero_en",
    name: "B2B Office & Companies (English)",
    category: "buero",
    language: "en",
    subject: "Flowers for {Firma} – for the office, clients and the team",
    headline: "Flowers for the office, your clients and your team.",
    body: `{Anrede}

we are Blumora, a flower delivery service for Vienna. For companies like {Firma} we deliver flowers where they make people happy – to the reception, into the office or straight to your clients.

**What companies ask us for:**
- Fresh flowers for the reception or meeting rooms on a regular basis – we agree rhythm and scope together.
- Gifts for employees and clients: for anniversaries, birthdays, farewells or as a thank-you – also to several addresses in Vienna.
- Flowers for openings, celebrations and events.

We deliver to all 23 districts of Vienna, Monday to Sunday, in one-hour windows between 9 am and 10 pm. Every bouquet is hand-tied by a Viennese partner florist and delivered directly by courier. Single bouquets can be ordered online at any time, with your company name at checkout.

We would be happy to discuss what suits {Firma} – including the easiest way to order and settle several deliveries. Simply reply to this e-mail or visit [blumora.at/en/business](https://blumora.at/en/business).`,
    starter: true,
  },
];

export function starterTemplates(now: string): OutreachTemplate[] {
  return STARTERS.map((t) => ({ ...t, attachments: t.attachments ?? [], createdAt: now, updatedAt: now }));
}
