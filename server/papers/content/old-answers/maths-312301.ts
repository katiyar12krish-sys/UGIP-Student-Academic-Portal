import type { OldAnswerKey } from '../../pdf';

// Model answers for the old paper "Applied Mathematics (paper code 312301), 3 Hours / 70 Marks".
export const MATHS_312301: OldAnswerKey = {
  parts: [
    { title: 'Q.1  Solve any FIVE (2 marks each)', items: [
      ['a) ∫ (1/(1 + x²) + 5ˣ) dx', 'tan⁻¹x + 5ˣ/log 5 + C'],
      ['b) ∫ tan²x dx', '∫ (sec²x − 1) dx = tan x − x + C'],
      ['c) ∫₁² dx/(2x + 11)', '½ [log(2x + 11)] from 1 to 2 = ½ (log 15 − log 13) = ½ log(15/13)'],
      ['d) Order and degree of d²y/dx² = √(1 + (dy/dx)³)', 'Squaring: (d²y/dx²)² = 1 + (dy/dx)³\nOrder = 2, degree = 2'],
      ['e) Show that x² − 2x − 1 = 0 has a root in (−1, 0)', 'f(x) = x² − 2x − 1;  f(−1) = 1 + 2 − 1 = 2 > 0;  f(0) = −1 < 0\nf is continuous and changes sign, so a root lies between −1 and 0.'],
      ['f) √26 by the Bakhshali method', 'N = 26, nearest square A² = 25 → A = 5, b = N − A² = 1\nFirst step: 5 + b/(2A) = 5 + 1/10 = 5.1\nBakhshali correction: √N ≈ 5.1 − (0.1)²/(2 × 5.1) = 5.1 − 0.00098 = 5.0990'],
      ['g) Ten fair coins: P(exactly 3 heads)', 'Binomial, n = 10, p = q = ½\nP(3) = ¹⁰C₃ (½)¹⁰ = 120/1024 = 15/128 ≈ 0.1172'],
    ] },
    { title: 'Q.2  Solve any THREE (4 marks each)', items: [
      ['a) ∫ dx/(2x + x log x)', '= ∫ dx/(x(2 + log x));  t = 2 + log x, dt = dx/x\n= ∫ dt/t = log|2 + log x| + C'],
      ['b) ∫ sec²x / ((1 + tan x)(2 + tan x)) dx', 't = tan x, dt = sec²x dx:  ∫ dt/((1 + t)(2 + t)) = ∫ [1/(1 + t) − 1/(2 + t)] dt\n= log|(1 + tan x)/(2 + tan x)| + C'],
      ['c) ∫ x tan⁻¹x dx', 'By parts (u = tan⁻¹x, dv = x dx): (x²/2) tan⁻¹x − ∫ (x²/2) · 1/(1 + x²) dx\n= (x²/2) tan⁻¹x − ½ ∫ (1 − 1/(1 + x²)) dx = (x²/2) tan⁻¹x − ½ (x − tan⁻¹x) + C\n= ½ [(x² + 1) tan⁻¹x − x] + C'],
      ['d) ∫ dx/(2x² + 3x + 1)', '2x² + 3x + 1 = (2x + 1)(x + 1);  1/((2x + 1)(x + 1)) = 2/(2x + 1) − 1/(x + 1)\n∫ = log|2x + 1| − log|x + 1| + C = log|(2x + 1)/(x + 1)| + C'],
    ] },
    { title: 'Q.3  Solve any THREE (4 marks each)', items: [
      ['a) ∫ dx/(4cos²x + 9sin²x)', 'Divide by cos²x: ∫ sec²x dx/(4 + 9tan²x);  t = tan x\n= (1/9) ∫ dt/(t² + (2/3)²) = (1/9)(3/2) tan⁻¹(3t/2) = (1/6) tan⁻¹(3 tan x / 2) + C'],
      ['b) ∫₀⁵ √(9 − x) / (√(9 − x) + √(x + 4)) dx', 'Using ∫ₐᵇ f(x) dx = ∫ₐᵇ f(a + b − x) dx with x → 5 − x:\nI = ∫₀⁵ √(x + 4) / (√(x + 4) + √(9 − x)) dx\nAdding: 2I = ∫₀⁵ 1 dx = 5  →  I = 5/2'],
      ['c) (3x² + 6xy²) dx + (6x²y + 4y²) dy = 0', 'M = 3x² + 6xy², N = 6x²y + 4y²;  ∂M/∂y = 12xy = ∂N/∂x → exact\n∫M dx (y constant) = x³ + 3x²y²;  terms of N free of x: ∫4y² dy = (4/3)y³\nSolution: x³ + 3x²y² + (4/3)y³ = C'],
      ['d) Root of x³ − 2x − 5 = 0 by bisection (3 iterations)', 'f(2) = −1 < 0, f(3) = 16 > 0 → root in (2, 3)\nx₁ = 2.5: f = 5.625 > 0 → (2, 2.5)\nx₂ = 2.25: f = 1.8906 > 0 → (2, 2.25)\nx₃ = 2.125: f = 0.3457 > 0 → (2, 2.125)\nRoot ≈ 2.125 after three iterations (true root 2.0946)'],
    ] },
    { title: 'Q.4  Solve any THREE (4 marks each)', items: [
      ['a) ∛100 by Newton-Raphson (3 iterations)', 'f(x) = x³ − 100, f′(x) = 3x²;  xₙ₊₁ = (2xₙ³ + 100)/(3xₙ²);  x₀ = 5\nx₁ = 350/75 = 4.6667\nx₂ = 4.6418\nx₃ = 4.6416  →  ∛100 ≈ 4.6416'],
      ['b) Root of x³ − 9x + 1 = 0 in (2, 3) by Regula Falsi', 'f(2) = −9, f(3) = 1;  x = (a f(b) − b f(a))/(f(b) − f(a))\nx₁ = (2 + 27)/10 = 2.9, f(2.9) = −0.711 → (2.9, 3)\nx₂ = (2.9 + 2.133)/1.711 = 2.9415, f = −0.0224 → (2.9415, 3)\nx₃ = 2.9428  →  root ≈ 2.943'],
      ['c) Gauss-Seidel: 10x + y + z = 12, 2x + 10y + z = 13, 2x + 2y + 10z = 14', 'x = (12 − y − z)/10, y = (13 − 2x − z)/10, z = (14 − 2x − 2y)/10;  start y = z = 0\nIter 1: x = 1.2, y = 1.06, z = 0.948\nIter 2: x = 0.9992, y = 1.0054, z = 0.9991\nIter 3: x = 0.9996, y = 1.0002, z = 1.0001\nSolution: x = 1, y = 1, z = 1'],
      ['d) p = 1/10, n = 12 pens: (i) exactly 2 (ii) at least 2 defective', 'q = 0.9\n(i) P(2) = ¹²C₂ (0.1)² (0.9)¹⁰ = 66 × 0.01 × 0.3487 = 0.2301\n(ii) P(0) = 0.9¹² = 0.2824, P(1) = 12 × 0.1 × 0.9¹¹ = 0.3766\nP(≥ 2) = 1 − (0.2824 + 0.3766) = 0.3410'],
      ['e) 5 % defective bulbs, sample of 100 (Poisson): (i) none (ii) five defective', 'm = np = 100 × 0.05 = 5;  P(r) = e⁻ᵐ mʳ / r!\n(i) P(0) = e⁻⁵ = 0.007\n(ii) P(5) = 0.007 × 5⁵/5! = 0.007 × 3125/120 = 0.1823'],
    ] },
    { title: 'Q.5  Solve any TWO (6 marks each)', items: [
      ['a) (i) ∫ dx/(5 + 4cos x)   (ii) ∫ x sin⁻¹x / √(1 − x²) dx', '(i) t = tan(x/2), cos x = (1 − t²)/(1 + t²), dx = 2dt/(1 + t²):\n∫ 2dt/(9 + t²) = (2/3) tan⁻¹(tan(x/2)/3) + C\n(ii) t = sin⁻¹x, x = sin t, dt = dx/√(1 − x²):  ∫ t sin t dt = −t cos t + sin t\n= x − √(1 − x²) sin⁻¹x + C'],
      ['b) (i) ∫₀^(π/2) sin x/(1 + cos x)² dx   (ii) ∫₀⁴ dx/√(4x − x²)', '(i) t = 1 + cos x, dt = −sin x dx; limits 2 → 1:  ∫₁² dt/t² = [−1/t]₁² = −½ + 1 = ½\n(ii) 4x − x² = 4 − (x − 2)²:  [sin⁻¹((x − 2)/2)]₀⁴ = sin⁻¹(1) − sin⁻¹(−1) = π/2 + π/2 = π'],
      ['c) (i) ∫₀^(π/2) √sin x/(√sin x + √cos x) dx   (ii) ∫₄⁵ √(5 − x)/(√(x − 4) + √(5 − x)) dx', '(i) With x → π/2 − x the integrand becomes √cos x/(√cos x + √sin x); adding, 2I = ∫₀^(π/2) dx = π/2 → I = π/4\n(ii) With x → 9 − x the integrand becomes √(x − 4)/(√(5 − x) + √(x − 4)); 2I = ∫₄⁵ dx = 1 → I = ½'],
    ] },
    { title: 'Q.6  Solve any TWO (6 marks each)', items: [
      ['a) (i) Form the D.E. of y = Aeˣ + Be⁻ˣ   (ii) Solve dy/dx = e^(3x − 2y) + x² e^(−2y)', '(i) y′ = Aeˣ − Be⁻ˣ, y″ = Aeˣ + Be⁻ˣ = y  →  d²y/dx² − y = 0\n(ii) dy/dx = e^(−2y)(e^(3x) + x²)  →  ∫ e^(2y) dy = ∫ (e^(3x) + x²) dx\ne^(2y)/2 = e^(3x)/3 + x³/3 + C'],
      ['b) (i) dy/dx + y cot x = cosec x   (ii) dy/dx = 6 − 3x, y = 0 at x = 0', '(i) Linear: P = cot x, Q = cosec x;  I.F. = e^(∫cot x dx) = sin x\ny sin x = ∫ cosec x · sin x dx = x + C\n(ii) y = 6x − 3x²/2 + C;  x = 0, y = 0 → C = 0;  y = 6x − 3x²/2'],
      ['c) 500 students, mean 68, S.D. 8 (normal): number scoring (i) less than 50 (ii) more than 60', '(i) z = (50 − 68)/8 = −2.25;  P(X < 50) = 0.5 − A(2.25) = 0.5 − 0.4878 = 0.0122\nNumber = 500 × 0.0122 = 6.1 ≈ 6 students\n(ii) z = (60 − 68)/8 = −1;  P(X > 60) = 0.5 + A(1) = 0.8413\nNumber = 500 × 0.8413 = 420.65 ≈ 421 students'],
    ] },
  ],
};
