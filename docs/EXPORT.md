# Export: Excel, PDF, CSV (Step 15)

Every main list now has three buttons: **Excel** (.xlsx), **PDF**, **CSV**. They export exactly the rows on screen (filters and search applied).

| Screen | File name starts with |
|---|---|
| Class-wise Student Database (both views) | Class_Students_ |
| Yearwise Attendance Ledger | Attendance_Year_ |
| Consolidated Marks Sheet | Marks_Sheet_ |
| Online test report (per test) | Test_Report_ |
| Student Category Roster | Student_Category_Register_ |
| Activity / Audit Log | Audit_Logs_ |

* **Excel:** real .xlsx, header row frozen and filterable, numbers stay numbers, Hindi text works. Written by `src/utils/exporter.ts` (no extra npm package).
* **PDF:** opens the browser print window with a clean table (college name, title, date, row count, repeating header, A4, landscape when there are many columns). Choose **Save as PDF** as the printer. This keeps Hindi text exactly and needs no package.
* **CSV:** same data, opens in Excel; text starting with `=`, `+`, `-`, `@` gets a leading `'` so nobody can plant a formula in a name.
* Privacy: Aadhaar is masked, no passwords are exported. Only data the logged-in user can already see on screen is exported (nothing new is requested from the server).
* Fixed: the old class CSV wrote a made-up 85% attendance when there was no data. It now shows blank.

Add it to another screen: `<ExportMenu build={() => ({ title, columns, rows, filename })} />` (`src/components/common/ExportMenu.tsx`).

## Not done yet / not checked
* Not run in a browser (no npm packages here). The .xlsx writer was opened with Python's openpyxl and `npm run test:export` checks the logic; please press each button once.
* Not added: timetable, faculty punches, placement lists, doubts/notices, parent portal, logins (the logins screen already has its own print slips).
* No audit-log entry is written when someone exports (it runs in the browser).
