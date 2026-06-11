import { create } from "zustand";
import type { Content } from "../types";
import { loadContent, ContentError } from "../engine/loadContent";

interface ContentState {
  content: Content | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

export const useContentStore = create<ContentState>((set, get) => ({
  content: null,
  loading: false,
  error: null,
  load: async () => {
    if (get().content || get().loading) return;
    set({ loading: true, error: null });
    try {
      const content = await loadContent(`${import.meta.env.BASE_URL}data/content.json`);
      set({ content, loading: false });
    } catch (e) {
      const message =
        e instanceof ContentError ? e.message : "Не удалось загрузить контент";
      set({ error: message, loading: false });
    }
  },
}));
