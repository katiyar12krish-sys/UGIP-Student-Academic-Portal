# Step 10: class & subject dispatch and student submissions on the server

"Class & Subject Dispatch" (a teacher sends notes / a task / a paper to one class, students hand in solutions with a file, the teacher grades) used to live in the browser (`localStorage`). A submitted file was stored only as text inside the browser, and any student could open the page as a teacher. Now it is in the database, files are real files on the server (the Step 9 file store), and the server decides who may do what.

## Who can do what

| | admin | teacher (own subject) | teacher (other subject) | student (same class) | student (other class) | parent |
|---|---|---|---|---|---|---|
| **Send** a dispatch (with an optional file) | any subject | yes | no | no | no | no |
| **See** a dispatch and download its file | all | yes | no (not even listed) | yes | no ("not found") | no |
| **Submit** work (text and / or one file) | no | no | no | yes, before the due date | no | no |
| See **submissions** and their files | all | yes | no | **own only** | no | no |
| **Grade** (and change a grade) | yes | yes | no | no | no | no |
| **Delete** a dispatch | any | only what they sent | no | no | no | no |

- The class (branch + semester) is **copied from the subject**, never from the request. A teacher picks only one of the subjects assigned to them (Step 2); the admin may pick any.
- Types: Lecture Notes, Assignment & Task, Test / Exam Paper, Lab Module, Circular Notice, Formula Sheet. **Only "Assignment & Task" takes submissions**, and only it has a due date and max marks (1 to 1000).
- **Due date:** a task is open until **23:59 IST on the due date**. After that the server refuses new and changed submissions. The due date of a new task cannot be in the past.
- A student can **replace** their submission until the due date; the old file is deleted from disk. Once a teacher has **graded** it, it is locked (the teacher can still change the grade).
- Marks must be a number from 0 to the max marks (two decimals kept). Feedback: 1000 characters. Answer text: 5000. Title 200, description 2000.
- Deleting a dispatch deletes its file, all submissions and their files.
- A subject that has dispatches cannot be deleted (same rule as exams, tests, doubts and materials).

## Files

Same two-step upload as Step 9 (`POST /api/files`, then use the file id), same type check by the first bytes (PDF, JPEG, PNG, Word, PowerPoint, Excel), 10 MB (`MAX_UPLOAD_MB`).

- **Students can now upload**, but only through this route and only to hand in work: 10 uploads per hour (staff 30). An upload nobody attached within an hour is deleted. Nobody can open a pending file.
- The file of a dispatch is opened only through `GET /api/dispatches/:id/file`, a submission file only through `GET /api/dispatches/:id/submissions/:sid/file`. The second works for **that student and the subject's teachers / admin only**. Classmates, other teachers and parents get "not found". File ids are never sent to the browser.
- PDFs and pictures open in the browser, Word / PowerPoint / Excel are saved (`nosniff`, `Cache-Control: private, no-cache`), as in Step 9.

## Messages (bell and phone)

| Message | Who | When |
|---|---|---|
| New task / New class material: *title* | students of the class | a dispatch is sent |
| Submission: *title* (name only, never the answer) | teachers of the subject | a student hands in or replaces work |
| Graded: *title* (no marks, no feedback) | that student | a grade is saved or changed |

Same rules as Step 4: only people who allowed notifications, never twice for the same event (`dedupe_key`), phone messages only 07:00-21:00 IST.

## Not moved: old browser data

There is **no "Move to server"** for this step. The sample dispatches that came with the app are gone. Real dispatches and submissions made in a browser before this step stay in that browser's `localStorage` and are no longer read (their "files" were only text inside the browser).

## API

`GET /api/dispatches` · `POST /api/dispatches` (staff) · `DELETE /api/dispatches/:id` · `POST /api/dispatches/:id/submissions` (student) · `POST /api/dispatches/:id/submissions/:sid/grade` (staff) · `GET /api/dispatches/:id/file[?download=1]` · `GET /api/dispatches/:id/submissions/:sid/file[?download=1]`

Tables: `dispatches`, `dispatch_submissions` (see `server/db/schema.sql`); `stored_files.attached_to` is now also `dispatch:<id>` or `submission:<id>`. Code: `server/dispatch/service.ts` (all the rules), `server/routes/dispatch.ts`, notifications in `server/notify/rules.ts`, screen `src/components/common/ClassSubjectDispatcher.tsx`, calls `src/services/dispatchApi.ts`. The screen refreshes from the server every 15 seconds.

## Tests

`npm run test:dispatch` (12 tests): input checks, class copied from the subject, who may send, upload must be yours and used once, who sees what, who may submit, the due date at the end of the day in IST (one millisecond before / after), replace removes the old file, grading limits and the lock, a student sees only their own submission, who can open which file (teacher's file, student's file, wrong dispatch, text-only submission), delete removes everything from disk, subject delete guard, every message (right people, no private text, no repeats, consent).

## Not covered / known limits

- **The screens were not run in a browser** (the sandbox could not install `npm` packages), and the Express routes were not run either; only the server logic is tested. Please try once: as a teacher send a Task with a PDF and a due date, as a student of that class download it, submit text + a picture, change the submission, as the teacher open the student's file and grade it, see the bell; as a student of another class check that nothing shows; delete the task.
- Student work is **one answer + at most one file**. No several files, no versions kept, no "late submission" window.
- Parents do not see dispatches or grades.
- Dispatches cannot be edited (delete and send again).
- The old "Class Student Numbers" button on the same screen (teacher edits a student's phone) is unchanged and still works on browser data; it is not part of this step.
- Still in the browser only: timetable, placement data, faculty punches.
