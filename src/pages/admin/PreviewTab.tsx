import { useState } from "react";
import type { Character } from "../../types";
import { useAdminStore } from "../../store/adminStore";
import { newCharacter } from "../../store/characterLogic";
import { renderOutcome } from "../../engine/outcome";
import WizardView from "../../components/WizardView";

export default function PreviewTab() {
  const draft = useAdminStore((s) => s.draft)!;
  const [character, setCharacter] = useState<Character | null>(null);
  const [finished, setFinished] = useState(false);

  const setting = draft.settings.find((s) => s.id === character?.settingId);

  if (!character || !setting) {
    return (
      <div>
        <p className="text-stone-400">
          Предпросмотр проходит анкету на текущем черновике. Временный персонаж не попадает в
          список персонажей игрока.
        </p>
        <div className="mt-4 grid gap-2 sm:max-w-md">
          {draft.settings.length === 0 && <p className="text-stone-500">Сначала создайте предысторию.</p>}
          {draft.settings.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setFinished(false);
                setCharacter(newCharacter(s.id));
              }}
              className="min-h-[44px] rounded-xl border border-stone-700 px-4 py-3 text-left hover:border-amber-500"
            >
              ▶ Пройти «{s.title || s.id}»
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div>
        <h3 className="text-lg font-semibold">Итоговый отчёт (предпросмотр)</h3>
        <article className="mt-3 whitespace-pre-wrap rounded-2xl border border-stone-700 bg-stone-900 p-6 leading-relaxed">
          {renderOutcome(setting, draft, character) || "Отчёт пуст."}
        </article>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setFinished(false);
              setCharacter(newCharacter(setting.id));
            }}
            className="min-h-[44px] rounded-xl border border-stone-700 px-5"
          >
            Пройти заново
          </button>
          <button
            onClick={() => setCharacter(null)}
            className="min-h-[44px] rounded-xl border border-stone-700 px-5"
          >
            К выбору предыстории
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setCharacter(null)} className="text-sm text-stone-400 hover:text-stone-200">
        ← выйти из предпросмотра
      </button>
      <div className="mt-3">
        <WizardView
          content={draft}
          setting={setting}
          character={character}
          onCharacter={setCharacter}
          onComplete={() => setFinished(true)}
        />
      </div>
    </div>
  );
}
