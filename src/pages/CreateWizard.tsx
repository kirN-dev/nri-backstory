import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Choice, MapStep, QuestionStep, Step } from "../types";
import { useContentStore } from "../store/contentStore";
import { usePlayerStore } from "../store/playerStore";
import { computeState } from "../engine/state";
import { drawAnswers } from "../engine/draw";
import { renderOutcome } from "../engine/outcome";

const NAME_STEP = "__name";

export default function CreateWizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const content = useContentStore((s) => s.content);
  const character = usePlayerStore((s) => s.characters.find((c) => c.id === id));
  const setActive = usePlayerStore((s) => s.setActive);
  const setChoice = usePlayerStore((s) => s.setChoice);
  const clearChoices = usePlayerStore((s) => s.clearChoices);
  const setName = usePlayerStore((s) => s.setName);
  const completeCharacter = usePlayerStore((s) => s.completeCharacter);

  const [currentId, setCurrentId] = useState<string>(NAME_STEP);
  const [reportOpen, setReportOpen] = useState(false);
  const [orphanConfirm, setOrphanConfirm] = useState<string[] | null>(null);

  const setting = content?.settings.find((s) => s.id === character?.settingId);

  const state = useMemo(
    () => (setting && content && character ? computeState(setting, content, character) : null),
    [setting, content, character],
  );

  if (!content || !character || !setting || !state) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-stone-400">Персонаж не найден.</p>
        <button onClick={() => navigate("/")} className="mt-4 min-h-[44px] rounded-xl border border-stone-600 px-5">
          На главную
        </button>
      </main>
    );
  }
  if (usePlayerStore.getState().activeCharacterId !== character.id) setActive(character.id);

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
    const orphans = setChoice(setting, content, stepId, choice);
    if (orphans.length > 0) setOrphanConfirm(orphans);
  };

  const goNext = () => {
    const next = navigable[curIdx + 1];
    if (next !== undefined) setCurrentId(next);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-28">
      {/* лента шагов */}
      <nav aria-label="Шаги" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {ribbon.map((r) => (
          <button
            key={r.id}
            disabled={r.status === "locked"}
            onClick={() => setCurrentId(r.id)}
            title={r.status === "locked" ? "Зависит от предыдущих выборов" : undefined}
            className={`min-h-[44px] whitespace-nowrap rounded-full border px-4 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
              r.id === currentId
                ? "border-amber-500 bg-amber-600/20"
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
          className="h-1.5 rounded bg-amber-600 transition-all"
          style={{ width: `${Math.round(state.completion * 100)}%` }}
        />
      </div>

      {/* тело шага */}
      <section className="mt-6">
        {currentId === NAME_STEP && (
          <div>
            <h2 className="text-xl font-semibold">Как зовут персонажа?</h2>
            <input
              value={character.name ?? ""}
              onChange={(e) => setName(e.target.value)}
              placeholder="Имя персонажа"
              className="mt-4 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 focus:border-amber-500 focus:outline-none"
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
          <MapStubView
            step={currentStep}
            choice={character.choices[currentStep.id]}
            onPick={(c) => applyChoice(currentStep.id, c)}
            onContinue={goNext}
          />
        )}
      </section>

      {/* нижняя панель навигации */}
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
            className="min-h-[44px] rounded-xl border border-amber-700 px-5 text-amber-400 hover:border-amber-500"
          >
            Отчёт
          </button>
          <button
            onClick={() => {
              completeCharacter();
              navigate(`/report/${character.id}`);
            }}
            disabled={!allDone}
            title={!allDone ? "Заполните все доступные шаги" : undefined}
            className="min-h-[44px] rounded-xl bg-amber-600 px-5 font-semibold text-stone-950 disabled:opacity-40"
          >
            Завершить
          </button>
        </div>
      </div>

      {/* панель отчёта */}
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

      {/* подтверждение сброса осиротевших выборов */}
      {orphanConfirm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4" role="alertdialog">
          <div className="max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-6">
            <h2 className="text-lg font-semibold">Изменение затронет другие шаги</h2>
            <p className="mt-2 text-stone-300">
              Эти шаги больше не подходят под новый выбор, их ответы будут сброшены:{" "}
              <span className="text-amber-400">
                {orphanConfirm
                  .map((sid) => setting.steps.find((s) => s.id === sid)?.title ?? sid)
                  .join(", ")}
              </span>
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  clearChoices(orphanConfirm);
                  setOrphanConfirm(null);
                }}
                className="min-h-[44px] rounded-xl bg-amber-600 px-5 font-semibold text-stone-950"
              >
                Сбросить и продолжить
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
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
              className={`min-h-[44px] rounded-xl border px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                on ? "border-amber-500 bg-amber-600/15" : "border-stone-700 hover:border-stone-500"
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

/** Временная заглушка карты (полноценный SVG — Этап 4): список регионов карты. */
function MapStubView({
  step,
  choice,
  onPick,
  onContinue,
}: {
  step: MapStep;
  choice?: Choice;
  onPick: (c: Choice) => void;
  onContinue: () => void;
}) {
  const content = useContentStore((s) => s.content);
  const map = content?.maps.find((m) => m.id === step.mapId);
  const selected = choice?.kind === "region" ? choice.regionId : null;
  if (!map) return <p className="text-red-400">Карта «{step.mapId}» не найдена в контенте.</p>;
  return (
    <div>
      <h2 className="text-xl font-semibold">{step.title}</h2>
      <p className="mt-1 text-sm text-stone-400">
        {map.title}. Интерактивная SVG-карта появится на следующем этапе — пока выберите регион из списка.
      </p>
      <div className="mt-4 grid gap-3">
        {map.regions.map((r) => {
          const on = selected === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onPick({ kind: "region", regionId: r.id })}
              aria-pressed={on}
              className={`rounded-xl border px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                on ? "border-amber-500 bg-amber-600/15" : "border-stone-700 hover:border-stone-500"
              }`}
            >
              <div className="font-semibold">{r.name}</div>
              <div className="mt-1 text-sm text-stone-400">{r.description}</div>
              {(r.bonuses?.length || r.classes?.length) && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {r.bonuses?.map((b) => (
                    <span key={b} className="rounded bg-emerald-900/60 px-2 py-0.5">{b}</span>
                  ))}
                  {r.classes?.map((c) => (
                    <span key={c} className="rounded bg-sky-900/60 px-2 py-0.5">{c}</span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <button
        onClick={onContinue}
        disabled={!selected}
        className="mt-5 min-h-[44px] rounded-xl bg-amber-600 px-6 py-3 font-semibold text-stone-950 disabled:opacity-40"
      >
        Продолжить с выбранным регионом
      </button>
    </div>
  );
}
