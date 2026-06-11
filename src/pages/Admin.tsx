import { useRef, useState } from "react";
import { useAdminStore } from "../store/adminStore";
import { useContentStore } from "../store/contentStore";
import { blankContent } from "../admin/draftLogic";
import { hasErrors, validateDraft, type Issue } from "../admin/validateDraft";
import SettingsTab from "./admin/SettingsTab";
import MapsTab from "./admin/MapsTab";
import PreviewTab from "./admin/PreviewTab";

const PASSWORD = "admin"; // НЕ безопасность: просто заслонка от случайных гостей

type Tab = "settings" | "maps" | "preview";

export default function Admin() {
  const { authed, setAuthed, draft, setDraft } = useAdminStore();
  const siteContent = useContentStore((s) => s.content);
  const [tab, setTab] = useState<Tab>("settings");
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState(false);
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!authed) {
    return (
      <main className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-2xl font-bold">Конструктор</h1>
        <p className="mt-2 text-sm text-stone-400">
          Пароль — это не настоящая защита (сайт статический), а заслонка от случайных гостей.
          Реальная защита контента — доступ к репозиторию.
        </p>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (pwd === PASSWORD ? setAuthed(true) : setPwdError(true))}
          placeholder="Пароль"
          className="mt-5 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3"
        />
        {pwdError && <p className="mt-2 text-red-400">Неверный пароль</p>}
        <button
          onClick={() => (pwd === PASSWORD ? setAuthed(true) : setPwdError(true))}
          className="mt-4 min-h-[44px] w-full rounded-xl bg-amber-600 px-5 font-semibold text-stone-950"
        >
          Войти
        </button>
      </main>
    );
  }

  if (!draft) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-2xl font-bold">С чего начать?</h1>
        <div className="mt-6 grid gap-3">
          <button
            onClick={() => siteContent && setDraft(structuredClone(siteContent))}
            disabled={!siteContent}
            className="min-h-[44px] rounded-xl bg-amber-600 px-5 py-3 text-left font-semibold text-stone-950 disabled:opacity-40"
          >
            Начать с текущего контента сайта
            <span className="block text-sm font-normal">обычный режим работы</span>
          </button>
          <button
            onClick={() => setDraft(blankContent())}
            className="min-h-[44px] rounded-xl border border-stone-600 px-5 py-3 text-left"
          >
            Начать с пустого
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="min-h-[44px] rounded-xl border border-stone-600 px-5 py-3 text-left"
          >
            Импорт content.json с диска
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const c = JSON.parse(await f.text());
                if (!Array.isArray(c?.settings) || !Array.isArray(c?.maps)) throw new Error();
                setDraft(c);
              } catch {
                alert("Это не похоже на content.json");
              }
              e.target.value = "";
            }}
          />
        </div>
      </main>
    );
  }

  const doExport = () => {
    const list = validateDraft(draft);
    setIssues(list);
    if (hasErrors(list)) return;
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "content.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">Конструктор</h1>
        <div className="flex-1" />
        <button onClick={doExport} className="min-h-[44px] rounded-xl bg-amber-600 px-5 font-semibold text-stone-950">
          Экспорт content.json
        </button>
        <button
          onClick={() => {
            if (confirm("Сбросить черновик? Несохранённые правки пропадут.")) setDraft(null);
          }}
          className="min-h-[44px] rounded-xl border border-red-900 px-4 text-red-400"
        >
          Сбросить черновик
        </button>
      </div>
      <p className="mt-1 text-xs text-stone-500">
        Черновик автосохраняется в браузере. Публикация: экспорт файла → положить в
        public/data/content.json → commit → push.
      </p>

      {issues && (
        <div className="mt-4 rounded-xl border border-stone-700 bg-stone-900 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              Проверка: {issues.filter((i) => i.level === "error").length} ошибок,{" "}
              {issues.filter((i) => i.level === "warning").length} предупреждений
            </h2>
            <button onClick={() => setIssues(null)} className="min-h-[44px] min-w-[44px] rounded-xl border border-stone-700">✕</button>
          </div>
          {issues.length === 0 ? (
            <p className="mt-2 text-emerald-400">Всё чисто — файл скачан.</p>
          ) : (
            <>
              <ul className="mt-2 space-y-1 text-sm">
                {issues.map((i, n) => (
                  <li key={n} className={i.level === "error" ? "text-red-400" : "text-yellow-400"}>
                    [{i.level === "error" ? "ошибка" : "внимание"}] {i.path}: {i.message}
                  </li>
                ))}
              </ul>
              {!hasErrors(issues) && (
                <p className="mt-2 text-sm text-emerald-400">
                  Ошибок нет — файл скачан, предупреждения не блокируют.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <nav className="mt-5 flex gap-2">
        {(
          [
            ["settings", "Предыстории"],
            ["maps", "Карты"],
            ["preview", "Предпросмотр"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`min-h-[44px] rounded-xl border px-4 ${
              tab === t ? "border-amber-500 bg-amber-600/20" : "border-stone-700 hover:border-stone-500"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-5">
        {tab === "settings" && <SettingsTab />}
        {tab === "maps" && <MapsTab />}
        {tab === "preview" && <PreviewTab />}
      </div>
    </main>
  );
}
