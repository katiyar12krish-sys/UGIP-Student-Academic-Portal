import type { PlacementMcq } from '../bank';
import { fmt, generate, mcq, numDistractors } from './builder';

// Quantitative aptitude – every answer is calculated, so it is always correct.
const C = 'Aptitude' as const;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const PCTS = [5, 10, 12.5, 15, 20, 25, 30, 40, 45, 50, 60, 75];

export const APTITUDE_QUESTIONS: PlacementMcq[] = [
  ...generate('apt-pct', 101, 119, (r, id) => {
    const p = r.pick(PCTS);
    const n = r.int(2, 60) * 40;
    const ans = (p * n) / 100;
    return mcq(r, id, C, `What is ${p}% of ${fmt(n)}?`, fmt(ans), numDistractors(r, ans).map(fmt), `${p}/100 x ${n} = ${fmt(ans)}`);
  }),
  ...generate('apt-inc', 102, 102, (r, id) => {
    const p = r.pick([5, 10, 15, 20, 25, 30, 40, 50]);
    const a = r.int(2, 40) * 20;
    const b = a + (a * p) / 100;
    const up = r.next() < 0.5;
    const q = up ? `The price of an item rises from Rs.${fmt(a)} to Rs.${fmt(b)}. What is the percentage increase?` : `The price of an item falls from Rs.${fmt(b)} to Rs.${fmt(a)}. What is the approximate percentage decrease?`;
    const ans = up ? p : Math.round(((b - a) / b) * 10000) / 100;
    return mcq(r, id, C, q, `${fmt(ans)}%`, numDistractors(r, ans, up ? 5 : 3).map(x => `${fmt(x)}%`), up ? `(${fmt(b)} - ${fmt(a)}) / ${fmt(a)} x 100 = ${p}%` : `(${fmt(b)} - ${fmt(a)}) / ${fmt(b)} x 100 = ${fmt(ans)}%`);
  }),
  ...generate('apt-pl', 103, 119, (r, id) => {
    const cp = r.int(4, 80) * 25;
    const p = r.pick([4, 5, 8, 10, 12, 15, 20, 25, 30]);
    const sp = cp + (cp * p) / 100;
    if (!Number.isInteger(sp)) return null;
    if (r.next() < 0.5) return mcq(r, id, C, `Cost price Rs.${fmt(cp)}, selling price Rs.${fmt(sp)}. Profit percent?`, `${p}%`, numDistractors(r, p, 2).map(x => `${fmt(x)}%`), `Profit = ${fmt(sp - cp)}; ${fmt(sp - cp)}/${fmt(cp)} x 100 = ${p}%`);
    return mcq(r, id, C, `An article bought for Rs.${fmt(cp)} is sold at ${p}% profit. Selling price?`, `Rs.${fmt(sp)}`, numDistractors(r, sp).map(x => `Rs.${fmt(x)}`), `${fmt(cp)} x ${100 + p}/100 = ${fmt(sp)}`);
  }),
  ...generate('apt-loss', 104, 85, (r, id) => {
    const cp = r.int(4, 80) * 25;
    const p = r.pick([4, 5, 8, 10, 12, 15, 20, 25]);
    const sp = cp - (cp * p) / 100;
    if (!Number.isInteger(sp)) return null;
    return mcq(r, id, C, `A shopkeeper buys an item for Rs.${fmt(cp)} and sells it at a loss of ${p}%. Selling price?`, `Rs.${fmt(sp)}`, numDistractors(r, sp).map(x => `Rs.${fmt(x)}`), `${fmt(cp)} x ${100 - p}/100 = ${fmt(sp)}`);
  }),
  ...generate('apt-disc', 105, 85, (r, id) => {
    const mp = r.int(4, 60) * 50;
    const d = r.pick([5, 10, 15, 20, 25, 30, 40]);
    const sp = mp - (mp * d) / 100;
    if (!Number.isInteger(sp)) return null;
    return mcq(r, id, C, `Marked price Rs.${fmt(mp)}, discount ${d}%. Selling price?`, `Rs.${fmt(sp)}`, numDistractors(r, sp).map(x => `Rs.${fmt(x)}`), `${fmt(mp)} - ${d}% of ${fmt(mp)} = ${fmt(sp)}`);
  }),
  ...generate('apt-si', 106, 119, (r, id) => {
    const p = r.int(2, 40) * 500;
    const rate = r.pick([4, 5, 6, 8, 10, 12]);
    const t = r.int(2, 6);
    const si = (p * rate * t) / 100;
    return mcq(r, id, C, `Simple interest on Rs.${fmt(p)} at ${rate}% per annum for ${t} years?`, `Rs.${fmt(si)}`, numDistractors(r, si).map(x => `Rs.${fmt(x)}`), `SI = P x R x T / 100 = ${fmt(p)} x ${rate} x ${t} / 100 = ${fmt(si)}`);
  }),
  ...generate('apt-ci', 107, 85, (r, id) => {
    const [rate, t, mult] = r.pick([[10, 2, 100], [20, 2, 100], [10, 3, 1000], [5, 2, 400]] as const);
    const p = r.int(1, 20) * mult;
    const amt = Math.round(p * Math.pow(1 + rate / 100, t) * 100) / 100;
    const ci = Math.round((amt - p) * 100) / 100;
    return mcq(r, id, C, `Compound interest on Rs.${fmt(p)} at ${rate}% per annum for ${t} years (compounded yearly)?`, `Rs.${fmt(ci)}`, [...numDistractors(r, ci).map(x => `Rs.${fmt(x)}`), `Rs.${fmt((p * rate * t) / 100)}`], `Amount = P(1 + R/100)^T = ${fmt(amt)}; CI = ${fmt(amt)} - ${fmt(p)} = ${fmt(ci)}`);
  }),
  ...generate('apt-spd', 108, 119, (r, id) => {
    const kind = r.int(0, 2);
    if (kind === 0) {
      const s = r.int(4, 24) * 5;
      const t = r.int(2, 8);
      return mcq(r, id, C, `A bus covers ${s * t} km in ${t} hours. Its speed?`, `${s} km/h`, numDistractors(r, s, 5).map(x => `${x} km/h`), `Speed = distance / time = ${s * t}/${t} = ${s} km/h`);
    }
    if (kind === 1) {
      const s = r.int(1, 8) * 18;
      const ms = (s * 5) / 18;
      return mcq(r, id, C, `${s} km/h is equal to how many metres per second?`, `${ms} m/s`, numDistractors(r, ms, 2).map(x => `${x} m/s`), `Multiply by 5/18: ${s} x 5/18 = ${ms} m/s`);
    }
    const s = r.int(3, 15) * 10;
    const t = r.pick([1.5, 2, 2.5, 3, 4, 5]);
    const d = s * t;
    return mcq(r, id, C, `A car runs at ${s} km/h for ${t} hours. Distance covered?`, `${fmt(d)} km`, numDistractors(r, d, 10).map(x => `${fmt(x)} km`), `Distance = speed x time = ${s} x ${t} = ${fmt(d)} km`);
  }),
  ...generate('apt-train', 109, 76, (r, id) => {
    const s = r.int(2, 6) * 18;
    const t = r.int(6, 30);
    const len = (t * s * 5) / 18;
    return mcq(r, id, C, `A train ${fmt(len)} m long runs at ${s} km/h. Time taken to cross a pole?`, `${t} seconds`, numDistractors(r, t, 2).map(x => `${x} seconds`), `${s} km/h = ${(s * 5) / 18} m/s; ${fmt(len)} / ${(s * 5) / 18} = ${t} s`);
  }),
  ...generate('apt-work', 110, 102, (r, id) => {
    const pairs = [[10, 15], [12, 24], [20, 30], [6, 12], [4, 12], [15, 30], [18, 36], [20, 60], [10, 40], [12, 36], [30, 60], [24, 48], [6, 30], [14, 35], [21, 42], [8, 24], [9, 18], [16, 48], [40, 60], [36, 45], [12, 60], [28, 21], [3, 6], [5, 20], [10, 10]];
    if (r.next() < 0.5) {
      const [a, b] = r.pick(pairs);
      const t = (a * b) / (a + b);
      return mcq(r, id, C, `A can finish a work in ${a} days and B in ${b} days. Working together, they finish it in?`, `${fmt(t)} days`, numDistractors(r, t, 1).map(x => `${fmt(x)} days`), `1/${a} + 1/${b} = 1/${fmt(t)} -> ${fmt(t)} days`);
    }
    const m1 = r.int(2, 12) * 2;
    const d1 = r.int(3, 20);
    const m2 = r.pick([...Array(30)].map((_, k) => k + 2).filter(m => (m1 * d1) % m === 0 && m !== m1));
    if (!m2) return null;
    const d2 = (m1 * d1) / m2;
    return mcq(r, id, C, `${m1} workers finish a job in ${d1} days. How many days will ${m2} workers take?`, `${fmt(d2)} days`, numDistractors(r, d2, 1).map(x => `${fmt(x)} days`), `${m1} x ${d1} = ${m1 * d1} man-days; ${m1 * d1} / ${m2} = ${fmt(d2)}`);
  }),
  ...generate('apt-ratio', 111, 102, (r, id) => {
    const a = r.int(1, 9);
    const b = r.int(1, 9);
    if (a === b || gcd(a, b) !== 1) return null;
    const total = (a + b) * r.int(5, 60);
    const share = (total * a) / (a + b);
    return mcq(r, id, C, `Rs.${fmt(total)} is divided between X and Y in the ratio ${a}:${b}. X's share?`, `Rs.${fmt(share)}`, [`Rs.${fmt(total - share)}`, ...numDistractors(r, share).map(x => `Rs.${fmt(x)}`)], `${fmt(total)} x ${a}/${a + b} = ${fmt(share)}`);
  }),
  ...generate('apt-avg', 112, 102, (r, id) => {
    if (r.next() < 0.6) {
      const nums = [...Array(5)].map(() => r.int(10, 99));
      const sum = nums.reduce((s, x) => s + x, 0);
      if (sum % 5) return null;
      return mcq(r, id, C, `Average of ${nums.join(', ')} is`, fmt(sum / 5), numDistractors(r, sum / 5, 2).map(fmt), `Sum ${sum} / 5 = ${sum / 5}`);
    }
    const n = r.int(5, 99);
    const avg = (n + 1) / 2;
    return mcq(r, id, C, `Average of the first ${n} natural numbers is`, fmt(avg), numDistractors(r, avg, 1).map(fmt), `(n + 1)/2 = ${fmt(avg)}`);
  }),
  ...generate('apt-age', 113, 76, (r, id) => {
    const k = r.int(2, 5);
    const b = r.int(4, 18);
    const sum = b * (k + 1);
    return mcq(r, id, C, `A father is ${k} times as old as his son. The sum of their ages is ${sum} years. Son's age?`, `${b} years`, numDistractors(r, b, 2).map(x => `${x} years`), `Son = x, father = ${k}x; ${k + 1}x = ${sum} -> x = ${b}`);
  }),
  ...generate('apt-lcm', 114, 102, (r, id) => {
    const g = r.int(2, 12);
    const a = g * r.int(2, 9);
    const b = g * r.int(2, 9);
    if (a === b) return null;
    const h = gcd(a, b);
    const l = (a * b) / h;
    if (r.next() < 0.5) return mcq(r, id, C, `HCF of ${a} and ${b} is`, String(h), numDistractors(r, h, 1).map(String), `Largest number dividing both = ${h}`);
    return mcq(r, id, C, `LCM of ${a} and ${b} is`, String(l), [String(a * b), ...numDistractors(r, l, h).map(String)], `LCM = ${a} x ${b} / HCF(${h}) = ${l}`);
  }),
  ...generate('apt-simp', 115, 119, (r, id) => {
    const a = r.int(11, 99);
    const b = r.int(2, 19);
    const c = r.int(10, 500);
    const kind = r.int(0, 2);
    if (kind === 0) return mcq(r, id, C, `${a} x ${b} + ${c} = ?`, fmt(a * b + c), numDistractors(r, a * b + c, 10).map(fmt), `${a * b} + ${c} = ${a * b + c}`);
    if (kind === 1) {
      const x = r.int(12, 60);
      const y = r.int(2, x - 1);
      return mcq(r, id, C, `${x}^2 - ${y}^2 = ?`, fmt(x * x - y * y), numDistractors(r, x * x - y * y, 10).map(fmt), `(a+b)(a-b) = ${x + y} x ${x - y} = ${x * x - y * y}`);
    }
    const d = r.int(2, 12);
    const q = r.int(10, 90);
    return mcq(r, id, C, `${d * q} / ${d} + ${c} = ?`, fmt(q + c), numDistractors(r, q + c, 5).map(fmt), `${d * q}/${d} = ${q}; ${q} + ${c} = ${q + c}`);
  }),
  ...generate('apt-root', 116, 76, (r, id) => {
    const n = r.int(11, 99);
    if (r.next() < 0.6) return mcq(r, id, C, `Square root of ${n * n} is`, String(n), numDistractors(r, n, 1).map(String), `${n} x ${n} = ${n * n}`);
    const m = r.int(2, 21);
    return mcq(r, id, C, `Cube root of ${m ** 3} is`, String(m), numDistractors(r, m, 1).map(String), `${m} x ${m} x ${m} = ${m ** 3}`);
  }),
  ...generate('apt-marks', 117, 68, (r, id) => {
    const total = r.pick([400, 500, 600, 700, 800, 1000]);
    const got = r.int(Math.round(total * 0.35), Math.round(total * 0.95));
    const pct = Math.round((got / total) * 10000) / 100;
    return mcq(r, id, C, `A student scores ${got} out of ${total} marks. Percentage?`, `${fmt(pct)}%`, numDistractors(r, pct, 3).map(x => `${fmt(x)}%`), `${got}/${total} x 100 = ${fmt(pct)}%`);
  }),
];
