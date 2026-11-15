// ===================================================================================================
// Opens the SQLite database file data/portal.db (all portal data lives in this one file).
// Runs schema.sql and schema-step18.sql on every start (safe: "IF NOT EXISTS"), adds columns that were
// introduced later, fills / stamps the academic year on dated records. BACK UP the data folder regularly
// (npm run backup): it is the whole history of the college for the coming years.
// ===================================================================================================
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.PORTAL_DATA_DIR || (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME ? '/tmp/portal-data' : path.resolve(here, '../../data')); // override is used by tests
fs.mkdirSync(DATA_DIR, { recursive: true });

function readSqlFile(name: string): string {
  const candidates = [
    path.join(here, name),
    path.resolve(process.cwd(), 'server', 'db', name),
    path.resolve('server/db', name),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return fs.readFileSync(c, 'utf8');
  }
  return '';
}

// All portal data lives in this one file, inside the project folder.
export const db = new DatabaseSync(path.join(DATA_DIR, 'portal.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
const initSql = readSqlFile('schema.sql');
if (initSql) db.exec(initSql);

// Columns added after the first release (CREATE TABLE IF NOT EXISTS does not add columns to an existing file).
function addColumn(table: string, col: string, ddl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`);
}
addColumn('users', 'adult_verified', 'INTEGER NOT NULL DEFAULT 0 /* 1 = staff confirmed the student is 18+ */');  // Step 3: staff confirmed this student is 18+ (otherwise treated as a minor)
addColumn('users', 'photo_version', 'INTEGER /* time the photo was stored (epoch ms) */');                      // Step 3: epoch ms of the stored profile photo, NULL = none
addColumn('users', 'temp_pw_enc', 'TEXT /* temporary password, ENCRYPTED (until changed) */');
addColumn('users', 'pw_view_enc', 'TEXT /* current password, ENCRYPTED copy for the allowed viewers */');                       // Step 19: ENCRYPTED readable copy of the current password (who may see it: auth/passwordVault.ts)

// ---- Step 18: academic years + promotion + practicals + board results (tables are in schema-step18.sql) ----
const step18Sql = readSqlFile('schema-step18.sql');
if (step18Sql) db.exec(step18Sql);
const qaSql = readSqlFile('schema-qa.sql');
if (qaSql) db.exec(qaSql);   // Doubt Q&A posts

// academic_year = '2026-27' style label on every dated record. It lets the portal show "this year's"
// exams / attendance to a class, while older years stay in the database (5-6+ years) and can still be opened.
addColumn('tests', 'academic_year', 'TEXT /* academic year, e.g. 2026-27 */');
addColumn('attendance_sessions', 'academic_year', 'TEXT /* academic year, e.g. 2026-27 */');
addColumn('online_tests', 'academic_year', 'TEXT /* academic year, e.g. 2026-27 */');
addColumn('students', 'dob', 'TEXT /* date of birth */');                    // date of birth 'YYYY-MM-DD' (optional)
addColumn('students', 'admission_year', 'INTEGER /* year of admission */');      // calendar year of admission, e.g. 2026 (lateral entry: year they joined 2nd year)
// is_demo = 1 marks RANDOM sample data, so the admin can remove all of it in one click once real data is entered.
for (const t of ['students', 'tests', 'attendance_sessions', 'online_tests']) addColumn(t, 'is_demo', 'INTEGER NOT NULL DEFAULT 0 /* 1 = random SAMPLE data */');
// Subject-wise faculty login: a teacher signs in for ONE subject and the session works only for that subject.
for (const t of ['sessions', 'mfa_challenges']) addColumn(t, 'subject_scope', 'TEXT /* faculty login: the one subject (subjects.id) this session may work on; NULL = all assigned */');

// Fill academic_year for rows created before Step 18 (only rows where it is still NULL, so this is a one-time fill).
// Rule: July..December belongs to "YYYY-(YY+1)", January..June to "(YYYY-1)-YY".  e.g. 2026-11-09 -> '2026-27'
const AY_SQL = (col: string) => `CASE WHEN CAST(strftime('%m', ${col}) AS INTEGER) >= 7
  THEN strftime('%Y', ${col}) || '-' || substr(CAST(CAST(strftime('%Y', ${col}) AS INTEGER) + 1 AS TEXT), 3, 2)
  ELSE CAST(CAST(strftime('%Y', ${col}) AS INTEGER) - 1 AS TEXT) || '-' || substr(strftime('%Y', ${col}), 3, 2) END`;
db.exec(`UPDATE tests SET academic_year = ${AY_SQL("COALESCE(NULLIF(date,''), created_at)")} WHERE academic_year IS NULL`);
db.exec(`UPDATE attendance_sessions SET academic_year = ${AY_SQL('date')} WHERE academic_year IS NULL`);
db.exec(`UPDATE online_tests SET academic_year = ${AY_SQL("datetime(created_at / 1000, 'unixepoch')")} WHERE academic_year IS NULL`);
// From now on, every NEW row gets its academic year automatically (whatever part of the code inserts it):
// these triggers run inside the database right after an INSERT that left academic_year empty.
db.exec(`
  CREATE TRIGGER IF NOT EXISTS trg_tests_ay AFTER INSERT ON tests WHEN NEW.academic_year IS NULL BEGIN
    UPDATE tests SET academic_year = ${AY_SQL("COALESCE(NULLIF(NEW.date,''), datetime('now','+330 minutes'))")} WHERE id = NEW.id; END;
  CREATE TRIGGER IF NOT EXISTS trg_att_ay AFTER INSERT ON attendance_sessions WHEN NEW.academic_year IS NULL BEGIN
    UPDATE attendance_sessions SET academic_year = ${AY_SQL('NEW.date')} WHERE id = NEW.id; END;
  CREATE TRIGGER IF NOT EXISTS trg_otests_ay AFTER INSERT ON online_tests WHEN NEW.academic_year IS NULL BEGIN
    UPDATE online_tests SET academic_year = ${AY_SQL("datetime(NEW.created_at / 1000, 'unixepoch', '+330 minutes')")} WHERE id = NEW.id; END;
`);                       // Step 12: the one-time TEMPORARY password of a student / parent, encrypted, kept only until they set their own (then erased)
