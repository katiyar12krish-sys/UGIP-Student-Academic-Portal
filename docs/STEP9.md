# Step 9: study materials and file upload on the server

Study materials (notes, lab manuals, question banks, links) used to live in the browser (`localStorage`). A PDF "upload" never stored the PDF: it stored only the file name, and the **Download** button generated a small text file. Pictures were stored inside the browser as base64. Now there is a real upload, one shared file store, and the server decides who may publish, see and download.

## The upload design (decided first, because notices, submissions and doubts will reuse it)

| Question | Decision | Why |
|---|---|---|
| Where is the file kept? | A folder on the server, `data/uploads/<id>`. The database keeps only a row about it (`stored_files`). | A database `BLOB` makes the database file huge and slow to back up; base64 inside JSON makes every file 33 % bigger and hits the 1 MB request limit. |
| How does the browser send it? | As the raw request body (`POST /api/files`, not base64, not JSON). The file name travels in the `X-File-Name` header. | No new `npm` package is needed (`express.raw` is built in); no multipart parser to keep updated. |
| One request or two? | **Two steps.** (1) upload the file, get a file id; (2) publish the material that uses that id. | The same upload step can serve notices, student submissions and doubts later. A failed publish does not lose the upload, and a material never exists without its file. |
| What if step 2 never happens? | The file stays "pending" and the server **deletes it after one hour** (also a file on disk with no database row). A person can have at most 10 pending files. | No forgotten files filling the disk. |
| Which file types? | PDF, JPEG, PNG, Word (`.docx`), PowerPoint (`.pptx`), Excel (`.xlsx`). The server decides the type from the **first bytes** of the file; the browser's name and Content-Type are ignored. A file named `notes.pdf` that is really HTML is refused. | No HTML, SVG, scripts, programs or archives can be stored, so nothing can run in someone's browser. |
| How big? | 10 MB (`MAX_UPLOAD_MB` in `.env`). 30 uploads per hour per person. | College wifi and a small server. |
| What is the name on disk? | A random id (`f-` + 24 hex characters). Nothing the user typed is ever part of a path. | No path tricks (`../../`). The original name is cleaned (no folders, no control characters, extension matching the real type) and used only for display and the download name. |
| How is a file downloaded? | **Only** through `GET /api/materials/:id/file`, after the same "may this person see this material" check as the list. There is no public link to a file and the file id is never sent to students. | A copied link does not work for a person outside the class or logged out. |
| Open or save? | PDFs and pictures open in the browser (`?download=1` saves them). Word / PowerPoint / Excel are always saved. `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-cache` on every file. | |
| Virus scan? | **No.** Only the type check above. Teachers and the admin are the only people who can upload. | If you want it later, ClamAV can be called in `savePending()` (`server/files/store.ts`). |

## Who can do what

| | admin | teacher (own subject) | teacher (other subject) | student (same class) | student (other class) | parent |
|---|---|---|---|---|---|---|
| **Publish** a material (file or link) | any subject, or a class / everybody without a subject | yes | no | no | no | no |
| Publish an **Official Circular** category | yes | no | no | no | no | no |
| **See** and download | all | all | all (the library is open to every teacher) | their class + general ones | no (told "not found") | no |
| Change title / description / category / tags / link | any | only their own uploads | only their own uploads | no | no | no |
| Delete (the file is removed from disk too) | any | only their own uploads | only their own uploads | no | no | no |

- A material with a **subject** gets its branch and semester **copied from the subject**, never from the request. A teacher must pick one of the subjects assigned to them (Step 2). Only the admin can publish without a subject (general material for one branch / semester / everybody).
- A student sees a material when its branch is "All" or theirs **and** its semester is empty (all) or theirs.
- The file and the class cannot be edited. To change them: delete and publish again.
- A web link must start with `https://` or `http://` (`javascript:`, `data:`, `file:` are refused).
- Limits: title 200, description 2000 characters, 10 tags of 30 characters. 40 materials per hour per person.
- A student's download is counted (staff opening a file is not).
- A subject that has materials cannot be deleted (same rule as exams, tests and doubts).

## Messages (bell and phone)

When a material is published, the students it is meant for get **New material: *title*** (category and teacher's name only, no file text). Same rules as Step 4: only people who allowed notifications, never twice (`dedupe_key` = `mat:<id>`), phone messages only 07:00-21:00 IST.

## Not moved: old browser data

There is **no "Move to server"** for this step. The eight sample materials that came with the app (including the NPTEL / Virtual Labs links) are gone. Real materials created in a browser before this step stay in that browser's `localStorage` and are no longer read; their PDFs were never stored anyway (only a name), so there is nothing to move. If you want those sample links back, the admin can add them as **Web URL** materials. Say so if you want a list.

## API

`POST /api/files` (raw body, staff) · `GET /api/materials` · `POST /api/materials` (staff) · `PATCH /api/materials/:id` · `DELETE /api/materials/:id` · `GET /api/materials/:id/file[?download=1]`

Tables: `stored_files`, `materials` (see `server/db/schema.sql`). Code: `server/files/store.ts` (file store, reusable), `server/materials/service.ts` (all the rules), `server/routes/materials.ts`, screen `src/components/common/DocumentMaterialHub.tsx`, calls `src/services/materialsApi.ts`. The old `StudyMaterialsLibrary` (three made-up notes) now just shows the same hub.

## Setup notes

- **Backup:** copy the `data/uploads/` folder together with `data/portal.db` (a database row without its file, or the reverse, is a broken material).
- **nginx / proxy:** nginx refuses bodies over 1 MB by default. Set `client_max_body_size 12m;` (a little more than `MAX_UPLOAD_MB`), otherwise uploads fail with 413 before they reach the app.
- `.gitignore` now also ignores `data/uploads/` and `data/photos/`.

## Tests

`npm run test:materials` (12 tests): type by bytes (HTML named `.pdf`, SVG, program, plain zip refused), size and "too many waiting" limits, name cleaning and random disk names, the subject rule and class copy, the uploaded file must be yours and can be used once (a second try fails and leaves nothing behind), links, who sees what and who gets the file, download counting, change / delete rights and file removal, the hourly clean-up, notifications, subject delete guard. `npm test` runs everything.
The Express routes were also run once through a small stand-in for `express` (24 checks: 401 / 403 / 404 / 413 / 415, file headers, same upload twice, delete removes the file). That stand-in is not part of the project.

## Not covered / known limits

- **The screens were not run in a browser.** The sandbox could not install `npm` packages, so the React screen was only edited, syntax-checked and read, not compiled or opened. Please try once: publish a PDF as a teacher (own subject), see it as a student of that class and of another class, press Download and View, delete it, then publish a Word file, a picture and a link.
- `npm test` shows **2 failing tests in `test:students`** (Aadhaar masking and "missing details"). They fail the same way in the Step 8 zip you sent, so they are not caused by this step; say if you want them looked at.
- There is no upload progress bar (the screen shows "Saving..." until the server answers).
- No folders, no versions, no replacing a file in place, no search inside files.
- Parents do not see materials.
- **Still in the browser:** "Class & Subject Dispatch" (`ClassSubjectDispatcher`: a teacher sends material to a class and students submit solutions with attachments, teacher grades). It overlaps with Step 7 assignments, and student submissions need a private file rule (only the student and that subject's teachers). It is the natural next user of the file store. Timetable, placement data and faculty punches are also still in the browser.
