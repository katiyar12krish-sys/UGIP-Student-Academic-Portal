# Marks, attendance and the faculty-subject rule (Step 2)

Exams, marks, attendance and subject assignments now live in the server database (`data/portal.db`). The browser no longer stores them, and every change is checked on the server.

## The rule

A faculty member can **write** marks or **run attendance** only for subjects assigned to them (table `faculty_subject_assignments`). Admin can do everything. The check is in one place: `server/academic/access.ts` (`canTeach`). Changing an assignment takes effect on the very next request, with no re-login.

| | admin | faculty (own subject) | faculty (other subject) | student | parent |
|---|---|---|---|---|---|
| Create / delete exam | yes | yes | no | no | no |
| Enter / change / delete marks | yes | yes | no | no | no |
| See all marks of a subject | yes | yes | only if the owner granted read access | no | no |
| See marks | all | all of own subjects | exam schedule only | own marks only | own children only |
| Open / close attendance, manual change, scan ID card | yes | yes | no | no | no |
| Punch own attendance (PIN / QR) | no | no | no | yes (own class) | no |
| See PIN / QR token of a session | yes | only sessions they opened | no | never | never |
| Overall attendance % per student | yes | yes | yes | own only | own children |

## How it works

- **Exams:** branch and semester are copied from the subject, never taken from the request. Marks must be numbers from 0 to the exam's maximum, for students of that class. Percentage and grade (A+ 90, A 80, B 70, C 60, D 40, else F) are computed by the server.
- **Attendance session:** the server generates a 6-digit PIN and a QR token, lasts 45 minutes, closes by itself. One open session per teacher and subject.
- **Student punch:** identity comes from the login, so nobody can mark attendance for someone else. Wrong PIN guesses are limited (8 per 5 minutes per student). The code must match an open session of the student's own class.
- **No invented numbers:** the old sample marks (80% for four students on every new exam, 42/44/45 pre-filled in the form, default 40 / grade B), the default 88% attendance and the fixed "120 lectures" are gone. With no data the screens show a dash.
- **Manual "Edit attendance %"** is removed: any faculty could overwrite a student's percentage. Attendance now comes only from recorded classes (teachers can still correct a single class: Present / Late / Absent).
- **Read access for a colleague** (replaces the old shared passcodes): the sheet owner or admin grants it (`POST /api/marks-access/grants`); it never allows writing.

## Moving your old data

If the real marks/attendance were entered in this browser before the upgrade: log in as **admin** on that computer, open the Overview tab and press **Move to server** in the yellow box. Sample data that shipped with the app is not moved. It is safe to press twice (nothing is duplicated). The old browser copy is deleted after a successful move.

Faculty who also kept data in their own browsers: ask the admin to run the move from that browser (it carries the data, the admin login authorises it).

## Faculty and subjects

- Admin → add subject (assign faculty) / edit subject / delete subject: these call the server. A subject that already has exams or attendance cannot be deleted.
- API: `PUT /api/admin/faculty/:id/subjects { subjectIds: [...] }` replaces what a faculty member teaches.
- A HOD who must see every subject of the branch needs those subjects assigned (or use admin).

## API summary

`GET /api/subjects` · `POST|PUT|DELETE /api/subjects` (admin)  
`GET /api/tests` · `POST /api/tests` · `DELETE /api/tests/:id` · `PUT /api/tests/:id/marks` · `DELETE /api/tests/:id/marks/:studentId`  
`GET /api/attendance/sessions` · `POST /api/attendance/sessions` · `POST .../:id/close` · `POST .../:id/records` · `POST .../:id/scan` · `POST /api/attendance/mark` · `GET /api/attendance/summary`  
`GET|POST|DELETE /api/marks-access/grants` · `POST /api/admin/import-legacy` (admin)

## Tests

`npm test` runs the unit tests (`test:auth`, `test:academic`) against a temporary database.

## Known limits

- Online tests, practicals, notices, study material, placements and fee-style data are still browser-only (later steps).
- Other portal data in `localStorage` (user list, notices, ...) is not yet checked by the server.
- A student's browser still keeps the local copy of the student directory that older versions created; the marks/attendance data is no longer stored there.
