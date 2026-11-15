import { notFound, permanentRedirect } from "next/navigation";
import { getCategoryBySlug } from "@/lib/cms";
import { routes } from "@/lib/urls";

type Props = { children: React.ReactNode; params: Promise<{ category: string }> };

/**
 * Resolves the category *before* the page's loading boundary (same idea as
 * `produkt/[slug]/layout.tsx`): a `notFound()` thrown inside the streamed page
 * arrives after the shell was flushed and the response stays 200 – a soft 404.
 */
export default async function CategoryLayout({ children, params }: Props) {
  const { category: slug } = await params;
  if (slug === "alle") permanentRedirect(routes.shop);
  if (!(await getCategoryBySlug(slug))) notFound();
  return children;
}
