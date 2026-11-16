import { Lock } from "lucide-react";
import { Banner } from "@/components/admin/controls";
import { AdminLoginForm } from "@/components/admin/login-form";
import { isAdminConfigured, safeAdminRedirect } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const next = safeAdminRedirect(typeof sp.next === "string" ? sp.next : null);
  const configured = isAdminConfigured();
  const count = (key: string) => {
    const n = Number(typeof sp[key] === "string" ? sp[key] : NaN);
    return Number.isInteger(n) && n >= 0 && n <= 60 ? n : null;
  };
  const attemptsLeft = count("versuche");
  const waitMinutes = count("minuten");

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
        {error === "invalid" && (
          <Banner tone="error" className="mb-4">
            <strong>Das Passwort ist nicht korrekt.</strong> Bitte auf Groß- und Kleinschreibung achten.
            {attemptsLeft !== null && (attemptsLeft > 0
              ? ` Noch ${attemptsLeft} ${attemptsLeft === 1 ? "Versuch" : "Versuche"}, danach ist die Anmeldung für bis zu 10 Minuten gesperrt.`
              : " Das war der letzte Versuch – die Anmeldung ist jetzt für bis zu 10 Minuten gesperrt.")}
          </Banner>
        )}
        {error === "locked" && (
          <Banner tone="error" className="mb-4">
            <strong>Zu viele Anmeldeversuche.</strong> Aus Sicherheitsgründen ist die Anmeldung vorübergehend gesperrt
            {waitMinutes ? ` – bitte in ${waitMinutes} ${waitMinutes === 1 ? "Minute" : "Minuten"} noch einmal versuchen.` : ". Bitte in einigen Minuten noch einmal versuchen."}
          </Banner>
        )}
        {error === "config" && configured && <Banner tone="error" className="mb-4">Die Anmeldung ist serverseitig nicht konfiguriert.</Banner>}

        <AdminLoginForm next={next} disabled={!configured} />
        <p className="mt-4 text-center text-[12px] text-ink-soft">Die Sitzung bleibt 12 Stunden aktiv.</p>
      </div>
    </div>
  );
}
