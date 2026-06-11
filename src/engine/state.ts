import type {
  Character,
  ComputedState,
  Condition,
  Content,
  Flags,
  Region,
  Setting,
  Step,
  StepStatus,
} from "../types";
import { drawAnswers } from "./draw";

export function conditionsMet(showIf: Condition[], flags: Flags): boolean {
  return showIf.every((c) => (flags[c.flag] === true) === c.equals);
}

export function findRegion(content: Content, regionId: string): Region | undefined {
  for (const map of content.maps) {
    const r = map.regions.find((reg) => reg.id === regionId);
    if (r) return r;
  }
  return undefined;
}

/**
 * Главная функция движка: пересчёт всего состояния С НУЛЯ по списку выборов.
 * Идём по шагам по порядку; флаги копятся только от выборов на видимых шагах.
 * Выбор на шаге, который стал невидимым, помечается осиротевшим (UI предупредит и сбросит).
 */
export function computeState(
  setting: Setting,
  content: Content,
  character: Pick<Character, "choices" | "seed">,
): ComputedState {
  const flags: Flags = {};
  const visibleSteps: Step[] = [];
  const orphanedStepIds: string[] = [];
  const statuses: Record<string, StepStatus> = {};
  let done = 0;

  for (const step of setting.steps) {
    const visible = conditionsMet(step.showIf, flags);
    const choice = character.choices[step.id];

    if (!visible) {
      statuses[step.id] = "locked";
      if (choice) orphanedStepIds.push(step.id);
      continue;
    }

    visibleSteps.push(step);

    if (!choice) {
      statuses[step.id] = "available";
      continue;
    }

    // применяем выбор к флагам
    if (choice.kind === "answers" && step.type === "question") {
      const shown = drawAnswers(step, character.seed);
      for (const answerId of choice.answerIds) {
        const ans = shown.find((a) => a.id === answerId);
        if (ans) for (const f of ans.setFlags) flags[f] = true;
      }
      statuses[step.id] = "done";
      done++;
    } else if (choice.kind === "region" && step.type === "map") {
      const region = findRegion(content, choice.regionId);
      if (region) for (const f of region.setFlags) flags[f] = true;
      statuses[step.id] = "done";
      done++;
    } else {
      // тип выбора не совпал с типом шага — считаем незаполненным
      statuses[step.id] = "available";
    }
  }

  return {
    flags,
    visibleSteps,
    orphanedStepIds,
    statuses,
    completion: visibleSteps.length === 0 ? 0 : done / visibleSteps.length,
  };
}
