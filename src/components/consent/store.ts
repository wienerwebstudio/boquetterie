"use client";
import { create } from "zustand";
import type { ConsentChoice, ConsentState } from "@/types/consent";
import { createConsent, persistConsent, readStoredConsent } from "./storage";

export type ConsentView = "choice" | "settings";

interface ConsentStore {
  /** null = no choice yet (or an outdated one). */
  consent: ConsentState | null;
  /** True once the stored choice was read on the client – nothing renders before. */
  hydrated: boolean;
  isOpen: boolean;
  view: ConsentView;
  /** Reads the stored choice; opens the sheet when there is none. Idempotent. */
  hydrate: () => void;
  /** Opens the sheet in the settings view – used by the "Cookie-Einstellungen" footer link. */
  open: () => void;
  /** Closes without changing anything. Only possible once a choice exists. */
  close: () => void;
  setView: (view: ConsentView) => void;
  acceptAll: () => void;
  acceptNecessary: () => void;
  save: (choice: ConsentChoice) => void;
}

export const useConsent = create<ConsentStore>((set, get) => {
  const commit = (choice: ConsentChoice) => {
    const consent = createConsent(choice);
    persistConsent(consent);
    set({ consent, isOpen: false, view: "choice" });
  };
  return {
    consent: null,
    hydrated: false,
    isOpen: false,
    view: "choice",
    hydrate: () => {
      if (get().hydrated) return;
      const consent = readStoredConsent();
      set({ consent, hydrated: true, isOpen: consent === null, view: "choice" });
    },
    open: () => set({ isOpen: true, view: "settings" }),
    close: () => {
      if (get().consent) set({ isOpen: false, view: "choice" });
    },
    setView: (view) => set({ view }),
    acceptAll: () => commit({ analytics: true, marketing: true }),
    acceptNecessary: () => commit({ analytics: false, marketing: false }),
    save: commit,
  };
});

/** Non-hook access for imperative code (e.g. `track()`). */
export const hasAnalyticsConsent = () => Boolean(useConsent.getState().consent?.analytics);
export const hasMarketingConsent = () => Boolean(useConsent.getState().consent?.marketing);
