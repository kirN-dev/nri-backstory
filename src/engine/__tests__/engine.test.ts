import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { validateContent, ContentError } from "../loadContent";
import { computeState } from "../state";
import { renderOutcome } from "../outcome";
import { drawAnswers } from "../draw";
import type { Content, QuestionStep, Setting } from "../../types";

const raw = JSON.parse(
  readFileSync(new URL("../../../public/data/content.json", import.meta.url), "utf8"),
);
const content: Content = validateContent(raw);
const setting: Setting = content.settings[0];
const jobStep = setting.steps.find((s) => s.id === "job") as QuestionStep;

describe("валидатор", () => {
  it("принимает корректный контент", () => {
    expect(content.settings).toHaveLength(1);
  });
  it("отклоняет битый JSON-объект", () => {
    expect(() => validateContent({})).toThrow(ContentError);
  });
  it("ловит ссылку на несуществующую карту", () => {
    const bad = structuredClone(raw);
    bad.settings[0].steps[0].mapId = "nope";
    expect(() => validateContent(bad)).toThrow(/несуществующую карту/);
  });
  it("ловит дубликат id региона", () => {
    const bad = structuredClone(raw);
    bad.maps[0].regions[1].id = bad.maps[0].regions[0].id;
    expect(() => validateContent(bad)).toThrow(/дублируется id региона/);
  });
});

describe("видимость шагов и флаги", () => {
  it("пустой showIf — шаг виден всегда", () => {
    const st = computeState(setting, content, { choices: {}, seed: 1 });
    expect(st.visibleSteps.map((s) => s.id)).toEqual(["homeland", "job"]);
    expect(st.statuses["district"]).toBe("locked");
  });

  it("выбор региона ставит флаги и открывает зависимый шаг", () => {
    const st = computeState(setting, content, {
      seed: 1,
      choices: { homeland: { kind: "region", regionId: "region-capital" } },
    });
    expect(st.flags.from_capital).toBe(true);
    expect(st.statuses["district"]).toBe("available");
    expect(st.statuses["homeland"]).toBe("done");
  });

  it("смена раннего выбора убирает флаги и помечает осиротевшие выборы", () => {
    const st = computeState(setting, content, {
      seed: 1,
      choices: {
        homeland: { kind: "region", regionId: "region-wilds" }, // сменили столицу на дикие земли
        district: { kind: "region", regionId: "district-docks" }, // выбор остался от старой ветки
      },
    });
    expect(st.flags.from_capital).toBeUndefined();
    expect(st.flags.survivalist).toBe(true);
    expect(st.orphanedStepIds).toEqual(["district"]);
  });

  it("completion считается по видимым шагам", () => {
    const st = computeState(setting, content, {
      seed: 1,
      choices: { homeland: { kind: "region", regionId: "region-wilds" } },
    });
    // видимы homeland и job, заполнен один
    expect(st.completion).toBe(0.5);
  });
});

describe("пул ответов (drawAnswers)", () => {
  it("один seed — одинаковая выборка", () => {
    const a = drawAnswers(jobStep, 42).map((x) => x.id);
    const b = drawAnswers(jobStep, 42).map((x) => x.id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    expect(new Set(a).size).toBe(3); // без дубликатов
  });

  it("разные seed дают разные выборки (среди 50 попыток)", () => {
    const base = drawAnswers(jobStep, 1).map((x) => x.id).join(",");
    const anyDifferent = Array.from({ length: 50 }, (_, i) =>
      drawAnswers(jobStep, i + 2).map((x) => x.id).join(","),
    ).some((s) => s !== base);
    expect(anyDifferent).toBe(true);
  });

  it("drawCount отсутствует или >= пула — показаны все", () => {
    const noCount = { ...jobStep, drawCount: undefined };
    expect(drawAnswers(noCount, 7)).toHaveLength(5);
    const big = { ...jobStep, drawCount: 99 };
    expect(drawAnswers(big, 7)).toHaveLength(5);
  });
});

describe("renderOutcome", () => {
  it("подставляет шаги, регионы и блоки if", () => {
    // найдём seed, при котором среди показанных есть «Вор»
    let seed = 0;
    for (let i = 1; i < 200; i++) {
      if (drawAnswers(jobStep, i).some((a) => a.id === "thief")) { seed = i; break; }
    }
    const text = renderOutcome(setting, content, {
      seed,
      choices: {
        homeland: { kind: "region", regionId: "region-capital" },
        district: { kind: "region", regionId: "district-docks" },
        job: { kind: "answers", answerIds: ["thief"] },
        crime: { kind: "answers", answerIds: ["smuggling", "burglary"] },
      },
    });
    expect(text).toContain("Столица Аркос");
    expect(text).toContain("квартале Доки");
    expect(text).toContain("Вор");
    expect(text).toContain("Контрабанда, Кражи со взломом");
    expect(text).not.toContain("{{");
  });

  it("незаполненные шаги — пустая строка, отчёт-черновик читаем", () => {
    const text = renderOutcome(setting, content, { seed: 1, choices: {} });
    expect(text).not.toContain("{{");
    expect(text).not.toContain("undefined");
  });

  it("выбор вне показанной выборки не подставляется", () => {
    // ищем seed, при котором «Вор» НЕ показан
    let seed = 0;
    for (let i = 1; i < 200; i++) {
      if (!drawAnswers(jobStep, i).some((a) => a.id === "thief")) { seed = i; break; }
    }
    const text = renderOutcome(setting, content, {
      seed,
      choices: { job: { kind: "answers", answerIds: ["thief"] } },
    });
    expect(text).not.toContain("Вор");
  });
});
