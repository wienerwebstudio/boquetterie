import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { MAX_OUTREACH_VIDEO_BYTES, saveOutreachFile, UploadError, type OutreachUploadPurpose } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PURPOSES: OutreachUploadPurpose[] = ["attachment", "header", "poster", "video"];

/**
 * POST /api/admin/outreach/upload – multipart/form-data with `file` and `purpose`
 * (attachment | header | poster | video). Admin only. Limits: see saveOutreachFile.
 */
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { scope: "admin-outreach-upload", limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, message: "Nicht angemeldet." }, { status: 401 });
  }
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_OUTREACH_VIDEO_BYTES + 64 * 1024) {
    return NextResponse.json({ ok: false, message: "Die Datei ist zu groß." }, { status: 413 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage (multipart/form-data erwartet)." }, { status: 400 });
  }
  const file = form.get("file");
  const purpose = PURPOSES.find((p) => p === form.get("purpose"));
  if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "Es wurde keine Datei übermittelt." }, { status: 400 });
  if (!purpose) return NextResponse.json({ ok: false, message: "Unbekannter Verwendungszweck." }, { status: 400 });
  try {
    const result = await saveOutreachFile({ buffer: Buffer.from(await file.arrayBuffer()), filename: file.name, purpose });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ ok: false, message: e.message }, { status: e.status });
    console.error("[outreach upload] failed", e);
    return NextResponse.json({ ok: false, message: "Der Upload ist fehlgeschlagen." }, { status: 500 });
  }
}
