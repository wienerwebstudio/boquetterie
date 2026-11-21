"use client";
import { Heart } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/format";
import { useFavorites } from "@/store/favorites";
import { useI18n } from "@/i18n/client";

const subscribeNoop = () => () => {};
const useMounted = () => useSyncExternalStore(subscribeNoop, () => true, () => false);

/**
 * The only interactive part of a product card. Kept as its own small client
 * component so the card itself renders on the server and no product data has
 * to be serialised for hydration.
 */
export function FavoriteButton({ slug, name, className }: { slug: string; name: string; className?: string }) {
  const mounted = useMounted();
  const { m, fmt } = useI18n();
  const fav = useFavorites((s) => s.slugs.includes(slug));
  const toggle = useFavorites((s) => s.toggle);
  const active = mounted && fav;
  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={active}
      aria-label={fmt(active ? m.shop.card.removeFavorite : m.shop.card.addFavorite, { name })}
      className={cn("inline-flex size-9 items-center justify-center rounded-full bg-white/85 text-ink shadow-soft backdrop-blur transition-all hover:scale-105 hover:text-burgundy", className)}
    >
      <Heart className={cn("size-4 transition-colors", active && "fill-burgundy text-burgundy")} strokeWidth={1.6} />
    </button>
  );
}
