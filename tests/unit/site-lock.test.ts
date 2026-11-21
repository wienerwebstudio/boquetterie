import { afterEach, describe, expect, it } from "vitest";
import { isOpenPath, isUnlocked, siteLockPassword } from "@/lib/site-lock";

const basic = (user: string, pass: string) => `Basic ${btoa(`${user}:${pass}`)}`;

describe("site lock", () => {
  afterEach(() => {
    delete process.env.SITE_PASSWORD;
  });

  it("is off without SITE_PASSWORD", () => {
    expect(siteLockPassword()).toBeNull();
    process.env.SITE_PASSWORD = "   ";
    expect(siteLockPassword()).toBeNull();
  });

  it("reads the password when set", () => {
    process.env.SITE_PASSWORD = "geheim";
    expect(siteLockPassword()).toBe("geheim");
  });

  it("accepts the right password with any user name", () => {
    expect(isUnlocked(basic("", "geheim"), "geheim")).toBe(true);
    expect(isUnlocked(basic("tunahan", "geheim"), "geheim")).toBe(true);
    expect(isUnlocked(basic("x", "pass:mit:doppelpunkt"), "pass:mit:doppelpunkt")).toBe(true);
  });

  it("rejects wrong, missing or malformed credentials", () => {
    expect(isUnlocked(basic("x", "falsch"), "geheim")).toBe(false);
    expect(isUnlocked(basic("x", "geheim2"), "geheim")).toBe(false);
    expect(isUnlocked(null, "geheim")).toBe(false);
    expect(isUnlocked("Bearer abc", "geheim")).toBe(false);
    expect(isUnlocked("Basic %%%", "geheim")).toBe(false);
    expect(isUnlocked(`Basic ${btoa("ohne-doppelpunkt")}`, "geheim")).toBe(false);
  });

  it("keeps webhooks and cron reachable", () => {
    expect(isOpenPath("/api/webhooks/stripe")).toBe(true);
    expect(isOpenPath("/api/cron/reminders")).toBe(true);
    expect(isOpenPath("/")).toBe(false);
    expect(isOpenPath("/api/orders")).toBe(false);
    expect(isOpenPath("/admin")).toBe(false);
  });
});
