import { useMemo, useState } from "react";
import type { Character, Choice, Content, QuestionStep, Setting, Step } from "../types";
import { computeState } from "../engine/state";
import { drawAnswers } from "../engine/draw";
import { renderOutcome } from "../engine/outcome";
import { withChoice, withoutChoices } from "../store/characterLogic";
import MapStepView from "./MapStepView";

const NAME_STEP = "__name";

export default function WizardView({
  content,
  setting,
  character,
  onCharacter,
  onComplete,
}: {
  content: Content;
  setting: Setting;
  character: Character;
  onCharacter: (next: Character) => void;
  onComplete: () => void;
}) {
  const [currentId, setCurrentId] = useState<string>(NAME_STEP);
  const [reportOpen, setReportOpen] = useState(false);
  const [orphanConfirm, setOrphanConfirm] = useState<string[] | null>(null);

  const state = useMemo(
    () => computeState(setting, content, character),
    [setting, content, character],
  );

  const ribbon: { id: string; title: string; status: string }[] = [
    { id: NAME_STEP, title: "Имя", status: character.name?.trim() ? "done" : "available" },
    ...setting.steps.map((s) => ({
      id: s.id,
      title: s.title,
      status: state.statuses[s.id] ?? "locked",
    })),
  ];
  const navigable = ribbon.filter((r) => r.status !== "locked").map((r) => r.id);
  const curIdx = navigable.indexOf(currentId);
  const allDone = ribbon.every((r) => r.status === "done" || r.status === "locked");
  const currentStep: Step | undefined = setting.steps.find((s) => s.id === currentId);

  const applyChoice = (stepId: string, choice: Choice) => {
    const res = withChoice(character, setting, content, stepId, choice);
    onCharacter(res.character);
    if (res.orphanedStepIds.length > 0) setOrphanConfirm(res.orphanedStepIds);
  };

  const goNext = () => {
    const next = navigable[curIdx + 1];
    if (next !== undefined) setCurrentId(next);
  };

  return (
    <div className="pb-24">
      <nav aria-label="Шаги" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {ribbon.map((r) => (
          <button
            key={r.id}
            disabled={r.status === "locked"}
            onClick={() => setCurrentId(r.id)}
            title={r.status === "locked" ? "Зависит от предыдущих выборов" : undefined}
            className={`min-h-[44px] whitespace-nowrap rounded-full border px-4 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${
              r.id === currentId
                ? "border-violet-400 bg-violet-400/20"
                : r.status === "locked"
                  ? "cursor-not-allowed border-stone-800 text-stone-600"
                  : "border-stone-700 hover:border-stone-500"
            }`}
          >
            {r.status === "done" ? "✓ " : r.status === "locked" ? "🔒 " : ""}
            {r.title}
          </button>
        ))}
      </nav>

      <div className="mt-2 h-1.5 w-full rounded bg-stone-800">
        <div
          className="h-1.5 rounded bg-gradient-to-r from-violet-400 to-purple-300 transition-all"
          style={{ width: `${Math.round(state.completion * 100)}%` }}
        />
      </div>

      <section className="mt-6">
        {currentId === NAME_STEP && (
          <div>
            <h2 className="text-xl font-semibold">Как зовут персонажа?</h2>
            <input
              value={character.name ?? ""}
              onChange={(e) =>
                onCharacter({ ...character, name: e.target.value, updatedAt: new Date().toISOString() })
              }
              placeholder="Имя персонажа"
              className="mt-4 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 focus:border-violet-400 focus:outline-none"
            />
          </div>
        )}

        {currentStep?.type === "question" && (
          <QuestionView
            step={currentStep}
            seed={character.seed}
            choice={character.choices[currentStep.id]}
            onPick={(c) => applyChoice(currentStep.id, c)}
          />
        )}

        {currentStep?.type === "map" && (
          <MapStepView
            step={currentStep}
            choice={character.choices[currentStep.id]}
            onPick={(c) => applyChoice(currentStep.id, c)}
            onContinue={goNext}
            contentOverride={content}
          />
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-stone-800 bg-stone-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <button
            onClick={() => {
              const prev = navigable[curIdx - 1];
              if (curIdx > 0 && prev !== undefined) setCurrentId(prev);
            }}
            disabled={curIdx <= 0}
            className="min-h-[44px] rounded-xl border border-stone-700 px-5 disabled:opacity-40"
          >
            Назад
          </button>
          <button
            onClick={goNext}
            disabled={curIdx >= navigable.length - 1}
            className="min-h-[44px] rounded-xl border border-stone-700 px-5 disabled:opacity-40"
          >
            Далее
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setReportOpen(true)}
            className="min-h-[44px] rounded-xl border border-violet-700 px-5 text-violet-300 hover:border-violet-400"
          >
            Отчёт
          </button>
          <button
            onClick={onComplete}
            disabled={!allDone}
            title={!allDone ? "Заполните все доступные шаги" : undefined}
            className="min-h-[44px] rounded-xl bg-gradient-to-r from-violet-400 to-purple-300 px-5 font-semibold text-stone-950 disabled:opacity-40"
          >
            Завершить
          </button>
        </div>
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-20 flex" role="dialog" aria-label="Черновик отчёта">
          <button aria-label="Закрыть" className="flex-1 bg-black/60" onClick={() => setReportOpen(false)} />
          <div className="w-full max-w-md overflow-y-auto bg-stone-900 p-6 sm:border-l sm:border-stone-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Отчёт ({Math.round(state.completion * 100)}%)</h2>
              <button onClick={() => setReportOpen(false)} className="min-h-[44px] min-w-[44px] rounded-xl border border-stone-700">✕</button>
            </div>
            <p className="mt-4 whitespace-pre-wrap leading-relaxed text-stone-200">
              {renderOutcome(setting, content, character) || "Пока пусто — сделайте первые выборы."}
            </p>
          </div>
        </div>
      )}

      {orphanConfirm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4" role="alertdialog">
          <div className="max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-6">
            <h2 className="text-lg font-semibold">Изменение затронет другие шаги</h2>
            <p className="mt-2 text-stone-300">
              Эти шаги больше не подходят под новый выбор, их ответы будут сброшены:{" "}
              <span className="text-violet-300">
                {orphanConfirm
                  .map((sid) => setting.steps.find((s) => s.id === sid)?.title ?? sid)
                  .join(", ")}
              </span>
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  onCharacter(withoutChoices(character, orphanConfirm));
                  setOrphanConfirm(null);
                }}
                className="min-h-[44px] rounded-xl bg-gradient-to-r from-violet-400 to-purple-300 px-5 font-semibold text-stone-950"
              >
                Сбросить и продолжить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionView({
  step,
  seed,
  choice,
  onPick,
}: {
  step: QuestionStep;
  seed: number;
  choice?: Choice;
  onPick: (c: Choice) => void;
}) {
  const shown = drawAnswers(step, seed);
  const selected = choice?.kind === "answers" ? choice.answerIds : [];
  const toggle = (answerId: string) => {
    if (step.mode === "single") {
      onPick({ kind: "answers", answerIds: [answerId] });
    } else {
      const next = selected.includes(answerId)
        ? selected.filter((x) => x !== answerId)
        : [...selected, answerId];
      onPick({ kind: "answers", answerIds: next });
    }
  };
  return (
    <div>
      <h2 className="text-xl font-semibold">{step.title}</h2>
      {step.mode === "multi" && <p className="mt-1 text-sm text-stone-400">Можно выбрать несколько.</p>}
      <div className="mt-4 grid gap-3">
        {shown.map((a) => {
          const on = selected.includes(a.id);
          return (
            <button
              key={a.id}
              onClick={() => toggle(a.id)}
              aria-pressed={on}
              className={`min-h-[44px] rounded-xl border px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${
                on ? "border-violet-400 bg-violet-400/15" : "border-stone-700 hover:border-stone-500"
              }`}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
