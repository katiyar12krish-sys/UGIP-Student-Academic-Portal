-- ===== Doubt Q&A: questions (with an optional PDF) posted by the admin or a teacher for a whole class =====
-- Students of that class (branch + semester) see them in their Doubt section and can open the file.
CREATE TABLE IF NOT EXISTS qa_posts (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  author_id TEXT NOT NULL, author_name TEXT NOT NULL, author_role TEXT NOT NULL CHECK (author_role IN ('admin','faculty')),   -- who posted it (from the login)
  subject_id TEXT REFERENCES subjects(id),   -- NULL = whole class, no subject (admin only)
  branch TEXT NOT NULL, semester INTEGER NOT NULL,   -- the class it is for
  title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',   -- the question / note
  answer TEXT NOT NULL DEFAULT '',   -- optional answer / explanation
  file_id TEXT REFERENCES stored_files(id),   -- optional PDF / picture
  created_at INTEGER NOT NULL   -- when it was posted
);
CREATE INDEX IF NOT EXISTS idx_qa_class ON qa_posts(branch, semester, created_at);

-- ===== Timetable picture / PDF: one per class (branch + semester), uploaded by the admin or a teacher =====
CREATE TABLE IF NOT EXISTS timetable_images (
  branch TEXT NOT NULL, semester INTEGER NOT NULL,   -- the class
  file_id TEXT NOT NULL REFERENCES stored_files(id),   -- the picture / PDF of the timetable
  note TEXT NOT NULL DEFAULT '',   -- e.g. "valid from 1 Aug"
  uploaded_by TEXT NOT NULL, uploaded_name TEXT NOT NULL, updated_at INTEGER NOT NULL,   -- who / when
  PRIMARY KEY (branch, semester)
);

-- ===== Exam calendar: dates of the semester (exam forms, sessional tests, copy checking, practical / theory exams) =====
-- Everybody signed in reads it; only the admin adds, changes or removes dates.
CREATE TABLE IF NOT EXISTS exam_calendar (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  title TEXT NOT NULL,   -- e.g. "Exam forms"
  kind TEXT NOT NULL CHECK (kind IN ('form','test','checking','practical','theory','result','holiday','other')),   -- type, decides the colour
  start_date TEXT NOT NULL, end_date TEXT NOT NULL,   -- YYYY-MM-DD, both days included
  note TEXT NOT NULL DEFAULT '',   -- what students / teachers must do
  updated_by TEXT NOT NULL, updated_at INTEGER NOT NULL   -- who / when
);
CREATE INDEX IF NOT EXISTS idx_exam_calendar_start ON exam_calendar(start_date);
