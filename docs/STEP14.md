# Step 14: parents see more (read-only), safer start-up, one-command backup

## Parents (read-only)
Before, a parent saw only profile, attendance, marks and notices. Now, **for their own child only**:
* **Messages from teachers** (direct notices): `GET /api/direct-notices` returns the child's. A parent cannot mark them read or send any.
* **Doubts**: `GET /api/doubts` returns the child's doubts with status and replies count. A parent cannot reply, resolve or ask (the old "doubt" rules still say no).
* **Online tests**: `GET /api/online-tests` returns the tests of the child's class and **only the child's own** submitted flag and result. Never the answer key, never classmates' results.
* **Reminders**: when a student has not submitted an online test, the parents get the same 3 reminders and the "deadline passed" message (the child's first name only), once each, only if they allowed notifications.
On screen: three new boxes on the Parent Portal (Hindi + English) and a hint about the green chat button. Parents with two children see the child's first name on each line.

## Safer start-up
`server/ops/startupChecks.ts` prints `[setup warn]` lines when it finds: `ADMIN_PASSWORD_RESET=1`, `ADMIN_PASSWORD` or `DEV_STAFF_PASSWORD` left in `.env`, `SMS_PROVIDER=console`, `initial-credentials.txt` not deleted, and in production `INSECURE_COOKIES=1` or no `TRUST_PROXY`. It never stops the server. `backups/` is git-ignored.

## Backup
`npm run backup` (or `npm run backup -- /path/to/folder`): snapshot of the database (taken while the server runs), `.secret`, `uploads/` (files and voice messages) and `photos/`, keeps the newest 14. See docs/DEPLOY.md for the full checklist.

## Tests
`npm run test:parent` (4), `npm run test:ops` (2). Two older expectations were changed on purpose, because they said "parents see nothing": `assignments.test.ts` (parents now get the class tests without answer key) and `comms.test.ts` (parents now read the child's direct notices).

## Not covered
* Screens and Express routes not run in a browser (no npm packages in the build sandbox). Please open the Parent Portal once with a parent login that has a child with a test, a doubt and a teacher message.
* Still only in the browser: timetable, faculty punches, alumni / mock interview extras. SMS password reset still off (needs DLT).
* The 2 failing tests in `server/db/students.test.ts` (Aadhaar, missing details) were already failing in the Step 12 zip and were not touched.
