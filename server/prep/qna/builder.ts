import type { PlacementMcq, QnaCategory } from '../bank';

/** Seeded random generator – the same seed always gives the same questions (ids stay stable). */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: <T,>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)],
    shuffle: <T,>(arr: readonly T[]) => {
      const b = [...arr];
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
      }
      return b;
    },
  };
}
export type Rng = ReturnType<typeof rng>;

/** Build one MCQ with the correct answer at a random position. Returns null if options clash. */
export function mcq(
  r: Rng,
  id: string,
  category: QnaCategory,
  question: string,
  correct: string,
  distractors: string[],
  explanation: string
): PlacementMcq | null {
  const uniq = Array.from(new Set(distractors.filter(d => d !== correct))).slice(0, 3);
  if (uniq.length < 3) return null;
  const options = r.shuffle([correct, ...uniq]);
  return { id, category, question, options, correctIndex: options.indexOf(correct), explanation };
}

/** Three nearby wrong numbers for a numeric answer. */
export function numDistractors(r: Rng, ans: number, step?: number): number[] {
  const s = step ?? Math.max(1, Math.round(Math.abs(ans) * 0.1));
  const out = new Set<number>();
  const deltas = r.shuffle([-3, -2, -1, 1, 2, 3, 4, -4]);
  for (const d of deltas) {
    const v = Math.round((ans + d * s) * 100) / 100;
    if (v > 0 && v !== ans) out.add(v);
    if (out.size === 3) break;
  }
  return [...out];
}

export const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-IN') : String(Math.round(n * 100) / 100));

/** Run a generator `count` times with its own seed; skips clashes so counts stay stable. */
export function generate(
  prefix: string,
  seed: number,
  count: number,
  make: (r: Rng, id: string, i: number) => PlacementMcq | null
): PlacementMcq[] {
  const r = rng(seed);
  const out: PlacementMcq[] = [];
  const seen = new Set<string>();
  let i = 0;
  let guard = 0;
  while (out.length < count && guard++ < count * 20) {
    const id = `${prefix}-${String(out.length + 1).padStart(4, '0')}`;
    const q = make(r, id, i++);
    if (q && !seen.has(q.question)) {
      seen.add(q.question);
      out.push(q);
    }
  }
  return out;
}

/** Static list → MCQs. Row: [question, correct, wrong1, wrong2, wrong3, explanation?] */
export type Row = [string, string, string, string, string, string?];
export function fromRows(prefix: string, seed: number, category: QnaCategory, rows: Row[]): PlacementMcq[] {
  const r = rng(seed);
  return rows
    .map(([q, c, w1, w2, w3, ex], i) => mcq(r, `${prefix}-${String(i + 1).padStart(4, '0')}`, category, q, c, [w1, w2, w3], ex ?? `Answer: ${c}`))
    .filter((x): x is PlacementMcq => !!x);
}
