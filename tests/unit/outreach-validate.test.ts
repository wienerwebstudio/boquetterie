import { describe, expect, it } from "vitest";
import { keyOfUrl, parseContactInput, parseTemplateInput } from "@/lib/outreach/validate";

const urlOf = (key: string) => `/media/${key}`;
const base = { name: "Hotel", subject: "Hallo {Firma}", body: "{Anrede}\n\nText", category: "hotel", language: "de" };

describe("template input", () => {
  it("requires name, subject and body", () => {
    expect(parseTemplateInput({ ...base, name: "" }, urlOf)).toMatchObject({ ok: false });
    expect(parseTemplateInput({ ...base, subject: " " }, urlOf)).toMatchObject({ ok: false });
    expect(parseTemplateInput({ ...base, body: "" }, urlOf)).toMatchObject({ ok: false });
  });
  it("accepts files only by valid storage key and recomputes the URL", () => {
    const r = parseTemplateInput({
      ...base,
      attachments: [
        { key: "outreach/2026/11/preise-1a2b3c4d.pdf", url: "https://evil.example/x.pdf", name: "Preise.pdf", bytes: 1000 },
        { key: "../../etc/passwd", name: "x" },
        { key: "outreach/2026/11/video-1a2b3c4d.mp4", name: "v.mp4", bytes: 10 },
      ],
      headerImage: { key: "outreach/2026/11/kopf-1a2b3c4d.jpg" },
    }, urlOf);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.attachments).toEqual([{ key: "outreach/2026/11/preise-1a2b3c4d.pdf", url: "/media/outreach/2026/11/preise-1a2b3c4d.pdf", name: "Preise.pdf", bytes: 1000, contentType: "application/pdf" }]);
    expect(r.value.headerImage?.url).toBe("/media/outreach/2026/11/kopf-1a2b3c4d.jpg");
  });
  it("limits the attachments to 20 MB in total", () => {
    const big = (i: number) => ({ key: `outreach/2026/11/a${i}-1a2b3c4d.pdf`, name: `a${i}.pdf`, bytes: 8 * 1024 * 1024 });
    expect(parseTemplateInput({ ...base, attachments: [big(1), big(2)] }, urlOf)).toMatchObject({ ok: true });
    expect(parseTemplateInput({ ...base, attachments: [big(1), big(2), big(3)] }, urlOf)).toMatchObject({ ok: false });
  });
  it("takes a pasted https video link or an uploaded video, with poster", () => {
    const r = parseTemplateInput({ ...base, video: { url: "https://vimeo.com/1", posterUrl: "/media/outreach/2026/11/p-1a2b3c4d.jpg", posterPlayUrl: "/media/outreach/2026/11/p-play-1a2b3c4d.jpg" } }, urlOf);
    expect(r.ok && r.value.video).toMatchObject({ url: "https://vimeo.com/1", posterUrl: "/media/outreach/2026/11/p-1a2b3c4d.jpg", posterPlayUrl: "/media/outreach/2026/11/p-play-1a2b3c4d.jpg" });
    expect(parseTemplateInput({ ...base, video: { url: "javascript:alert(1)" } }, urlOf)).toMatchObject({ ok: false });
    const up = parseTemplateInput({ ...base, video: { url: "ignored", file: { key: "outreach/2026/11/film-1a2b3c4d.mp4", bytes: 5 } } }, urlOf);
    expect(up.ok && up.value.video?.url).toBe("/media/outreach/2026/11/film-1a2b3c4d.mp4");
  });
  it("finds the storage key in a URL", () => {
    expect(keyOfUrl("https://cdn.example/uploads/outreach/2026/11/p-1a2b3c4d.jpg")).toBe("outreach/2026/11/p-1a2b3c4d.jpg");
    expect(keyOfUrl("/images/x.jpg")).toBe("");
  });
});

describe("contact input", () => {
  it("validates and normalises", () => {
    const r = parseContactInput({ email: " Anna@Huber.AT ", website: "huber.at", salutation: "frau", category: "hotel", status: "termin", tags: "a, b, a" });
    expect(r).toMatchObject({ ok: true, value: { email: "anna@huber.at", website: "https://huber.at", salutation: "frau", category: "hotel", status: "termin", tags: ["a", "b"] } });
    expect(parseContactInput({ email: "kaputt" })).toMatchObject({ ok: false });
    expect(parseContactInput({ email: "a@b.at", category: "x", status: "y", salutation: "z" })).toMatchObject({ ok: true, value: { category: "sonstiges", status: "neu", salutation: "" } });
  });
});
