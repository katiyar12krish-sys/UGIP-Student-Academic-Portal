# Step 7: assignments and online tests on the server (with questions, answers and deadline reminders)

Assignments / online tests used to live in the browser (`localStorage`). They are now in the database (`data/portal.db`), so every device sees the same tests, and the server checks who may do what.

## Who can do what (subject-wise)

The same rule as marks and attendance: `canTeach` in `server/academic/access.ts` (a faculty member teaches the subjects assigned to them; admin: all).

| | admin | faculty (own subject) | faculty (other subject) | student (same class) | student (other class) | parent |
|---|---|---|---|---|---|---|
| Create a test / assignment | yes | yes | no | no | no | no |
| See the test with its **answer key** and every student's result | yes | yes | no (not even listed) | no | no | no |
| See the test (no answer key) and **own** result | | | | yes | no | no |
| Answer questions and submit | no | no | no | yes | no | no |
| Remind students who have not submitted | yes | yes | no | no | no | no |

- Branch, year and semester are **copied from the subject**, never taken from the request. The create form now has a **Subject** list that shows only the teacher's own subjects (before, the subject was silently the first one in the list).
- **The answer key never reaches a student before they submit.** The student's list has only the question count; the questions come from `GET /api/online-tests/:id/questions` without `correctIndex` or explanation; after submitting, the reply contains the review (right answers, explanations) for the attempt they just made.
- **Grading is done by the server.** Score = correct / total x total marks (rounded), grade on the same scale the screen always used (A+ 90, A 80, B 70, C 60, D 50, E 40, else F). A retake keeps the better score.
- **The deadline is enforced.** After the deadline (plus a 2-minute grace for an attempt that was already running) the questions are not served and a submission is refused. The deadline is Indian time (IST).
- A test **without questions** (a plain assignment) is just marked "submitted" by the student. It has no score. (Before, the screen graded it against an unrelated sample question bank, which has been removed.)
- A student is told only about **their own** submission; they get the number of classmates who submitted, not who.

## Deadline reminders (now on the server)

Run by the scheduler in `server/notify/rules.ts` (`assignmentReminders`, every 10 minutes), so they arrive even when nobody has the portal open. They appear in the bell and, if the person turned it on, as phone notifications (07:00-21:00 IST), like the Step 4 messages.

| Message | Who | When |
|---|---|---|
| New test: *title* | every student of the class | when the teacher creates it |
| Reminder 1 / 2 / 3 of 3 | only students of the class who have **not** submitted | 72 h, 24 h and 3 h before the deadline. If the server was off, only the latest due one is sent |
| Deadline passed | the students who did not submit (once) | after the deadline |
| Deadline over: *title* | the teacher who created it and the teacher(s) assigned to the subject | after the deadline: how many did not submit (the names are in the Performance Report, not in the notification text) |
| Please submit | not submitted students | teacher presses **Alert unsubmitted students** (at most once per hour per test) |

Same rules as Step 4: nothing is sent to a person who has not allowed notifications (a parent allows it for a student under 18), and the same event never notifies the same person twice (`dedupe_key` = `asg:<test>:<n>`). After the deadline the test becomes `expired` (someone did not submit) or `completed` (everyone did).

The old browser reminder code is removed (`src/services/reminderEngine.ts` only keeps the countdown helpers), so nobody gets a reminder twice.

## Moving old data

If real tests were created in a browser before this step: log in as **admin** on that computer, Overview tab, **Move to server** (the same yellow box as Step 2). The two sample tests that came with the app are not moved. Each test is matched to a subject by its code and branch, and to a teacher by name (if no name matches, to the teacher assigned to the subject). Safe to press twice.

## API

`GET /api/online-tests` · `POST /api/online-tests` (teacher / admin) · `GET /api/online-tests/:id/questions` (student) · `POST /api/online-tests/:id/submit {answers:[index|null,...]}` (student) · `POST /api/online-tests/:id/remind` (teacher / admin)

Tables: `online_tests`, `online_test_questions`, `online_test_submissions` (see `server/db/schema.sql`). A subject that has online tests cannot be deleted.

## Tests

`npm run test:assignments` (15 tests): the subject-wise rule, input checks, what each role sees (the answer key must not appear in a student's data), grading, deadline and grace, best attempt, plain assignments, each reminder with Indian-time deadlines, no repeats, catch-up sends only the latest, teacher summary, consent, old-data move. `npm test` runs everything.

## Not covered / known limits

- **Written so far without running the full app**: the sandbox this step was built in could not install `npm` packages, so the server logic was tested directly (the 15 tests above) but the Express routes and the screens were only syntax-checked. Please try once in the browser: create a test as a teacher, answer it as a student, press "Alert unsubmitted students", and check the bell.
- A student can **retake** a test after seeing the answers (as before); the better score counts. If you want only the first attempt to count, it is one line in `submit()` (`server/assignments/service.ts`).
- The 10-minute timer on the test screen is still in the browser; the server only enforces the deadline.
- Tests cannot be edited or deleted yet (same as before).
- A teacher who was only given **read access** to a colleague's marks (Step 2 grants) does not see that colleague's online tests.
- Parents do not see online tests and are not sent these reminders.
