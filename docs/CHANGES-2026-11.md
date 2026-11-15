# Changes, November 2026

## Who sees what
- **Sample (random) data** and the **MySQL / database button** are shown only to the **admin** and the **HOD of Computer Science**. Other teachers get only real records (the server leaves sample rows out: `server/auth/sample.ts`).
- **Faculty passwords** can be seen or reset only by the admin; a teacher never sees any faculty password, not even their own.

## Faculty login by subject
- The Faculty box on the login page asks for **subject + password** (no username). The session then opens **only that subject**; for another subject the teacher logs out and logs in again with that subject.
- The admin decides who teaches what in **Faculty Role Control → Subject teachers (semester-wise)**. A subject without a teacher cannot be used to log in.
- Class dispatch shows the teacher of each subject; a teacher sees only their own subject.

## Doubt Q&A
- New **Class questions & PDFs** board at the top of the Doubt section: the admin (any class) or a teacher (own subject) posts a question, an optional answer and an optional PDF / picture. Students see their own class only. (`server/qa/`, `server/routes/qa.ts`)

## Timetable
- Semester filter; **upload a picture / PDF** of the printed timetable per class; **Fill whole day** form for 4–6 periods at once (teacher comes from the subject).

## Study materials
- Ready-made library made once on start-up (`server/materials/library.ts`): unit-wise syllabus & study-plan PDFs, solved question-bank PDFs, YouTube lecture and free tutorial links, plus SWAYAM / NPTEL / NDL / NCERT. Set `STUDY_LIBRARY=0` in `.env` to switch it off.

## Exam calendar
- Admin edits it in **Academic Year**; students, parents and teachers see it with "going on now / days left". First start fills the odd-semester 2026 dates: exam forms 27 Oct – 16 Nov, tests / assignments / practical work and copy checking 17 Nov – 1 Dec, practical exams and final papers 1 – 15 Dec.

## 1st-year board papers added (Question Papers → Semester 1, with answer keys)
- Applied Chemistry - I, 2025 (Winter), old code 991004
- Applied Mathematics - I, 2022 (Summer), old code 991002
- Engineering Drawing - I, 2018 (Winter), old code 1005 (key points; drawing questions must be drawn)

## Checked
- 184 automated tests pass; `vite build` succeeds.
- End-to-end run on a fresh test database: admin, faculty (subject login) and student first login, privacy notice, every main screen, and the new features above (32 checks, all passed).
