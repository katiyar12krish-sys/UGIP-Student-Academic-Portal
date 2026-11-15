import type { OldAnswerKey } from '../../pdf';

// Model answers / key points for "Diploma Semester Examination 2018 (Winter), 1005 Engineering Drawing - I".
// Most questions must be DRAWN on the sheet; here are the short answers, the calculation and the steps to follow.
export const DRAWING_1005_2018: OldAnswerKey = {
  note: 'Drawing questions (1, 2(b), 4, 5(b), 6(b)) must be drawn to scale with instruments. Below are the short answers, the calculations and the main steps.',
  parts: [
    { title: 'Short answers', items: [
      ['6(a)(i) ........ centimetres are in one kilometre.', '1,00,000 cm (10⁵ cm)'],
      ['6(a)(ii) Inclination of letters recommended by B.I.S.', '75° to the horizontal'],
      ['6(a)(iii) The minimum distance between two points is known as ........ .', 'A straight line'],
      ['6(a)(iv) When R.F. = 1, the scale is called ........ .', 'Full-size scale'],
      ['2(c) Line conventions.', '(i) Centre line – thin long chain (long dash, short dash).\n(ii) Cutting plane line – thin long chain, thick at the ends and at change of direction, with arrows.\n(iii) Hidden line – thin short dashes.\n(iv) Long break line – thin continuous line with zig-zags.'],
      ['2(a) Aligned vs unidirectional dimensioning.', 'Aligned: dimension figures are placed above and along the dimension line, read from the bottom or the right-hand side of the sheet.\nUnidirectional: all figures are written horizontally and read from the bottom of the sheet; the dimension line is broken in the middle for the figure.'],
      ['5(a) Symbols of first- and third-angle projection.', 'Truncated cone shown by front view and side view: in first angle the side view (circles) is drawn on the RIGHT of the front view; in third angle it is drawn on the LEFT.'],
    ] },
    { title: 'Worked steps', items: [
      ['3. Diagonal scale: field 50,000 m², map 10 cm × 8 cm, read to 1 m, show 235 m.', 'Map area = 80 cm²; field area = 50,000 m² = 5 × 10⁸ cm²\nR.F. = √(80 / 5 × 10⁸) = √(1.6 × 10⁻⁷) = 4 × 10⁻⁴ = 1/2500\nTake the maximum length 300 m: length of scale = 300 m × 1/2500 = 12 cm.\nDivide 12 cm into 3 main parts (100 m each), the first part into 10 (10 m each), and draw 10 equal diagonal divisions (1 m each).\nMark 235 m = 2 main parts + 3 small parts + 5 diagonal divisions. Write R.F. = 1/2500 below the scale.'],
      ['2(b) Ellipse by concentric circles, major axis 80 mm, minor 50 mm.', 'Draw circles of 80 mm and 50 mm diameter on one centre; divide both into 12 equal parts; from each point on the big circle draw a vertical line and from the matching point on the small circle a horizontal line; their meeting points lie on the ellipse; join them with a smooth curve.'],
      ['4. Line AB 70 mm, 45° to V.P., 30° to H.P., A in H.P. and 20 mm in front of V.P.', 'Use the rotating-line method: first find the true length lines at 30° (front view) and 45° (top view), rotate to get the apparent lengths, locate a, a′ (a′ on XY, a 20 mm below XY), and find the H.T. and V.T. where the extended views meet the reference lines.'],
      ['6(c) Standard symbols.', 'Draw any ten from the B.I.S. charts: material hatching (aluminium, brass, leather, wood), knurling, round pipe, exhaust fan, channel section, urinal stall, Indian W.C., shower head, electric bell.'],
    ] },
  ],
};
