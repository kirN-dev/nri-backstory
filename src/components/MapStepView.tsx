import { useEffect, useMemo, useRef, useState } from "react";
import type { Choice, Content, MapStep, Region } from "../types";
import { useContentStore } from "../store/contentStore";
import { buildRegionIndex, idChainFromElement, regionByIdChain } from "../engine/svgMap";

const svgCache = new Map<string, string>();

async function fetchSvg(url: string): Promise<string> {
  const cached = svgCache.get(url);
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Не удалось загрузить карту (${res.status})`);
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  if (doc.querySelector("parsererror") || !doc.querySelector("svg")) {
    throw new Error("Файл карты повреждён: это не валидный SVG");
  }
  svgCache.set(url, text);
  return text;
}

export default function MapStepView({
  step,
  choice,
  onPick,
  onContinue,
  contentOverride,
}: {
  step: MapStep;
  choice?: Choice;
  onPick: (c: Choice) => void;
  onContinue: () => void;
  contentOverride?: Content;
}) {
  const siteContent = useContentStore((s) => s.content);
  const content = contentOverride ?? siteContent;
  const map = content?.maps.find((m) => m.id === step.mapId);
  const hostRef = useRef<HTMLDivElement>(null);
  const [svgError, setSvgError] = useState<string | null>(null);
  const [svgReady, setSvgReady] = useState(false);
  const [preview, setPreview] = useState<Region | null>(null);
  const [hoverName, setHoverName] = useState<string | null>(null);

  const selectedId = choice?.kind === "region" ? choice.regionId : null;
  const index = useMemo(() => (map ? buildRegionIndex(map) : null), [map]);

  // загрузка и инлайн SVG
  useEffect(() => {
    let alive = true;
    setSvgReady(false);
    setSvgError(null);
    if (!map) return;
    fetchSvg(`${import.meta.env.BASE_URL}${map.svgFile}`)
      .then((text) => {
        if (!alive || !hostRef.current) return;
        hostRef.current.innerHTML = text;
        setSvgReady(true);
      })
      .catch((e) => alive && setSvgError(e instanceof Error ? e.message : "Ошибка карты"));
    return () => {
      alive = false;
    };
  }, [map]);

  // классы и доступность на интерактивных элементах
  useEffect(() => {
    const root = hostRef.current?.querySelector("svg");
    if (!svgReady || !root || !map) return;
    for (const r of map.regions) {
      const el = root.querySelector<SVGElement>(`#${CSS.escape(r.svgElementId)}`);
      if (!el) continue;
      el.classList.add(el.tagName.toLowerCase() === "g" ? "region-group" : "region");
      el.classList.toggle("region--selected", r.id === selectedId);
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", r.name);
    }
  }, [svgReady, map, selectedId]);

  if (!map) return <p className="text-red-400">Карта «{step.mapId}» не найдена в контенте.</p>;

  const resolve = (target: EventTarget | null): Region | undefined => {
    const root = hostRef.current?.querySelector("svg");
    if (!root || !index || !(target instanceof Element)) return undefined;
    return regionByIdChain(idChainFromElement(target, root), index);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold">{step.title}</h2>
      <p className="mt-1 text-sm text-stone-400">
        {map.title}. Наведите или коснитесь региона, нажмите — откроется описание.
      </p>

      {svgError ? (
        <p className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">
          {svgError}. Воспользуйтесь списком регионов ниже.
        </p>
      ) : (
        <div className="relative mt-4">
          <div
            ref={hostRef}
            className="svg-map overflow-x-auto rounded-xl border border-stone-800"
            onClick={(e) => {
              const r = resolve(e.target);
              if (r) setPreview(r);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              const r = resolve(e.target);
              if (r) {
                e.preventDefault();
                setPreview(r);
              }
            }}
            onMouseMove={(e) => setHoverName(resolve(e.target)?.name ?? null)}
            onMouseLeave={() => setHoverName(null)}
          />
          {hoverName && (
            <div className="pointer-events-none absolute left-3 top-3 rounded bg-stone-900/90 px-3 py-1 text-sm">
              {hoverName}
            </div>
          )}
        </div>
      )}

      {selectedId && (
        <p className="mt-3 text-sm">
          Выбрано: <span className="text-violet-300">{map.regions.find((r) => r.id === selectedId)?.name}</span>
        </p>
      )}

      {/* запасной режим: выбор из списка */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-stone-400 hover:text-stone-200">
          Выбрать из списка
        </summary>
        <div className="mt-3 grid gap-2">
          {map.regions.map((r) => (
            <button
              key={r.id}
              onClick={() => setPreview(r)}
              className={`min-h-[44px] rounded-xl border px-4 py-2 text-left ${
                selectedId === r.id ? "border-violet-400 bg-violet-400/15" : "border-stone-700 hover:border-stone-500"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </details>

      <button
        onClick={onContinue}
        disabled={!selectedId}
        className="mt-5 min-h-[44px] rounded-xl bg-gradient-to-r from-violet-400 to-purple-300 px-6 py-3 font-semibold text-stone-950 disabled:opacity-40"
      >
        Продолжить с выбранным регионом
      </button>

      {/* панель региона */}
      {preview && (
        <div className="fixed inset-0 z-20 flex justify-end" role="dialog" aria-label={preview.name}>
          <button aria-label="Закрыть" className="hidden flex-1 bg-black/60 sm:block" onClick={() => setPreview(null)} />
          <div className="flex h-full w-full flex-col overflow-y-auto bg-stone-900 p-6 sm:w-2/5 sm:min-w-[360px] sm:border-l sm:border-stone-700">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold">{preview.name}</h3>
              <button
                onClick={() => setPreview(null)}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-stone-700 hover:border-stone-500"
                aria-label="Закрыть панель"
              >
                ✕
              </button>
            </div>
            {preview.image && (
              <img
                src={`${import.meta.env.BASE_URL}${preview.image}`}
                alt=""
                className="mt-4 max-h-56 w-full rounded-xl object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            )}
            <p className="mt-4 leading-relaxed text-stone-200">{preview.description}</p>
            {preview.bonuses && preview.bonuses.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-stone-400">Бонусы</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {preview.bonuses.map((b) => (
                    <span key={b} className="rounded bg-emerald-900/60 px-2 py-1 text-sm">{b}</span>
                  ))}
                </div>
              </div>
            )}
            {preview.classes && preview.classes.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-stone-400">Возможные классы</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {preview.classes.map((c) => (
                    <span key={c} className="rounded bg-sky-900/60 px-2 py-1 text-sm">{c}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-auto pt-6">
              <button
                onClick={() => {
                  onPick({ kind: "region", regionId: preview.id });
                  setPreview(null);
                }}
                className="min-h-[44px] w-full rounded-xl bg-gradient-to-r from-violet-400 to-purple-300 px-6 py-3 font-semibold text-stone-950"
              >
                Выбрать этот регион
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
