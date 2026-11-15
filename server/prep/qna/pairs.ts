import type { PlacementMcq, QnaCategory } from '../bank';
import { mcq, rng } from './builder';

export type Fact = [string, string];

/** A trailing note such as "Kerala (female solo)" only keeps table rows apart; it is never shown. */
const plain = (s: string) => s.replace(/\s+\([^)]+\)$/, '');

/**
 * Turns a table of matched pairs into questions asked both ways.
 * Wrong options come from other rows of the same table, so they are always plausible,
 * and a row sharing either side with the question is left out, so no wrong option is also right.
 */
export function pairs(
  prefix: string,
  seed: number,
  category: QnaCategory,
  subject: string,
  facts: Fact[],
  ask: (a: string) => string,
  inverse: (b: string) => string
): PlacementMcq[] {
  const r = rng(seed);
  const out: PlacementMcq[] = [];
  const seen = new Set<string>();
  const add = (q: PlacementMcq | null) => {
    if (q && !seen.has(q.question)) {
      seen.add(q.question);
      out.push({ ...q, subject });
    }
  };
  const rows = facts.map(([a, b]): Fact => [plain(a), plain(b)]);
  rows.forEach(([a, b], i) => {
    const n = String(i + 1).padStart(3, '0');
    const others = rows.filter(f => f[0] !== a && f[1] !== b);
    // Numbers and dates compete with numbers and dates, so the answer does not stand out.
    const sameKind = (x: string) => /^\d/.test(x) === /^\d/.test(b);
    const wrong = r.shuffle(others.map(f => f[1]));
    add(mcq(r, `${prefix}-a${n}`, category, ask(a), b, [...wrong.filter(sameKind), ...wrong.filter(x => !sameKind(x))], `${a}: ${b}`));
    add(mcq(r, `${prefix}-b${n}`, category, inverse(b), a, r.shuffle(others.map(f => f[0])), `${a}: ${b}`));
  });
  return out;
}

/**
 * Exam-style "Which pair is correctly matched?" questions from the same kind of table.
 * The right option is a real row "A – B"; each wrong option joins an A with a B from a DIFFERENT row,
 * skipping any B that also belongs to that A, so exactly one option is correct.
 * `label` names the table in the question ("Books – Authors"); `notMode` asks for the WRONG pair instead.
 */
export function matchedPairs(
  prefix: string,
  seed: number,
  category: QnaCategory,
  subject: string,
  facts: Fact[],
  label: string,
  notMode = false
): PlacementMcq[] {
  const r = rng(seed);
  const rows = facts.map(([a, b]): Fact => [plain(a), plain(b)]);
  const truth = new Set(rows.map(([a, b]) => `${a}|${b}`));
  const out: PlacementMcq[] = [];
  rows.forEach(([a, b], i) => {
    const n = String(i + 1).padStart(3, '0');
    const wrongs: string[] = [];
    for (const [a2] of r.shuffle(rows.filter(f => f[0] !== a))) {
      const bs = r.shuffle(rows.filter(f => f[1] !== b).map(f => f[1]));
      const b2 = bs.find(x => !truth.has(`${a2}|${x}`));
      if (b2) wrongs.push(`${a2} – ${b2}`);
      if (wrongs.length === 3) break;
    }
    if (notMode) {
      // one mismatched pair among three true ones
      const trues = r.shuffle(rows.filter(f => f[0] !== a && f[1] !== b)).slice(0, 3).map(([x, y]) => `${x} – ${y}`);
      const bad = wrongs[0];
      if (!bad || trues.length < 3) return;
      const q = mcq(r, `${prefix}-n${n}`, category, `${label}: which pair is NOT correctly matched? (Set ${i + 1})`, bad, trues, `${bad} is wrong. Correct pairs include ${a} – ${b}.`);
      if (q) out.push({ ...q, subject });
      return;
    }
    const q = mcq(r, `${prefix}-m${n}`, category, `${label}: which pair is correctly matched? (Set ${i + 1})`, `${a} – ${b}`, wrongs, `${a} – ${b}`);
    if (q) out.push({ ...q, subject });
  });
  return out;
}
