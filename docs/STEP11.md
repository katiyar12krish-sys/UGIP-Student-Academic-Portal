# Step 11: placement drives, applications and job listings on the server

Placement drives, the "Apply" button and the Government / Private job listings used to live in the browser (`localStorage`). "Applied" was forgotten on reload, the staff "password" check was only on the screen, and nobody could see who applied. Now they are in the database (`data/portal.db`) and the server decides who may do what.

## Who can do what

| | admin | faculty (posted it) | faculty (someone else's) | student (own branch) | student (other branch) | parent |
|---|---|---|---|---|---|---|
| **Post** a drive or a job listing | yes | yes | yes | no | no | no |
| **See** drives and listings | all | all | all | yes | no (not listed; apply gives "not found") | no |
| **Close / reopen / delete** a drive | any | yes | no | no | no | no |
| **Delete** a job listing | any | yes | no | no | no | no |
| **Apply** / withdraw | no | no | no | yes (rules below) | no | no |
| See **who applied** (names, roll no, average %) | yes | yes | no | **never** (only the count) | no | no |
| Set an applicant's status | yes | yes | no | no | no | no |

- A student's own application and status are shown to that student only.
- Staff names ("posted by", contact person) come from the login, not from the request.

## Apply rules (checked on the server, and the screen shows the reason on the button)

1. The drive must be **open** (not closed by staff).
2. Before **23:59 IST on the deadline day**. The deadline of a new drive cannot be in the past.
3. The drive's branch must be the student's branch (or "Both").
4. **Minimum percentage:** the student's recorded average of the semester results on file (`semester_results`) must reach the drive's minimum. If the drive has a minimum but the student has **no marks on record**, the student is told to contact the placement cell (nothing is guessed).
5. One application per drive; applying twice changes nothing.

A student can **withdraw** only while the status is still "Applied" and before the deadline. After "Shortlisted / Selected / Rejected" it is locked.

Statuses: Applied, Shortlisted, Selected, Rejected. The poster / admin change them from the **Applicants** window (the people icon on the drive card), which also has a CSV download (formula-safe).

## Messages (bell and phone)

Same rules as Step 4: only people who allowed notifications (a parent allows it for a student under 18), never twice for the same event, phone messages 07:00-21:00 IST.

| Message | Who | When |
|---|---|---|
| New placement drive: *company* | students of the branch(es) it is for | a drive is posted |
| Placement update: *company* | that student | status becomes Shortlisted / Selected / Rejected. The result itself is not in the message |

## What was removed

- The sample drives and sample job listings that shipped with the app are **no longer shown**; the screen starts empty and staff post the real ones (the "No placement drives to show yet" note). The old browser copy is not read and there is **no "Move to server"** for this step.
- The old "alert: application registered" that did nothing.

## Not moved yet

- **Alumni experiences, Q&A bank, resume builder, mock interviews, college placement records** are still in the browser (they are personal or read-only content, not shared decisions). Moving shared experiences (with moderation) is a good next step.
- Offer-letter / brochure upload for a drive is not built (use the Step 9 file store when needed).
- A drive cannot be edited after posting (close it and post a new one).
- The "Security Authorization" password window on the screen is kept as an extra confirmation, but the real check is the server: a student cannot post, delete or see applicants even if they change the page.

## API

`GET /api/placement/drives` · `GET /api/placement/jobs` · `POST /api/placement/drives` (staff) · `POST /api/placement/drives/:id/active {active}` · `DELETE /api/placement/drives/:id` · `POST|DELETE /api/placement/drives/:id/apply` (student) · `GET /api/placement/drives/:id/applicants` · `POST /api/placement/drives/:id/applicants/:aid/status {status}` · `POST /api/placement/jobs` · `DELETE /api/placement/jobs/:id`

Tables: `placement_drives`, `placement_applications`, `placement_jobs` (see `server/db/schema.sql`). Code: `server/placement/service.ts` (all the rules), `server/routes/placement.ts`, messages in `server/notify/rules.ts`, calls `src/services/placementApi.ts`, screen `src/components/placement/ComprehensivePlacementPortal.tsx` (refreshes every 30 seconds).

## Tests

`npm run test:placement` (9 tests): who can post, input checks, branch filter for students / parents, apply rules (deadline one millisecond before / after in IST, closed drive, minimum percentage exactly at the limit, no marks on record, once only), what each person is told, withdraw rules, applicants visible only to poster / admin, status validation and cross-drive checks, delete removes applications, job listings, messages (right students, no repeats, consent, no result in the text). `npm test` runs everything.

## Please try once in the browser (the screens were not run here)

As faculty post a drive for CSE with minimum 60%; as a CSE student with marks on record apply, see "Applied", withdraw, apply again; as a Civil student check the CSE drive is not listed; as the faculty open Applicants, set "Shortlisted", check the student's bell; as another faculty check there is no Applicants / Close button; as a student with no marks check that the button explains why.

## Known issue found while checking (not from this step)

`npm run test:students` shows 2 failing tests (Aadhaar masking and the "missing details" list) in the Step 10 zip too. Nothing in Step 11 touches them.
