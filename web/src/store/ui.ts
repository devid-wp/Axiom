import { create } from "zustand";

export type View = "start" | "studio" | "study" | "explore";
export type Lang = "en" | "ru";

interface UiState {
  view: View;
  lang: Lang;
  aiRequest: number;
  setView: (view: View) => void;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  requestAi: () => void;
  consumeAiRequest: () => void;
}

export const useUi = create<UiState>()((set) => ({
  view: "studio",
  lang: "en",
  aiRequest: 0,
  setView: (view) => set({ view }),
  setLang: (lang) => set({ lang }),
  toggleLang: () => set((s) => ({ lang: s.lang === "en" ? "ru" : "en" })),
  requestAi: () => set({ aiRequest: Date.now() }),
  consumeAiRequest: () => set({ aiRequest: 0 }),
}));