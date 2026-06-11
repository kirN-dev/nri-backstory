import type { Content, Step } from "../types";

export class ContentError extends Error {}

/** Валидация структуры content.json. Бросает ContentError с понятным сообщением. */
export function validateContent(data: unknown): Content {
  if (typeof data !== "object" || data === null) {
    throw new ContentError("content.json: корень должен быть объектом");
  }
  const c = data as Partial<Content>;
  if (typeof c.version !== "number") throw new ContentError("content.json: нет поля version");
  if (!Array.isArray(c.settings)) throw new ContentError("content.json: settings должен быть массивом");
  if (!Array.isArray(c.maps)) throw new ContentError("content.json: maps должен быть массивом");

  const mapIds = new Set<string>();
  const regionIds = new Set<string>();
  for (const map of c.maps) {
    req(map?.id, `карта без id`);
    if (mapIds.has(map.id)) throw new ContentError(`дублируется id карты: ${map.id}`);
    mapIds.add(map.id);
    req(map.svgFile, `карта ${map.id}: нет svgFile`);
    if (!Array.isArray(map.regions)) throw new ContentError(`карта ${map.id}: regions должен быть массивом`);
    for (const r of map.regions) {
      req(r?.id, `карта ${map.id}: регион без id`);
      if (regionIds.has(r.id)) throw new ContentError(`дублируется id региона: ${r.id}`);
      regionIds.add(r.id);
      req(r.svgElementId, `регион ${r.id}: нет svgElementId`);
      req(r.name, `регион ${r.id}: нет name`);
      if (!Array.isArray(r.setFlags)) throw new ContentError(`регион ${r.id}: setFlags должен быть массивом`);
    }
  }

  for (const s of c.settings) {
    req(s?.id, "предыстория без id");
    req(s.title, `предыстория ${s.id}: нет title`);
    if (typeof s.outcomeTemplate !== "string") throw new ContentError(`предыстория ${s.id}: нет outcomeTemplate`);
    if (!Array.isArray(s.steps)) throw new ContentError(`предыстория ${s.id}: steps должен быть массивом`);
    const stepIds = new Set<string>();
    for (const step of s.steps as Step[]) {
      req(step?.id, `предыстория ${s.id}: шаг без id`);
      if (stepIds.has(step.id)) throw new ContentError(`предыстория ${s.id}: дублируется id шага ${step.id}`);
      stepIds.add(step.id);
      if (!Array.isArray(step.showIf)) throw new ContentError(`шаг ${step.id}: showIf должен быть массивом`);
      if (step.type === "map") {
        if (!mapIds.has(step.mapId)) {
          throw new ContentError(`шаг ${step.id}: ссылка на несуществующую карту ${step.mapId}`);
        }
      } else if (step.type === "question") {
        if (!Array.isArray(step.answers) || step.answers.length === 0) {
          throw new ContentError(`шаг ${step.id}: пустой пул ответов`);
        }
        if (step.drawCount !== undefined && (step.drawCount < 1 || !Number.isInteger(step.drawCount))) {
          throw new ContentError(`шаг ${step.id}: drawCount должен быть целым числом >= 1`);
        }
        for (const a of step.answers) {
          req(a?.id, `шаг ${step.id}: ответ без id`);
          if (!Array.isArray(a.setFlags)) throw new ContentError(`ответ ${a.id}: setFlags должен быть массивом`);
          if (a.linkedRegionId && !regionIds.has(a.linkedRegionId)) {
            throw new ContentError(`ответ ${a.id}: ссылка на несуществующий регион ${a.linkedRegionId}`);
          }
        }
      } else {
        throw new ContentError(`шаг ${(step as { id: string }).id}: неизвестный тип`);
      }
    }
  }

  return c as Content;
}

function req(value: unknown, message: string): asserts value {
  if (typeof value !== "string" || value.length === 0) throw new ContentError(`content.json: ${message}`);
}

/** Загрузка content.json в приложении (использует import.meta.env.BASE_URL во время вызова из UI). */
export async function loadContent(url: string): Promise<Content> {
  const res = await fetch(url);
  if (!res.ok) throw new ContentError(`Не удалось загрузить контент (${res.status})`);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ContentError("content.json повреждён: это не валидный JSON");
  }
  return validateContent(json);
}
