import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/content";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

/**
 * Resolves the product before the page renders, so unknown slugs get a real 404
 * status (SEO, monitoring, tests). The page has no `loading.tsx` on purpose: it is
 * prerendered, and a loading boundary would ship a skeleton plus hidden content
 * that a script has to swap in – slower for the largest image.
 */
export default async function ProductLayout({ children, params }: Props) {
  const { slug } = await params;
  if (!(await getProductBySlug(slug))) notFound();
  return children;
}
