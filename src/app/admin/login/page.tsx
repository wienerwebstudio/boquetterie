import { Flower2, Lock, ShieldCheck } from "lucide-react";
import { getSettings } from "@/lib/cms";
import { Banner } from "@/components/admin/controls";
import { AdminLoginForm } from "@/components/admin/login-form";
import { isAdminConfigured, safeAdminRedirect } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const next = safeAdminRedirect(typeof sp.next === "string" ? sp.next : null);
  const configured = isAdminConfigured();
  const settings = await getSettings();
  const count = (key: string) => {
    const n = Number(typeof sp[key] === "string" ? sp[key] : NaN);
    return Number.isInteger(n) && n >= 0 && n <= 60 ? n : null;
  };
  const attemptsLeft = count("versuche");
  const waitMinutes = count("minuten");

  return (
    <div className="flex min-h-screen font-sans">
      {/* Decorative brand panel */}
      <aside className="bl-sidebar relative hidden w-[44%] max-w-[620px] flex-col justify-between overflow-hidden p-12 text-white lg:flex" aria-hidden>
        <span className="pointer-events-none absolute -left-20 top-24 size-72 rounded-full bg-[#d6406d]/30 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-24 right-0 size-80 rounded-full bg-[#0f8f8f]/40 blur-3xl" />
        <span className="pointer-events-none absolute right-24 top-10 size-40 rounded-full bg-[#f0a020]/20 blur-3xl" />
        <svg className="pointer-events-none absolute -right-24 bottom-24 size-[420px] text-white/[0.06]" viewBox="0 0 100 100">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => (
            <ellipse key={r} cx="50" cy="26" rx="11" ry="24" fill="currentColor" transform={`rotate(${r} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="8" fill="currentColor" />
        </svg>
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#f8a9c1_-20%,#d6406d_45%,#e0532f_110%)] shadow-[0_8px_20px_-8px_rgba(214,64,109,0.9)]">
            <Flower2 className="size-5" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">{settings.brand.name}</span>
        </div>
        <div className="relative">
          <p className="text-[34px] font-bold leading-tight tracking-tight">Bestellungen, Sortiment<br />und Inhalte an einem Ort.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[["#7ee2b8", "Bestellungen"], ["#f8a9c1", "Sortiment"], ["#fbd27a", "Verkauf"], ["#c7b5fc", "Inhalte"], ["#9ccbfa", "System"]].map(([c, l]) => (
              <span key={l} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-medium ring-1 ring-white/15">
                <span className="size-2 rounded-full" style={{ background: c }} />{l}
              </span>
            ))}
          </div>
        </div>
      </aside>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#f6f4ef] px-4 py-12">
        <span className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[#fde8ee] blur-3xl" aria-hidden />
        <span className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-[#dff5f4] blur-3xl" aria-hidden />
        <div className="relative w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#1f3a2d,#0f8f8f)] text-white shadow-[0_8px_20px_-10px_rgba(15,143,143,0.9)]"><Lock className="size-[18px]" aria-hidden /></span>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-ink">Verwaltung</h1>
            <p className="text-[13px] text-[#5f5c56]">Bitte mit dem Admin-Passwort anmelden.</p>
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
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12px] text-[#5f5c56]"><ShieldCheck className="size-3.5 text-[#0f9466]" aria-hidden />Die Sitzung bleibt 12 Stunden aktiv.</p>
        </div>
      </div>
    </div>
  );
}
