-- SQLite schema (file: data/portal.db). Full MySQL version: database/mysql/schema.sql
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY, roll_no TEXT NOT NULL UNIQUE, name TEXT NOT NULL, aadhar_name TEXT,   -- id: unique id of the row · roll_no: UBTER roll number · name: full name · aadhar_name: name as on Aadhaar
  aadhar_enc TEXT, aadhar_hash TEXT, phone TEXT,   -- aadhar_enc: Aadhaar number, ENCRYPTED · aadhar_hash: hash of the Aadhaar number (finds duplicates without decrypting) · phone: mobile number
  branch TEXT NOT NULL CHECK (branch IN ('CSE','Civil')),   -- branch: CSE or Civil
  year INTEGER NOT NULL, semester INTEGER NOT NULL, batch TEXT, entry_type TEXT DEFAULT 'Regular',   -- year: study year 1-3 · semester: semester 1-6 · batch: admission batch, e.g. 2024-2027 · entry_type: Regular or Lateral entry
  category TEXT, gender TEXT, tenth REAL, twelfth REAL, address TEXT, mother TEXT, father TEXT,   -- category: General / OBC / SC / ST / EWS · gender: Male / Female / Other · tenth: 10th percentage · twelfth: 12th percentage · address: full address · mother: mother's name · father: father's name
  record_status TEXT DEFAULT 'Active / Enrolled', photo_path TEXT,   -- record_status: Active / Enrolled, Passed Out, Detained ... · photo_path: old photo path (photos are now files in data/photos)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT   -- created_at: when the row was made · updated_at: last change · deleted_at: set when deleted (soft delete: the row is kept for the records)
);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(branch, year);
-- Semester-wise percentage / SGPA of a student (one row per student per semester). Updated from the UBTER board result.
CREATE TABLE IF NOT EXISTS semester_results (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE, semester INTEGER NOT NULL,   -- student_id: the student (students.id) · semester: semester 1-6
  percentage REAL, cgpa REAL, PRIMARY KEY (student_id, semester)   -- percentage: percentage · cgpa: CGPA / SGPA
);
-- Year-wise percentage / CGPA of a student (one row per student per study year).
CREATE TABLE IF NOT EXISTS year_results (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE, year INTEGER NOT NULL,   -- student_id: the student (students.id) · year: study year 1-3
  percentage REAL, cgpa REAL, PRIMARY KEY (student_id, year)   -- percentage: percentage · cgpa: CGPA / SGPA
);
-- Every change of a student record status (Active, Fee Cleared, Passed Out ...) with who changed it and when.
CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,   -- id: unique id of the row · student_id: the student (students.id)
  status TEXT NOT NULL, remarks TEXT, changed_by TEXT, changed_at TEXT DEFAULT CURRENT_TIMESTAMP   -- status: current status · remarks: free remark · changed_by: username who changed it · changed_at: when it was changed
);
-- Security / audit log: who did what and when (logins, edits, deletes, exports, password views). Never edited.
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT, action TEXT, entity TEXT, entity_id TEXT,   -- id: unique id of the row · actor: username who did it · action: what was done · entity: kind of thing (student, test ...) · entity_id: id of that thing
  detail TEXT, at TEXT DEFAULT CURRENT_TIMESTAMP   -- detail: extra details · at: when
);

-- ===== Step 1: authentication & roles =====
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,        -- admin/faculty: username, student: roll number
  role TEXT NOT NULL CHECK (role IN ('admin','faculty','student','parent')),   -- role: admin / faculty / student / parent
  name TEXT NOT NULL,   -- name: full name
  email TEXT, phone TEXT, department TEXT, designation TEXT,   -- email: e-mail address · phone: mobile number · department: department · designation: designation, e.g. Lecturer
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,   -- set for role='student'
  password_hash TEXT,                                  -- NULL = cannot log in until admin issues credentials
  must_change_password INTEGER NOT NULL DEFAULT 0,   -- must_change_password: 1 = must choose a new password at next login
  failed_attempts INTEGER NOT NULL DEFAULT 0,   -- failed_attempts: wrong passwords in a row
  locked_until INTEGER,                                -- epoch ms
  is_active INTEGER NOT NULL DEFAULT 1,   -- is_active: 1 = active, 0 = switched off
  last_login_at TEXT,   -- last_login_at: last sign-in
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP   -- created_at: when the row was made · updated_at: last change
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student ON users(student_id) WHERE student_id IS NOT NULL;

-- Who is signed in: one row per open login session (the cookie token itself is never stored, only its hash).
CREATE TABLE IF NOT EXISTS sessions (
  id_hash TEXT PRIMARY KEY,                            -- sha256 of the cookie token (raw token is never stored)
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- user_id: the user (users.id)
  created_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,   -- created_at: when the row was made · last_seen_at: last activity (epoch ms) · expires_at: end time (epoch ms)
  ip TEXT, user_agent TEXT   -- ip: IP address · user_agent: browser / device
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Which faculty teaches which subject (used by Step 2 for the marks/attendance rule)
CREATE TABLE IF NOT EXISTS faculty_subject_assignments (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- user_id: the user (users.id)
  subject_id TEXT NOT NULL,   -- subject_id: the subject (subjects.id)
  PRIMARY KEY (user_id, subject_id)
);

-- Parent portal (Step 5) links a parent login to one or more students
CREATE TABLE IF NOT EXISTS parent_student_links (
  parent_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- parent_user_id: the parent's login (users.id)
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,   -- student_id: the student (students.id)
  relation TEXT, PRIMARY KEY (parent_user_id, student_id)   -- relation: Father / Mother / Guardian
);

-- ===== Step 2: subjects, exams/marks, attendance =====
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY, code TEXT NOT NULL, name TEXT NOT NULL,   -- id: unique id of the row · code: subject code, e.g. 053006 · name: full name
  branch TEXT NOT NULL, semester INTEGER NOT NULL, year INTEGER NOT NULL,   -- branch: CSE or Civil · semester: semester 1-6 · year: study year 1-3
  credits INTEGER NOT NULL DEFAULT 0, has_practical INTEGER NOT NULL DEFAULT 0,   -- credits: credits · has_practical: 1 = subject has a practical
  created_at TEXT DEFAULT CURRENT_TIMESTAMP   -- created_at: when the row was made
);

-- Exams of a subject: sessionals, class tests, MCQ tests, assignments, practical / viva, board exams.
CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, type TEXT NOT NULL,   -- id: unique id of the row · title: title · type: type
  subject_id TEXT NOT NULL REFERENCES subjects(id),   -- subject_id: the subject (subjects.id)
  max_marks REAL NOT NULL CHECK (max_marks > 0),   -- max_marks: maximum marks
  date TEXT, time_slot TEXT, room TEXT, duration TEXT, reporting_time TEXT, instructions TEXT,   -- date: date YYYY-MM-DD · time_slot: time, e.g. 10:00 - 11:00 · room: room / hall · duration: duration · reporting_time: reporting time · instructions: instructions for students
  status TEXT NOT NULL DEFAULT 'Upcoming',   -- status: current status
  branch TEXT NOT NULL, semester INTEGER NOT NULL,            -- copied from the subject (never trusted from the client)
  created_by TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT   -- created_by: username who made it · created_at: when the row was made · deleted_at: set when deleted (soft delete: the row is kept for the records)
);
CREATE INDEX IF NOT EXISTS idx_tests_class ON tests(branch, semester);

-- Marks of one student in one exam.
CREATE TABLE IF NOT EXISTS test_marks (
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,   -- test_id: the exam (tests.id)
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,   -- student_id: the student (students.id)
  marks_obtained REAL NOT NULL CHECK (marks_obtained >= 0),   -- marks_obtained: marks scored
  remarks TEXT, updated_by TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP,   -- remarks: free remark · updated_by: username who last changed it · updated_at: last change
  PRIMARY KEY (test_id, student_id)
);

-- One lecture for which attendance is taken (QR code + PIN while it is open).
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  subject_id TEXT NOT NULL REFERENCES subjects(id),   -- subject_id: the subject (subjects.id)
  faculty_id TEXT NOT NULL,   -- faculty_id: teacher who took the lecture (users.id)
  branch TEXT NOT NULL, semester INTEGER NOT NULL,   -- branch: CSE or Civil · semester: semester 1-6
  date TEXT NOT NULL, time_slot TEXT, topic TEXT,   -- date: date YYYY-MM-DD · time_slot: time, e.g. 10:00 - 11:00 · topic: topic taught
  qr_token TEXT NOT NULL UNIQUE, pin TEXT NOT NULL,             -- only ever sent to the owner faculty / admin
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Closed')),   -- status: current status
  expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, closed_at INTEGER   -- expires_at: end time (epoch ms) · created_at: when the row was made · closed_at: when it was closed (epoch ms)
);
CREATE INDEX IF NOT EXISTS idx_att_sessions_class ON attendance_sessions(branch, semester, status);

-- Present / Late / Absent of one student in one lecture.
CREATE TABLE IF NOT EXISTS attendance_records (
  session_id TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,   -- session_id: the lecture (attendance_sessions.id)
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,   -- student_id: the student (students.id)
  status TEXT NOT NULL CHECK (status IN ('Present','Absent','Late')),   -- status: current status
  marked_via TEXT NOT NULL CHECK (marked_via IN ('QR','PIN','Manual')),   -- marked_via: QR, PIN or Manual
  marked_by TEXT, marked_at INTEGER NOT NULL,   -- marked_by: who marked it · marked_at: when (epoch ms)
  PRIMARY KEY (session_id, student_id)
);

-- A faculty (owner) lets a colleague READ their marks sheet. Writing always needs a subject assignment.
CREATE TABLE IF NOT EXISTS marks_access_grants (
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- owner_user_id: teacher who owns the marks sheet
  grantee_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- grantee_user_id: colleague who may read it
  granted_by TEXT, granted_at TEXT DEFAULT CURRENT_TIMESTAMP,   -- granted_by: who gave access · granted_at: when access was given
  PRIMARY KEY (owner_user_id, grantee_user_id)
);

-- ===== Step 3: MFA (authenticator-app TOTP), DPDP consent, SMS OTP =====
CREATE TABLE IF NOT EXISTS user_mfa (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,   -- user_id: the user (users.id)
  secret_enc TEXT NOT NULL,                            -- TOTP secret, AES-256-GCM (same key as Aadhaar)
  enabled INTEGER NOT NULL DEFAULT 0,                  -- 0 = enrolment started but not confirmed yet
  last_step INTEGER NOT NULL DEFAULT 0,                -- last accepted 30s time-step (a code can be used only once)
  created_at INTEGER NOT NULL, enabled_at INTEGER   -- created_at: when the row was made · enabled_at: when it was switched on
);
-- One-time recovery codes for two-step login (used when the phone with the authenticator app is lost).
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- user_id: the user (users.id)
  code_hash TEXT NOT NULL, used_at INTEGER,   -- code_hash: hash of the code (the code itself is not stored) · used_at: when it was used
  PRIMARY KEY (user_id, code_hash)
);
-- Password was right, second step still pending. No session exists until the code is accepted.
CREATE TABLE IF NOT EXISTS mfa_challenges (
  id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- id_hash: SHA-256 hash of the session token · user_id: the user (users.id)
  created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, ip TEXT, user_agent TEXT   -- created_at: when the row was made · expires_at: end time (epoch ms) · attempts: number of tries · ip: IP address · user_agent: browser / device
);
-- Append-only consent ledger. Current state = newest row per (subject_user_id, purpose).
CREATE TABLE IF NOT EXISTS consent_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,   -- id: unique id of the row
  subject_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- whose personal data
  actor_user_id TEXT NOT NULL,                                            -- who clicked (the person, or a parent for a minor)
  purpose TEXT NOT NULL CHECK (purpose IN ('service','photo','notifications')),   -- purpose: what the consent is for (service, photo, notifications)
  granted INTEGER NOT NULL, notice_version TEXT NOT NULL,   -- granted: 1 = agreed, 0 = withdrawn · notice_version: version of the privacy notice shown
  at TEXT DEFAULT CURRENT_TIMESTAMP, ip TEXT, user_agent TEXT   -- at: when · ip: IP address · user_agent: browser / device
);
CREATE INDEX IF NOT EXISTS idx_consent_subject ON consent_records(subject_user_id, purpose, id);
-- One-time SMS codes (password reset). Only a hash of the code is stored.
CREATE TABLE IF NOT EXISTS sms_otps (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose TEXT NOT NULL,   -- id: unique id of the row · user_id: the user (users.id) · purpose: what the consent is for (service, photo, notifications)
  code_hash TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, used_at INTEGER   -- code_hash: hash of the code (the code itself is not stored) · created_at: when the row was made · expires_at: end time (epoch ms) · attempts: number of tries · used_at: when it was used
);
CREATE INDEX IF NOT EXISTS idx_sms_otps_user ON sms_otps(user_id, purpose);

-- ===== Step 4: notifications, Web Push, reminders =====
-- One row per person per message. The in-app list reads from here; push delivery is a queue on the same rows.
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,   -- id: unique id of the row
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- user_id: the user (users.id)
  kind TEXT NOT NULL,                                  -- exam_reminder | marks_published | absent | low_attendance | test
  title TEXT NOT NULL, body TEXT NOT NULL, url TEXT,   -- title: title · body: message text · url: link to open
  dedupe_key TEXT NOT NULL,                            -- the same event never notifies the same person twice
  created_at INTEGER NOT NULL, read_at INTEGER,   -- created_at: when the row was made · read_at: when it was read
  push_state TEXT NOT NULL DEFAULT 'pending' CHECK (push_state IN ('pending','sent','skipped')),   -- push_state: phone push status
  push_attempts INTEGER NOT NULL DEFAULT 0,   -- push_attempts: push tries
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, id);
CREATE INDEX IF NOT EXISTS idx_notifications_push ON notifications(push_state, created_at);

-- One row per browser/phone that allowed notifications. The endpoint is a URL at Google / Mozilla / Apple / Microsoft.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,   -- id: unique id of the row
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- user_id: the user (users.id)
  endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL,   -- endpoint: push service address of the device · auth: push key
  user_agent TEXT, created_at INTEGER NOT NULL, last_ok_at INTEGER, fail_count INTEGER NOT NULL DEFAULT 0   -- user_agent: browser / device · created_at: when the row was made · last_ok_at: last successful push · fail_count: failed pushes in a row
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- ===== Step 7: assignments / online tests (questions + answer key) on the server =====
-- Branch / year / semester are copied from the subject (never trusted from the client). Deadlines are Indian time.
CREATE TABLE IF NOT EXISTS online_tests (
  id TEXT PRIMARY KEY, title TEXT NOT NULL,   -- id: unique id of the row · title: title
  subject_id TEXT NOT NULL REFERENCES subjects(id),   -- subject_id: the subject (subjects.id)
  branch TEXT NOT NULL, year INTEGER NOT NULL, semester INTEGER NOT NULL,   -- branch: CSE or Civil · year: study year 1-3 · semester: semester 1-6
  deadline_date TEXT NOT NULL, deadline_time TEXT NOT NULL, deadline_at INTEGER NOT NULL,   -- epoch ms of date+time in IST
  total_marks REAL NOT NULL CHECK (total_marks > 0), description TEXT,   -- total_marks: total marks · description: description
  created_by TEXT NOT NULL REFERENCES users(id), created_by_name TEXT NOT NULL,   -- created_by: username who made it · created_by_name: name of the person who made it
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','completed')),   -- status: current status
  reminders_sent INTEGER NOT NULL DEFAULT 0, reminder_log TEXT, faculty_alerted INTEGER NOT NULL DEFAULT 0,   -- reminders_sent: how many deadline reminders were sent · reminder_log: when reminders were sent · faculty_alerted: 1 = teacher was told who did not submit
  created_at INTEGER NOT NULL, deleted_at INTEGER   -- created_at: when the row was made · deleted_at: set when deleted (soft delete: the row is kept for the records)
);
CREATE INDEX IF NOT EXISTS idx_online_tests_class ON online_tests(branch, semester);
CREATE INDEX IF NOT EXISTS idx_online_tests_subject ON online_tests(subject_id);
-- The answer key (correct_index) is sent only to the teacher of the subject / admin, and to a student after they submit.
CREATE TABLE IF NOT EXISTS online_test_questions (
  test_id TEXT NOT NULL REFERENCES online_tests(id) ON DELETE CASCADE, idx INTEGER NOT NULL,   -- test_id: the exam (tests.id) · idx: question number
  question TEXT NOT NULL, options TEXT NOT NULL,                                          -- options: JSON array of strings
  correct_index INTEGER NOT NULL, explanation TEXT,   -- correct_index: number of the right option (answer key) · explanation: explanation of the answer
  PRIMARY KEY (test_id, idx)
);
-- One row per student per test. score is NULL for a test without questions (plain assignment: only "submitted").
CREATE TABLE IF NOT EXISTS online_test_submissions (
  test_id TEXT NOT NULL REFERENCES online_tests(id) ON DELETE CASCADE,   -- test_id: the exam (tests.id)
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,   -- student_id: the student (students.id)
  score REAL, total REAL NOT NULL, percentage REAL, correct INTEGER, wrong INTEGER, grade TEXT,   -- score: score · total: out of · percentage: percentage · correct: right answers · wrong: wrong answers · grade: grade
  answers TEXT,                                                                           -- JSON array of chosen option index (or null)
  attempts INTEGER NOT NULL DEFAULT 1, submitted_at INTEGER NOT NULL,   -- attempts: number of tries · submitted_at: when it was handed in
  PRIMARY KEY (test_id, student_id)
);

-- ===== Step 8: notices, direct notices to one student, doubts (questions to teachers) =====
-- Circulars. Who sees one is decided by the server from target_branch / target_semesters, not by the screen.
CREATE TABLE IF NOT EXISTS notices (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  title TEXT NOT NULL,   -- title: title
  category TEXT NOT NULL CHECK (category IN ('Academic','Exam','Scholarship','Placement','Sports','Administrative')),   -- category: General / OBC / SC / ST / EWS
  priority TEXT NOT NULL CHECK (priority IN ('Normal','High','Urgent')),   -- priority: Normal / High / Urgent
  content TEXT NOT NULL, pdf_attachment TEXT,                       -- pdf_attachment is only a file name for display
  published_by TEXT NOT NULL,   -- published_by: name shown as publisher
  target_branch TEXT NOT NULL DEFAULT 'All',                        -- 'All' or a branch
  target_semesters TEXT NOT NULL DEFAULT '[]',                      -- JSON array; empty = every semester
  created_by_user_id TEXT NOT NULL, created_at INTEGER NOT NULL, deleted_at INTEGER   -- created_by_user_id: who made it (users.id) · created_at: when the row was made · deleted_at: set when deleted (soft delete: the row is kept for the records)
);
CREATE INDEX IF NOT EXISTS idx_notices_created ON notices(created_at);

-- A private message from a teacher / admin to ONE student.
CREATE TABLE IF NOT EXISTS direct_notices (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,   -- student_id: the student (students.id)
  title TEXT NOT NULL, message TEXT NOT NULL,   -- title: title · message: message text
  priority TEXT NOT NULL CHECK (priority IN ('normal','urgent','critical')),   -- priority: Normal / High / Urgent
  sent_by_user_id TEXT NOT NULL, sent_by_role TEXT NOT NULL, sent_by_name TEXT NOT NULL,   -- sent_by_user_id: sender (users.id) · sent_by_role: sender role · sent_by_name: sender name
  created_at INTEGER NOT NULL, read_at INTEGER   -- created_at: when the row was made · read_at: when it was read
);
CREATE INDEX IF NOT EXISTS idx_direct_student ON direct_notices(student_id, created_at);

-- A student's question to the teachers of a subject, with the conversation under it.
CREATE TABLE IF NOT EXISTS doubts (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,   -- student_id: the student (students.id)
  subject_id TEXT NOT NULL REFERENCES subjects(id),   -- subject_id: the subject (subjects.id)
  branch TEXT NOT NULL, semester INTEGER NOT NULL,                  -- copied from the subject
  title TEXT NOT NULL, details TEXT NOT NULL,   -- title: title · details: details
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','In Discussion','Resolved')),   -- status: current status
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, resolved_at INTEGER   -- created_at: when the row was made · updated_at: last change · resolved_at: when marked resolved
);
CREATE INDEX IF NOT EXISTS idx_doubts_student ON doubts(student_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_doubts_subject ON doubts(subject_id, updated_at);

-- Replies in a doubt thread (student <-> teachers of the subject).
CREATE TABLE IF NOT EXISTS doubt_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,   -- id: unique id of the row
  doubt_id TEXT NOT NULL REFERENCES doubts(id) ON DELETE CASCADE,   -- doubt_id: the doubt (doubts.id)
  sender_user_id TEXT NOT NULL, sender_role TEXT NOT NULL CHECK (sender_role IN ('student','faculty','admin')),   -- sender_user_id: who wrote it · sender_role: student / faculty / admin
  sender_name TEXT NOT NULL,                                        -- taken from the login, never from the request
  text TEXT NOT NULL, created_at INTEGER NOT NULL   -- text: text · created_at: when the row was made
);
CREATE INDEX IF NOT EXISTS idx_doubt_replies ON doubt_replies(doubt_id, id);

-- ===== Step 9: uploaded files + study materials =====
-- Every uploaded file is one row here and one file in data/uploads/<id> (no extension, no user-typed text in the path).
-- Upload is step one (the file is "pending"); a record that uses it (a material, later a notice or a submission) attaches it in step two.
-- Pending files nobody attached within an hour are deleted by the server.
CREATE TABLE IF NOT EXISTS stored_files (
  id TEXT PRIMARY KEY,                        -- f-<24 random hex>; also the file name on disk
  original_name TEXT NOT NULL,                -- for display and the download name only, cleaned
  mime TEXT NOT NULL,                         -- decided by the server from the first bytes, never from the browser
  size INTEGER NOT NULL, sha256 TEXT NOT NULL,   -- size: size in bytes
  uploaded_by TEXT NOT NULL, created_at INTEGER NOT NULL,   -- uploaded_by: who uploaded it (users.id) · created_at: when the row was made
  attached_to TEXT                            -- NULL = pending; otherwise 'material:<id>', 'dispatch:<id>' or 'submission:<id>'
);
CREATE INDEX IF NOT EXISTS idx_files_pending ON stored_files(attached_to, created_at);

-- Study materials (notes, lab manuals, question banks ...): a file or a web link. Class (branch + semester) is copied from the subject when there is one.
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',   -- title: title · description: description
  kind TEXT NOT NULL CHECK (kind IN ('file','link')),   -- kind: kind
  category TEXT NOT NULL CHECK (category IN ('Lecture Notes','Lab Manual','Question Bank','Syllabus & Curriculum','Assignment / Tutorial','Official Circular','Reference E-Book','Online Video / Lecture')),   -- category: General / OBC / SC / ST / EWS
  subject_id TEXT REFERENCES subjects(id),    -- NULL = general material (admin only)
  branch TEXT NOT NULL DEFAULT 'All',         -- 'All' or a branch
  semester INTEGER,                           -- NULL = every semester
  file_id TEXT REFERENCES stored_files(id), link_url TEXT,   -- file_id: stored file (stored_files.id) · link_url: web link
  tags TEXT NOT NULL DEFAULT '[]',            -- JSON array of short strings
  uploaded_by_user_id TEXT NOT NULL, uploaded_by_name TEXT NOT NULL,   -- uploaded_by_user_id: who uploaded it · uploaded_by_name: name of the uploader
  download_count INTEGER NOT NULL DEFAULT 0,  -- counts downloads / views by students
  created_at INTEGER NOT NULL   -- created_at: when the row was made
);
CREATE INDEX IF NOT EXISTS idx_materials_created ON materials(created_at);
CREATE INDEX IF NOT EXISTS idx_materials_subject ON materials(subject_id);

-- ===== Step 10: class & subject dispatch (teacher -> class) and student submissions with private files =====
-- A dispatch is a note / task / paper a teacher sends to one class (branch + semester are copied from the subject).
-- Only "Assignment & Task" dispatches take submissions. A submission file is private: its student and the teachers of that subject only.
CREATE TABLE IF NOT EXISTS dispatches (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  subject_id TEXT NOT NULL REFERENCES subjects(id),   -- subject_id: the subject (subjects.id)
  type TEXT NOT NULL CHECK (type IN ('Lecture Notes','Assignment & Task','Test / Exam Paper','Lab Module','Circular Notice','Formula Sheet')),   -- type: type
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',   -- title: title · description: description
  file_id TEXT REFERENCES stored_files(id),   -- file_id: stored file (stored_files.id)
  due_date TEXT, max_marks REAL,              -- only for 'Assignment & Task'; due_date is YYYY-MM-DD, open until 23:59 IST that day
  sent_by_user_id TEXT NOT NULL, sent_by_name TEXT NOT NULL,   -- sent_by_user_id: sender (users.id) · sent_by_name: sender name
  created_at INTEGER NOT NULL   -- created_at: when the row was made
);
CREATE INDEX IF NOT EXISTS idx_dispatches_subject ON dispatches(subject_id, created_at);
-- Work handed in by a student for a class dispatch task (with optional file), and the teacher's marks.
CREATE TABLE IF NOT EXISTS dispatch_submissions (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  dispatch_id TEXT NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,   -- dispatch_id: the dispatch (dispatches.id)
  student_id TEXT NOT NULL REFERENCES students(id),   -- student_id: the student (students.id)
  content TEXT NOT NULL DEFAULT '',   -- content: text
  file_id TEXT REFERENCES stored_files(id),   -- file_id: stored file (stored_files.id)
  submitted_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 1,   -- submitted_at: when it was handed in · attempts: number of tries
  marks REAL, feedback TEXT, graded_by TEXT, graded_at INTEGER,   -- marks NULL = not graded yet
  UNIQUE (dispatch_id, student_id)
);

-- ===== Step 11: placement drives, applications and job listings =====
-- A drive is posted by admin or faculty. A student applies once; the server checks branch, deadline (end of day IST), active flag and minimum percentage.
CREATE TABLE IF NOT EXISTS placement_drives (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  title TEXT NOT NULL, company TEXT NOT NULL,   -- title: title · company: company name
  branch TEXT NOT NULL CHECK (branch IN ('CSE','Civil','Both')),   -- branch: CSE or Civil
  type TEXT NOT NULL CHECK (type IN ('Campus Placement','Industrial Training','Government PSU','Off-Campus Drive')),   -- type: type
  ctc TEXT NOT NULL DEFAULT '', stipend TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',   -- ctc: salary package · stipend: stipend · location: place
  deadline TEXT NOT NULL,                      -- YYYY-MM-DD, open until 23:59 IST that day
  vacancies INTEGER NOT NULL DEFAULT 1,   -- vacancies: number of posts
  description TEXT NOT NULL DEFAULT '',   -- description: description
  min_percentage REAL NOT NULL DEFAULT 0, other_criteria TEXT NOT NULL DEFAULT '',   -- min_percentage: minimum percentage needed · other_criteria: other eligibility rules
  selection_process TEXT NOT NULL DEFAULT '[]', key_skills TEXT NOT NULL DEFAULT '[]',   -- JSON arrays of strings
  apply_url TEXT NOT NULL DEFAULT '', contact_person TEXT NOT NULL DEFAULT '',   -- apply_url: link to apply · contact_person: contact person
  is_active INTEGER NOT NULL DEFAULT 1,   -- is_active: 1 = active, 0 = switched off
  posted_by_user_id TEXT NOT NULL, posted_by_name TEXT NOT NULL,   -- posted_by_user_id: who posted it · posted_by_name: name of the poster
  created_at INTEGER NOT NULL   -- created_at: when the row was made
);
CREATE INDEX IF NOT EXISTS idx_placement_drives_created ON placement_drives(created_at);
-- A student's application to a placement drive and its status (Applied, Shortlisted, Selected, Rejected).
CREATE TABLE IF NOT EXISTS placement_applications (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  drive_id TEXT NOT NULL REFERENCES placement_drives(id) ON DELETE CASCADE,   -- drive_id: the placement drive
  student_id TEXT NOT NULL REFERENCES students(id),   -- student_id: the student (students.id)
  applied_at INTEGER NOT NULL,   -- applied_at: when the student applied
  status TEXT NOT NULL DEFAULT 'Applied' CHECK (status IN ('Applied','Shortlisted','Selected','Rejected')),   -- status: current status
  status_by TEXT, status_at INTEGER,   -- status_by: who changed the status · status_at: when the status changed
  UNIQUE (drive_id, student_id)
);
-- Government / PSU / private job listings posted by the placement cell for CSE and Civil students.
CREATE TABLE IF NOT EXISTS placement_jobs (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  title TEXT NOT NULL, organization TEXT NOT NULL,   -- title: title · organization: organisation
  branch TEXT NOT NULL CHECK (branch IN ('CSE','Civil','Both')),   -- branch: CSE or Civil
  job_type TEXT NOT NULL CHECK (job_type IN ('Government','PSU','Private EPC / IT')),   -- job_type: Government / PSU / Private
  exam_or_post TEXT NOT NULL DEFAULT '', expected_month TEXT NOT NULL DEFAULT '', pay_scale TEXT NOT NULL DEFAULT '',   -- exam_or_post: exam or post name · expected_month: expected month of the notification · pay_scale: pay scale
  vacancies INTEGER NOT NULL DEFAULT 0, qualification TEXT NOT NULL DEFAULT '', age_limit TEXT NOT NULL DEFAULT '',   -- vacancies: number of posts · qualification: qualification needed · age_limit: age limit
  official_link TEXT NOT NULL DEFAULT '', syllabus_summary TEXT NOT NULL DEFAULT '',   -- official_link: official website · syllabus_summary: short syllabus
  application_deadline TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',   -- application_deadline: last date to apply · notes: notes
  is_active INTEGER NOT NULL DEFAULT 1,   -- is_active: 1 = active, 0 = switched off
  posted_by_user_id TEXT NOT NULL, posted_by_name TEXT NOT NULL,   -- posted_by_user_id: who posted it · posted_by_name: name of the poster
  created_at INTEGER NOT NULL   -- created_at: when the row was made
);

-- ===== Step 13: chat (WhatsApp-style) between parents / students and teachers / admin =====
-- One thread = two people (+ the child it is about). user_lo < user_hi (plain string order) so the same pair never gets two threads.
-- student_id is '' for a talk between two staff members (admin <-> faculty).
CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  user_lo TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- user_lo: one person of the chat
  user_hi TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- user_hi: the other person of the chat
  student_id TEXT NOT NULL DEFAULT '',   -- student_id: the student (students.id)
  created_at INTEGER NOT NULL, last_at INTEGER NOT NULL,   -- created_at: when the row was made · last_at: time of the newest message
  last_read_lo INTEGER NOT NULL DEFAULT 0,             -- newest message id the lo person has opened (blue ticks for the other side)
  last_read_hi INTEGER NOT NULL DEFAULT 0,   -- last_read_hi: newest message read
  UNIQUE (user_lo, user_hi, student_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_threads_lo ON chat_threads(user_lo, last_at);
CREATE INDEX IF NOT EXISTS idx_chat_threads_hi ON chat_threads(user_hi, last_at);

-- Messages of a chat thread: text, voice, photo or file.
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,   -- id: unique id of the row
  thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,   -- thread_id: the chat (chat_threads.id)
  sender_id TEXT NOT NULL,                              -- from the login, never from the request
  kind TEXT NOT NULL CHECK (kind IN ('text','voice','image','file')),   -- kind: kind
  body TEXT NOT NULL DEFAULT '',                        -- the text, or the caption of a photo / file
  file_id TEXT, file_name TEXT, file_mime TEXT, file_size INTEGER,   -- file_id: stored file (stored_files.id) · file_name: original file name · file_mime: file type · file_size: size in bytes
  duration_ms INTEGER,                                  -- voice messages
  created_at INTEGER NOT NULL,   -- created_at: when the row was made
  deleted_at INTEGER                                    -- "delete for everyone": text and file are erased, the row stays
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id, id);

-- ===== Group chats: "All faculty", branch groups (CSE / Civil students), class groups (branch + year), custom groups =====
-- Built-in groups get their members from the records (role, branch, semester, subjects taught), so they never go stale.
-- Custom groups (e.g. a sports group) are made by the admin and list their members in chat_group_members.
CREATE TABLE IF NOT EXISTS chat_groups (
  id TEXT PRIMARY KEY,                                   -- grp-faculty, grp-branch-CSE, grp-class-CSE-2, grp-<random> (custom)
  kind TEXT NOT NULL CHECK (kind IN ('faculty','branch','class','custom')),   -- kind: who the members are
  name TEXT NOT NULL,                                    -- name shown in the chat list
  branch TEXT, year INTEGER,                             -- branch: CSE / Civil (branch + class groups) · year: study year 1-3 (class groups)
  created_by TEXT, created_at INTEGER NOT NULL,          -- created_by: users.id of the admin (custom groups) · created_at: when made
  last_at INTEGER NOT NULL,                              -- time of the newest message
  archived INTEGER NOT NULL DEFAULT 0                    -- 1 = deleted by the admin (hidden, messages kept for the records)
);
CREATE TABLE IF NOT EXISTS chat_group_members (          -- members of CUSTOM groups only
  group_id TEXT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by TEXT, added_at INTEGER NOT NULL,
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user ON chat_group_members(user_id);
CREATE TABLE IF NOT EXISTS chat_group_messages (         -- same shape as chat_messages
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,                               -- from the login, never from the request
  sender_name TEXT NOT NULL, sender_role TEXT NOT NULL,  -- kept so old messages still show who wrote them
  kind TEXT NOT NULL CHECK (kind IN ('text','voice','image','file')),
  body TEXT NOT NULL DEFAULT '',
  file_id TEXT, file_name TEXT, file_mime TEXT, file_size INTEGER, duration_ms INTEGER,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER, deleted_by TEXT                    -- deleted by the writer, or by the admin (moderation)
);
CREATE INDEX IF NOT EXISTS idx_chat_group_messages ON chat_group_messages(group_id, id);
CREATE TABLE IF NOT EXISTS chat_group_reads (            -- newest message each member has opened (unread counts)
  group_id TEXT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, user_id)
);

-- ===== Question papers: sample papers made from the syllabus, old board papers and answer keys =====
-- The PDF / picture itself is kept INSIDE this database (exam_paper_files.data), so copying data/portal.db
-- carries every paper and answer key along. Built-in sample papers are created on start-up from server/papers/content.
CREATE TABLE IF NOT EXISTS exam_paper_files (
  id TEXT PRIMARY KEY,                       -- qf-<24 random hex>
  original_name TEXT NOT NULL,               -- download name, cleaned
  mime TEXT NOT NULL,                        -- decided by the server from the first bytes (PDF / JPEG / PNG / Word)
  size INTEGER NOT NULL, sha256 TEXT NOT NULL,   -- size: size in bytes · sha256: checksum of the bytes
  data BLOB NOT NULL,                        -- the file itself
  created_at INTEGER NOT NULL                -- when the row was made
);
CREATE TABLE IF NOT EXISTS exam_papers (
  id TEXT PRIMARY KEY,                       -- qp-<random>
  seed_key TEXT UNIQUE,                      -- 'sample:<syllabus key>:<set>' for a built-in sample paper; NULL for an uploaded one
  content_hash TEXT,                         -- built-in samples: checksum of the question text they were made from (rebuilt when the text changes)
  kind TEXT NOT NULL CHECK (kind IN ('sample','previous','model')),   -- sample = made from the syllabus · previous = old board paper · model = other practice paper
  title TEXT NOT NULL,                       -- e.g. 'Sample Paper - Set A'
  subject_code TEXT NOT NULL, subject_name TEXT NOT NULL,   -- board subject code and name
  branch TEXT NOT NULL DEFAULT 'All',        -- 'All' (1st year, common) or 'CSE' / 'Civil'
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 6),
  exam_year TEXT,                            -- e.g. '2024' for an old board paper (optional)
  paper_file_id TEXT NOT NULL REFERENCES exam_paper_files(id),   -- the question paper
  answer_file_id TEXT REFERENCES exam_paper_files(id),           -- the answer key (NULL = not given yet)
  uploaded_by_user_id TEXT NOT NULL, uploaded_by_name TEXT NOT NULL, -- who added the paper ('system' for built-in samples)
  answer_updated_by_name TEXT, answer_updated_at INTEGER,            -- who last uploaded / replaced the answer key, and when
  download_count INTEGER NOT NULL DEFAULT 0, -- opens + downloads
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  deleted_at INTEGER                         -- set when removed; a removed built-in sample is not created again
);
CREATE INDEX IF NOT EXISTS idx_exam_papers_class ON exam_papers(semester, branch);
