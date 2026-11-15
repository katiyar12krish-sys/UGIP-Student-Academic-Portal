import type { OldAnswerKey } from '../../pdf';

// Model answers for "Diploma Semester Exam. (S) 2022, 991002 Applied Mathematics - I" (old code).
export const MATHS_991002_2022: OldAnswerKey = {
  parts: [
    { title: 'Section A  (any 10, 2 marks each)', items: [
      ['1. Evaluate ¹⁰C₄.', '10!/(4! 6!) = (10·9·8·7)/(4·3·2·1) = 210'],
      ['2. Number of terms in the expansion of (x + y)¹⁰.', 'n + 1 = 11 terms'],
      ['3. Evaluate |4 3 ; 2 1|.', '4×1 − 3×2 = −2'],
      ['4. A = {1, 3, 4, 5}, B = {3, 5, 7}. Find A ∩ B.', '{3, 5}'],
      ['5. Value of sin 495°.', 'sin 495° = sin(360° + 135°) = sin 135° = 1/√2'],
      ['6. If sin A = 3/5, find sin 2A.', 'cos A = 4/5;  sin 2A = 2 sin A cos A = 2 × 3/5 × 4/5 = 24/25'],
      ['7. Conjugate of 6i − 3.', '−3 − 6i'],
      ['8. Modulus of 1 + i.', '√(1² + 1²) = √2'],
      ['9. lim (x→0) sin x / x.', '1'],
      ['10. f(x) = x² − 5x + 6, find f(4).', '16 − 20 + 6 = 2'],
      ['11. Derivative of tan⁻¹x is −1/(1 + x²).', 'False. d/dx tan⁻¹x = 1/(1 + x²)  (−1/(1 + x²) is the derivative of cot⁻¹x).'],
      ['12. Slope of y = 2x² + 5x + 7 at x = 1.', 'dy/dx = 4x + 5 = 9 at x = 1'],
    ] },
    { title: 'Section B  (any 5, 6 marks each)', items: [
      ['13. Partial fractions of (5x + 1)/(x² + x − 2).', 'x² + x − 2 = (x − 1)(x + 2).  (5x + 1) = A(x + 2) + B(x − 1)\nx = 1: 6 = 3A → A = 2;   x = −2: −9 = −3B → B = 3\nAnswer: 2/(x − 1) + 3/(x + 2)'],
      ['14. A = {1,2,3,4,5,6}, B = {2,4,6,8}. Find A − B and B − A.', 'A − B = {1, 3, 5};   B − A = {8}'],
      ['15. Prove tan 7A − tan 4A − tan 3A = tan 7A tan 4A tan 3A.', '7A = 4A + 3A ⇒ tan 7A = (tan 4A + tan 3A)/(1 − tan 4A tan 3A)\n⇒ tan 7A − tan 7A tan 4A tan 3A = tan 4A + tan 3A\n⇒ tan 7A − tan 4A − tan 3A = tan 7A tan 4A tan 3A'],
      ['16. Prove sin 150° cos 120° + cos 330° sin 660° = −1.', 'sin 150° = 1/2, cos 120° = −1/2, cos 330° = √3/2, sin 660° = sin(720° − 60°) = −√3/2\nLHS = (1/2)(−1/2) + (√3/2)(−√3/2) = −1/4 − 3/4 = −1 = RHS'],
      ['17. Express 1 + i in polar form.', 'r = √2, θ = tan⁻¹(1/1) = π/4\n1 + i = √2 (cos π/4 + i sin π/4)'],
      ['18. Derivative of cos x by first principle.', 'd/dx cos x = lim(h→0) [cos(x + h) − cos x]/h = lim(h→0) [−2 sin(x + h/2) sin(h/2)]/h\n= −lim sin(x + h/2) · lim [sin(h/2)/(h/2)] = −sin x · 1 = −sin x'],
      ['19. Adjoint of [1 2 ; 3 4].', 'Cofactors: C₁₁ = 4, C₁₂ = −3, C₂₁ = −2, C₂₂ = 1\nadj A = transpose of cofactor matrix = [4  −2 ; −3  1]'],
    ] },
    { title: 'Section C  (any 5, 10 marks each)', items: [
      ["20. Cramer's rule: 5x − 7y + z = 11, 6x − 8y − z = 15, 3x + 2y − 6z = 7.", 'D = |5 −7 1 ; 6 −8 −1 ; 3 2 −6| = 5(48 + 2) + 7(−36 + 3) + 1(12 + 24) = 250 − 231 + 36 = 55\nDx = |11 −7 1 ; 15 −8 −1 ; 7 2 −6| = 550 − 581 + 86 = 55\nDy = |5 11 1 ; 6 15 −1 ; 3 7 −6| = −415 + 363 − 3 = −55\nDz = |5 −7 11 ; 6 −8 15 ; 3 2 7| = −430 − 21 + 396 = −55\nx = Dx/D = 1,  y = Dy/D = −1,  z = Dz/D = −1   (check: 5 + 7 − 1 = 11 ✓)'],
      ['21. Term independent of x in [(3/2)x² − 1/(3x)]⁹.', 'T(r+1) = ⁹Cr (3/2)^(9−r) (−1/3)^r x^(18 − 3r)\n18 − 3r = 0 ⇒ r = 6\nT₇ = ⁹C₆ (3/2)³ (1/3)⁶ = 84 × 27/8 × 1/729 = 7/18'],
      ['22. Prove sin 20° sin 40° sin 60° sin 80° = 3/16.', 'sin 20° sin 40° = ½(cos 20° − cos 60°) = ½ cos 20° − ¼\n× sin 80°: ½ cos 20° sin 80° − ¼ sin 80° = ¼(sin 100° + sin 60°) − ¼ sin 80° = ¼ sin 60°  (sin 100° = sin 80°)\nSo sin 20° sin 40° sin 80° = √3/8;  × sin 60° (√3/2) = 3/16'],
      ['23. Square root of 5 + 12i.', 'Let √(5 + 12i) = a + ib: a² − b² = 5, 2ab = 12, a² + b² = |5 + 12i| = 13\n⇒ a² = 9, b² = 4, and ab > 0\n√(5 + 12i) = ±(3 + 2i)'],
      ['24. Maximum value of (1/x)^x is e^(1/e).', 'y = x^(−x);  log y = −x log x;  (1/y) dy/dx = −(log x + 1)\ndy/dx = 0 ⇒ log x = −1 ⇒ x = 1/e\nd²y/dx² < 0 there (y′ changes from + to −), so it is a maximum.\ny_max = (1/(1/e))^(1/e) = e^(1/e)'],
      ['25. Prove |a+b+c −c −b ; −c a+b+c −a ; −b −a a+b+c| = 2(a + b)(b + c)(c + a).', 'C₁ → C₁ + C₂: column becomes (a + b, a + b, −(a + b)) ⇒ take (a + b) out.\nC₂ → C₂ + C₃: column becomes (−(b + c), b + c, b + c) ⇒ take (b + c) out.\nΔ = (a + b)(b + c) |1 −1 −b ; 1 1 −a ; −1 1 a+b+c|\n= (a + b)(b + c)[(a + b + c + a) + (a + b + c − a) − 2b] = (a + b)(b + c) · 2(c + a)'],
      ['26. If y = sin(log x), show x² y″ + x y′ + y = 0.', 'y′ = cos(log x)/x ⇒ x y′ = cos(log x)\nDifferentiate: x y″ + y′ = −sin(log x)/x = −y/x\nMultiply by x: x² y″ + x y′ + y = 0'],
    ] },
  ],
};
