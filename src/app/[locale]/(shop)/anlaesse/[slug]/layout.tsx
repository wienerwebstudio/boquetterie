import { notFound } from "next/navigation";
import { getOccasionBySlug } from "@/lib/content";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

/** Real 404 for unknown occasions – resolved before the page's loading boundary (see `blumen/[category]/layout.tsx`). */
export default async function OccasionLayout({ children, params }: Props) {
  const { slug } = await params;
  if (!(await getOccasionBySlug(slug))) notFound();
  return children;
}
