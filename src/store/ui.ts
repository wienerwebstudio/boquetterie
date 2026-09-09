"use client";
import { create } from "zustand";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  image?: string;
  action?: { label: string; onClick: () => void };
}

interface UiState {
  cartOpen: boolean;
  searchOpen: boolean;
  menuOpen: boolean;
  toasts: Toast[];
  openCart: () => void;
  closeCart: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  setMenuOpen: (v: boolean) => void;
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

export const useUi = create<UiState>((set, get) => ({
  cartOpen: false,
  searchOpen: false,
  menuOpen: false,
  toasts: [],
  openCart: () => set({ cartOpen: true, searchOpen: false, menuOpen: false }),
  closeCart: () => set({ cartOpen: false }),
  openSearch: () => set({ searchOpen: true, cartOpen: false, menuOpen: false }),
  closeSearch: () => set({ searchOpen: false }),
  setMenuOpen: (menuOpen) => set({ menuOpen, cartOpen: false, searchOpen: false }),
  toast: (t) => {
    const id = Math.random().toString(36).slice(2);
    set({ toasts: [...get().toasts, { ...t, id }] });
    setTimeout(() => get().dismissToast(id), 4200);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
