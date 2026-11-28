import { describe, expect, it } from "vitest";
import { DEFAULT_DIAL, PHONE_COUNTRIES, joinPhone, normalizePhone, splitPhone } from "@/lib/phone";

describe("phone with country code", () => {
  it("defaults to Austria", () => {
    expect(DEFAULT_DIAL).toBe("+43");
    expect(PHONE_COUNTRIES[0]).toEqual({ region: "AT", dial: "+43" });
    expect(splitPhone("")).toEqual({ dial: "+43", national: "" });
    expect(splitPhone("0660 1234567")).toEqual({ dial: "+43", national: "0660 1234567" });
  });

  it("splits international numbers by the longest matching code", () => {
    expect(splitPhone("+43 660 1234567")).toEqual({ dial: "+43", national: "660 1234567" });
    expect(splitPhone("+436601234567")).toEqual({ dial: "+43", national: "6601234567" });
    expect(splitPhone("+423 123 45 67")).toEqual({ dial: "+423", national: "123 45 67" });
    expect(splitPhone("0049 30 123456")).toEqual({ dial: "+49", national: "30 123456" });
    expect(splitPhone("+386 41 123 456")).toEqual({ dial: "+386", national: "41 123 456" });
    expect(splitPhone("+1 212 555 0100")).toEqual({ dial: "+1", national: "212 555 0100" });
  });

  it("joins and drops the trunk zero", () => {
    expect(joinPhone("+43", "0660 1234567")).toBe("+43 660 1234567");
    expect(joinPhone("+49", "030 123456")).toBe("+49 30 123456");
    expect(joinPhone("+43", "(0) 660 1")).toBe("+43 660 1");
    expect(joinPhone("+43", "")).toBe("");
    expect(joinPhone("+43", "0")).toBe("");
    expect(joinPhone("+43", "+49 30 1")).toBe("+49 30 1");
    expect(joinPhone("+43", "+4")).toBe("+4");
  });

  it("normalizes idempotently", () => {
    for (const v of ["0660 1234567", "+43 660 1234567", "0049 30 1", "+4", "", "+41791234567"]) {
      const n = normalizePhone(v);
      expect(normalizePhone(n)).toBe(n);
    }
    expect(normalizePhone("0660 1234567")).toBe("+43 660 1234567");
  });
});
