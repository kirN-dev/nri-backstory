import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { validateContent } from "../../engine/loadContent";
import { collectFlags, moveStep, renameRegionId } from "../draftLogic";
import { hasErrors, validateDraft } from "../validateDraft";
import type { Content, QuestionStep } from "../../types";

const load = (): Content =>
  validateContent(
    JSON.parse(readFileSync(new URL("../../../public/data/content.json", import.meta.url), "utf8")),
  );

describe("draftLogic", () => {
  it("moveStep меняет порядок и не падает на границах", () => {
    const s = load().settings[0]!;
    const moved = moveStep(s, 0, 1);
    expect(moved.steps[1]!.id).toBe(s.steps[0]!.id);
    expect(moveStep(s, 0, -1)).toBe(s);
  });

  it("collectFlags собирает флаги ответов и регионов используемых карт", () => {
    const content = load();
    const flags = collectFlags(content.settings[0]!, content);
    expect(flags).toContain("from_capital"); // регион
    expect(flags).toContain("criminal"); // ответ
  });

  it("renameRegionId обновляет ссылки в ответах", () => {
    const content = load();
    const q = content.settings[0]!.steps.find((s) => s.id === "job") as QuestionStep;
    q.answers[0]!.linkedRegionId = "region-capital";
    const renamed = renameRegionId(content, "region-capital", "region-arkos");
    const q2 = renamed.settings[0]!.steps.find((s) => s.id === "job") as QuestionStep;
    expect(q2.answers[0]!.linkedRegionId).toBe("region-arkos");
    expect(renamed.maps[0]!.regions[0]!.id).toBe("region-arkos");
  });
});

describe("validateDraft", () => {
  it("корректный демо-контент: ноль ошибок", () => {
    expect(hasErrors(validateDraft(load()))).toBe(false);
  });

  it("пустой пул ответов — ошибка", () => {
    const c = load();
    (c.settings[0]!.steps.find((s) => s.id === "job") as QuestionStep).answers = [];
    expect(validateDraft(c).some((i) => i.level === "error" && /пул/i.test(i.message))).toBe(true);
  });

  it("drawCount больше пула — ошибка", () => {
    const c = load();
    (c.settings[0]!.steps.find((s) => s.id === "job") as QuestionStep).drawCount = 99;
    expect(validateDraft(c).some((i) => i.level === "error" && /больше размера пула/.test(i.message))).toBe(true);
  });

  it("ссылка на несуществующую карту — ошибка", () => {
    const c = load();
    const mapStep = c.settings[0]!.steps.find((s) => s.type === "map");
    if (mapStep && mapStep.type === "map") mapStep.mapId = "nope";
    expect(validateDraft(c).some((i) => i.level === "error" && /несуществующую карту/.test(i.message))).toBe(true);
  });

  it("флаг в showIf, который никто не ставит — предупреждение", () => {
    const c = load();
    c.settings[0]!.steps[0]!.showIf = [{ flag: "ghost_flag", equals: true }];
    const issues = validateDraft(c);
    expect(issues.some((i) => i.level === "warning" && /ghost_flag/.test(i.message))).toBe(true);
  });

  it("подстановка в шаблоне, не совпадающая с шагом — предупреждение", () => {
    const c = load();
    c.settings[0]!.outcomeTemplate += " {{unknown_step}}";
    expect(validateDraft(c).some((i) => /unknown_step/.test(i.message))).toBe(true);
  });
});
