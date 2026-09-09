import { create } from "zustand";

export type View = "start" | "studio" | "study" | "explore";
export type Lang = "en" | "ru";

interface UiState {
  view: View;
  lang: Lang;
  aiRequest: number;
  aiPanel: boolean;
  setView: (view: View) => void;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  requestAi: () => void;
  consumeAiRequest: () => void;
  openAiPanel: () => void;
  closeAiPanel: () => void;
  toggleAiPanel: () => void;
}

export const useUi = create<UiState>()((set) => ({
  view: "start",
  lang: "en",
  aiRequest: 0,
  aiPanel: false,
  setView: (view) => set({ view }),
  setLang: (lang) => set({ lang }),
  toggleLang: () => set((s) => ({ lang: s.lang === "en" ? "ru" : "en" })),
  requestAi: () => set({ aiRequest: Date.now() }),
  consumeAiRequest: () => set({ aiRequest: 0 }),
  openAiPanel: () => set({ aiPanel: true }),
  closeAiPanel: () => set({ aiPanel: false }),
  toggleAiPanel: () => set((s) => ({ aiPanel: !s.aiPanel })),
}));