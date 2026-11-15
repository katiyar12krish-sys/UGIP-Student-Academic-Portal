# Question Papers & Answer Keys

Menu: **Question Papers & Answer Keys** (admin, faculty, student). Parents do not see it.

## What is there
- **Sample papers**: two per subject (Set A, Set B), written from the UBTER syllabus in the board pattern, each with a separate **answer key PDF**.
  - 1st year (Sem 1, 2), 50 marks, 2½ hours: Section A any 10 of 12 × 1, Section B any 5 of 7 × 3, Section C any 5 of 7 × 5
  - 2nd/3rd year (CSE Sem 3, 5), 70 marks, 2½ hours: Section A any 10 of 12 × 1, Section B any 5 of 7 × 5, Section C any 5 of 7 × 7
  - Subjects: Sem 1 and 2 common subjects (English, Maths, Physics, Chemistry, Computer Fundamentals, EVS), CSE Sem 3 (C, Computer Organization, OS, Web Design, Open Source, Office Application), CSE Sem 5 (Java, Software Engineering, Hardware, Android).
  - Not included: Engineering Graphics, Workshop Practice and Minor Project (drawing / practical, no written paper), and Civil Sem 3 to 6 plus CSE Sem 4 and 6 (no syllabus in the portal yet).
- **Old board papers** given by the college (`server/papers/previous/*.pdf`, list in `server/papers/content/previous.ts`), each with a model **answer key** written by the institute (`server/papers/content/old-answers/`). If a teacher uploads their own answer key for one of these papers, the server keeps theirs.

## Who can do what
| | open / download paper and answer key | upload new paper | upload / replace answer key | remove paper |
|---|---|---|---|---|
| Admin | all | yes | yes | any |
| Faculty | all | yes* | yes* | only papers they uploaded |
| Student | common 1st-year papers + own branch | no | no | no |

\* The admin can switch this off per teacher: Faculty permissions → "Question papers & answer keys (upload)".

## Where the data lives (going live)
- Every paper and answer key file is stored **inside the database**: tables `exam_papers` and `exam_paper_files` in `data/portal.db`. Copying `data/portal.db` carries all of them, including papers and answer keys staff uploaded later.
- On every start the server checks `server/papers/content/` and `server/papers/previous/`:
  - it creates missing sample papers and old papers (a fresh empty database gets all of them automatically);
  - it rebuilds a sample paper only when its question text was changed in the code;
  - it never overwrites an answer key that a teacher replaced by hand, and never brings back a paper someone removed (admin: "Bring back removed sample papers").
- To change a sample question: edit the file in `server/papers/content/` and restart the server.
- Table layout: `database/sqlite/full-schema.sql` (regenerated with `npm run schema`).
