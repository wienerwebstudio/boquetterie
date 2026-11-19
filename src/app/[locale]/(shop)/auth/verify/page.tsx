import type { Metadata } from "next";
import { CircleAlert, KeyRound, Mail } from "lucide-react";
import { isAuthConfigured } from "@/lib/auth/session";
import { peekLoginToken, TOKEN_TTL_MINUTES } from "@/lib/auth/tokens";
import { routes } from "@/lib/urls";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";
import { rich } from "@/components/checkout/rich-text";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return {
    title: m.account.verify.metaTitle,
    robots: { index: false, follow: false },
  };
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

type View =
  | { kind: "confirm"; token: string; email: string }
  | { kind: "disabled" }
  | { kind: "invalid" }
  | { kind: "expired" };


async function resolveView(sp: Record<string, string | string[] | undefined>): Promise<View> {
  if (!isAuthConfigured()) return { kind: "disabled" };
  const status = typeof sp.status === "string" ? sp.status : "";
  if (status === "expired") return { kind: "expired" };
  if (status === "invalid" || status === "disabled") return { kind: status };
  const token = typeof sp.token === "string" ? sp.token : "";
  const lookup = await peekLoginToken(token);
  if (lookup.status === "valid") return { kind: "confirm", token, email: lookup.email };
  return { kind: lookup.status };
}

export default async function VerifyPage({ searchParams }: Props) {
  const view = await resolveView(await searchParams);
  const { m, fmt } = await getI18n();
  const t = m.account.verify;
  const copy: Record<Exclude<View["kind"], "confirm">, { title: string; text: string }> = {
    disabled: { title: t.disabledTitle, text: t.disabledText },
    invalid: { title: t.invalidTitle, text: t.invalidText },
    expired: { title: t.expiredTitle, text: fmt(t.expiredText, { minutes: TOKEN_TTL_MINUTES }) },
  };

  return (
    <div className="container-x py-16 lg:py-24">
      <div className="mx-auto max-w-lg rounded-lg border border-line bg-white/60 p-8 text-center sm:p-10">
        {view.kind === "confirm" ? (
          <>
            <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-ivory-200 text-forest"><KeyRound className="size-6" strokeWidth={1.5} aria-hidden /></span>
            <p className="eyebrow mb-3">{t.eyebrow}</p>
            <h1 className="display-3 text-balance text-ink">{t.title}</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
              {rich(t.text, { email: <strong className="font-semibold text-ink">{view.email}</strong> })}
            </p>
            <form method="post" action="/api/auth/verify" className="mt-8">
              <input type="hidden" name="token" value={view.token} />
              <Button type="submit" size="lg" full>{t.submit}</Button>
            </form>
            <p className="mt-5 text-[12.5px] leading-relaxed text-ink-soft">{t.notYou}</p>
          </>
        ) : (
          <>
            <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-rose-100 text-burgundy"><CircleAlert className="size-6" strokeWidth={1.5} aria-hidden /></span>
            <p className="eyebrow mb-3">{t.errorEyebrow}</p>
            <h1 className="display-3 text-balance text-ink">{copy[view.kind].title}</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">{copy[view.kind].text}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {view.kind !== "disabled" && (
                <Button href={routes.account} size="lg" icon={<Mail className="size-4" aria-hidden />}>{t.newLink}</Button>
              )}
              <Button href={routes.shop} size="lg" variant={view.kind === "disabled" ? "primary" : "outline"}>{t.toShop}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
