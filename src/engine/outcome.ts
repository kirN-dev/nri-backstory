import type { Character, Content, Flags, Setting } from "../types";
import { drawAnswers } from "./draw";
import { computeState, findRegion } from "./state";

/**
 * Подстановка в шаблон отчёта:
 *  {{#if flag}}текст{{/if}} — текст виден, если флаг поднят;
 *  {{stepId}} — подпись выбранного ответа (multi — через запятую) или имя региона.
 * Незаполненный шаг -> пустая строка (отчёт-черновик можно смотреть в любой момент).
 */
export function renderOutcome(
  setting: Setting,
  content: Content,
  character: Pick<Character, "choices" | "seed">,
): string {
  const { flags } = computeState(setting, content, character);
  let out = renderIfBlocks(setting.outcomeTemplate, flags);

  out = out.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_m, stepId: string) =>
    choiceLabel(setting, content, character, stepId),
  );

  // подчистка двойных пробелов от пустых подстановок
  return out.replace(/[ \t]{2,}/g, " ").replace(/ +([.,!?])/g, "$1").trim();
}

function renderIfBlocks(template: string, flags: Flags): string {
  // без вложенности: повторяем замену, пока есть блоки
  const re = /\{\{#if\s+([\w-]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g;
  let prev = "";
  let cur = template;
  while (prev !== cur) {
    prev = cur;
    cur = cur.replace(re, (_m, flag: string, body: string) =>
      flags[flag] ? body : "",
    );
  }
  return cur;
}

function choiceLabel(
  setting: Setting,
  content: Content,
  character: Pick<Character, "choices" | "seed">,
  stepId: string,
): string {
  const step = setting.steps.find((s) => s.id === stepId);
  const choice = character.choices[stepId];
  if (!step || !choice) return "";

  if (choice.kind === "answers" && step.type === "question") {
    const shown = drawAnswers(step, character.seed);
    return choice.answerIds
      .map((id) => shown.find((a) => a.id === id)?.label)
      .filter((l): l is string => Boolean(l))
      .join(", ");
  }
  if (choice.kind === "region" && step.type === "map") {
    return findRegion(content, choice.regionId)?.name ?? "";
  }
  return "";
}
