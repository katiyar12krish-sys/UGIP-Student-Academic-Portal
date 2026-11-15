# UGIP Portal - Database
1. `mysql -u root -p < schema.sql`
2. `mysql -u root -p -e "SET @aes_key:='YOUR_SECRET'; source seed_students.sql" gpt_portal`
   (set @aes_key and run seed in the same session; keep the key out of the DB, e.g. in .env)
3. Replace `CHANGE_ME_HASH` with bcrypt hashes of the real passwords (never store plain text).
New year: insert a row in `academic_years` (e.g. 2027-28); attendance is partitioned by year (add a partition yearly).
Class-wise sheets: `SELECT ... FROM students WHERE branch_code=? AND current_year=?`.

## Which database file is which
- **database/sqlite/full-schema.sql** – the COMPLETE layout of the live database (all tables, every column explained). Made with `npm run schema`.
- **server/db/schema.sql**, **server/db/schema-step18.sql** and the tables in **server/routes/records.ts** / **resumes.ts** – where the tables are defined (edit these, then run `npm run schema`).
- **database/mysql/schema.sql** – an earlier MySQL 8 design, kept for a possible future move to MySQL. Not used by the running portal.
