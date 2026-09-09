"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface FavoritesState {
  slugs: string[];
  toggle: (slug: string) => void;
  has: (slug: string) => boolean;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      slugs: [],
      toggle: (slug) =>
        set({ slugs: get().slugs.includes(slug) ? get().slugs.filter((s) => s !== slug) : [...get().slugs, slug] }),
      has: (slug) => get().slugs.includes(slug),
    }),
    { name: "boquetterie-favorites", storage: createJSONStorage(() => localStorage) },
  ),
);
