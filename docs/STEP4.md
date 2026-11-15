# Step 4: reminders and phone notifications (Web Push)

## What people get

| Message | Who gets it | When |
|---|---|---|
| **Exam tomorrow / exam today** | every student of that class, and their parents | the day before and the morning of the exam (date from the exam record) |
| **New marks added** | the student and their parents | the first time marks are saved for that student in that exam. The text never contains the marks |
| **Marked absent** | the student's parents | when a lecture's attendance is closed and the student has no Present/Late record |
| **Low attendance** | the student and their parents | overall attendance below 75% after the class has had 5 lectures. At most once a week |
| **Test notification** | yourself | "Send a test" button |

Everything appears in the **bell** inside the portal. If the person also turned on notifications on a device, it arrives there too, even when the portal is closed. Push is sent **07:00-21:00 IST only**; anything created at night waits until morning (and is dropped if it is more than 24 hours old).

## Rules that are enforced (not just promised)

- **Consent first.** Nothing is created for a person who has not allowed "Notifications" (Step 3 consent). For students under 18 only a parent login can allow it. A parent's alerts need the parent's *own* consent.
- **Withdrawing consent** deletes that person's registered devices and cancels queued pushes (`consent.ts` -> `dropAllNotificationData`).
- **No duplicates.** Every message has a `dedupe_key` (for example `exam:<test>:1`, `abs:<session>:<student>`, `lowatt:<week>`); the same event can never notify the same person twice, however often the scheduler runs.
- **Only real push services.** The server will only POST to Google (FCM), Mozilla, Apple or Microsoft push hosts over https (`notify/subs.ts`, tested against look-alike hosts, `localhost`, `169.254.169.254`, embedded passwords, odd ports). Without this, a logged-in user could make the server call any address.
- **At most 5 devices** per person. A device registered by someone else on a shared computer moves to the person who signs in.
- Dead devices (HTTP 404/410 from the push service) are removed automatically; temporary failures are retried 3 times.
- Push text avoids sensitive detail: no marks; the child's **first name** only in parent alerts.
- Notifications older than 90 days are deleted.

## Setting it up (once)

1. `npm install` (adds the `web-push` package).
2. `npm run vapid` prints three lines. Paste them into `.env` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` with a real contact e-mail). Keep the private key secret and do not change it later, or every phone must allow notifications again.
3. Phone push needs **https** (or `localhost` for testing). On an iPhone the person must first use Share -> Add to Home Screen and open the portal from there.
4. Sign in -> account menu -> **Privacy & Security -> Notifications** -> "Turn on for this device" -> "Send a test".

Without the keys everything still works inside the portal (the bell); only phone push is off.

`.env` options: `ATTENDANCE_MIN_PERCENT` (default 75), `PUSH_ENDPOINT_HOSTS` (extra allowed push hosts, rarely needed).

## How it runs

`server/notify/rules.ts` starts a scheduler with the server: time-based rules every 10 minutes, the push queue every 30 seconds. It runs inside the one Node process (as the rate limiter does). If you ever run more than one copy of the server, duplicates are still blocked by the dedupe key, but the scheduler should then be run in only one of them.

Marks notifications are triggered directly when a teacher saves marks (`routes/marks.ts`); a failure there never fails the save.

## API

| | |
|---|---|
| `GET /api/notifications?limit=&before=` | my list + unread count |
| `POST /api/notifications/read` `{ids}` or `{all:true}` | mark read |
| `DELETE /api/notifications` | clear mine |
| `GET /api/push/config` | server push on/off, public key, my consent |
| `POST /api/push/subscribe` `{subscription}` / `POST /api/push/unsubscribe` `{endpoint}` | this device |
| `GET /api/push/devices`, `DELETE /api/push/devices/:id` | my devices |
| `POST /api/push/test` | send myself a test (3 per 10 minutes) |

## Not covered / known limits

- **Exam reminders use the exam's date** (`YYYY-MM-DD`), not its time slot. An exam without a valid date gets no reminder.
- **Online-test deadline reminders** (72 h / 24 h / 3 h) now run in this scheduler too, see [STEP7.md](STEP7.md).
- Messages are in English. A Hindi version needs a language setting per person.
- SMS as a notification channel is not built (SMS is still off until DLT is done, see STEP3.md). When it is on, add it as a second channel in `notify/service.ts`; the consent purpose already exists.
- The real `web-push` library could not be installed where this step was built (no internet), so sending was tested with a fake push service. **Do one real test** after `npm install`: "Send a test" on a phone.
- The screens (Notifications tab, bell) were syntax-checked only; try them once in the browser.
- Faculty do not get reminders yet (their timetable is still in the browser).

## Tests

`npm run test:step4` (13 tests): allow-list and key checks, device limits, consent, each reminder rule with Indian-time dates, no repeats, quiet hours, retry and clean-up, consent withdrawal, missing keys. `npm test` runs all suites.
