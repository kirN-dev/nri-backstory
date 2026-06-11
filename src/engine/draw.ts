import type { Answer, QuestionStep } from "../types";

/** Простой детерминированный ГПСЧ (mulberry32). Один seed — одна последовательность. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Выборка вариантов из пула вопроса.
 * Детерминирована: один и тот же seed + шаг => всегда один и тот же набор
 * (в исходном порядке пула, без дубликатов).
 * drawCount отсутствует или >= размера пула => показываются все ответы.
 * Seed смешивается с id шага, чтобы у разных вопросов были разные выборки.
 */
export function drawAnswers(step: QuestionStep, seed: number): Answer[] {
  const pool = step.answers;
  const n = step.drawCount;
  if (n === undefined || n >= pool.length) return pool;
  const count = Math.max(1, n);

  // смешиваем seed с id шага
  let h = seed >>> 0;
  for (let i = 0; i < step.id.length; i++) {
    h = Math.imul(h ^ step.id.charCodeAt(i), 2654435761);
  }
  const rand = mulberry32(h);

  // Фишер–Йетс по индексам, берём первые count, сортируем по исходному порядку
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = idx[i] as number;
    idx[i] = idx[j] as number;
    idx[j] = a;
  }
  return idx
    .slice(0, count)
    .sort((a, b) => a - b)
    .flatMap((i) => (pool[i] ? [pool[i] as typeof pool[number]] : []));
}
