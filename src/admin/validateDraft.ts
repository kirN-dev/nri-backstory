import type { Content } from "../types";
import { validateContent } from "../engine/loadContent";
import { collectFlags } from "./draftLogic";

export interface Issue {
  level: "error" | "warning";
  message: string;
  path: string; // человекочитаемое место: «Предыстория X → шаг Y»
}

export function validateDraft(content: Content): Issue[] {
  const issues: Issue[] = [];
  const err = (path: string, message: string) => issues.push({ level: "error", path, message });
  const warn = (path: string, message: string) => issues.push({ level: "warning", path, message });

  // базовая структурная валидация движка
  try {
    validateContent(JSON.parse(JSON.stringify(content)));
  } catch (e) {
    err("Структура", e instanceof Error ? e.message : "Файл не проходит проверку движка");
  }

  if (content.settings.length === 0) warn("Контент", "Нет ни одной предыстории");

  const regionIds = new Set(content.maps.flatMap((m) => m.regions.map((r) => r.id)));
  const mapIds = new Set(content.maps.map((m) => m.id));

  for (const map of content.maps) {
    const p = `Карта «${map.title}»`;
    if (!map.title.trim()) err(p, "Пустое название карты");
    if (!map.svgFile.trim() || map.svgFile.trim() === "maps/") err(p, "Не указан путь к SVG-файлу");
    for (const r of map.regions) {
      const rp = `${p} → регион «${r.name}»`;
      if (!r.svgElementId.trim()) err(rp, "Не указан svgElementId (id элемента в SVG)");
      if (!r.name.trim()) err(rp, "Пустое имя региона");
    }
  }

  for (const setting of content.settings) {
    const sp = `Предыстория «${setting.title}»`;
    if (!setting.title.trim()) err(sp, "Пустое название");
    if (setting.steps.length === 0) warn(sp, "Нет ни одного шага");
    if (!setting.outcomeTemplate.trim()) warn(sp, "Пустой шаблон отчёта");

    const setFlags = new Set(collectFlags(setting, content));
    const stepIds = new Set(setting.steps.map((s) => s.id));

    for (const step of setting.steps) {
      const pp = `${sp} → шаг «${step.title}»`;
      if (!step.title.trim()) err(pp, "Пустой заголовок шага");

      for (const c of step.showIf) {
        if (!setFlags.has(c.flag)) {
          warn(pp, `Условие использует флаг «${c.flag}», который никто не ставит — шаг может быть недостижим`);
        }
      }

      if (step.type === "map") {
        if (!mapIds.has(step.mapId)) err(pp, `Ссылка на несуществующую карту «${step.mapId}»`);
      } else {
        if (step.answers.length === 0) err(pp, "Пустой пул ответов");
        if (step.drawCount !== undefined) {
          if (!Number.isInteger(step.drawCount) || step.drawCount < 1) {
            err(pp, "«Показывать случайно N» должно быть целым числом от 1");
          } else if (step.drawCount > step.answers.length) {
            err(pp, `«Показывать случайно ${step.drawCount}» больше размера пула (${step.answers.length})`);
          }
        }
        for (const a of step.answers) {
          if (!a.label.trim()) err(pp, `Ответ «${a.id}»: пустая подпись`);
          if (a.linkedRegionId && !regionIds.has(a.linkedRegionId)) {
            err(pp, `Ответ «${a.label}»: ссылка на несуществующий регион «${a.linkedRegionId}»`);
          }
        }
      }
    }

    // флаги и шаги в шаблоне отчёта
    for (const m of setting.outcomeTemplate.matchAll(/\{\{#if\s+([\w-]+)\s*\}\}/g)) {
      const flag = m[1];
      if (flag && !setFlags.has(flag)) {
        warn(sp, `Шаблон отчёта: блок {{#if ${flag}}} — этот флаг никто не ставит`);
      }
    }
    const cleaned = setting.outcomeTemplate.replace(/\{\{#if\s+[\w-]+\s*\}\}|\{\{\/if\}\}/g, "");
    for (const m of cleaned.matchAll(/\{\{\s*([\w-]+)\s*\}\}/g)) {
      const ref = m[1];
      if (ref && !stepIds.has(ref)) {
        warn(sp, `Шаблон отчёта: подстановка {{${ref}}} не совпадает ни с одним id шага`);
      }
    }
  }

  return issues;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.level === "error");
