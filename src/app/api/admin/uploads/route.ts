import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { deleteUpload, getUploadDriver, listStaticImages, listUploads, UploadError } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function guard(req: NextRequest) {
  const limited = enforceRateLimit(req, { scope: "admin-uploads", limit: 120, windowMs: 60 * 1000 });
  if (limited) return limited;
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "unauthorized", message: "Nicht angemeldet." }, { status: 401 });
  }
  return null;
}

/**
 * GET /api/admin/uploads            → { ok, driver, items: [{ key, url, bytes, modifiedAt }] }
 * GET /api/admin/uploads?source=static → { ok, items: [{ url, bytes, modifiedAt }] } (public/images, read-only)
 */
export async function GET(req: NextRequest) {
  const blocked = await guard(req);
  if (blocked) return blocked;
  const source = req.nextUrl.searchParams.get("source");
  try {
    if (source === "static") {
      return NextResponse.json({ ok: true, source: "static", items: await listStaticImages() }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ok: true, source: "uploads", driver: getUploadDriver(), items: await listUploads() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[uploads] list failed", e);
    return NextResponse.json({ ok: false, message: "Die Medien konnten nicht geladen werden." }, { status: 500 });
  }
}

/** DELETE /api/admin/uploads?key=2026/09/bild-1a2b3c4d.jpg */
export async function DELETE(req: NextRequest) {
  const blocked = await guard(req);
  if (blocked) return blocked;
  const key = req.nextUrl.searchParams.get("key") ?? "";
  try {
    await deleteUpload(key);
    return NextResponse.json({ ok: true, key });
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ ok: false, message: e.message }, { status: e.status });
    console.error("[uploads] delete failed", e);
    return NextResponse.json({ ok: false, message: "Die Datei konnte nicht gelöscht werden." }, { status: 500 });
  }
}
