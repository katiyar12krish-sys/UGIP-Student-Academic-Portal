import type { PlacementMcq } from '../bank';
import { generate, mcq, numDistractors } from './builder';

// Logical reasoning – generated with calculated answers.
const C = 'Reasoning' as const;
const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letter = (i: number) => AZ[((i % 26) + 26) % 26];
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};
const WORDS = ['CAT', 'DOG', 'SUN', 'PEN', 'BOOK', 'TREE', 'FISH', 'MILK', 'ROAD', 'GOLD', 'RAIN', 'STAR', 'BIRD', 'DESK', 'LAMP', 'ROSE', 'SHIP', 'KING', 'CAKE', 'WIND', 'FARM', 'NOTE', 'PARK', 'COAL', 'HILL', 'LION', 'MOON', 'SALT', 'TIME', 'WORK', 'CODE', 'DATA', 'BRICK', 'STONE', 'WATER', 'PLANT', 'TRAIN', 'HOUSE', 'CHAIR', 'MOUSE'];
const shiftWord = (w: string, k: number) => [...w].map(ch => letter(AZ.indexOf(ch) + k)).join('');
const DIRS = ['North', 'East', 'South', 'West'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [12, 16, 20], [7, 24, 25], [15, 20, 25], [20, 21, 29], [10, 24, 26]];

export const REASONING_QUESTIONS: PlacementMcq[] = [
  ...generate('rea-ap', 201, 136, (r, id) => {
    const a = r.int(1, 60);
    const d = r.int(2, 15) * (r.next() < 0.2 ? -1 : 1);
    const t = [0, 1, 2, 3, 4].map(k => a + k * d);
    const ans = a + 5 * d;
    return mcq(r, id, C, `Find the next number: ${t.join(', ')}, ?`, String(ans), numDistractors(r, ans, Math.abs(d) > 3 ? 2 : 1).map(String), `Each term changes by ${d}: ${t[4]} + (${d}) = ${ans}`);
  }),
  ...generate('rea-gp', 202, 85, (r, id) => {
    const a = r.int(1, 30);
    const k = r.pick([2, 3, 4]);
    const t = [0, 1, 2, 3].map(i => a * k ** i);
    const ans = a * k ** 4;
    return mcq(r, id, C, `Find the next number: ${t.join(', ')}, ?`, String(ans), numDistractors(r, ans, a).map(String), `Each term is multiplied by ${k}: ${t[3]} x ${k} = ${ans}`);
  }),
  ...generate('rea-sq', 203, 68, (r, id) => {
    const n = r.int(1, 25);
    const cube = r.next() < 0.3;
    const f = (x: number) => (cube ? x ** 3 : x * x);
    const t = [0, 1, 2, 3].map(i => f(n + i));
    const ans = f(n + 4);
    return mcq(r, id, C, `Find the next number: ${t.join(', ')}, ?`, String(ans), numDistractors(r, ans, cube ? 7 : 2).map(String), `These are ${cube ? 'cubes' : 'squares'} of ${n}, ${n + 1}, ${n + 2}, ${n + 3} -> next ${n + 4}${cube ? '^3' : '^2'} = ${ans}`);
  }),
  ...generate('rea-diff', 204, 102, (r, id) => {
    const a = r.int(1, 30);
    const d = r.int(1, 6);
    const k = r.int(1, 4);
    const t = [a];
    for (let i = 0; i < 4; i++) t.push(t[i] + d + i * k);
    const ans = t[4] + d + 4 * k;
    return mcq(r, id, C, `Find the next number: ${t.join(', ')}, ?`, String(ans), numDistractors(r, ans, k).map(String), `Differences ${d}, ${d + k}, ${d + 2 * k}, ${d + 3 * k} grow by ${k}; next difference ${d + 4 * k} -> ${ans}`);
  }),
  ...generate('rea-let', 205, 102, (r, id) => {
    const s = r.int(0, 25);
    const k = r.int(1, 5) * (r.next() < 0.25 ? -1 : 1);
    if (s + 4 * k < 0 || s + 4 * k > 25) return null;
    const t = [0, 1, 2, 3].map(i => letter(s + i * k));
    const ans = letter(s + 4 * k);
    return mcq(r, id, C, `Find the next letter: ${t.join(', ')}, ?`, ans, [letter(s + 4 * k + 1), letter(s + 4 * k - 1), letter(s + 4 * k + 2)], `Letters move ${k > 0 ? 'forward' : 'backward'} by ${Math.abs(k)} -> ${ans}`);
  }),
  ...generate('rea-code', 206, 136, (r, id) => {
    const k = r.pick([1, 2, 3, -1, -2]);
    const [w1, w2] = r.shuffle(WORDS).slice(0, 2);
    const ans = shiftWord(w2, k);
    return mcq(r, id, C, `If ${w1} is written as ${shiftWord(w1, k)}, how is ${w2} written in that code?`, ans, [shiftWord(w2, k + 1), shiftWord(w2, -k), [...ans].reverse().join('')], `Each letter is shifted by ${k > 0 ? '+' : ''}${k}: ${w2} -> ${ans}`);
  }),
  ...generate('rea-pos', 207, 68, (r, id) => {
    const from = r.int(5, 20);
    const move = r.int(2, 6);
    const right = r.next() < 0.5;
    const pos = right ? from + move : from - move;
    if (pos < 1 || pos > 26) return null;
    const ans = letter(pos - 1);
    return mcq(r, id, C, `Which letter is ${move} places to the ${right ? 'right' : 'left'} of the ${from}th letter of the English alphabet?`, ans, [letter(pos), letter(pos - 2), letter(from - 1)], `${from}th letter is ${letter(from - 1)}; ${right ? '+' : '-'}${move} -> position ${pos} = ${ans}`);
  }),
  ...generate('rea-dir', 208, 102, (r, id) => {
    const [a, b, h] = r.pick(TRIPLES);
    const start = r.int(0, 3);
    const turnRight = r.next() < 0.5;
    const d1 = DIRS[start];
    const d2 = DIRS[(start + (turnRight ? 1 : 3)) % 4];
    if (r.next() < 0.5) {
      return mcq(r, id, C, `Ravi walks ${a} km ${d1}, then turns ${turnRight ? 'right' : 'left'} and walks ${b} km. How far is he from the starting point?`, `${h} km`, [`${a + b} km`, `${Math.abs(b - a) || h + 2} km`, `${h + 1} km`], `Right-angled path: sqrt(${a}^2 + ${b}^2) = ${h} km`);
    }
    const ns = d1 === 'North' || d1 === 'South' ? d1 : d2;
    const ew = d1 === 'East' || d1 === 'West' ? d1 : d2;
    const ans = `${ns}-${ew}`;
    const opp = (d: string) => DIRS[(DIRS.indexOf(d) + 2) % 4];
    return mcq(r, id, C, `Seema walks ${a} km ${d1}, turns ${turnRight ? 'right' : 'left'} and walks ${b} km. In which direction is she now from the start?`, ans, [`${opp(ns)}-${ew}`, `${ns}-${opp(ew)}`, `${opp(ns)}-${opp(ew)}`], `${a} km ${d1} + ${b} km ${d2} -> ${ans}`);
  }),
  ...generate('rea-odd', 209, 102, (r, id) => {
    const kind = r.int(0, 2);
    const pool = [...Array(98)].map((_, i) => i + 2);
    let good: number[];
    let bad: number[];
    let rule: string;
    if (kind === 0) {
      good = pool.filter(isPrime);
      bad = pool.filter(n => !isPrime(n) && n % 2 === 1);
      rule = 'all others are prime numbers';
    } else if (kind === 1) {
      good = pool.filter(n => n % 2 === 0);
      bad = pool.filter(n => n % 2 === 1);
      rule = 'all others are even numbers';
    } else {
      good = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144];
      bad = pool.filter(n => !Number.isInteger(Math.sqrt(n)));
      rule = 'all others are perfect squares';
    }
    const three = r.shuffle(good).slice(0, 3);
    const odd = r.pick(bad);
    return mcq(r, id, C, `Find the odd one out: ${r.shuffle([...three, odd]).join(', ')}`, String(odd), three.map(String), `${odd} is the odd one – ${rule}.`);
  }),
  ...generate('rea-clock', 210, 68, (r, id) => {
    const h = r.int(1, 12);
    const m = r.pick([0, 10, 15, 20, 30, 40, 45, 50]);
    let ang = Math.abs(30 * (h % 12) - 5.5 * m);
    if (ang > 180) ang = 360 - ang;
    const fmtA = (x: number) => `${x} degrees`;
    return mcq(r, id, C, `Angle between the hour and minute hands at ${h}:${String(m).padStart(2, '0')}?`, fmtA(ang), numDistractors(r, ang, 5).map(fmtA), `|30 x ${h % 12} - 5.5 x ${m}| = ${ang} degrees`);
  }),
  ...generate('rea-day', 211, 85, (r, id) => {
    const d = r.int(0, 6);
    const n = r.int(8, 120);
    const ans = DAYS[(d + n) % 7];
    return mcq(r, id, C, `If today is ${DAYS[d]}, what day will it be after ${n} days?`, ans, [DAYS[(d + n + 1) % 7], DAYS[(d + n + 6) % 7], DAYS[(d + n + 2) % 7]], `${n} mod 7 = ${n % 7}; ${DAYS[d]} + ${n % 7} = ${ans}`);
  }),
  ...generate('rea-ana', 212, 68, (r, id) => {
    const cube = r.next() < 0.4;
    const [a, b] = r.shuffle([...Array(14)].map((_, i) => i + 2)).slice(0, 2);
    const f = (x: number) => (cube ? x ** 3 : x * x);
    return mcq(r, id, C, `${a} : ${f(a)} :: ${b} : ?`, String(f(b)), [String(f(b) + b), String(cube ? b * b : b ** 3), String(f(b) - 1)], `Second number is the ${cube ? 'cube' : 'square'} of the first: ${b} -> ${f(b)}`);
  }),
  ...generate('rea-rank', 213, 68, (r, id) => {
    const top = r.int(3, 25);
    const bottom = r.int(3, 25);
    const total = top + bottom - 1;
    return mcq(r, id, C, `In a row, Amit is ${top}th from the front and ${bottom}th from the back. How many students are in the row?`, String(total), [String(total + 1), String(total - 1), String(total + 2)], `Total = ${top} + ${bottom} - 1 = ${total}`);
  }),
];
