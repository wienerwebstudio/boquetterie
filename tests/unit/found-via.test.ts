import { describe, expect, it } from "vitest";
import type { Order } from "@/types";
import { foundViaLabel, readFoundVia } from "@/lib/found-via";
import { reviewRequest } from "@/lib/mail/templates";

describe("readFoundVia", () => {
  it("accepts known answers, keeps free text only for Sonstiges", () => {
    expect(readFoundVia("instagram", "egal", "2026-11-18T10:00:00.000Z")).toEqual({ source: "instagram", at: "2026-11-18T10:00:00.000Z" });
    expect(readFoundVia("sonstiges", "Flyer\nim Café", "x")?.other).toBe("Flyer im Café");
    expect(readFoundVia("radio", "", "x")).toBeNull();
    expect(foundViaLabel({ source: "sonstiges", other: "Flyer" })).toBe("Sonstiges: Flyer");
  });
});

describe("review mail", () => {
  it("does not mention the question – it is only asked in the review form", () => {
    const order = { id: "BQ-FOUND1", customer: { firstName: "Anna" }, lines: [{ productName: "Red Passion" }] } as unknown as Order;
    const mail = reviewRequest({ order, brand: { name: "Blumora", siteUrl: "https://blumora.at" }, reviewUrl: "https://blumora.at/bewertung?order=BQ-FOUND1&token=abc" });
    expect(mail.html).not.toContain("gefunden");
    expect(mail.html).toContain("Bewertung schreiben");
  });
});
