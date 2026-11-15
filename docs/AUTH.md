# Login & roles (Step 1)

Login is now checked **on the server**. The browser never holds a password; it only holds an HttpOnly session cookie (`ugip_sid`) that JavaScript cannot read.

## First run

1. `npm install`
2. Optional: set `ADMIN_PASSWORD` in `.env` (min 8 chars, letters + digits). If you don't, a random one is generated.
3. `npm run dev`. On first start the server creates the admin + 7 faculty accounts and writes their **temporary passwords** to `data/initial-credentials.txt` (git-ignored, mode 600). Hand them out, then delete the file.
4. Everyone must choose a new password at first login (the login window asks for it).

Existing `data/portal.db` files are upgraded automatically (new tables are added; every student gets a login row with **no password** until one is issued).

## Who can do what (server-enforced)

| Action | admin | faculty | student | parent |
|---|---|---|---|---|
| List students / export class CSV | yes | yes | no | no |
| Read one student | any | any | own record only | linked children only (read-only) |
| Add / edit / change status | yes | yes | no | no |
| Delete (soft) student | yes | no | no | no |
| Create faculty login | yes | no | no | no |
| Create parent login for a student | yes | yes | no | no |
| Issue temporary password | anyone | **students and parents only** | no | no |
| AI endpoints | login required for all roles, 40 requests / 10 min per user |

Every credential issue, login failure, lockout, delete and export is written to `audit_logs` with the real username.

## Parent role

- A parent has their own login, linked to one student (up to 4 parent logins per student). Username is `p<rollNo>` (second parent `p<rollNo>_2`).
- Create it in the app: student directory (Faculty or Admin) -> **Add parent login**. The one-time password appears in a pop-up. From the command line: `npm run credentials -- --role parent`.
- The parent portal is read-only and shows only the linked child's profile and results (the server enforces this, see `GET /api/parent/children`). If the student is deleted, the parent loses access.
- Attendance and internal marks will be added to the parent view in Step 2/5, when they move to the server.

## Marks-sheet passcodes

The old shared passcodes and master keys for the consolidated marks sheet are gone from the code, the screen and `localStorage`. An admin unlocks a sheet by re-entering their **own** login password (checked by the server); faculty use "Request Access". Real server-side enforcement of who may see/edit which marks arrives in Step 2.

## Passwords for students / staff

Passwords are stored only as scrypt hashes, so nobody (including admin) can *view* them; they can only be *reset*.

- In the app: Admin → Faculty list → "Issue new password"; Faculty/Admin → student directory → "Issue password". The one-time password appears in a pop-up.
- From the command line:
  ```
  npm run credentials -- --user jitendra_cse
  npm run credentials -- --role student --branch CSE --year 3 --out data/cse-year3.csv
  npm run credentials -- --role faculty
  ```
- Student username = roll number. Faculty username = e.g. `jitendra_cse`.

## Protections

- scrypt hashing, 8h idle / 7-day absolute session expiry, logout kills the session server-side.
- 5 wrong passwords locks the account for 15 min; login is also rate-limited per IP and per username.
- Same error for "wrong password" and "unknown user".
- Cross-site POST/PUT/DELETE blocked (Origin check + `SameSite=Lax`).
- Deleting/deactivating a user ends their live sessions immediately.
- CSV export neutralises spreadsheet formulas.

## Production notes

- Serve over **HTTPS** (cookie is `Secure` when `NODE_ENV=production`).
- Behind nginx / Cloud Run set `TRUST_PROXY=1`, otherwise rate limits see the proxy's IP.
- Back up `data/.secret` (Aadhaar encryption key) together with `data/portal.db`.

## Tests

`npm run test:auth` runs against a throw-away temp database (never touches `data/portal.db`).

Manual smoke test once the server is running:
```
curl -i localhost:3000/api/students                      # 401
curl -i -c jar -H 'Content-Type: application/json' -d '{"username":"admin","password":"<temp>"}' localhost:3000/api/auth/login
curl -i -b jar localhost:3000/api/students               # 403 password_change_required until changed
```

## Known limits (planned in later steps)

- Marks, attendance and exams are now server-side (Step 2, see ACADEMIC.md). Notices, online tests, practicals, study material etc. still live in each browser's `localStorage`.
- Admin "view as faculty/student" is a UI mode only; the server still sees the admin.
- "Forgot password" by SMS code is built in Step 3 but stays off until an SMS provider and DLT registration exist (see [STEP3.md](STEP3.md)). Until then admin/faculty issue a new temporary password.
- There is no "change my password" screen after the first login yet (the endpoint `POST /api/auth/change-password` exists).
- Aadhaar numbers are still kept in browser state and included in the class export on the client.
- Step 3 added authenticator-app login, privacy consent and server-side photos: see [STEP3.md](STEP3.md).
