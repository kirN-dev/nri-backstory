import type { Answer, Content, MapData, MapStep, QuestionStep, Region, Setting } from "../types";

export const DRAFT_KEY = "nri-backstory:admin-draft:v1";

let counter = 0;
export function freshId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter}`;
}

export function blankContent(): Content {
  return { version: 1, settings: [], maps: [] };
}

export function blankSetting(): Setting {
  return {
    id: freshId("setting"),
    title: "Новая предыстория",
    description: "",
    steps: [],
    outcomeTemplate: "",
  };
}

export function blankQuestionStep(): QuestionStep {
  return { id: freshId("q"), title: "Новый вопрос", type: "question", mode: "single", showIf: [], answers: [] };
}

export function blankMapStep(mapId: string): MapStep {
  return { id: freshId("m"), title: "Выбор на карте", type: "map", mapId, showIf: [] };
}

export function blankAnswer(): Answer {
  return { id: freshId("a"), label: "Новый ответ", setFlags: [] };
}

export function blankMap(): MapData {
  return { id: freshId("map"), title: "Новая карта", svgFile: "maps/", regions: [] };
}

export function blankRegion(): Region {
  return { id: freshId("region"), svgElementId: "", name: "Новый регион", description: "", setFlags: [] };
}

/** Переместить шаг вверх/вниз. */
export function moveStep(setting: Setting, index: number, dir: -1 | 1): Setting {
  const to = index + dir;
  if (to < 0 || to >= setting.steps.length) return setting;
  const steps = [...setting.steps];
  const a = steps[index];
  const b = steps[to];
  if (!a || !b) return setting;
  steps[index] = b;
  steps[to] = a;
  return { ...setting, steps };
}

/** Все флаги, которые кто-то ставит в сеттинге (ответы + регионы используемых карт). */
export function collectFlags(setting: Setting, content: Content): string[] {
  const flags = new Set<string>();
  for (const step of setting.steps) {
    if (step.type === "question") {
      for (const a of step.answers) for (const f of a.setFlags) flags.add(f);
    } else {
      const map = content.maps.find((m) => m.id === step.mapId);
      if (map) for (const r of map.regions) for (const f of r.setFlags) flags.add(f);
    }
  }
  return [...flags].sort();
}

/** Переименовать id региона с обновлением всех ссылок (linkedRegionId ответов). */
export function renameRegionId(content: Content, oldId: string, newId: string): Content {
  return {
    ...content,
    maps: content.maps.map((m) => ({
      ...m,
      regions: m.regions.map((r) => (r.id === oldId ? { ...r, id: newId } : r)),
    })),
    settings: content.settings.map((s) => ({
      ...s,
      steps: s.steps.map((st) =>
        st.type === "question"
          ? {
              ...st,
              answers: st.answers.map((a) =>
                a.linkedRegionId === oldId ? { ...a, linkedRegionId: newId } : a,
              ),
            }
          : st,
      ),
    })),
  };
}

/** id всех элементов внутри SVG-текста (для сверки svgElementId). */
export function idsFromSvgText(svgText: string): string[] {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) return [];
  return [...doc.querySelectorAll("[id]")].map((el) => el.id);
}
