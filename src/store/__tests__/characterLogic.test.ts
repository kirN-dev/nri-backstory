import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { validateContent } from "../../engine/loadContent";
import {
  PLAYER_DATA_VERSION,
  deserialize,
  exportCharacter,
  importCharacter,
  newCharacter,
  serialize,
  tileInfo,
  withChoice,
  withoutChoices,
} from "../characterLogic";
import type { Content } from "../../types";

const content: Content = validateContent(
  JSON.parse(readFileSync(new URL("../../../public/data/content.json", import.meta.url), "utf8")),
);
const setting = content.settings[0];

describe("логика персонажа", () => {
  it("новый персонаж: черновик, уникальные id и seed", () => {
    const a = newCharacter(setting.id);
    const b = newCharacter(setting.id);
    expect(a.status).toBe("draft");
    expect(a.id).not.toBe(b.id);
  });

  it("withChoice сообщает об осиротевших шагах, withoutChoices их сбрасывает", () => {
    let c = newCharacter(setting.id);
    c = withChoice(c, setting, content, "homeland", { kind: "region", regionId: "region-capital" }).character;
    c = withChoice(c, setting, content, "district", { kind: "region", regionId: "district-docks" }).character;
    const res = withChoice(c, setting, content, "homeland", { kind: "region", regionId: "region-wilds" });
    expect(res.orphanedStepIds).toEqual(["district"]);
    const cleaned = withoutChoices(res.character, res.orphanedStepIds);
    expect(cleaned.choices["district"]).toBeUndefined();
  });

  it("tileInfo выводит место и класс из выбранного региона", () => {
    let c = newCharacter(setting.id);
    c = withChoice(c, setting, content, "homeland", { kind: "region", regionId: "region-capital" }).character;
    c = { ...c, name: "Арен" };
    const info = tileInfo(c, content);
    expect(info).toEqual({ name: "Арен", className: "Плут", place: "Столица Аркос" });
  });
});

describe("LocalStorage сериализация", () => {
  it("туда-обратно без потерь", () => {
    const data = { version: PLAYER_DATA_VERSION, characters: [newCharacter(setting.id)] };
    expect(deserialize(serialize(data))).toEqual(data);
  });
  it("битые данные и чужая версия -> null", () => {
    expect(deserialize("не json")).toBeNull();
    expect(deserialize(JSON.stringify({ version: 999, characters: [] }))).toBeNull();
    expect(deserialize(null)).toBeNull();
  });
});

describe("экспорт/импорт персонажа", () => {
  it("импорт даёт нового персонажа с новым id, выборы сохранены", () => {
    let c = newCharacter(setting.id);
    c = withChoice(c, setting, content, "homeland", { kind: "region", regionId: "region-wilds" }).character;
    const imported = importCharacter(exportCharacter(c, content), content);
    expect(imported.id).not.toBe(c.id);
    expect(imported.choices).toEqual(c.choices);
    expect(imported.seed).toBe(c.seed);
  });
  it("чужой файл и несуществующий сеттинг отклоняются", () => {
    expect(() => importCharacter("{}", content)).toThrow(/не файл персонажа/);
    const bad = exportCharacter({ ...newCharacter("nope"), settingId: "nope" }, content);
    expect(() => importCharacter(bad, content)).toThrow(/нет предыстории/);
  });
});
