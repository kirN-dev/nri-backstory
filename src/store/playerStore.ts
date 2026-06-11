import { create } from "zustand";
import type { Character, Choice, Content, Setting } from "../types";
import {
  STORAGE_KEY,
  deserialize,
  emptyPlayerData,
  importCharacter,
  newCharacter,
  serialize,
  withChoice,
  withoutChoices,
} from "./characterLogic";

interface PlayerState {
  characters: Character[];
  activeCharacterId: string | null;

  createCharacter: (settingId: string) => Character;
  setActive: (id: string | null) => void;
  setChoice: (
    setting: Setting,
    content: Content,
    stepId: string,
    choice: Choice,
  ) => string[]; // возвращает осиротевшие шаги (UI решит, подтверждать ли сброс)
  clearChoices: (stepIds: string[]) => void;
  setName: (name: string) => void;
  completeCharacter: () => void;
  deleteCharacter: (id: string) => void;
  importFromFile: (raw: string, content: Content) => Character;
}

function loadInitial(): Pick<PlayerState, "characters"> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = deserialize(raw);
    if (raw && !data) {
      // несовместимые/битые данные — бережно откладываем в бэкап
      localStorage.setItem(`${STORAGE_KEY}:backup-${Date.now()}`, raw);
    }
    return { characters: data?.characters ?? [] };
  } catch {
    return { characters: [] };
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  const updateActive = (fn: (c: Character) => Character) => {
    const { activeCharacterId, characters } = get();
    set({
      characters: characters.map((c) => (c.id === activeCharacterId ? fn(c) : c)),
    });
  };

  return {
    ...loadInitial(),
    activeCharacterId: null,

    createCharacter: (settingId) => {
      const character = newCharacter(settingId);
      set((s) => ({
        characters: [...s.characters, character],
        activeCharacterId: character.id,
      }));
      return character;
    },

    setActive: (id) => set({ activeCharacterId: id }),

    setChoice: (setting, content, stepId, choice) => {
      const active = get().characters.find((c) => c.id === get().activeCharacterId);
      if (!active) return [];
      const { character, orphanedStepIds } = withChoice(active, setting, content, stepId, choice);
      set((s) => ({
        characters: s.characters.map((c) => (c.id === character.id ? character : c)),
      }));
      return orphanedStepIds;
    },

    clearChoices: (stepIds) => updateActive((c) => withoutChoices(c, stepIds)),

    setName: (name) =>
      updateActive((c) => ({ ...c, name, updatedAt: new Date().toISOString() })),

    completeCharacter: () =>
      updateActive((c) => ({ ...c, status: "complete", updatedAt: new Date().toISOString() })),

    deleteCharacter: (id) =>
      set((s) => ({
        characters: s.characters.filter((c) => c.id !== id),
        activeCharacterId: s.activeCharacterId === id ? null : s.activeCharacterId,
      })),

    importFromFile: (raw, content) => {
      const character = importCharacter(raw, content);
      set((s) => ({ characters: [...s.characters, character] }));
      return character;
    },
  };
});

// автосохранение: любое изменение списка персонажей пишем в LocalStorage
usePlayerStore.subscribe((state) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      serialize({ ...emptyPlayerData(), characters: state.characters }),
    );
  } catch {
    // переполнение/приватный режим — молча пропускаем, данные живут в памяти
  }
});
