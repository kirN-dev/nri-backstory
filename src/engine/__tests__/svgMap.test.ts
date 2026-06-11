import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { validateContent } from "../loadContent";
import { buildRegionIndex, regionByIdChain } from "../svgMap";
import type { Content } from "../../types";

const content: Content = validateContent(
  JSON.parse(readFileSync(new URL("../../../public/data/content.json", import.meta.url), "utf8")),
);
const worldMap = content.maps.find((m) => m.id === "world-map")!;
const index = buildRegionIndex(worldMap);

describe("сопоставление SVG и регионов", () => {
  it("прямое попадание по id элемента", () => {
    expect(regionByIdChain(["p-wilds"], index)?.id).toBe("region-wilds");
  });
  it("клик по кривой внутри группы поднимается до интерактивной группы", () => {
    // цепочка: безымянная кривая -> g-capital -> country-empire -> svg
    expect(regionByIdChain(["g-capital", "country-empire"], index)?.id).toBe("region-capital");
  });
  it("ближайший известный id побеждает", () => {
    expect(regionByIdChain(["p-wilds", "g-capital"], index)?.id).toBe("region-wilds");
  });
  it("неизвестные id -> undefined (фон некликабелен)", () => {
    expect(regionByIdChain(["country-east", "ocean"], index)).toBeUndefined();
  });
});
