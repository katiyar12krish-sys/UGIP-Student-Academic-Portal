-- =====================================================================================================
-- Step 18 (Nov 2026): academic years, class promotion, practical records, UBTER board results
-- -----------------------------------------------------------------------------------------------------
-- Loaded by server/db/connection.ts right after schema.sql (every start; "IF NOT EXISTS" makes it safe).
--
-- Goal: keep every year's data for 5-6+ years. NOTHING in this file is ever deleted automatically.
--   * Old marks / attendance stay linked to the student's id (they do not depend on the current class).
--   * Every dated record remembers its academic year (e.g. '2026-27'), so after students move up a class
--     the old records are still found, shown and exported.
--   * Promoting a class writes a snapshot first, so a promotion made by mistake can be undone.
-- =====================================================================================================

-- Small key/value settings table (e.g. the last academic year for which classes were promoted).
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,   -- key: setting name
  value TEXT,   -- value: setting value
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP   -- updated_at: last change
);

-- Which class a student was in during each academic year (one row per student per year).
-- Written whenever classes are promoted, so "what class was Diya in during 2025-26?" can always be answered.
CREATE TABLE IF NOT EXISTS student_class_history (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,   -- student_id: the student (students.id)
  academic_year TEXT NOT NULL,                          -- '2025-26' = 1 July 2025 .. 30 June 2026
  branch TEXT NOT NULL, year INTEGER NOT NULL, semester INTEGER NOT NULL,   -- branch: CSE or Civil · year: study year 1-3 · semester: semester 1-6
  record_status TEXT,                                   -- status in that year (Active, Passed Out, Detained ...)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,   -- created_at: when the row was made
  PRIMARY KEY (student_id, academic_year)
);
CREATE INDEX IF NOT EXISTS idx_class_history_class ON student_class_history(academic_year, branch, semester);

-- One row per "promote the class" action (automatic or by the admin). snapshot = JSON list of
-- {id, year, semester, status} BEFORE the change, so the admin can undo a promotion made by mistake.
CREATE TABLE IF NOT EXISTS promotion_runs (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  academic_year TEXT NOT NULL,                          -- the NEW academic year the students move into
  branch TEXT,                                          -- NULL = all branches
  from_year INTEGER,                                    -- NULL = all years
  mode TEXT NOT NULL CHECK (mode IN ('auto','manual','semester')),   -- semester = odd -> even semester switch in January
  moved INTEGER NOT NULL DEFAULT 0,                     -- how many students changed class
  snapshot TEXT NOT NULL,   -- snapshot: class of every moved student BEFORE the change (JSON, used by Undo)
  run_by TEXT, run_at TEXT DEFAULT CURRENT_TIMESTAMP,   -- run_by: who ran it · run_at: when it ran
  undone_at TEXT, undone_by TEXT   -- undone_at: when it was undone · undone_by: who undid it
);

-- Practical / lab experiments of a subject (before Step 18 these lived only in one browser's storage).
CREATE TABLE IF NOT EXISTS practical_experiments (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  subject_id TEXT NOT NULL REFERENCES subjects(id),   -- subject_id: the subject (subjects.id)
  branch TEXT NOT NULL, semester INTEGER NOT NULL,      -- copied from the subject (never trusted from the browser)
  academic_year TEXT NOT NULL,                          -- the year it was added in
  experiment_no INTEGER NOT NULL DEFAULT 1,   -- experiment_no: practical number
  title TEXT NOT NULL,   -- title: title
  details TEXT NOT NULL DEFAULT '{}',                   -- JSON: objective, apparatus[], procedureSteps[], vivaQuestions[], inputType, imageUrl, writtenNoteUrl
  max_marks REAL NOT NULL DEFAULT 10 CHECK (max_marks > 0),   -- max_marks: maximum marks
  is_demo INTEGER NOT NULL DEFAULT 0,                   -- 1 = sample (random) data, removable in one click
  created_by TEXT, created_by_name TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT, deleted_at TEXT   -- created_by: username who made it · created_by_name: name of the person who added it · created_at: when the row was made · updated_at: last change · deleted_at: set when deleted (soft delete: the row is kept for the records)
);
CREATE INDEX IF NOT EXISTS idx_practicals_class ON practical_experiments(branch, semester, academic_year);

-- Marks / status of one student for one practical.
CREATE TABLE IF NOT EXISTS practical_records (
  experiment_id TEXT NOT NULL REFERENCES practical_experiments(id) ON DELETE CASCADE,   -- experiment_id: the practical (practical_experiments.id)
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,   -- student_id: the student (students.id)
  status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed','Pending','Absent','Needs Revision')),   -- status: current status
  marks REAL CHECK (marks IS NULL OR marks >= 0),   -- marks: marks given
  remarks TEXT,   -- remarks: free remark
  updated_by TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP,   -- updated_by: username who last changed it · updated_at: last change
  PRIMARY KEY (experiment_id, student_id)
);

-- UBTER (board) semester result of a student, as printed in the board's "Cross List".
CREATE TABLE IF NOT EXISTS board_results (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,   -- student_id: the student (students.id)
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 6),   -- semester: semester 1-6
  exam_session TEXT NOT NULL,                           -- e.g. '2025-26 (Winter)'
  theory_total REAL, practical_total REAL,   -- theory_total: total theory marks · practical_total: total practical marks
  gp REAL, ie REAL,                                     -- General Proficiency, Industrial Exposure (sessional, max 25 each)
  sem_total REAL, max_total REAL,                       -- e.g. 689 out of 1000
  sgpa REAL,                                            -- NULL = not known yet (e.g. not readable on the scanned sheet)
  result TEXT,                                          -- PASS / PBP (pass with back paper) / FAIL / RL ...
  promoted INTEGER,                                     -- 1 = promoted to next semester, 0 = no, NULL = not printed
  back_papers TEXT,                                     -- free text, e.g. '991002 Applied Mathematics-I 008|030'
  remarks TEXT,   -- remarks: free remark
  is_demo INTEGER NOT NULL DEFAULT 0,   -- is_demo: 1 = random SAMPLE data
  created_by TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT,   -- created_by: username who made it · created_at: when the row was made · updated_at: last change
  UNIQUE (student_id, semester, exam_session)
);
CREATE INDEX IF NOT EXISTS idx_board_results_student ON board_results(student_id);

-- Subject-wise lines of one board result.
CREATE TABLE IF NOT EXISTS board_result_subjects (
  result_id TEXT NOT NULL REFERENCES board_results(id) ON DELETE CASCADE,   -- result_id: the result (board_results.id)
  subject_code TEXT NOT NULL,   -- subject_code: subject code
  subject_name TEXT,   -- subject_name: subject name
  theory REAL, practical REAL,                          -- totals (end-semester + sessional); NULL = no theory / practical part
  theory_note TEXT, practical_note TEXT,                -- e.g. 'BK' (back) or 'ABS' (absent) printed next to / instead of marks
  grade TEXT, grade_point REAL,   -- grade: grade · grade_point: grade point
  PRIMARY KEY (result_id, subject_code)
);
