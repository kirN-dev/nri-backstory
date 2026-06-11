import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContentStore } from "../store/contentStore";
import { usePlayerStore } from "../store/playerStore";
import { exportCharacter, tileInfo } from "../store/characterLogic";
import { renderOutcome } from "../engine/outcome";

export default function Report() {
  const { id } = useParams();
  const navigate = useNavigate();
  const content = useContentStore((s) => s.content);
  const character = usePlayerStore((s) => s.characters.find((c) => c.id === id));
  const deleteCharacter = usePlayerStore((s) => s.deleteCharacter);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const setting = content?.settings.find((s) => s.id === character?.settingId);
  if (!content || !character || !setting) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-stone-400">Персонаж не найден.</p>
        <button onClick={() => navigate("/")} className="mt-4 min-h-[44px] rounded-xl border border-stone-600 px-5">
          На главную
        </button>
      </main>
    );
  }

  const info = tileInfo(character, content);
  const text = renderOutcome(setting, content, character);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* буфер недоступен — ничего страшного */
    }
  };

  const download = () => {
    const blob = new Blob([exportCharacter(character, content)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `character-${info.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <button onClick={() => navigate("/")} className="text-sm text-stone-400 hover:text-stone-200">
        ← На главную
      </button>
      <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{info.name}</h1>
      <p className="mt-1 text-stone-400">
        {setting.title} · Класс: {info.className} · Место: {info.place}
        {character.status === "draft" && " · Черновик"}
      </p>

      <article className="mt-6 whitespace-pre-wrap rounded-2xl border border-stone-700 bg-stone-900 p-6 leading-relaxed">
        {text || "Отчёт пока пуст."}
      </article>

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={copy} className="min-h-[44px] rounded-xl bg-amber-600 px-5 font-semibold text-stone-950">
          {copied ? "Скопировано ✓" : "Копировать текст"}
        </button>
        <button onClick={download} className="min-h-[44px] rounded-xl border border-stone-600 px-5 hover:border-stone-400">
          Экспорт в файл
        </button>
        {character.status === "draft" && (
          <button
            onClick={() => navigate(`/create/${character.id}`)}
            className="min-h-[44px] rounded-xl border border-stone-600 px-5 hover:border-stone-400"
          >
            Продолжить создание
          </button>
        )}
        <button
          onClick={() => setConfirmDelete(true)}
          className="min-h-[44px] rounded-xl border border-red-900 px-5 text-red-400 hover:border-red-600"
        >
          Удалить
        </button>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4" role="alertdialog">
          <div className="max-w-sm rounded-2xl border border-stone-700 bg-stone-900 p-6">
            <p>Удалить персонажа «{info.name}» безвозвратно?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} className="min-h-[44px] rounded-xl border border-stone-600 px-5">
                Отмена
              </button>
              <button
                onClick={() => {
                  deleteCharacter(character.id);
                  navigate("/");
                }}
                className="min-h-[44px] rounded-xl bg-red-700 px-5 font-semibold"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
