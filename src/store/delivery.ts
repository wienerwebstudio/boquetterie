"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DeliveryZone, ISODate } from "@/types";

/** Remembers the PLZ (and resolved zone) the visitor checked, across pages. */
interface DeliveryState {
  postalCode: string;
  zone: DeliveryZone | null;
  checked: boolean;
  preferredDate: ISODate | null;
  setResult: (postalCode: string, zone: DeliveryZone | null) => void;
  setPreferredDate: (date: ISODate | null) => void;
  reset: () => void;
}

export const useDeliveryContext = create<DeliveryState>()(
  persist(
    (set) => ({
      postalCode: "",
      zone: null,
      checked: false,
      preferredDate: null,
      setResult: (postalCode, zone) => set({ postalCode, zone, checked: true }),
      setPreferredDate: (preferredDate) => set({ preferredDate }),
      reset: () => set({ postalCode: "", zone: null, checked: false, preferredDate: null }),
    }),
    { name: "boquetterie-delivery", storage: createJSONStorage(() => sessionStorage) },
  ),
);
