import type { MapData, Region } from "../types";

/** Индекс: id SVG-элемента -> регион. */
export function buildRegionIndex(map: MapData): Map<string, Region> {
  const index = new Map<string, Region>();
  for (const r of map.regions) index.set(r.svgElementId, r);
  return index;
}

/**
 * Определить регион по цепочке id от точки клика вверх к корню SVG
 * (первый известный id побеждает — клик по кривой внутри группы выбирает
 * кривую, если интерактивна она, иначе поднимаемся до группы).
 */
export function regionByIdChain(
  idChain: string[],
  index: Map<string, Region>,
): Region | undefined {
  for (const id of idChain) {
    const region = index.get(id);
    if (region) return region;
  }
  return undefined;
}

/** Цепочка id от DOM-элемента вверх до корневого svg включительно. */
export function idChainFromElement(el: Element | null, root: Element): string[] {
  const ids: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== root.parentElement) {
    if (cur.id) ids.push(cur.id);
    if (cur === root) break;
    cur = cur.parentElement;
  }
  return ids;
}
