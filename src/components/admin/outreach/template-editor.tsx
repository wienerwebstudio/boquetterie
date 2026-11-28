"use client";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Bold, FileText, ImageIcon, Link2, List, Loader2, Monitor, Paperclip, Smartphone, Trash2, Upload, Video, X } from "lucide-react";
import { saveOutreachTemplateAction, sendOutreachTestAction } from "@/app/admin/outreach/actions";
import { Banner, Card, Field, inputCls } from "@/components/admin/controls";
import { formatBytes, missingPlaceholders, PLACEHOLDERS, TEMPLATE_CATEGORY_LABELS, type ContactLike } from "@/lib/outreach/format";
import { renderOutreachMail, SAMPLE_CONTACT, type OutreachBrand } from "@/lib/outreach/render";
import { OUTREACH_CATEGORIES, type OutreachFile, type OutreachLanguage, type OutreachTemplate, type OutreachTemplateCategory, type OutreachVideo } from "@/types/outreach";
import { cn } from "@/lib/format";
import { btnOutline, btnPrimary } from "./bits";

export interface PreviewContact extends ContactLike {
  id: string;
  label: string;
}

type Purpose = "attachment" | "header" | "poster" | "video";
interface UploadResult extends OutreachFile { playUrl?: string; playKey?: string }

const MAX_TOTAL = 20 * 1024 * 1024;
const CATEGORIES: OutreachTemplateCategory[] = [...OUTREACH_CATEGORIES, "allgemein", "nachfassen"];

async function upload(file: File, purpose: Purpose): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("purpose", purpose);
  let res: Response;
  try {
    res = await fetch("/api/admin/outreach/upload", { method: "POST", body: form });
  } catch {
    throw new Error("Keine Verbindung zum Server.");
  }
  const data = (await res.json().catch(() => ({}))) as Partial<UploadResult> & { ok?: boolean; message?: string };
  if (!res.ok || !data.ok || !data.key) {
    throw new Error(data.message ?? (res.status === 413 ? "Die Datei ist zu groß für den Upload." : res.status === 401 ? "Sitzung abgelaufen – bitte neu anmelden." : "Der Upload ist fehlgeschlagen."));
  }
  return data as UploadResult;
}

type TextField = "subject" | "headline" | "body";

export function TemplateEditor({ template, brand, contacts, defaultTestTo }: {
  template?: OutreachTemplate;
  brand: OutreachBrand;
  contacts: PreviewContact[];
  defaultTestTo: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState<OutreachTemplateCategory>(template?.category ?? "allgemein");
  const [language, setLanguage] = useState<OutreachLanguage>(template?.language ?? "de");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [headline, setHeadline] = useState(template?.headline ?? "");
  const [body, setBody] = useState(template?.body ?? "{Anrede}\n\n");
  const [headerImage, setHeaderImage] = useState<OutreachFile | undefined>(template?.headerImage);
  const [attachments, setAttachments] = useState<OutreachFile[]>(template?.attachments ?? []);
  const [video, setVideo] = useState<OutreachVideo | undefined>(template?.video);
  const [videoMode, setVideoMode] = useState<"none" | "upload" | "link">(template?.video ? (template.video.file ? "upload" : "link") : "none");
  const [busy, setBusy] = useState<Purpose | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testTo, setTestTo] = useState(defaultTestTo);
  const [previewId, setPreviewId] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [pending, start] = useTransition();
  const [testing, startTest] = useTransition();

  const subjectRef = useRef<HTMLInputElement>(null);
  const headlineRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastField = useRef<TextField>("body");
  const setters: Record<TextField, (v: string) => void> = { subject: setSubject, headline: setHeadline, body: setBody };
  const values: Record<TextField, string> = { subject, headline, body };

  /** Replaces the selection of the field with `make(selected)` and puts the cursor after it. */
  const edit = (field: TextField, make: (selected: string) => string) => {
    const el = field === "subject" ? subjectRef.current : field === "headline" ? headlineRef.current : bodyRef.current;
    const value = values[field];
    const startPos = el?.selectionStart ?? value.length;
    const endPos = el?.selectionEnd ?? value.length;
    const insert = make(value.slice(startPos, endPos));
    setters[field](value.slice(0, startPos) + insert + value.slice(endPos));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(startPos + insert.length, startPos + insert.length);
    });
  };

  const payload = { name, category, language, subject, headline, body, headerImage, attachments, video: videoMode === "none" ? undefined : video };
  const total = attachments.reduce((n, a) => n + a.bytes, 0);

  const previewContact: ContactLike = contacts.find((c) => c.id === previewId) ?? SAMPLE_CONTACT;
  const rendered = useMemo(
    () => renderOutreachMail({
      template: { subject, headline, body, headerImage, attachments, language, video: videoMode === "none" ? undefined : video },
      contact: previewContact,
      brand,
      assetBase: "",
      unsubscribeUrl: `${brand.siteUrl}/e-mail-abmelden`,
    }),
    [subject, headline, body, headerImage, attachments, language, video, videoMode, previewContact, brand],
  );
  const missing = missingPlaceholders([subject, headline, body], rendered.values);

  const doUpload = async (files: FileList | null, purpose: Purpose) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setUploadError("");
    setBusy(purpose);
    try {
      for (const file of list) {
        const r = await upload(file, purpose);
        const f: OutreachFile = { key: r.key, url: r.url, name: r.name, bytes: r.bytes, contentType: r.contentType };
        if (purpose === "attachment") setAttachments((a) => [...a, f]);
        if (purpose === "header") setHeaderImage(f);
        if (purpose === "poster") setVideo((v) => ({ url: v?.url ?? "", ...v, posterUrl: r.url, posterPlayUrl: r.playUrl }));
        if (purpose === "video") setVideo((v) => ({ ...v, url: r.url, file: f }));
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Der Upload ist fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  };

  const fileInput = (purpose: Purpose, accept: string, label: string, multiple = false) => (
    <label className={cn(btnOutline, "cursor-pointer", busy && "pointer-events-none opacity-60")}>
      {busy === purpose ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
      {label}
      <input type="file" accept={accept} multiple={multiple} className="sr-only" onChange={(e) => { void doUpload(e.target.files, purpose); e.target.value = ""; }} />
    </label>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <Card title="Vorlage">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name (intern)" htmlFor="t-name" required className="sm:col-span-2"><input id="t-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
            <Field label="Kategorie" htmlFor="t-cat">
              <select id="t-cat" value={category} onChange={(e) => setCategory(e.target.value as OutreachTemplateCategory)} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{TEMPLATE_CATEGORY_LABELS[c]}</option>)}
              </select>
            </Field>
            <Field label="Sprache" htmlFor="t-lang" hint="Bestimmt Anrede, Grußformel und Fußzeile.">
              <select id="t-lang" value={language} onChange={(e) => setLanguage(e.target.value as OutreachLanguage)} className={inputCls}>
                <option value="de">Deutsch</option>
                <option value="en">Englisch</option>
              </select>
            </Field>
          </div>
        </Card>

        <Card title="Text" description="Platzhalter anklicken – sie landen an der Stelle des Cursors (Betreff, Überschrift oder Text).">
          <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Platzhalter einfügen">
            {PLACEHOLDERS.map((p) => (
              <button
                key={p}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => edit(lastField.current, () => `{${p}}`)}
                className="rounded-full border border-forest/30 bg-[#e4ebe0] px-3 py-1 font-mono text-[12px] font-semibold text-forest hover:border-forest"
              >
                {`{${p}}`}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            <Field label="Betreff" htmlFor="t-subject" required>
              <input id="t-subject" ref={subjectRef} value={subject} onFocus={() => (lastField.current = "subject")} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Überschrift (optional)" htmlFor="t-headline" hint="Groß in Serifenschrift über dem Text. Leer lassen für eine schlichte, briefartige Mail.">
              <input id="t-headline" ref={headlineRef} value={headline} onFocus={() => (lastField.current = "headline")} onChange={(e) => setHeadline(e.target.value)} className={inputCls} />
            </Field>
            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="t-body" className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Text <span className="text-danger" aria-hidden>*</span></label>
                <div className="flex gap-1" role="toolbar" aria-label="Formatierung">
                  <button type="button" title="Fett (**Text**)" aria-label="Fett" onMouseDown={(e) => e.preventDefault()} onClick={() => edit("body", (s) => `**${s || "fett"}**`)} className="rounded border border-line bg-white p-1.5 hover:border-forest"><Bold className="size-4" aria-hidden /></button>
                  <button
                    type="button"
                    title="Link ([Text](https://…))"
                    aria-label="Link"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const url = prompt("Adresse des Links (https://…)", "https://blumora.at");
                      if (url && /^https?:\/\/\S+$/.test(url.trim())) edit("body", (s) => `[${s || "Linktext"}](${url.trim()})`);
                    }}
                    className="rounded border border-line bg-white p-1.5 hover:border-forest"
                  >
                    <Link2 className="size-4" aria-hidden />
                  </button>
                  <button type="button" title="Liste (- Punkt)" aria-label="Liste" onMouseDown={(e) => e.preventDefault()} onClick={() => edit("body", (s) => (s ? s.split("\n").map((l) => (l.startsWith("- ") ? l : `- ${l}`)).join("\n") : "\n- "))} className="rounded border border-line bg-white p-1.5 hover:border-forest"><List className="size-4" aria-hidden /></button>
                </div>
              </div>
              <textarea
                id="t-body"
                ref={bodyRef}
                rows={18}
                value={body}
                onFocus={() => (lastField.current = "body")}
                onChange={(e) => setBody(e.target.value)}
                className={`${inputCls} h-auto py-3 font-mono text-[13px] leading-relaxed`}
              />
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
                Leerzeile = neuer Absatz · <code>**fett**</code> · <code>[Linktext](https://…)</code> · Zeilen mit <code>- </code> am Anfang = Aufzählung. Grußformel, Signatur und Abmeldelink kommen automatisch dazu.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Bilder, Anhänge & Video">
          <div className="space-y-6">
            <div>
              <p className="text-[13px] font-semibold text-ink">Kopfbild (optional)</p>
              <p className="mb-2 text-[12px] text-ink-soft">Breites Foto oben in der Mail, ideal 1200 × 600 px.</p>
              {headerImage ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file */}
                  <img src={headerImage.url} alt="" className="h-16 w-28 rounded object-cover" />
                  <span className="text-[13px] text-ink-muted">{headerImage.name}</span>
                  <button type="button" onClick={() => setHeaderImage(undefined)} className="rounded p-1 text-ink-soft hover:text-danger" aria-label="Kopfbild entfernen"><X className="size-4" aria-hidden /></button>
                </div>
              ) : fileInput("header", "image/jpeg,image/png,image/webp,image/avif", "Kopfbild hochladen")}
            </div>

            <div>
              <p className="text-[13px] font-semibold text-ink">Anhänge</p>
              <p className="mb-2 text-[12px] text-ink-soft">PDFs (bis 10 MB) und Bilder, zusammen höchstens 20 MB. Werden als echte Anhänge mitgeschickt und unten in der Mail genannt.</p>
              {attachments.length > 0 && (
                <ul className="mb-3 space-y-1.5">
                  {attachments.map((a, i) => (
                    <li key={a.key} className="flex items-center gap-2 rounded-md border border-line bg-ivory-100/60 px-3 py-2 text-[13px]">
                      {a.contentType === "application/pdf" ? <FileText className="size-4 text-burgundy" aria-hidden /> : <ImageIcon className="size-4 text-burgundy" aria-hidden />}
                      <input
                        value={a.name}
                        onChange={(e) => setAttachments((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                        aria-label="Dateiname im Anhang"
                        className="min-w-0 flex-1 bg-transparent outline-none focus:underline"
                      />
                      <span className="text-ink-soft">{formatBytes(a.bytes)}</span>
                      <button type="button" onClick={() => setAttachments((list) => list.filter((_, j) => j !== i))} className="rounded p-1 text-ink-soft hover:text-danger" aria-label={`${a.name} entfernen`}><Trash2 className="size-3.5" aria-hidden /></button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {fileInput("attachment", "application/pdf,image/jpeg,image/png,image/webp,image/avif", "Anhang hinzufügen", true)}
                <span className={cn("text-[12px]", total > MAX_TOTAL ? "font-semibold text-danger" : "text-ink-soft")}><Paperclip className="mr-1 inline size-3.5" aria-hidden />{formatBytes(total)} von 20 MB</span>
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-ink">Video</p>
              <p className="mb-2 text-[12px] text-ink-soft">Videos werden nie angehängt: Die Mail zeigt ein Vorschaubild mit Play-Knopf, ein Klick öffnet das Video.</p>
              <div className="mb-3 flex flex-wrap gap-4 text-[14px]">
                {([["none", "Kein Video"], ["upload", "Video hochladen"], ["link", "Link einfügen (YouTube, Vimeo …)"]] as const).map(([m, l]) => (
                  <label key={m} className="inline-flex items-center gap-2"><input type="radio" name="video-mode" checked={videoMode === m} onChange={() => setVideoMode(m)} className="accent-forest" />{l}</label>
                ))}
              </div>
              {videoMode !== "none" && (
                <div className="space-y-3 rounded-md border border-line p-3">
                  {videoMode === "upload" ? (
                    video?.file ? (
                      <p className="flex items-center gap-2 text-[13px]"><Video className="size-4 text-burgundy" aria-hidden />{video.file.name} · {formatBytes(video.file.bytes)}
                        <button type="button" onClick={() => setVideo((v) => (v ? { ...v, file: undefined, url: "" } : v))} className="rounded p-1 text-ink-soft hover:text-danger" aria-label="Video entfernen"><X className="size-4" aria-hidden /></button>
                      </p>
                    ) : fileInput("video", "video/mp4,video/quicktime,video/webm", "Video hochladen (MP4, MOV, WebM)")
                  ) : (
                    <Field label="Video-Link" htmlFor="t-video-url">
                      <input id="t-video-url" value={video?.file ? "" : video?.url ?? ""} onChange={(e) => setVideo((v) => ({ ...v, file: undefined, url: e.target.value.trim() }))} placeholder="https://www.youtube.com/watch?v=…" className={inputCls} />
                    </Field>
                  )}
                  <Field label="Beschriftung" htmlFor="t-video-label" hint={`Leer = „${language === "en" ? "Watch the video" : "Video ansehen"}“`}>
                    <input id="t-video-label" value={video?.label ?? ""} onChange={(e) => setVideo((v) => ({ url: v?.url ?? "", ...v, label: e.target.value }))} className={inputCls} />
                  </Field>
                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Vorschaubild</p>
                    {video?.posterUrl ? (
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file */}
                        <img src={video.posterPlayUrl ?? video.posterUrl} alt="" className="h-16 w-28 rounded object-cover" />
                        <span className="text-[12px] text-ink-muted">Play-Knopf wird automatisch eingesetzt.</span>
                        <button type="button" onClick={() => setVideo((v) => (v ? { ...v, posterUrl: undefined, posterPlayUrl: undefined } : v))} className="rounded p-1 text-ink-soft hover:text-danger" aria-label="Vorschaubild entfernen"><X className="size-4" aria-hidden /></button>
                      </div>
                    ) : fileInput("poster", "image/jpeg,image/png,image/webp,image/avif", "Vorschaubild hochladen")}
                  </div>
                </div>
              )}
            </div>
            {uploadError && <Banner tone="error">{uploadError}</Banner>}
          </div>
        </Card>

        {msg && <Banner tone={msg.ok ? "success" : "error"}>{msg.text}</Banner>}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending || Boolean(busy)}
            className={btnPrimary}
            onClick={() => {
              setMsg(null);
              start(async () => {
                const r = await saveOutreachTemplateAction(template?.id ?? null, payload);
                setMsg({ ok: r.ok, text: r.message });
                if (r.ok && !template && r.id) router.replace(`/admin/outreach/vorlagen/${r.id}`);
                else if (r.ok) router.refresh();
              });
            }}
          >
            {pending ? "Wird gespeichert …" : "Vorlage speichern"}
          </button>
        </div>
      </div>

      <div className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
        <Card
          title="Vorschau"
          actions={
            <div className="flex rounded-md border border-line p-0.5" role="group" aria-label="Ansicht">
              <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")} className={cn("rounded p-1.5", device === "desktop" ? "bg-forest text-ivory" : "text-ink-muted")} aria-label="Desktop"><Monitor className="size-4" aria-hidden /></button>
              <button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")} className={cn("rounded p-1.5", device === "mobile" ? "bg-forest text-ivory" : "text-ink-muted")} aria-label="Handy"><Smartphone className="size-4" aria-hidden /></button>
            </div>
          }
        >
          <Field label="Vorschau für" htmlFor="t-preview">
            <select id="t-preview" value={previewId} onChange={(e) => setPreviewId(e.target.value)} className={inputCls}>
              <option value="">Beispielkontakt (Frau Anna Huber, Beispiel GmbH)</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <p className="mt-3 text-[13px] text-ink-muted"><span className="font-semibold text-ink">Betreff:</span> {rendered.subject || "–"}</p>
          {missing.length > 0 && (
            <p className="mt-2 text-[12px] text-warn">Ohne Wert bei diesem Kontakt: {missing.map((m) => `{${m}}`).join(", ")} – der Platzhalter bleibt dann leer.</p>
          )}
          <div className="mt-3 overflow-hidden rounded-md border border-line bg-[#faf7f2]">
            <iframe
              title="Vorschau der E-Mail"
              srcDoc={rendered.html}
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              className="mx-auto block h-[760px] border-0 bg-[#faf7f2] transition-[width]"
              style={{ width: device === "mobile" ? 375 : "100%" }}
            />
          </div>
        </Card>
        <Card title="Test-Mail" description="Schickt diese Fassung (auch ungespeichert) mit „[TEST]“ im Betreff an eine Adresse eurer Wahl – mit dem Kontakt aus der Vorschau.">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setTestMsg(null);
              startTest(async () => {
                const r = await sendOutreachTestAction(payload, testTo, previewId || undefined);
                setTestMsg({ ok: r.ok, text: r.message });
              });
            }}
          >
            <label htmlFor="t-test-to" className="sr-only">Empfänger der Test-Mail</label>
            <input id="t-test-to" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} required className={inputCls} />
            <button type="submit" disabled={testing} className={cn(btnOutline, "shrink-0")}>{testing ? "Wird gesendet …" : "Test-Mail senden"}</button>
          </form>
          {testMsg && <p role="status" className={`mt-2 text-[13px] ${testMsg.ok ? "text-success" : "text-danger"}`}>{testMsg.text}</p>}
        </Card>
      </div>
    </div>
  );
}
