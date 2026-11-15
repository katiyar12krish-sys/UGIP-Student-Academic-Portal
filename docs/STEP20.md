# Step 20 (10 Nov 2026): college name, every feature in the database, comments everywhere

## College name
**Uttarakhand Government Institute of Polytechnic** (short form **UGIP**) everywhere: login page, top bar, footers, exports, printouts, privacy notice, authenticator app name, documents. Hindi: उत्तराखंड राजकीय पॉलिटेक्निक संस्थान.

## Every feature now has its database table
These lists were kept only in one browser before (lost when browser data was cleared, not visible on another device). Each now has its own table and permission rules (`server/routes/records.ts`):

| Feature | Table | Who may change it |
|---|---|---|
| Class timetable | `timetable_slots` | admin, faculty |
| Staff gate register (faculty punch) | `staff_attendance` | admin; a teacher only their own |
| Previous-year question papers | `question_papers` | admin, faculty (students may only count a download) |
| Interview / placement experiences | `shared_experiences` | anyone posts; only the writer, faculty or admin edits |
| Practice quizzes | `practice_quizzes` | admin, faculty |
| Quiz attempts, progress graph, mock interviews | `quiz_attempts`, `progress_points`, `mock_interviews` | the student (own), staff |
| Screen activity log | `activity_logs` | added automatically; nobody can edit or delete history; only admin reads |

The browser keeps working the same way: `src/services/recordsSync.ts` loads each list after sign-in and saves every add / change / delete to its table. Only personal settings (language, light / dark mode) stay in the browser on purpose.
Tests: `npm run test:records`.

## Database comments
- `server/db/schema.sql`, `server/db/schema-step18.sql` and the tables created in `server/routes/records.ts` / `resumes.ts`: a description above every table and a comment for **every column**.
- Columns added later (`academic_year`, `is_demo`, `dob`, `pw_view_enc` ...) carry their comment inside the definition, so it is stored in the database itself.
- **`database/sqlite/full-schema.sql`** – the complete live layout (55 tables) with all comments in one file. Re-create it any time with `npm run schema`.
- `database/mysql/schema.sql` (earlier MySQL design, kept for a possible future move) – every table and column commented too.

## Code comments
Every source file starts with a header explaining what it does. In addition, comments were added above every piece of screen state, every handler and function, every automatic effect, every data shape, every tab section and every server route (with who may call it) – about 1,700 comments in 158 files. All tests (20 suites) and the production build pass.
