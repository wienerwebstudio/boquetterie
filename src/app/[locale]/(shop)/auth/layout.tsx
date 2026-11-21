import { ClientMessages } from "@/i18n/scope";

/** Sends the texts this page's Client Components need (see src/i18n/scope.tsx). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientMessages ns={["account"]}>{children}</ClientMessages>;
}
