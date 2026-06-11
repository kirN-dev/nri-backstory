import { create } from "zustand";
import type { Content } from "../types";
import { DRAFT_KEY } from "../admin/draftLogic";
import { validateContent } from "../engine/loadContent";

interface AdminState {
  authed: boolean;
  draft: Content | null;
  setAuthed: (v: boolean) => void;
  setDraft: (c: Content | null) => void;
  /** Иммутабельная мутация черновика. */
  mutate: (fn: (draft: Content) => Content) => void;
}

function loadDraft(): Content | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return validateContentLoose(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Черновик может быть временно невалидным (в процессе редактирования) — принимаем по форме. */
function validateContentLoose(data: unknown): Content | null {
  const c = data as Content;
  if (!c || !Array.isArray(c.settings) || !Array.isArray(c.maps)) return null;
  return c;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  authed: sessionStorage.getItem("nri-admin") === "1",
  draft: loadDraft(),
  setAuthed: (v) => {
    sessionStorage.setItem("nri-admin", v ? "1" : "0");
    set({ authed: v });
  },
  setDraft: (draft) => set({ draft }),
  mutate: (fn) => {
    const cur = get().draft;
    if (cur) set({ draft: fn(cur) });
  },
}));

useAdminStore.subscribe((state) => {
  try {
    if (state.draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(state.draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* нет места/приватный режим */
  }
});

export { validateContent };
