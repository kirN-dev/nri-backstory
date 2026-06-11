// Типы данных проекта. Выведены из PROJECT_SPEC.md + правки (шаги, карты, пул ответов).

// ---------- Контент (public/data/content.json) ----------

export interface Content {
  version: number;
  settings: Setting[];
  maps: MapData[];
}

export interface Setting {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  steps: Step[];
  outcomeTemplate: string;
}

export interface Condition {
  flag: string;
  equals: boolean;
}

interface StepBase {
  id: string;
  title: string;
  showIf: Condition[]; // все условия должны выполняться (логическое И)
}

export interface QuestionStep extends StepBase {
  type: "question";
  mode: "single" | "multi";
  answers: Answer[]; // пул ответов
  drawCount?: number; // сколько случайно показать из пула; нет или >= длины — показать все
}

export interface MapStep extends StepBase {
  type: "map";
  mapId: string;
}

export type Step = QuestionStep | MapStep;

export interface Answer {
  id: string;
  label: string;
  setFlags: string[];
  linkedRegionId?: string;
}

export interface MapData {
  id: string;
  title: string;
  svgFile: string;
  regions: Region[];
}

export interface Region {
  id: string;
  svgElementId: string; // id кривой (path) или группы (g) в SVG
  name: string;
  description: string;
  image?: string;
  bonuses?: string[];
  classes?: string[];
  setFlags: string[];
}

// ---------- Данные игрока (LocalStorage) ----------

export interface PlayerData {
  version: number;
  characters: Character[];
}

export type Choice =
  | { kind: "answers"; answerIds: string[] }
  | { kind: "region"; regionId: string };

export interface Character {
  id: string;
  createdAt: string;
  updatedAt: string;
  settingId: string;
  seed: number; // для детерминированной выборки из пула ответов
  name?: string;
  className?: string;
  place?: string;
  choices: Record<string, Choice>; // ключ — id шага
  status: "draft" | "complete";
}

// ---------- Производное состояние (вычисляется движком) ----------

export type Flags = Record<string, true>;

export type StepStatus = "done" | "available" | "locked";

export interface ComputedState {
  flags: Flags;
  visibleSteps: Step[];
  orphanedStepIds: string[]; // выборы на шагах, ставших невидимыми
  statuses: Record<string, StepStatus>;
  completion: number; // 0..1 — доля заполненных видимых шагов
}
