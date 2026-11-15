# Step 12: privacy of logins, parent login, "Logins & Passwords" screen

## Who sees what
| | admin | faculty | the student | the parent |
|---|---|---|---|---|
| Student login ID (= roll number) | all | all | own | own child |
| Student password | only while still the **temporary** one | same | knows own | never |
| Parent login ID | all | all | own parents' IDs (no password) | own |
| Student's details (record, marks, attendance, files) | all | all (marks: own subjects) | **only own** | **only own child**, read-only |

Passwords are stored as hashes. Only the *temporary* password handed out by staff is also kept **encrypted** (`users.temp_pw_enc`, same key as Aadhaar), so the class teacher can print/hand it out. It is erased the moment the student / parent sets their own password (or resets by SMS). After that nobody, not even admin, can read it; staff can only make a new temporary one. Staff passwords are never kept. Every time temporary passwords are shown, one line goes to `audit_logs` (`view_temp_passwords`).

## Parent login
* Login ID: `p` + roll number (e.g. `p24090050011`); second parent `p24090050011_2`.
* Password: random one-time (e.g. `k7Hq-93Fm-Tz4p`); must be changed at first login, then privacy consent.
* Made with one tap from the student's record (father / mother name already there): "+ Father login" / "+ Mother login", or "Make all missing logins" for a class.
* One login = one child. Two children = two logins.

## Screens
* Admin and Faculty -> student list -> **Logins & Passwords** (or "Login & password" on a row): class filter, status, show/copy temporary password, new password, parent logins, "Make all missing logins", "Print login slips".
* Student and Parent dashboards -> **My login** card: own ID, parents' IDs, change password. Login window now explains what ID/password to use (Hindi + English).

## API
`GET /api/admin/logins?branch=&year=&q=` · `POST /api/admin/logins/parent {studentId, relation}` · `POST /api/admin/logins/bulk {branch, year, students, parents}` (never touches anyone who already set their own password) · `GET /api/me/login-info`.

## Tests
`npm run test:logins` (7 tests). The screens were syntax-checked only, not opened in a browser: please try once as admin, faculty, a student and a parent.
