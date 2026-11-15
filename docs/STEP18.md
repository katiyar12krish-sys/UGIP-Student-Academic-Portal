# Step 18 (9 Nov 2026): real data, sample data, edit/delete everywhere, automatic promotion, 5-6 years of history

## 1. Fixes to make the project run
- `npm install` failed: `esbuild ^0.25` clashed with Vite 8 → now `^0.27`.
- `npm run lint` had 17 TypeScript errors (login result type, auth routes, placement status, tests, `web-push` types, interview video link) → all fixed.
- **Windows tip:** keep the project in a short folder path (e.g. `C:\gpt-portal`). Very long paths (over 260 characters) stop the build tool (esbuild) from starting.

## 2. Data from the college's papers (real, `server/db/seed-real-2025-26.json`)
Typed in by hand from the scans and checked: for every student the subject marks add up exactly to the printed theory / practical totals.
| Source | What was added |
|---|---|
| Syllabus guide PDF | Official UBTER subjects: 1st year sem 1 (991001-991052) and sem 2 (992001-992052) for CSE and Civil, CSE sem 3 (053001-053006 + GP/IE), Civil sem 3 (023xxx). 55 subjects in total. Old placeholder codes (CS-101 ...) were renamed. |
| `result 8.pdf` (UBTER Cross List, 3rd sem 2025-26 Winter) | 37 students: name, father's name, date of birth, subject-wise theory/practical marks + grade, totals, SGPA, result, back papers. 24 students were missing and were added. Abdul Ahad and Raju Garkoti were "Civil" in the old data; the board sheet says CSE, so they were corrected. |
| `rdbms .pdf` (typed RDBMS sessional sheet) | CT-1..CT-5 and MCQ-1..MCQ-5 (each /10) of 36 students, 2025-26, CSE semester 4. |
| `COMPUTER HARDWARE1 PRA.pdf` | The 18 practicals (title + aim), under the subject "Computer Hardware, Maintenance & Networking (Lab)". |

**Please check / fill in:**
- SGPA was cut off on the scan for 9 students (Himanshi Samant, Jatin Kumar, Kavita, Km Sanjana Chauhan, Krishna Katiyar, Neeraj Joshi, Nishant, Prashant Kumar, Preeti). Their results say "fill in" – edit them in *UBTER Board Results*.
- The official RDBMS subject code is not on the sheet (`CSE-RDBMS` is a placeholder); the semester of the hardware lab is not on the file (put in sem 5). Change both in *Subjects*.
- The handwritten lecture registers (attendance, pages 6-10 of the RDBMS PDF) could not be read reliably and were **not** entered.

## 3. Random sample data (`server/db/demoData.ts`)
Because real marks of today's 1st and 2nd year are not available, the first start creates **sample** data:
45 first-year (2026 batch) and 45 second-year (2025 batch) students of CSE and Civil with sessionals, class tests, assignments, practical/viva marks, ~270 attendance lectures, practical records, online assignments, and last year's exams + board results of the 2nd year.
Every sample item shows a **SAMPLE** badge, can be edited / deleted like real data, and **Admin → Academic Year & Promotion → Delete all sample data** removes all of it in one click (real data is not touched). `DEMO_DATA=0` in `.env` before the first start skips it.

## 4. Edit + delete everywhere
New: exam details (edit), attendance lecture (edit / delete / correct each student), online test / assignment (edit / delete), notice (edit), one-to-one notice (edit / delete – server), doubt (delete), class dispatch (edit), placement drive and job listing (edit), practicals (add / edit / delete + student-wise marks), UBTER board results (add / edit / delete). All deletes ask first in a proper dialog. Server code: `server/routes/edits.ts`, `practicals.ts`, `academicYear.ts`.

## 5. Automatic promotion (`server/academic/promotion.ts`)
- **1 July** every year (after the May-June result; change with `PROMOTION_DATE`): every active student moves up – 1st → 2nd year (sem 3), 2nd → 3rd (sem 5), 3rd → **Passed Out** (kept as alumni). New admissions then simply go into the empty 1st year.
- **January:** odd semester → even semester (1→2, 3→4, 5→6).
- Students with status **Detained / Year Back / Left / Passed Out** are never moved. The admin can also untick single students.
- **Admin → Academic Year & Promotion:** class strength, "Show who will move" preview, promote one class or all, Undo last promotion, history.
- It never promotes twice (class history + batch year are checked), and the first start of a new installation moves nobody.

## 6. Kept for years
- Exams, attendance and online tests carry their **academic year** (`2026-27`); students see this year's work of their class + everything they were marked in before. Attendance % counts only the current year.
- `student_class_history` remembers each student's class in every year, so last year's marks can still be corrected after promotion.
- Nothing is deleted automatically. Run `npm run backup` daily (copy the backup folder to another disk / pen drive). SQLite easily holds 10+ years of a polytechnic's data.

## 7. Look & messages
Plain browser pop-ups (`alert` / `confirm`) were replaced by toast messages and a confirmation dialog (`src/components/common/ui/feedback.tsx`). New screens follow one clean style (cards, clear headings, badges, empty-state texts).

## 8. Comments
Every source file now starts with a header that explains what it does; all Step 18 code is commented line-by-line where it matters.

## Tests
`npm test` – 147 tests (new: `npm run test:step18` covers import, sample data, January switch, July promotion, no double promotion, undo, detained students, one-click sample removal).
