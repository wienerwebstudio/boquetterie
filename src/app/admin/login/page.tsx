import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Banner, Field, inputCls } from "@/components/admin/controls";
import { isAdminConfigured, safeAdminRedirect } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const next = safeAdminRedirect(typeof sp.next === "string" ? sp.next : null);
  const configured = isAdminConfigured();

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4 py-12 font-sans">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-forest text-ivory"><Lock className="size-4" aria-hidden /></span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">Verwaltung</h1>
            <p className="text-[13px] text-ink-muted">Bitte mit dem Admin-Passwort anmelden.</p>
          </div>
        </div>

        {!configured && (
          <Banner tone="warn" className="mb-4">
            <strong>ADMIN_PASSWORD ist nicht konfiguriert.</strong> Bitte die Umgebungsvariable <code>ADMIN_PASSWORD</code> (und idealerweise <code>ADMIN_SECRET</code>) setzen – siehe <code>.env.example</code>. Solange sie fehlt, ist keine Anmeldung möglich.
          </Banner>
        )}
        {error === "invalid" && <Banner tone="error" className="mb-4">Das Passwort ist nicht korrekt.</Banner>}
        {error === "config" && configured && <Banner tone="error" className="mb-4">Die Anmeldung ist serverseitig nicht konfiguriert.</Banner>}

        <form method="post" action="/api/admin/login" className="space-y-4 rounded-lg border border-line bg-white p-6">
          <input type="hidden" name="next" value={next} />
          <Field label="Passwort" htmlFor="password" required>
            <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus disabled={!configured} className={inputCls} />
          </Field>
          <Button type="submit" full disabled={!configured}>Anmelden</Button>
        </form>
        <p className="mt-4 text-center text-[12px] text-ink-soft">Die Sitzung bleibt 12 Stunden aktiv.</p>
      </div>
    </div>
  );
}
