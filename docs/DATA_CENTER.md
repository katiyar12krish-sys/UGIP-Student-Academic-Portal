# Data Center (Step 16): download, upload and count any data

Admin and Faculty dashboards have a new tab **Data Center (Download / Upload)**.

## 1. Filter + count
Filters: branch, year, semester, gender, category, search. Quick buttons: *Only girls*, *Only boys*, SC / ST / OBC / EWS / General.
Shows total, boys, girls, other, "not filled", a **Category x Gender** table and a **class-wise** table (CSE / Civil, year 1-3). Excel / PDF / CSV buttons for the counts and for the filtered student list (all rows, not only the 200 shown on screen).
"Not filled" = gender or category still blank in the student record. API: `GET /api/data/students?gender=Female&category=SC...`

## 2. Download any data (Excel / PDF / CSV)
Students (with sem / year results), attendance (overall %), marks (all exams), subjects + faculty, faculty list (admin only). `GET /api/data/export/:dataset`. Teachers get marks only of subjects they teach or were granted. Aadhaar and passwords are never exported. Every download is written to the audit log.

## 3. Upload students (admin only): add new + update old
Download the empty template (or the student list), edit in Excel, upload `.xlsx` or `.csv`. Matching is by **Roll No**: new Roll No = new student, existing = update. A **blank cell never erases** saved data. The file is first only **checked** (nothing saved) and every row is reported: New / Update (with which fields change) / No change / Rejected (with reason). Press **Save to database** to apply; rejected rows are skipped. Same rules as the student form (Aadhaar check digit, phone, 0-100 percentages...). Accepts forms like "girl / ladki / F", "1st year", "computer science", "gen".
A new student with a blank Semester gets the first semester of the year (year 1 -> sem 1). The student's login row is created like for any new student. After saving, press **Refresh screens** (reloads the page so every screen reads the new data). Up to 1500 students per file. Audit entry: `bulk_import_students`.
A downloaded student file uploads back with zero changes (tested).

## 4. Upload marks of one exam
Choose the exam, upload a file with **Roll No** and **Marks**. The browser checks roll numbers, class and 0..max; the existing marks route saves it, so the faculty-subject rule is enforced by the server.

## Tests
`npm run test:datacenter` (3 tests: counts, upload create/update/dry-run/errors, download round-trip and access rules), `npm run test:importer` (xlsx written by this app and by openpyxl, CSV with quotes / Hindi).

## Not done / not checked
* Screens and Express routes were not run in a browser (no npm packages in the build sandbox); the server logic and file reader were run. Please press each button once.
* Upload of faculty, subjects and attendance is **not** built (download only). Only students and marks can be uploaded.
* Not uploaded: photos, parent logins, a student's Aadhaar is accepted in the file but never downloaded.
* TFW appears in the old category screen but the server rule only allows General / OBC / SC / ST / EWS, so a TFW row is rejected with a clear message.
* This zip (step15) has the export-buttons version of Step 15. The academic sessions / promotion / Passed Out part is not in this zip, so it is not included here.
