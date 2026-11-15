# Step 19 (9 Nov 2026): one login page, viewable passwords, no duplicates, placement career center, new look

## Login
- The first screen is one login page: the college name in big letters and three boxes – **Admin Login, Faculty Login, Student Login** (a small "Parent login" link below). File: `src/components/auth/LoginPage.tsx`.
- Each role has its own username and password. The server refuses a login on the wrong box (e.g. a student account on the Admin box).
- The role switch (view as faculty / student) is still only for the admin – the server decides this, nobody else can turn it on.

## Who can see which password (`server/auth/passwordVault.ts`)
| Password of | Visible in |
|---|---|
| Admin | Admin panel only (Logins & Passwords → My login) |
| Faculty | Admin panel (Faculty logins table) and the teacher's own panel |
| Student / parent | Faculty panel and admin panel (Open student logins) – never to other students |
- Login still checks a one-way hash. The viewable copy is a separate **encrypted** column (`users.pw_view_enc`, key in `data/.secret` or `DATA_KEY`). Back up the key with the database.
- Every time a password is shown, a line is written to the security audit log.
- Passwords set before Step 19 were stored only as a hash and show "not viewable" – press **Reset / New password** once to get a viewable one.

## Duplicates removed
- Student: "UBTER Result" (a look-alike of the board site) and "My UBTER Results" → one **UBTER Result** tab with the real results + a link to the official site (ubter.in). Header buttons that repeated the menu / top bar (Ask Faculty Doubt, UBTER Result, Punch QR, Password Reset OTP) were removed.
- Admin: two student lists → one **Students · 1st, 2nd, 3rd Yr** entry ("Photos & quick list" opens the old list). "MySQL DDL" (same as the top-bar MySQL button) and the second "Add Student & Password" button were removed.

## Placement portal
- **Resume:** each student uploads one PDF / Word resume that is saved on the server (upload, download, replace, delete). The placement cell sees and downloads all resumes. `server/routes/resumes.ts`.
- **5 sample resumes:** fresher CSE, fresher Civil, internship / apprenticeship, experienced CSE, experienced Civil – view / print as PDF or download as Word.
- **Career Guide:** internships, applying for jobs, realistic starting salaries for a diploma holder (and what not to expect), professional behaviour.
- **CSE & Civil Job Links** replace the "Sarkari Result" links: NCS, NATS, Apprenticeship India, AICTE internships, UKSSSC, UKPSC, SSC, plus Naukri / LinkedIn / Indeed / Internshala searches for each branch, and how to switch on job alerts.

## Look
- College name everywhere: **Uttarakhand Government Institute of Polytechnic** (short form UGIP).
- Main colour changed from green to navy blue; green now only means "success" (PASS, saved).
- Dark mode: older screens that forgot dark colours now get readable text, backgrounds, borders and form fields (`src/index.css`).
- Emoji decorations removed from buttons and headings.

## Local test logins (only in the local `.env`, NOT in the zip)
`admin` / `Admin2026test`, every faculty / `Staff2026test`. Before going live set your own `ADMIN_PASSWORD`, remove `DEV_STAFF_PASSWORD`, and change the admin password after the first login (see DEPLOY.md).
