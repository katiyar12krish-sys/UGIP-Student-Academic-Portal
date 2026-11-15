# Step 3: two-step verification, privacy consent (DPDP), photo upload, SMS OTP

## What changed for users

Sign-in is now: **password -> authenticator code (if on) -> new password (first login) -> authenticator setup (if your role must) -> privacy notice -> portal.**

| | admin | faculty | student | parent |
|---|---|---|---|---|
| Authenticator app (TOTP) | **required** | **required** | optional | optional |
| Privacy notice acceptance | required | required | required | required |
| Optional consents (photo, notifications) | own | own | **a parent gives them** until staff confirm 18+ | own + for each under-18 child |

Change who must use the authenticator app with `MFA_REQUIRED_ROLES` in `.env` (default `admin,faculty`).

## Authenticator app (free, works today)

- Standard TOTP (RFC 6238): Google Authenticator, Microsoft Authenticator, Authy, any other app.
- A code works **once** (replay blocked); one step of clock drift is allowed.
- 8 **recovery codes** are shown once at setup (stored only as hashes). Each works once.
- After the password is right, **no session exists** until the code is accepted. 5 wrong codes cancel the sign-in (password must be entered again); also limited to 10 tries / 15 min per person.
- Turning it off or making new recovery codes needs password **and** a current code. Roles that must have it cannot turn it off.
- The secret is stored encrypted (same key as Aadhaar: `data/.secret`).

**Lost phone and lost recovery codes?**
- Admin: Admin API `POST /api/admin/users/<id>/reset-mfa`, or on the server: `npm run credentials -- --reset-mfa <username>`. Their sessions end and they set it up again at next login.
- If the **only admin** is locked out, use the command-line one on the server.

## SMS OTP (password reset): switched OFF until DLT is done

SMS in India needs, before the first message can be sent:
1. DLT registration of the institute as an **Entity** (with a telecom operator's DLT portal: Jio, Airtel, Vi, BSNL) and its Entity ID.
2. A registered **Sender ID** (header, 6 letters).
3. An approved **content template** for the OTP message (wording must match exactly; variable parts as `{#var#}`).
4. An **SMS provider** account (MSG91, Gupshup, Twilio, the NIC SMS gateway, ...) with those IDs attached.

Start 1-3 now: it can take days to weeks. Government institutes can often use the **NIC SMS gateway**; ask the college IT / NIC coordinator.

What is already built:
- `server/auth/sms.ts`: provider switch. `SMS_PROVIDER=none` (default) = off; `console` = development only (prints the code in the server log, refuses to run in production). Adding the real provider is one function in that file (`sendOtp(phone, code)`).
- `POST /api/auth/forgot/request` and `/forgot/verify`: 6-digit code, valid 5 minutes, 5 tries, single use, only a hash stored, same answer whether or not the username exists, rate limited by IP and by user, **never for admin accounts**, other devices are signed out on success.
- The login window shows the SMS "Forgot password" form only when the server reports SMS is on; otherwise it shows the old "ask admin / faculty" message.
- Needs a valid 10-digit Indian mobile number in the user's `phone` field.

## Privacy consent (DPDP Act 2023)

- Notice text (English + Hindi) is in `server/auth/consent.ts` (`noticeText()`). **It is a working draft: have the institute / a legal adviser review it before go-live**, and set `GRIEVANCE_EMAIL` in `.env`.
- Purposes: `service` (required; re-asked when `NOTICE_VERSION` in `server/auth/policy.ts` changes), `photo`, `notifications` (optional, off until given).
- Every choice is stored in an **append-only ledger** (`consent_records`: who, for whom, purpose, granted or withdrawn, notice version, time, IP). Withdrawal is as easy as giving: *Account menu -> Privacy & Security -> Privacy & consent*.
- Withdrawing **photo** consent deletes the stored photo. Withdrawing the **service** consent signs the person out and removes optional consents.
- **Children:** students are treated as under 18 until an admin confirms they are 18+ (`POST /api/admin/students/<id>/adult` with `{"adult": true}`). Until then only a linked parent login can give the optional consents (create parent logins as before). When a student is confirmed adult, the parent's optional consents stop counting and the student is asked again.

## Photos

- Stored on the server (`data/photos/<userId>.jpg`), not in the browser. JPEG only, 64-1024 px, at most 400 KB uploaded. The server removes EXIF/GPS and all metadata before saving.
- Needs the person's `photo` consent (a parent's, for under-18 students). Without it the upload window explains what is missing.
- Who may upload: the person; admin for anyone; faculty for students. Who may see: staff photos are visible to every signed-in user; a student's photo only to the student, their parents and staff. Served only through `/api/photos/<id>` (checked on every request), never as a public file.
- Old photos that were saved in the browser keep working there until replaced.

## Not covered / known limits

- Faculty photos uploaded by an admin are visible on other devices only for **students** (the student list carries the photo link). Staff photos on other people's screens still come from each browser's own copy until a staff directory is added in a later step.
- `data/photos/` must be backed up together with `data/portal.db` and `data/.secret`.
- Aadhaar still travels to the browser in the class export (listed in Step 1 limits). Not changed here.
- The server routes were checked with unit tests of the logic (`npm run test:step3`); run a manual smoke test of the screens after `npm install && npm run dev`.

## Tests

`npm test` runs auth, academic and step3 suites against throw-away databases.
