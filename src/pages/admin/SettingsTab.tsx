import { useState } from "react";
import type { Answer, Condition, Content, QuestionStep, Setting, Step } from "../../types";
import { useAdminStore } from "../../store/adminStore";
import {
  blankAnswer,
  blankMapStep,
  blankQuestionStep,
  blankSetting,
  collectFlags,
  moveStep,
} from "../../admin/draftLogic";

const inputCls =
  "w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 focus:border-amber-500 focus:outline-none";
const btnCls = "min-h-[44px] rounded-xl border border-stone-700 px-3 hover:border-stone-500";
const smallBtn = "min-h-[36px] rounded-lg border border-stone-700 px-2 text-sm hover:border-stone-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-stone-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/** Список строк через запятую (флаги, бонусы, классы). */
function csv(values: string[] | undefined): string {
  return (values ?? []).join(", ");
}
function parseCsv(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

export default function SettingsTab() {
  const draft = useAdminStore((s) => s.draft)!;
  const mutate = useAdminStore((s) => s.mutate);
  const [selId, setSelId] = useState<string | null>(draft.settings[0]?.id ?? null);
  const setting = draft.settings.find((s) => s.id === selId) ?? null;

  const updateSetting = (id: string, fn: (s: Setting) => Setting) =>
    mutate((c) => ({ ...c, settings: c.settings.map((s) => (s.id === id ? fn(s) : s)) }));

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside>
        <div className="grid gap-2">
          {draft.settings.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelId(s.id)}
              className={`rounded-xl border px-3 py-2 text-left ${
                s.id === selId ? "border-amber-500 bg-amber-600/15" : "border-stone-700 hover:border-stone-500"
              }`}
            >
              {s.title || s.id}
            </button>
          ))}
          <button
            onClick={() => {
              const s = blankSetting();
              mutate((c) => ({ ...c, settings: [...c.settings, s] }));
              setSelId(s.id);
            }}
            className={btnCls}
          >
            + Добавить предысторию
          </button>
        </div>
      </aside>

      {setting ? (
        <SettingEditor
          key={setting.id}
          setting={setting}
          content={draft}
          onChange={(fn) => updateSetting(setting.id, fn)}
          onDelete={() => {
            if (!confirm(`Удалить предысторию «${setting.title}»?`)) return;
            mutate((c) => ({ ...c, settings: c.settings.filter((s) => s.id !== setting.id) }));
            setSelId(null);
          }}
        />
      ) : (
        <p className="text-stone-400">Выберите предысторию слева или создайте новую.</p>
      )}
    </div>
  );
}

function SettingEditor({
  setting,
  content,
  onChange,
  onDelete,
}: {
  setting: Setting;
  content: Content;
  onChange: (fn: (s: Setting) => Setting) => void;
  onDelete: () => void;
}) {
  const knownFlags = collectFlags(setting, content);

  const updateStep = (stepId: string, fn: (st: Step) => Step) =>
    onChange((s) => ({ ...s, steps: s.steps.map((st) => (st.id === stepId ? fn(st) : st)) }));

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-xl border border-stone-800 p-4 sm:grid-cols-2">
        <Field label="id (латиницей, попадает в адреса и шаблон)">
          <input className={inputCls} value={setting.id}
            onChange={(e) => onChange((s) => ({ ...s, id: e.target.value }))} />
        </Field>
        <Field label="Название">
          <input className={inputCls} value={setting.title}
            onChange={(e) => onChange((s) => ({ ...s, title: e.target.value }))} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Описание (на карточке выбора мира)">
            <input className={inputCls} value={setting.description}
              onChange={(e) => onChange((s) => ({ ...s, description: e.target.value }))} />
          </Field>
        </div>
      </div>

      <section>
        <h3 className="font-semibold">Шаги</h3>
        <div className="mt-3 grid gap-3">
          {setting.steps.map((step, i) => (
            <div key={step.id} className="rounded-xl border border-stone-800 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-stone-800 px-2 py-0.5 text-xs">
                  {step.type === "question" ? "Вопрос" : "Карта"}
                </span>
                <span className="text-sm text-stone-500">id: {step.id}</span>
                <div className="flex-1" />
                <button className={smallBtn} onClick={() => onChange((s) => moveStep(s, i, -1))}>↑</button>
                <button className={smallBtn} onClick={() => onChange((s) => moveStep(s, i, 1))}>↓</button>
                <button
                  className={`${smallBtn} border-red-900 text-red-400`}
                  onClick={() =>
                    confirm(`Удалить шаг «${step.title}»?`) &&
                    onChange((s) => ({ ...s, steps: s.steps.filter((x) => x.id !== step.id) }))
                  }
                >
                  Удалить
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="id шага (для шаблона отчёта)">
                  <input className={inputCls} value={step.id}
                    onChange={(e) => updateStep(step.id, (st) => ({ ...st, id: e.target.value }))} />
                </Field>
                <Field label="Заголовок">
                  <input className={inputCls} value={step.title}
                    onChange={(e) => updateStep(step.id, (st) => ({ ...st, title: e.target.value }))} />
                </Field>
              </div>

              <ShowIfEditor
                showIf={step.showIf}
                knownFlags={knownFlags}
                onChange={(showIf) => updateStep(step.id, (st) => ({ ...st, showIf }))}
              />

              {step.type === "map" ? (
                <div className="mt-3">
                  <Field label="Какая карта показывается">
                    <select
                      className={inputCls}
                      value={step.mapId}
                      onChange={(e) => updateStep(step.id, (st) => ({ ...st, mapId: e.target.value }) as Step)}
                    >
                      <option value="">— выберите карту —</option>
                      {content.maps.map((m) => (
                        <option key={m.id} value={m.id}>{m.title} ({m.id})</option>
                      ))}
                    </select>
                  </Field>
                </div>
              ) : (
                <QuestionEditor
                  step={step}
                  content={content}
                  onChange={(fn) => updateStep(step.id, (st) => fn(st as QuestionStep))}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button className={btnCls}
            onClick={() => onChange((s) => ({ ...s, steps: [...s.steps, blankQuestionStep()] }))}>
            + Вопрос
          </button>
          <button
            className={btnCls}
            onClick={() => onChange((s) => ({ ...s, steps: [...s.steps, blankMapStep(content.maps[0]?.id ?? "")] }))}
          >
            + Шаг-карта
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-stone-800 p-4">
        <h3 className="font-semibold">Шаблон отчёта</h3>
        <p className="mt-1 text-xs text-stone-500">
          {"{{id-шага}} подставляет выбор; {{#if флаг}}текст{{/if}} показывает текст при поднятом флаге."}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {setting.steps.map((st) => (
            <button key={st.id} className={smallBtn}
              onClick={() => onChange((s) => ({ ...s, outcomeTemplate: s.outcomeTemplate + `{{${st.id}}}` }))}>
              {"{{"}{st.id}{"}}"}
            </button>
          ))}
          {knownFlags.map((f) => (
            <button key={f} className={smallBtn}
              onClick={() => onChange((s) => ({ ...s, outcomeTemplate: s.outcomeTemplate + `{{#if ${f}}}{{/if}}` }))}>
              if {f}
            </button>
          ))}
        </div>
        <textarea
          className={`${inputCls} mt-3 min-h-[120px] font-mono text-sm`}
          value={setting.outcomeTemplate}
          onChange={(e) => onChange((s) => ({ ...s, outcomeTemplate: e.target.value }))}
        />
      </section>

      <div>
        <button onClick={onDelete} className={`${btnCls} border-red-900 text-red-400`}>
          Удалить предысторию
        </button>
      </div>
    </div>
  );
}

function ShowIfEditor({
  showIf,
  knownFlags,
  onChange,
}: {
  showIf: Condition[];
  knownFlags: string[];
  onChange: (next: Condition[]) => void;
}) {
  return (
    <div className="mt-3">
      <span className="text-sm text-stone-400">Показывать шаг, только если (все условия сразу):</span>
      <div className="mt-1 grid gap-2">
        {showIf.map((c, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              className={`${inputCls} max-w-[220px]`}
              list="known-flags"
              value={c.flag}
              placeholder="флаг"
              onChange={(e) => onChange(showIf.map((x, n) => (n === i ? { ...x, flag: e.target.value } : x)))}
            />
            <select
              className={`${inputCls} max-w-[160px]`}
              value={String(c.equals)}
              onChange={(e) =>
                onChange(showIf.map((x, n) => (n === i ? { ...x, equals: e.target.value === "true" } : x)))
              }
            >
              <option value="true">поднят</option>
              <option value="false">не поднят</option>
            </select>
            <button className={smallBtn} onClick={() => onChange(showIf.filter((_, n) => n !== i))}>✕</button>
          </div>
        ))}
        <datalist id="known-flags">
          {knownFlags.map((f) => <option key={f} value={f} />)}
        </datalist>
        <button className={`${smallBtn} w-fit`} onClick={() => onChange([...showIf, { flag: "", equals: true }])}>
          + условие
        </button>
      </div>
    </div>
  );
}

function QuestionEditor({
  step,
  content,
  onChange,
}: {
  step: QuestionStep;
  content: Content;
  onChange: (fn: (st: QuestionStep) => QuestionStep) => void;
}) {
  const regions = content.maps.flatMap((m) => m.regions.map((r) => ({ ...r, mapTitle: m.title })));

  const updateAnswer = (answerId: string, fn: (a: Answer) => Answer) =>
    onChange((st) => ({ ...st, answers: st.answers.map((a) => (a.id === answerId ? fn(a) : a)) }));

  return (
    <div className="mt-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Режим">
          <select className={inputCls} value={step.mode}
            onChange={(e) => onChange((st) => ({ ...st, mode: e.target.value as "single" | "multi" }))}>
            <option value="single">один ответ</option>
            <option value="multi">несколько ответов</option>
          </select>
        </Field>
        <Field label={`Показывать случайно N из пула (${step.answers.length} в пуле; пусто = все)`}>
          <input
            type="number"
            min={1}
            max={Math.max(step.answers.length, 1)}
            className={inputCls}
            value={step.drawCount ?? ""}
            onChange={(e) =>
              onChange((st) => ({
                ...st,
                drawCount: e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
          />
        </Field>
      </div>

      <span className="mt-3 block text-sm text-stone-400">Пул ответов:</span>
      <div className="mt-1 grid gap-2">
        {step.answers.map((a) => (
          <div key={a.id} className="grid gap-2 rounded-lg border border-stone-800 p-3 sm:grid-cols-2">
            <Field label="Подпись">
              <input className={inputCls} value={a.label}
                onChange={(e) => updateAnswer(a.id, (x) => ({ ...x, label: e.target.value }))} />
            </Field>
            <Field label="Поднимает флаги (через запятую)">
              <input className={inputCls} value={csv(a.setFlags)}
                onChange={(e) => updateAnswer(a.id, (x) => ({ ...x, setFlags: parseCsv(e.target.value) }))} />
            </Field>
            <Field label="Связанный регион (необязательно)">
              <select
                className={inputCls}
                value={a.linkedRegionId ?? ""}
                onChange={(e) =>
                  updateAnswer(a.id, (x) => ({ ...x, linkedRegionId: e.target.value || undefined }))
                }
              >
                <option value="">— нет —</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.mapTitle})</option>
                ))}
              </select>
            </Field>
            <div className="flex items-end justify-end">
              <button
                className={`${smallBtn} border-red-900 text-red-400`}
                onClick={() => onChange((st) => ({ ...st, answers: st.answers.filter((x) => x.id !== a.id) }))}
              >
                Удалить ответ
              </button>
            </div>
          </div>
        ))}
        <button className={`${smallBtn} w-fit`}
          onClick={() => onChange((st) => ({ ...st, answers: [...st.answers, blankAnswer()] }))}>
          + ответ в пул
        </button>
      </div>
    </div>
  );
}
