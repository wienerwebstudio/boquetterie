"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem, ISODate, SizeId } from "@/types";

export interface CartState {
  items: CartItem[];
  coupon: string | null;
  hydrated: boolean;
  addItem: (item: Omit<CartItem, "id"> & { id?: string }) => string;
  updateItem: (id: string, patch: Partial<Omit<CartItem, "id">>) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  addExtra: (itemId: string, extraId: string) => void;
  removeExtra: (itemId: string, extraId: string) => void;
  setExtraQuantity: (itemId: string, extraId: string, quantity: number) => void;
  setDelivery: (itemId: string, delivery: { deliveryDate?: ISODate; postalCode?: string; windowId?: string }) => void;
  setCoupon: (code: string | null) => void;
  clear: () => void;
  setHydrated: (v: boolean) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      hydrated: false,
      addItem: (item) => {
        const id = item.id ?? uid();
        set({ items: [...get().items, { ...item, id, extras: item.extras ?? [], quantity: item.quantity || 1 }] });
        return id;
      },
      updateItem: (id, patch) =>
        set({ items: get().items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }),
      removeItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      setQuantity: (id, quantity) =>
        set({
          items: quantity <= 0
            ? get().items.filter((i) => i.id !== id)
            : get().items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        }),
      addExtra: (itemId, extraId) =>
        set({
          items: get().items.map((i) => {
            if (i.id !== itemId) return i;
            const existing = i.extras.find((e) => e.extraId === extraId);
            return {
              ...i,
              extras: existing
                ? i.extras.map((e) => (e.extraId === extraId ? { ...e, quantity: e.quantity + 1 } : e))
                : [...i.extras, { extraId, quantity: 1 }],
            };
          }),
        }),
      removeExtra: (itemId, extraId) =>
        set({ items: get().items.map((i) => (i.id === itemId ? { ...i, extras: i.extras.filter((e) => e.extraId !== extraId) } : i)) }),
      setExtraQuantity: (itemId, extraId, quantity) =>
        set({
          items: get().items.map((i) =>
            i.id === itemId
              ? { ...i, extras: quantity <= 0 ? i.extras.filter((e) => e.extraId !== extraId) : i.extras.map((e) => (e.extraId === extraId ? { ...e, quantity } : e)) }
              : i,
          ),
        }),
      setDelivery: (itemId, delivery) =>
        set({ items: get().items.map((i) => (i.id === itemId ? { ...i, ...delivery } : i)) }),
      setCoupon: (coupon) => set({ coupon }),
      clear: () => set({ items: [], coupon: null }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "boquetterie-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, coupon: s.coupon }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0);

export type SizeChoice = { sizeId: SizeId };
