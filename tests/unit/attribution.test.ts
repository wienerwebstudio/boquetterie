import { describe, expect, it } from "vitest";
import { attributionFromTouch, sanitizeAttribution, sanitizeVisitorId } from "@/lib/attribution";

const touch = (referrer: string, url = "https://blumora.at/") => attributionFromTouch({ referrer, url, ownHosts: ["blumora.at"] });

describe("attribution", () => {
  it("classifies the channels seen on blumora.at", () => {
    expect(touch("", "https://blumora.at/lieferung?utm_source=chatgpt.com").channel).toBe("chatgpt");
    expect(touch("https://chatgpt.com/").channel).toBe("chatgpt");
    expect(touch("https://www.google.com/").channel).toBe("google");
    expect(touch("android-app://com.google.android.googlequicksearchbox/").channel).toBe("google");
    expect(touch("https://www.google.com/", "https://blumora.at/?gclid=abc").channel).toBe("google_ads");
    expect(touch("https://l.instagram.com/", "https://blumora.at/?utm_source=ig").channel).toBe("instagram");
    expect(touch("https://de.trustpilot.com/review/blumora.at").channel).toBe("trustpilot");
    expect(touch("https://www.perplexity.ai/").channel).toBe("perplexity");
    expect(touch("", "https://blumora.at/?utm_source=newsletter&utm_medium=email").channel).toBe("email");
    expect(touch("https://www.meinbezirk.at/wien").channel).toBe("referral");
    expect(touch("").channel).toBe("direct");
    expect(touch("https://blumora.at/blumen").channel).toBe("direct");
  });

  it("keeps the hints short and drops query strings from the landing page", () => {
    const a = touch("https://www.google.com/search?q=blumen", "https://blumora.at/produkt/amour?utm_source=Google&x=1");
    expect(a).toMatchObject({ channel: "google", referrer_domain: "google.com", utm_source: "Google", landing: "/produkt/amour" });
  });

  it("validates what the browser sends", () => {
    expect(sanitizeAttribution({ channel: "chatgpt", referrer_domain: "chatgpt.com", landing: "/en/flowers" })).toEqual({ channel: "chatgpt", referrer_domain: "chatgpt.com", landing: "/en/flowers" });
    expect(sanitizeAttribution({ channel: "evil" })).toBeUndefined();
    expect(sanitizeAttribution({ channel: "google", referrer_domain: "<script>", landing: "/x?email=a@b.c", utm_source: "a\"b" })).toEqual({ channel: "google" });
    expect(sanitizeVisitorId("3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90")).toBe("3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90");
    expect(sanitizeVisitorId("abc")).toBeUndefined();
  });
});
