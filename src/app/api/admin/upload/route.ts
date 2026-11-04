import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { MAX_UPLOAD_BYTES, saveUpload, UploadError } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/upload – multipart/form-data with field `file`.
 * The proxy already rejects unauthenticated requests; the check is repeated here
 * so the route stays safe should the matcher ever change.
 * Returns { ok: true, url, key, width, height, bytes }.
 */
export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { scope: "admin-upload", limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized", message: "Nicht angemeldet." }, { status: 401 });
  }

  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ ok: false, message: "Die Datei ist zu groß (maximal 15 MB)." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage (multipart/form-data erwartet)." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Es wurde keine Datei übermittelt." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, message: "Die Datei ist zu groß (maximal 15 MB)." }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await saveUpload({ buffer, filename: file.name, mime: file.type });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ ok: false, message: e.message }, { status: e.status });
    console.error("[upload] failed", e);
    return NextResponse.json({ ok: false, message: "Der Upload ist fehlgeschlagen." }, { status: 500 });
  }
}
