import { useState } from "react";
import type { MapData, Region } from "../../types";
import { useAdminStore } from "../../store/adminStore";
import { blankMap, blankRegion, idsFromSvgText, renameRegionId } from "../../admin/draftLogic";

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

const csv = (v: string[] | undefined) => (v ?? []).join(", ");
const parseCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function MapsTab() {
  const draft = useAdminStore((s) => s.draft)!;
  const mutate = useAdminStore((s) => s.mutate);
  const [selId, setSelId] = useState<string | null>(draft.maps[0]?.id ?? null);
  const map = draft.maps.find((m) => m.id === selId) ?? null;

  const updateMap = (id: string, fn: (m: MapData) => MapData) =>
    mutate((c) => ({ ...c, maps: c.maps.map((m) => (m.id === id ? fn(m) : m)) }));

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="grid gap-2 self-start">
        {draft.maps.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelId(m.id)}
            className={`rounded-xl border px-3 py-2 text-left ${
              m.id === selId ? "border-amber-500 bg-amber-600/15" : "border-stone-700 hover:border-stone-500"
            }`}
          >
            {m.title || m.id}
          </button>
        ))}
        <button
          onClick={() => {
            const m = blankMap();
            mutate((c) => ({ ...c, maps: [...c.maps, m] }));
            setSelId(m.id);
          }}
          className={btnCls}
        >
          + Добавить карту
        </button>
      </aside>

      {map ? (
        <MapEditor
          key={map.id}
          map={map}
          onChange={(fn) => updateMap(map.id, fn)}
          onRenameRegion={(oldId, newId) => mutate((c) => renameRegionId(c, oldId, newId))}
          onDelete={() => {
            if (!confirm(`Удалить карту «${map.title}»?`)) return;
            mutate((c) => ({ ...c, maps: c.maps.filter((m) => m.id !== map.id) }));
            setSelId(null);
          }}
        />
      ) : (
        <p className="text-stone-400">Выберите карту слева или создайте новую.</p>
      )}
    </div>
  );
}

function MapEditor({
  map,
  onChange,
  onRenameRegion,
  onDelete,
}: {
  map: MapData;
  onChange: (fn: (m: MapData) => MapData) => void;
  onRenameRegion: (oldId: string, newId: string) => void;
  onDelete: () => void;
}) {
  const [svgIds, setSvgIds] = useState<string[] | null>(null);
  const [svgCheckError, setSvgCheckError] = useState<string | null>(null);

  const checkSvg = async () => {
    setSvgCheckError(null);
    setSvgIds(null);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}${map.svgFile}`);
      if (!res.ok) throw new Error(`Файл не найден (${res.status}). Он лежит в public/${map.svgFile}?`);
      const ids = idsFromSvgText(await res.text());
      if (ids.length === 0) throw new Error("В SVG не найдено элементов с id (или файл повреждён)");
      setSvgIds(ids);
    } catch (e) {
      setSvgCheckError(e instanceof Error ? e.message : "Не удалось проверить SVG");
    }
  };

  const updateRegion = (regionId: string, fn: (r: Region) => Region) =>
    onChange((m) => ({ ...m, regions: m.regions.map((r) => (r.id === regionId ? fn(r) : r)) }));

  const boundIds = new Set(map.regions.map((r) => r.svgElementId));
  const unbound = svgIds?.filter((id) => !boundIds.has(id)) ?? [];

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-xl border border-stone-800 p-4 sm:grid-cols-3">
        <Field label="id карты">
          <input className={inputCls} value={map.id}
            onChange={(e) => onChange((m) => ({ ...m, id: e.target.value }))} />
        </Field>
        <Field label="Название">
          <input className={inputCls} value={map.title}
            onChange={(e) => onChange((m) => ({ ...m, title: e.target.value }))} />
        </Field>
        <Field label="Путь к SVG (внутри public/)">
          <input className={inputCls} value={map.svgFile} placeholder="maps/world.svg"
            onChange={(e) => onChange((m) => ({ ...m, svgFile: e.target.value }))} />
        </Field>
      </div>

      <div className="rounded-xl border border-stone-800 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">Сверка с SVG-файлом</h3>
          <div className="flex-1" />
          <button className={btnCls} onClick={() => void checkSvg()}>Проверить файл</button>
        </div>
        {svgCheckError && <p className="mt-2 text-red-400">{svgCheckError}</p>}
        {svgIds && (
          <div className="mt-2 text-sm">
            <p className="text-stone-400">id, найденные в SVG и пока не привязанные к регионам:</p>
            {unbound.length === 0 ? (
              <p className="mt-1 text-emerald-400">все id привязаны</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1">
                {unbound.map((id) => <span key={id} className="rounded bg-stone-800 px-2 py-0.5">{id}</span>)}
              </div>
            )}
          </div>
        )}
        <datalist id={`svg-ids-${map.id}`}>
          {(svgIds ?? []).map((id) => <option key={id} value={id} />)}
        </datalist>
      </div>

      <section>
        <h3 className="font-semibold">Регионы</h3>
        <div className="mt-3 grid gap-3">
          {map.regions.map((r) => {
            const status =
              svgIds === null ? null : svgIds.includes(r.svgElementId) ? "ok" : "missing";
            return (
              <div key={r.id} className="grid gap-2 rounded-xl border border-stone-800 p-4 sm:grid-cols-2">
                <Field label="id региона (для ссылок из ответов)">
                  <input
                    className={inputCls}
                    defaultValue={r.id}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== r.id) onRenameRegion(r.id, v);
                    }}
                  />
                </Field>
                <Field label={`svgElementId (id элемента в SVG)${status === "ok" ? " ✅" : status === "missing" ? " ❌ нет в SVG" : ""}`}>
                  <input className={inputCls} list={`svg-ids-${map.id}`} value={r.svgElementId}
                    onChange={(e) => updateRegion(r.id, (x) => ({ ...x, svgElementId: e.target.value }))} />
                </Field>
                <Field label="Имя">
                  <input className={inputCls} value={r.name}
                    onChange={(e) => updateRegion(r.id, (x) => ({ ...x, name: e.target.value }))} />
                </Field>
                <Field label="Картинка (путь внутри public/, необязательно)">
                  <input className={inputCls} value={r.image ?? ""} placeholder="images/capital.jpg"
                    onChange={(e) => updateRegion(r.id, (x) => ({ ...x, image: e.target.value || undefined }))} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Описание">
                    <textarea className={`${inputCls} min-h-[70px]`} value={r.description}
                      onChange={(e) => updateRegion(r.id, (x) => ({ ...x, description: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Бонусы (через запятую)">
                  <input className={inputCls} value={csv(r.bonuses)}
                    onChange={(e) => updateRegion(r.id, (x) => ({ ...x, bonuses: parseCsv(e.target.value) }))} />
                </Field>
                <Field label="Возможные классы (через запятую)">
                  <input className={inputCls} value={csv(r.classes)}
                    onChange={(e) => updateRegion(r.id, (x) => ({ ...x, classes: parseCsv(e.target.value) }))} />
                </Field>
                <Field label="Поднимает флаги (через запятую)">
                  <input className={inputCls} value={csv(r.setFlags)}
                    onChange={(e) => updateRegion(r.id, (x) => ({ ...x, setFlags: parseCsv(e.target.value) }))} />
                </Field>
                <div className="flex items-end justify-end">
                  <button
                    className={`${smallBtn} border-red-900 text-red-400`}
                    onClick={() =>
                      confirm(`Удалить регион «${r.name}»?`) &&
                      onChange((m) => ({ ...m, regions: m.regions.filter((x) => x.id !== r.id) }))
                    }
                  >
                    Удалить регион
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button className={`${btnCls} mt-3`}
          onClick={() => onChange((m) => ({ ...m, regions: [...m.regions, blankRegion()] }))}>
          + Добавить регион
        </button>
      </section>

      <div>
        <button onClick={onDelete} className={`${btnCls} border-red-900 text-red-400`}>
          Удалить карту
        </button>
      </div>
    </div>
  );
}
