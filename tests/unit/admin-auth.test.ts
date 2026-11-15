import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_SESSION_SECONDS, adminPasswordProblem, createSessionToken, getAdminPassword, getAdminSecret, isAdminConfigured,
  safeAdminRedirect, timingSafeEqual, verifySessionToken,
} from "@/lib/admin-auth";

const env = (values: { NODE_ENV: string; ADMIN_PASSWORD?: string; ADMIN_SECRET?: string }) => {
  vi.stubEnv("NODE_ENV", values.NODE_ENV);
  vi.stubEnv("ADMIN_PASSWORD", values.ADMIN_PASSWORD ?? "");
  vi.stubEnv("ADMIN_SECRET", values.ADMIN_SECRET ?? "");
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("adminPasswordProblem", () => {
  it("always refuses a missing password", () => {
    for (const production of [true, false]) {
      expect(adminPasswordProblem(undefined, production)).toBe("missing");
      expect(adminPasswordProblem("", production)).toBe("missing");
      expect(adminPasswordProblem("   ", production)).toBe("missing");
    }
  });

  it("refuses placeholders and known defaults in production", () => {
    for (const pw of ["change-me", "changeme", "Change_Me!", "CHANGEME", "admin", "password", "Passwort", "test1234", "administrator", "1234567890"]) {
      expect(adminPasswordProblem(pw, true), pw).toBe("default");
    }
  });

  it("refuses short passwords in production", () => {
    expect(adminPasswordProblem("k7#Lm2pQ", true)).toBe("short");
    expect(adminPasswordProblem("123456789", true)).toBe("short");
  });

  it("accepts real passwords in production, including the CI value", () => {
    for (const pw of ["ci-admin-password", "k7#Lm2pQ-zR", "korrekt pferd batterie"]) {
      expect(adminPasswordProblem(pw, true), pw).toBeNull();
    }
  });

  it("accepts any non-empty password outside production (dev, tests)", () => {
    for (const pw of ["test1234", "change-me", "x"]) expect(adminPasswordProblem(pw, false), pw).toBeNull();
  });
});

describe("admin configuration from the environment", () => {
  it("is locked in production with the .env.example default, even when ADMIN_SECRET is set", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    env({ NODE_ENV: "production", ADMIN_PASSWORD: "change-me", ADMIN_SECRET: "a-long-random-secret-value" });
    expect(getAdminPassword()).toBeNull();
    expect(getAdminSecret()).toBeNull();
    expect(isAdminConfigured()).toBe(false);
    expect(log).toHaveBeenCalledTimes(1);
    getAdminPassword();
    expect(log).toHaveBeenCalledTimes(1); // logged once, not per request
  });

  it("is locked without a password", () => {
    env({ NODE_ENV: "development", ADMIN_SECRET: "a-long-random-secret-value" });
    expect(isAdminConfigured()).toBe(false);
    expect(getAdminSecret()).toBeNull();
  });

  it("works in production with the CI credentials", () => {
    env({ NODE_ENV: "production", ADMIN_PASSWORD: "ci-admin-password", ADMIN_SECRET: "ci-admin-secret-ci-admin-secret" });
    expect(getAdminPassword()).toBe("ci-admin-password");
    expect(getAdminSecret()).toBe("ci-admin-secret-ci-admin-secret");
    expect(isAdminConfigured()).toBe(true);
  });

  it("works in development with the local Playwright credentials", () => {
    env({ NODE_ENV: "development", ADMIN_PASSWORD: "test1234", ADMIN_SECRET: "devsecret-devsecret" });
    expect(getAdminPassword()).toBe("test1234");
    expect(isAdminConfigured()).toBe(true);
  });

  it("falls back to the password as key material when ADMIN_SECRET is missing", () => {
    env({ NODE_ENV: "production", ADMIN_PASSWORD: "ci-admin-password" });
    expect(getAdminSecret()).toBe("ci-admin-password");
  });
});

describe("session tokens", () => {
  const now = Date.UTC(2026, 0, 1);

  it("round-trips and expires", async () => {
    const token = await createSessionToken("secret-one", now);
    expect(token).toMatch(/^\d+\.[0-9a-f]{64}$/);
    expect(await verifySessionToken(token, "secret-one", now)).toBe(true);
    expect(await verifySessionToken(token, "secret-one", now + ADMIN_SESSION_SECONDS * 1000 - 1000)).toBe(true);
    expect(await verifySessionToken(token, "secret-one", now + ADMIN_SESSION_SECONDS * 1000 + 1000)).toBe(false);
  });

  it("rejects other secrets, tampering and malformed values", async () => {
    const token = await createSessionToken("secret-one", now);
    const [expiresAt, mac] = token.split(".");
    expect(await verifySessionToken(token, "secret-two", now)).toBe(false);
    expect(await verifySessionToken(token, null, now)).toBe(false);
    expect(await verifySessionToken(`${Number(expiresAt) + 3600}.${mac}`, "secret-one", now)).toBe(false);
    for (const bad of [undefined, null, "", "abc", `${expiresAt}.`, `.${mac}`, `${expiresAt}.${mac.slice(1)}`]) {
      expect(await verifySessionToken(bad, "secret-one", now)).toBe(false);
    }
  });

  it("does not sign with the raw secret as HMAC key", async () => {
    const secret = "ci-admin-password";
    const token = await createSessionToken(secret, now);
    const [expiresAt, mac] = token.split(".");
    const enc = new TextEncoder();
    const rawKey = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const rawSig = await crypto.subtle.sign("HMAC", rawKey, enc.encode(`blumora-admin-session:v1:${expiresAt}`));
    const rawMac = Array.from(new Uint8Array(rawSig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(mac).not.toBe(rawMac);
    // A cookie signed the old way (raw secret as key) is no longer accepted.
    expect(await verifySessionToken(`${expiresAt}.${rawMac}`, secret, now)).toBe(false);
  });
});

describe("helpers", () => {
  it("timingSafeEqual compares whole strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
    expect(timingSafeEqual("", "abc")).toBe(false);
  });

  it("safeAdminRedirect only allows admin paths", () => {
    expect(safeAdminRedirect("/admin/bestellungen")).toBe("/admin/bestellungen");
    for (const bad of [null, "", "//evil.test", "https://evil.test", "/konto", "/admin/login"]) expect(safeAdminRedirect(bad)).toBe("/admin");
  });
});
