import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildDeliveryRequest, isViennaPostalCode, pickNominatim, pickViennaAddress, localToDate, mapRiderxStatus, parsePhone, planPickup, shouldApplyStatus, toZonedIso, verifyRiderxSignature,
} from "@/lib/courier/riderx-core";
import type { Order } from "@/types";

const order = (delivery: Partial<Order["delivery"]> = {}): Order => ({
  id: "BQ-ABC123", token: "t", createdAt: "2026-11-04T10:00:00.000Z", status: "paid", history: [],
  recipient: { firstName: "Anna", lastName: "Huber", company: "Hotel Sacher", street: "Mariahilfer Straße", houseNumber: "12", addition: "Stiege 2/Top 5", zip: "1060", city: "Wien", country: "AT", phone: "0664 1234567" },
  delivery: { date: "2026-11-05", windowId: "am", windowLabel: "9–12 Uhr", windowFrom: "09:00", windowTo: "12:00", zoneId: "wien-zentrum", zoneName: "Wien Zentrum", fee: 7.9, note: "Bitte läuten", ...delivery },
  customer: { firstName: "Paul", lastName: "Maier", email: "p@example.at", phone: "+43 660 1112223" },
  lines: [{ productId: "p-rosalie", productName: "Rosalie", sizeId: "m", sizeLabel: "Mittel", quantity: 1, unitPrice: 50, image: "", extras: [] }],
  totals: { subtotal: 50, extras: 0, delivery: 7.9, discount: 0, total: 57.9 },
  payment: { method: "card", status: "paid" },
});

const opts = { prepMinutes: 60, defaultFrom: "09:00" };

describe("RiderX time handling", () => {
  it("converts Vienna wall time across DST", () => {
    expect(localToDate("2026-11-05", "09:00").toISOString()).toBe("2026-11-05T08:00:00.000Z"); // CET
    expect(localToDate("2026-07-01", "09:00").toISOString()).toBe("2026-07-01T07:00:00.000Z"); // CEST
    expect(toZonedIso(new Date("2026-11-05T08:00:00Z"))).toBe("2026-11-05T09:00:00+01:00");
    expect(toZonedIso(new Date("2026-07-01T15:00:00Z"))).toBe("2026-07-01T17:00:00+02:00");
  });

  it("books the pickup at the window start for a future day", () => {
    const plan = planPickup(order(), new Date("2026-11-04T18:00:00Z"), opts);
    expect(plan.ok && toZonedIso(plan.at)).toBe("2026-11-05T09:00:00+01:00");
    expect(plan.ok && plan.late).toBe(false);
  });

  it("waits for the florist's preparation time on the same day", () => {
    const plan = planPickup(order(), new Date("2026-11-05T09:30:00Z"), opts); // 10:30 local
    expect(plan.ok && toZonedIso(plan.at)).toBe("2026-11-05T11:30:00+01:00");
    expect(plan.ok && plan.late).toBe(true);
  });

  it("refuses a window that is over and pickups after 21:15", () => {
    expect(planPickup(order(), new Date("2026-11-05T11:30:00Z"), opts).ok).toBe(false);
    const evening = order({ windowId: "eve", windowFrom: "17:00", windowTo: "22:00" });
    expect(planPickup(evening, new Date("2026-11-05T19:30:00Z"), opts).ok).toBe(false); // 20:30 + 60 min > 21:15
    const ok = planPickup(evening, new Date("2026-11-05T12:00:00Z"), opts);
    expect(ok.ok && toZonedIso(ok.at)).toBe("2026-11-05T17:00:00+01:00");
  });

  it("falls back to the default start without a window", () => {
    const plan = planPickup(order({ windowId: undefined, windowFrom: undefined, windowTo: undefined }), new Date("2026-11-04T18:00:00Z"), opts);
    expect(plan.ok && toZonedIso(plan.at)).toBe("2026-11-05T09:00:00+01:00");
  });
});

describe("RiderX payload", () => {
  it("parses Austrian and foreign phone numbers", () => {
    expect(parsePhone("0664 1234567")).toEqual({ country_symbol: "at", country_code: "43", number: "6641234567" });
    expect(parsePhone("+43 (0) 664/123 45 67")).toEqual({ country_symbol: "at", country_code: "43", number: "6641234567" });
    expect(parsePhone("0043 1 5123456")).toEqual({ country_symbol: "at", country_code: "43", number: "15123456" });
    expect(parsePhone("+49 151 23456789")).toEqual({ country_symbol: "de", country_code: "49", number: "15123456789" });
    expect(parsePhone("+999 123456")).toBeNull();
    expect(parsePhone("abc")).toBeNull();
  });

  it("builds the delivery request from the order", () => {
    const o = order();
    const plan = planPickup(o, new Date("2026-11-04T18:00:00Z"), opts);
    if (!plan.ok) throw new Error("plan");
    const req = buildDeliveryRequest(o, {
      packageId: 2, plan, absent: "drop_by_neighbour", brand: "Blumora",
      receiverCoords: { latitude: "48.196900", longitude: "16.350000" }, senderCoords: { latitude: "48.197400", longitude: "16.295100" },
      pickup: { name: "Partnerflorist", phone: "01 2345678", street: "Hauptstraße", houseNumber: "1", zip: "1100", city: "Wien" },
    });
    expect(req).toMatchObject({
      deliver_type: "to_person", delivery_package_id: 2, pickup_schedule: "2026-11-05T09:00:00+01:00",
      receiver_full_name: "Anna Huber",
      receiver_phone: { country_code: "43", number: "6641234567" },
      receiver_address_details: { full_address: "Mariahilfer Straße 12, 1060 Wien, Österreich", house_number: "12", postal_code: "1060", address_extra_details: "Hotel Sacher · Stiege 2/Top 5" },
      sender_address_details: { full_address: "Hauptstraße 1, 1100 Wien, Österreich", postal_code: "1100" },
      tags: ["fragile", "side_up"], absent_receiver_instructions: "drop_by_neighbour",
    });
    expect(req.description).toContain("BQ-ABC123");
    expect(req.description).toContain("1× Rosalie (Mittel)");
    expect(req.description).toContain("Bitte läuten");
    expect(req).toMatchObject({ receiver_latitude: "48.196900", receiver_longitude: "16.350000", sender_latitude: "48.197400" });
  });
});

describe("RiderX webhook", () => {
  const body = JSON.stringify({ event: "delivery.updated", delivery: { id: 731, status: "pickup" } });
  const mac = createHmac("sha256", "geheim").update(body).digest();

  it("accepts hex and base64 signatures, rejects anything else", () => {
    expect(verifyRiderxSignature(body, mac.toString("hex"), "geheim")).toBe(true);
    expect(verifyRiderxSignature(body, mac.toString("hex").toUpperCase(), "geheim")).toBe(true);
    expect(verifyRiderxSignature(body, mac.toString("base64"), "geheim")).toBe(true);
    expect(verifyRiderxSignature(body, `sha256=${mac.toString("hex")}`, "geheim")).toBe(true);
    expect(verifyRiderxSignature(body, mac.toString("hex"), "falsch")).toBe(false);
    expect(verifyRiderxSignature(`${body} `, mac.toString("hex"), "geheim")).toBe(false);
    expect(verifyRiderxSignature(body, null, "geheim")).toBe(false);
    expect(verifyRiderxSignature(body, "", "geheim")).toBe(false);
  });

  it("maps RiderX statuses onto the order flow, forward only", () => {
    expect(mapRiderxStatus("pickup")).toBe("in_transit");
    expect(mapRiderxStatus("late_completed")).toBe("delivered");
    expect(mapRiderxStatus("address_not_found")).toBe("undeliverable");
    expect(mapRiderxStatus("accepted")).toBeNull();
    expect(shouldApplyStatus("paid", "in_transit")).toBe(true);
    expect(shouldApplyStatus("in_transit", "delivered")).toBe(true);
    expect(shouldApplyStatus("delivered", "in_transit")).toBe(false);
    expect(shouldApplyStatus("cancelled", "delivered")).toBe(false);
    expect(shouldApplyStatus("ready", "undeliverable")).toBe(true);
    expect(shouldApplyStatus("undeliverable", "delivered")).toBe(true);
  });
});

describe("geocoding helpers", () => {
  it("recognises Vienna postal codes", () => {
    expect(isViennaPostalCode("1010")).toBe(true);
    expect(isViennaPostalCode("1230")).toBe(true);
    expect(isViennaPostalCode("1240")).toBe(false);
    expect(isViennaPostalCode("2340")).toBe(false);
  });

  it("only accepts a Vienna hit in the order's postal code", () => {
    const data = { features: [
      { geometry: { coordinates: [16.359234513, 48.201251601] as [number, number] }, properties: { PostalCode: "1070", Kategorie: "Adresse" } },
      { geometry: { coordinates: [16.3, 48.1] as [number, number] }, properties: { PostalCode: "1060", Kategorie: "Marktstand" } },
    ] };
    expect(pickViennaAddress(data, "1070")).toEqual({ latitude: "48.201252", longitude: "16.359235" });
    expect(pickViennaAddress(data, "1060")).toBeNull();
    expect(pickViennaAddress(null, "1060")).toBeNull();
  });

  it("reads the first Nominatim hit", () => {
    expect(pickNominatim([{ lat: "48.1974220", lon: "16.2954576" }])).toEqual({ latitude: "48.197422", longitude: "16.295458" });
    expect(pickNominatim([])).toBeNull();
  });
});
