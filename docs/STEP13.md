# Step 13: Messages (WhatsApp-style chat, text + voice)

A green chat button (bottom right, with a count of waiting messages) on every signed-in screen: parent, student, teacher, admin.

## Who can talk to whom (server-enforced, `server/chat/service.ts`)
| | may chat with |
|---|---|
| Parent | teachers of their child's class (the subjects they teach are shown) and the admin office |
| Student | the same (switch off with `CHAT_STUDENT_CHAT=0` in `.env`: parents and staff keep working) |
| Teacher | students and parents of the classes they teach, and the admin |
| Admin | everybody (filter by branch / semester / name) |
| Never | parent <-> parent, parent <-> student, student <-> student, teacher <-> teacher |

* A chat is always **about one child** (a parent with two children gets two chats with the same teacher). A teacher sees "Father of Rahul Kumar · CSE Sem 5" so they know whose parent it is.
* Only the two people of a chat can open it, read it or fetch its voice / photo files. **Not even the admin** can read other people's chats.
* If the child moves to a class the teacher does not teach (or a teacher leaves), the old chat stays readable but nobody can write in it.

## What the screen does
Chat list with unread counts and search · new chat picker (search; staff also filter by branch / semester) · day separators (Today / Yesterday) · sent ✓ and seen ✓✓ (blue) · text (Enter sends on a computer, new line with Shift+Enter) · **voice messages** (tap the mic, speak, tap send; trash cancels; up to 5 minutes; play / pause, seek, 1x / 1.5x / 2x; one plays at a time) · photos (tap to enlarge) and files (PDF, Word, PowerPoint, Excel, up to 10 MB) with the paperclip · "speak to type" button in Hindi (only where the browser supports it, e.g. Chrome) · quick sentences for an empty chat (for parents: attendance, result, meeting, leave) · delete your own message for everyone (tap it) · full screen on a phone, two panes on a computer · Hindi + English labels.
The screen asks the server every 3 seconds when a chat is open, every 8 seconds for the list and every 15 seconds for the button's count (only while the tab is visible).

## Bell / phone message
"New message from *name*", never the message text. One per chat until the person opens it. Only for people who allowed notifications (Step 4 rules, 07:00-21:00 IST for phone push).

## Limits
Text 2000 characters · 60 messages / 10 minutes · 40 voice / photo / file uploads per hour · 30 new chats per day · voice up to 5 minutes. A file's type is decided from its first bytes (audio: webm, ogg, m4a/mp4, wav, mp3). The Step 9 / 10 uploads (materials, submissions) still **refuse audio**.

## API
`GET /api/chat/unread` · `GET /api/chat/threads` · `GET /api/chat/contacts?q=&branch=&semester=` · `POST /api/chat/threads {userId, studentId}` · `GET /api/chat/threads/:id/messages?after=&before=&since=` · `POST /api/chat/threads/:id/messages {text}` · `POST /api/chat/threads/:id/upload` (raw body; headers `X-File-Name`, `X-Duration-Ms`, `X-Caption`) · `POST /api/chat/threads/:id/read` · `DELETE /api/chat/messages/:id` · `GET /api/chat/messages/:id/file`.
Tables: `chat_threads`, `chat_messages` (see `server/db/schema.sql`). Code: `server/chat/service.ts`, `server/routes/chat.ts`, `src/services/chatApi.ts`, `src/components/chat/ChatHub.tsx` + `ChatLauncher.tsx`.

## Tests
`npm run test:chat` (12 tests): who may chat, one thread per pair, text limits, strangers (and admin) cannot read, voice / photo / file checks, ticks and unread counts, refresh + deleted messages, delete erases the file, class change, contact lists, `CHAT_STUDENT_CHAT=0`, bell rules. The older suites (materials, dispatch, comms, auth) were re-run: still pass.

## Not covered / known limits
* **The screens were not compiled or opened in a browser** (no `npm` packages in the build sandbox); the Express routes were not run either, only the service logic. Please try once: parent -> teacher text, voice (allow the microphone), photo; teacher replies; check the blue ticks and the bell. Voice recording needs **HTTPS** (or localhost) in the browser.
* Messages are stored as plain text in `data/portal.db` (not encrypted) and files in `data/uploads/`: back them up together.
* Polling, not push-instant: a new message shows within about 3 seconds.
* No "delete chat", no message editing, no group chats, no forwarding, no block / report button yet.
* Old messages are never deleted automatically. Decide a retention period.
* nginx: allow `client_max_body_size 12m;` (same as Step 9).
