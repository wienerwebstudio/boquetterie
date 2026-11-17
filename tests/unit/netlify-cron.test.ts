import { describe, expect, it, vi } from "vitest";
import { cronBaseUrl, triggerCron } from "../../netlify/lib/cron-trigger";
import * as reviewFn from "../../netlify/functions/cron-review-requests.mjs";
import * as remindersFn from "../../netlify/functions/cron-reminders.mjs";

const silent = () => ({ log: vi.fn(), error: vi.fn() });

describe("Netlify scheduled functions", () => {
  it("run once a day", () => {
    expect(reviewFn.config.schedule).toMatch(/^\d+ \d+ \* \* \*$/);
    expect(remindersFn.config.schedule).toMatch(/^\d+ \d+ \* \* \*$/);
  });
});

describe("cronBaseUrl", () => {
  it("prefers the site URL from the Netlify context, then URL, then NEXT_PUBLIC_SITE_URL", () => {
    expect(cronBaseUrl({ site: { url: "https://blumora.at/" } }, { URL: "https://x.netlify.app" })).toBe("https://blumora.at");
    expect(cronBaseUrl(undefined, { URL: "https://x.netlify.app" })).toBe("https://x.netlify.app");
    expect(cronBaseUrl({}, { NEXT_PUBLIC_SITE_URL: "https://blumora.at" })).toBe("https://blumora.at");
    expect(cronBaseUrl({}, {})).toBeNull();
  });
});

describe("triggerCron", () => {
  it("does nothing and logs a clear message without CRON_SECRET", async () => {
    const fetchImpl = vi.fn();
    const log = silent();
    const r = await triggerCron("/api/cron/review-requests", { site: { url: "https://blumora.at" } }, { env: {}, fetchImpl, log });
    expect(r).toEqual({ ok: false, status: "skipped" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(log.error.mock.calls[0][0]).toMatch(/CRON_SECRET ist nicht gesetzt/);
  });

  it("calls the endpoint on the site with the bearer token", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true, sent: 1 }), { status: 200 }));
    const r = await triggerCron("/api/cron/review-requests", { site: { url: "https://blumora.at" } }, { env: { CRON_SECRET: "s3cret" }, fetchImpl, log: silent() });
    expect(r).toEqual({ ok: true, status: 200, body: { ok: true, sent: 1 } });
    expect(fetchImpl).toHaveBeenCalledWith("https://blumora.at/api/cron/review-requests", expect.objectContaining({ method: "POST", headers: { Authorization: "Bearer s3cret" } }));
  });

  it("reports HTTP and network errors without throwing", async () => {
    const log = silent();
    const denied = await triggerCron("/api/cron/reminders", undefined, { env: { CRON_SECRET: "x", URL: "https://blumora.at" }, fetchImpl: async () => new Response("{}", { status: 401 }), log });
    expect(denied).toMatchObject({ ok: false, status: 401 });
    const down = await triggerCron("/api/cron/reminders", undefined, { env: { CRON_SECRET: "x", URL: "https://blumora.at" }, fetchImpl: async () => { throw new Error("ECONNRESET"); }, log });
    expect(down).toEqual({ ok: false, status: "error" });
    expect(log.error).toHaveBeenCalledTimes(2);
  });
});
