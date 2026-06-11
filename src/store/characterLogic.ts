import type { Character, Choice, Content, PlayerData, Setting } from "../types";
import { computeState, findRegion } from "../engine/state";

export const STORAGE_KEY = "nri-backstory:player:v1";
export const PLAYER_DATA_VERSION = 1;

export function emptyPlayerData(): PlayerData {
  return { version: PLAYER_DATA_VERSION, characters: [] };
}

export function newCharacter(settingId: string, now = new Date()): Character {
  return {
    id: `ch-${now.getTime()}-${Math.floor(Math.random() * 1e6)}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    settingId,
    seed: Math.floor(Math.random() * 2 ** 31),
    choices: {},
    status: "draft",
  };
}

/** Применить выбор; вернуть нового персонажа и список шагов, чьи выборы осиротеют. */
export function withChoice(
  character: Character,
  setting: Setting,
  content: Content,
  stepId: string,
  choice: Choice,
): { character: Character; orphanedStepIds: string[] } {
  const next: Character = {
    ...character,
    choices: { ...character.choices, [stepId]: choice },
    updatedAt: new Date().toISOString(),
  };
  const { orphanedStepIds } = computeState(setting, content, next);
  return { character: next, orphanedStepIds };
}

/** Сбросить выборы на перечисленных шагах. */
export function withoutChoices(character: Character, stepIds: string[]): Character {
  const choices = { ...character.choices };
  for (const id of stepIds) delete choices[id];
  return { ...character, choices, updatedAt: new Date().toISOString() };
}

/** Данные для плитки: место и класс выводятся из выборов. */
export function tileInfo(
  character: Character,
  content: Content,
): { name: string; className: string; place: string } {
  let place = character.place ?? "";
  let className = character.className ?? "";
  const setting = content.settings.find((s) => s.id === character.settingId);
  if (setting) {
    for (const step of setting.steps) {
      const choice = character.choices[step.id];
      if (!choice || choice.kind !== "region") continue;
      const region = findRegion(content, choice.regionId);
      if (!region) continue;
      if (!place) place = region.name;
      if (!className && region.classes?.length) className = region.classes[0];
    }
  }
  return {
    name: character.name?.trim() || "Безымянный",
    className: className || "—",
    place: place || "—",
  };
}

// ---------- сериализация LocalStorage ----------

export function serialize(data: PlayerData): string {
  return JSON.stringify(data);
}

/** Чтение с защитой: битые данные/чужая версия -> null (вызывающий сделает бэкап, не сотрёт). */
export function deserialize(raw: string | null): PlayerData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as PlayerData;
    if (data?.version !== PLAYER_DATA_VERSION || !Array.isArray(data.characters)) return null;
    return data;
  } catch {
    return null;
  }
}

// ---------- экспорт / импорт персонажа ----------

export interface CharacterFile {
  app: "nri-backstory";
  contentVersion: number;
  character: Character;
}

export function exportCharacter(character: Character, content: Content): string {
  const file: CharacterFile = {
    app: "nri-backstory",
    contentVersion: content.version,
    character,
  };
  return JSON.stringify(file, null, 2);
}

/** Импорт: валидация и выдача персонажа с НОВЫМ id (не затирает существующих). */
export function importCharacter(raw: string, content: Content): Character {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Файл повреждён: это не JSON");
  }
  const file = parsed as Partial<CharacterFile>;
  const ch = file?.character;
  if (file?.app !== "nri-backstory" || !ch || typeof ch !== "object") {
    throw new Error("Это не файл персонажа nri-backstory");
  }
  if (!content.settings.some((s) => s.id === ch.settingId)) {
    throw new Error(`В контенте нет предыстории «${ch.settingId}» из файла`);
  }
  const fresh = newCharacter(ch.settingId);
  return {
    ...fresh,
    name: ch.name,
    className: ch.className,
    place: ch.place,
    seed: typeof ch.seed === "number" ? ch.seed : fresh.seed,
    choices: ch.choices ?? {},
    status: ch.status === "complete" ? "complete" : "draft",
  };
}
