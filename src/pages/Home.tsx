import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContentStore } from "../store/contentStore";
import { usePlayerStore } from "../store/playerStore";
import { tileInfo } from "../store/characterLogic";

export default function Home() {
  const navigate = useNavigate();
  const content = useContentStore((s) => s.content);
  const characters = usePlayerStore((s) => s.characters);
  const createCharacter = usePlayerStore((s) => s.createCharacter);
  const setActive = usePlayerStore((s) => s.setActive);
  const importFromFile = usePlayerStore((s) => s.importFromFile);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pickSetting, setPickSetting] = useState(false);

  if (!content) return null;

  const startCreate = () => {
    const only = content.settings[0];
    if (content.settings.length === 1 && only) {
      const c = createCharacter(only.id);
      navigate(`/create/${c.id}`);
    } else {
      setPickSetting(true);
    }
  };

  const onImport = async (file: File) => {
    setImportError(null);
    try {
      const c = importFromFile(await file.text(), content);
      setActive(c.id);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Не удалось импортировать файл");
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Предыстории персонажей</h1>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={startCreate}
          className="min-h-[44px] rounded-xl bg-amber-600 px-6 py-3 font-semibold text-stone-950 hover:bg-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          + Создать новую предысторию
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="min-h-[44px] rounded-xl border border-stone-600 px-6 py-3 hover:border-stone-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          Импорт из файла
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = "";
          }}
        />
      </div>
      {importError && <p className="mt-3 text-red-400">{importError}</p>}

      {pickSetting && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Выберите мир</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {content.settings.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  const c = createCharacter(s.id);
                  navigate(`/create/${c.id}`);
                }}
                className="rounded-xl border border-stone-700 p-4 text-left hover:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <div className="font-semibold">{s.title}</div>
                <div className="mt-1 text-sm text-stone-400">{s.description}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Мои персонажи</h2>
        {characters.length === 0 ? (
          <p className="mt-3 text-stone-400">
            Пока пусто. Нажмите «Создать новую предысторию», чтобы собрать первого персонажа.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...characters]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map((c) => {
                const info = tileInfo(c, content);
                const draft = c.status === "draft";
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActive(c.id);
                      navigate(draft ? `/create/${c.id}` : `/report/${c.id}`);
                    }}
                    className="relative rounded-xl border border-stone-700 p-4 text-left hover:border-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                  >
                    {draft && (
                      <span className="absolute right-3 top-3 rounded bg-stone-700 px-2 py-0.5 text-xs">
                        Черновик
                      </span>
                    )}
                    <div className="text-base font-semibold">{info.name}</div>
                    <dl className="mt-2 space-y-1 text-sm text-stone-400">
                      <div>Класс: <span className="text-stone-200">{info.className}</span></div>
                      <div>Место: <span className="text-stone-200">{info.place}</span></div>
                    </dl>
                  </button>
                );
              })}
          </div>
        )}
      </section>
    </main>
  );
}
