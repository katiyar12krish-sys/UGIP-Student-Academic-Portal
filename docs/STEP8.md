# Step 8: notices, one-to-one notices and doubts on the server

Notices (circulars), private notices to one student, and doubts (a student's question to the teachers) used to live in the browser (`localStorage`): each device had its own copy and nothing stopped anyone from reading or changing them. They are now in the database (`data/portal.db`), and the server decides who may see or do what.

## Who can do what

| | admin | teacher (own class / subject) | teacher (other class / subject) | student (same class) | student (other class) | parent |
|---|---|---|---|---|---|---|
| **Notice**: publish | any audience, may write the "published by" line | only to classes they teach; "published by" is always their own name | no | no | no | no |
| Notice: read | all | all | all | their class only | no | their child's class |
| Notice: delete | any | only their own | only their own | no | no | no |
| **Direct notice**: send to one student | any student | students of classes they teach | no | no | no | no |
| Direct notice: read | all | the ones they sent | the ones they sent | their own only | no | no |
| **Doubt**: ask | no | no | no | own class' subjects only | no | no |
| Doubt: read and reply | all | doubts of subjects they teach | no (not even listed) | their own only | no | no |
| Doubt: mark resolved | yes | yes | no | their own | no | no |

- A "class" is branch + semester. A teacher teaches a class when one of the subjects assigned to them (Step 2) belongs to it. So a notice for **all branches / all semesters** can only be published by the admin.
- A notice has a category, a priority (Normal / High / Urgent), a target branch (or All) and target semesters (empty = all). **Placement** notices must name the semesters.
- **Visitors who are not logged in** (the front page) get only notices meant for everybody: no class targeting, and never Placement.
- Doubts: a student can only pick a subject of their own class. The class is copied from the subject. The teachers shown as "Assigned Expert" are the ones assigned to that subject (the old screen let the student pick any teacher, with an id that did not exist). Sender name and role in a doubt thread come from the login, never from the request. A teacher's first reply moves **Pending** to **In Discussion**; a student writing again under a **Resolved** doubt reopens it.
- Limits: title 200, notice text 5000, direct message 2000, doubt details and replies 2000 characters. Rate limits: 30 notices / hour per person, 60 direct notices / hour, 10 new doubts / hour per student, 40 doubt messages / 10 minutes.

## Messages (bell and phone)

Same rules as Step 4: only to people who allowed notifications (a parent allows it for a student under 18), the same event never notifies the same person twice (`dedupe_key`), phone messages only 07:00-21:00 IST, and **no private text on the lock screen**.

| Message | Who | When |
|---|---|---|
| Notice: *title* / Urgent notice: *title* | students the notice is meant for | only for **High** and **Urgent** notices |
| Message from *teacher* | the student | a direct notice is sent. The text only says "Open the portal to read it" |
| New doubt: *subject* | the teachers of that subject | a student asks (no question text) |
| Reply to your doubt / *Name* replied | the student / the teachers | someone writes in the thread (no reply text) |
| Doubt resolved | the student | a teacher closes it |

## Not moved: old browser data

There is **no "Move to server"** for this step. The three sample notices that came with the app, the two sample direct notices and the two sample doubts are not moved; the front page shows "No circulars have been published yet" until the admin publishes one. Real notices or doubts created in a browser before this step stay in that browser's `localStorage` and are no longer read. If you need them moved, say so.

## API

`GET /api/public/notices` (no login) · `GET /api/notices` · `POST /api/notices` · `DELETE /api/notices/:id` · `GET /api/direct-notices` · `POST /api/direct-notices` · `POST /api/direct-notices/:id/read` · `GET /api/doubts` · `POST /api/doubts` · `POST /api/doubts/:id/replies {text}` · `POST /api/doubts/:id/resolve`

Tables: `notices`, `direct_notices`, `doubts`, `doubt_replies` (see `server/db/schema.sql`). A subject that has doubts cannot be deleted.

The screens refresh by asking the server: notices every minute, direct notices and doubts every 15 seconds (and straight after you send something).

## Tests

`npm run test:comms` (9 tests): input checks, the class rule for teachers, "published by" cannot be faked, who reads which notice (student / parent / staff / visitor), delete rights, direct-notice rights, doubt visibility and the status flow, and every message (right people, no private text, no repeats, consent).
The Express routes were also run once through a small stand-in for `express` (35 checks: login needed, 401/403/404/400 answers, what each role gets back). That stand-in is not part of the project.

## Not covered / known limits

- **The screens were not run in a browser.** The sandbox could not install `npm` packages, so the React screens were only edited and read, not compiled or opened. Please try once: publish a notice as a teacher and as admin, ask a doubt as a student, answer it as the subject's teacher, send a direct notice, check the bell.
- A student sees only their **own** doubts (the old screen said class doubts were visible). Say if you want classmates to see each other's.
- Notices, direct notices and doubts cannot be edited. Notices can be deleted; the other two cannot.
- A doubt has text only (no files or images).
- Parents do not see direct notices or doubts.
- A notice's "PDF attachment" is still only a file name shown on the screen; no file is stored.
