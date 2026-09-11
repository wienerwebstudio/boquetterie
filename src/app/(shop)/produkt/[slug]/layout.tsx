import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/cms";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

/**
 * Resolves the product *before* the page's loading boundary. The page itself
 * streams behind `loading.tsx`, so a `notFound()` thrown there arrives after the
 * shell was flushed and the response keeps status 200. Throwing here – outside the
 * Suspense boundary – yields a real 404 for unknown slugs (SEO, monitoring, tests).
 */
export default async function ProductLayout({ children, params }: Props) {
  const { slug } = await params;
  if (!(await getProductBySlug(slug))) notFound();
  return children;
}
