import type { Metadata } from "next";
import { NotFoundView } from "@/components/content/not-found-view";

export const metadata: Metadata = { title: "Seite nicht gefunden", robots: { index: false } };

export default function NotFound() {
  return <NotFoundView />;
}
