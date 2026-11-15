# Student data: adding, missing details, rules

## Adding students
* **From the portal:** Class Student Database > "Add student". Only name, UBTER roll number and class are required.
  Everything else can be left blank and added later.
* **From the seed file:** add an object to `server/db/seed-data.json`. On the next server start
  `seedMissingStudents()` inserts anyone not in the database yet (matched by id or roll number).
  It never changes an existing record and never brings back a deleted one.
  `database/mysql/seed_students.sql` is the MySQL copy, keep it in step.
* The Aadhaar number goes in `seed-data.json` only. It is encrypted when stored and is not in the browser bundle
  (`src/data/mockData.ts` has no Aadhaar numbers).

## Missing details
Blank details are marked "Missing" in the edit form, counted per student in the table ("N missing · Add details"),
and can be filtered with "Missing details (N)". The server sends the same list as `missing` on each student.
A semester that has not happened yet is not counted (a student in semester 5 is expected to have semesters 1-4).
Lateral-entry students are not expected to have year 1 or semesters 1-2.

## Rules (`src/utils/studentRules.ts`, used by the forms and the server)
| Field | Rule |
|---|---|
| Mobile | 10 digits, starts with 6-9 (+91 / spaces are removed) |
| Aadhaar | 12 digits, not starting with 0/1, check digit must match (Verhoeff). One number per student |
| Category | General, OBC, SC, ST, EWS |
| Percentages | 0-100. CGPA 0-10 (a typed number up to 10 is saved as CGPA, above 10 as percentage) |
| Roll number | letters/digits, 4-24 chars, unique |
| Semester vs year | semester 5 or 6 belongs to year 3 (checked in the form) |

A save the server refuses now shows a "Student record not saved" notification with the reason.

## Aadhaar visibility
Lists and the student's own screen show only `XXXX XXXX 1234`. `GET /api/students/:id/aadhar` returns the full number
to an admin only, is never cached, and writes `reveal_aadhaar` to the audit log.
A number typed into the form stays in that browser tab's memory until the next page load.

## Still open
* Tarun Giri, Sachin Singh, Saurabh Giri, Harshvardhan Singh Patni were added from messages; gender was not given for any of them.
* Harshvardhan's Aadhaar failed the check digit, so it was not stored. Add the correct number from the form.
* Saurabh Giri's branch (CSE) is a guess from the roll number 24021050014, which does not match the 2409005xxxx / 2409002xxxx pattern. Confirm it.
* Saurabh's 2nd-year result (6.87 / 65.26%) is identical to Sachin Singh's. Confirm it is not a copy-paste.
