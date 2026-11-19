-- UGIP Portal : MySQL 8 DESIGN for a future move to MySQL (scalable, role-based, year-wise).
-- NOTE: the running portal uses SQLite. Its exact, complete table layout (all tables, all comments) is in
--       database/sqlite/full-schema.sql (made from the live database) and server/db/schema*.sql.
-- Run:  mysql -u root -p < schema.sql  &&  mysql -u root -p gpt_portal < seed_students.sql
CREATE DATABASE IF NOT EXISTS gpt_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gpt_portal;

-- ===== 1. Master data =====
CREATE TABLE academic_years (
  id SMALLINT PRIMARY KEY AUTO_INCREMENT,   -- id: unique id of the row
  label VARCHAR(9) NOT NULL UNIQUE,            -- e.g. 2026-27 (add 2027-28 ... any time)
  start_date DATE NOT NULL, end_date DATE NOT NULL,   -- start_date: first day · end_date: last day
  is_current TINYINT(1) NOT NULL DEFAULT 0   -- is_current: 1 = the running year
);
-- Departments: CSE and Civil.
CREATE TABLE branches (
  code VARCHAR(10) PRIMARY KEY,                -- CSE, CIVIL
  name VARCHAR(100) NOT NULL   -- name: full name
);
-- Subjects of each br                      anch and semester (official UBTER codes).
CREATE TABLE subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,   -- id: unique id of the row
  branch_code VARCHAR(10) NOT NULL, semester TINYINT NOT NULL,   -- branch_code: branch (branches.code) · semester: semester 1-6
  code VARCHAR(20) NOT NULL, name VARCHAR(150) NOT NULL, credits TINYINT,   -- code: subject code, e.g. 053006 · name: full name · credits: credits
  UNIQUE (branch_code, code),
  FOREIGN KEY (branch_code) REFERENCES branches(code)
);

-- ===== 2. Users & role-based access =====
CREATE TABLE roles (
  id TINYINT PRIMARY KEY, name VARCHAR(20) UNIQUE NOT NULL   -- 1 admin, 2 faculty, 3 student
);
-- Every login (admin, faculty, student, parent).
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,   -- id: unique id of the row
  role_id TINYINT NOT NULL,   -- role_id: role (roles.id)
  full_name VARCHAR(120) NOT NULL,   -- full_name: full name
  email VARCHAR(150) UNIQUE, phone VARCHAR(15),   -- email: e-mail address · phone: mobile number
  password_hash VARCHAR(255) NOT NULL,          -- bcrypt/argon2, never plain text
  mfa_enabled TINYINT(1) DEFAULT 0, mfa_secret VARBINARY(255),   -- mfa_enabled: mfa enabled · mfa_secret: mfa secret
  photo_file_id BIGINT NULL,   -- photo_file_id: photo file id
  is_active TINYINT(1) DEFAULT 1,   -- is_active: 1 = active, 0 = switched off
  last_login_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,   -- last_login_at: last sign-in · created_at: when the row was made
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,   -- updated_at: last change
  FOREIGN KEY (role_id) REFERENCES roles(id), INDEX (phone)
);
-- What each role may do.
CREATE TABLE permissions (
  id INT PRIMARY KEY AUTO_INCREMENT, role_id TINYINT NOT NULL,   -- id: unique id of the row · role_id: role (roles.id)
  resource VARCHAR(50) NOT NULL,                -- students, marks, attendance, placements ...
  can_read TINYINT(1) DEFAULT 0, can_create TINYINT(1) DEFAULT 0,   -- can_read: can read · can_create: can create
  can_update TINYINT(1) DEFAULT 0, can_delete TINYINT(1) DEFAULT 0,   -- can_update: can update · can_delete: can delete
  UNIQUE (role_id, resource), FOREIGN KEY (role_id) REFERENCES roles(id)
);
-- Signed-in sessions.
CREATE TABLE sessions (
  id CHAR(36) PRIMARY KEY, user_id BIGINT NOT NULL, ip VARCHAR(45), device VARCHAR(200),   -- id: unique id of the row · user_id: the user (users.id) · ip: IP address · device: device
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME NOT NULL,   -- created_at: when the row was made · expires_at: end time (epoch ms)
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===== 3. Faculty =====
CREATE TABLE faculty (
  user_id BIGINT PRIMARY KEY, branch_code VARCHAR(10), designation VARCHAR(100),   -- user_id: the user (users.id) · branch_code: branch (branches.code) · designation: designation, e.g. Lecturer
  FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (branch_code) REFERENCES branches(code)
);
-- faculty can edit marks/attendance ONLY for subjects listed here
CREATE TABLE faculty_subjects (
  faculty_id BIGINT NOT NULL, subject_id INT NOT NULL, academic_year_id SMALLINT NOT NULL,   -- faculty_id: teacher (faculty.id) · subject_id: subject (subjects.id) · academic_year_id: academic year (academic_years.id)
  PRIMARY KEY (faculty_id, subject_id, academic_year_id),
  FOREIGN KEY (faculty_id) REFERENCES faculty(user_id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
);

-- ===== 4. Students =====
CREATE TABLE students (
  user_id BIGINT PRIMARY KEY,   -- user_id: the user (users.id)
  ubter_roll_no VARCHAR(20) NOT NULL UNIQUE,   -- ubter_roll_no: ubter roll no
  aadhar_name VARCHAR(120),   -- aadhar_name: name as on Aadhaar
  aadhar_enc VARBINARY(255),                    -- AES-256 encrypted (app-level key)
  aadhar_hash CHAR(64),                         -- SHA-256 for duplicate check only
  branch_code VARCHAR(10) NOT NULL,   -- branch_code: branch (branches.code)
  entry_type ENUM('Regular','Lateral') DEFAULT 'Regular',   -- entry_type: Regular or Lateral entry
  batch VARCHAR(20), current_year TINYINT NOT NULL, current_semester TINYINT NOT NULL,   -- batch: admission batch, e.g. 2024-2027 · current_year: study year now (1-3) · current_semester: semester now
  category VARCHAR(20), gender ENUM('Male','Female','Other'),   -- category: General / OBC / SC / ST / EWS · gender: Male / Female / Other
  tenth_percentage DECIMAL(5,2), twelfth_percentage DECIMAL(5,2),   -- tenth_percentage: tenth percentage · twelfth_percentage: twelfth percentage
  full_address VARCHAR(300), mother_name VARCHAR(100), father_name VARCHAR(100),   -- full_address: full address · mother_name: mother name · father_name: father name
  record_status ENUM('Active / Enrolled','Fee Cleared','Documents Verified','Placement Ready','Pending Review') DEFAULT 'Active / Enrolled',   -- record_status: Active / Enrolled, Passed Out, Detained ...
  deleted_at DATETIME NULL,                     -- soft delete
  FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (branch_code) REFERENCES branches(code),
  INDEX idx_class (branch_code, current_year)   -- class-wise Excel sheets / dashboards
);
-- Every change of a student status.
CREATE TABLE student_status_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, student_id BIGINT NOT NULL,   -- id: unique id of the row · student_id: the student (students.id)
  status VARCHAR(40) NOT NULL, remarks VARCHAR(255),   -- status: current status · remarks: free remark
  changed_by BIGINT, changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,   -- changed_by: username who changed it · changed_at: when it was changed
  FOREIGN KEY (student_id) REFERENCES students(user_id), FOREIGN KEY (changed_by) REFERENCES users(id)
);
-- Semester percentage / SGPA.
CREATE TABLE semester_results (                 -- 1 row per student per semester (sem 1..6)
  student_id BIGINT NOT NULL, semester TINYINT NOT NULL,   -- student_id: the student (students.id) · semester: semester 1-6
  percentage DECIMAL(5,2) NULL, cgpa DECIMAL(4,2) NULL,   -- NULL = N/A
  academic_year_id SMALLINT NULL,   -- academic_year_id: academic year (academic_years.id)
  PRIMARY KEY (student_id, semester), FOREIGN KEY (student_id) REFERENCES students(user_id)
);
-- Year percentage / CGPA.
CREATE TABLE year_results (                     -- 1st / 2nd / 3rd year summary
  student_id BIGINT NOT NULL, year TINYINT NOT NULL,   -- student_id: the student (students.id) · year: study year 1-3
  percentage DECIMAL(5,2) NULL, cgpa DECIMAL(4,2) NULL,   -- percentage: percentage · cgpa: CGPA / SGPA
  PRIMARY KEY (student_id, year), FOREIGN KEY (student_id) REFERENCES students(user_id)
);
-- Marks of a student in an exam.
CREATE TABLE marks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, student_id BIGINT NOT NULL, subject_id INT NOT NULL,   -- id: unique id of the row · student_id: the student (students.id) · subject_id: subject (subjects.id)
  exam_type ENUM('Sessional 1','Sessional 2','Unit Test','Practical / Viva','Board Exam') NOT NULL,   -- exam_type: exam type
  marks_obtained DECIMAL(5,2), max_marks DECIMAL(5,2) NOT NULL,   -- marks_obtained: marks scored · max_marks: maximum marks
  entered_by BIGINT NOT NULL, entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,   -- entered_by: entered by · entered_at: entered at
  UNIQUE (student_id, subject_id, exam_type),
  FOREIGN KEY (student_id) REFERENCES students(user_id), FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- ===== 5. Attendance (partition by year for growth) =====
CREATE TABLE attendance (
  id BIGINT AUTO_INCREMENT, student_id BIGINT NOT NULL, subject_id INT NOT NULL,   -- id: unique id of the row · student_id: the student (students.id) · subject_id: subject (subjects.id)
  class_date DATE NOT NULL, status ENUM('P','A','L') NOT NULL, marked_by BIGINT NOT NULL,   -- class_date: class date · status: current status · marked_by: who marked it
  PRIMARY KEY (id, class_date), UNIQUE (student_id, subject_id, class_date),
  INDEX (subject_id, class_date)
) PARTITION BY RANGE (YEAR(class_date)) (
  PARTITION p2025 VALUES LESS THAN (2026), PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION p2027 VALUES LESS THAN (2028), PARTITION pmax VALUES LESS THAN MAXVALUE
);
CREATE VIEW v_attendance_summary AS      -- UBTER 75% rule
SELECT student_id, subject_id, COUNT(*) AS held, SUM(status='P') AS attended,
       ROUND(100*SUM(status='P')/COUNT(*),1) AS percent,
       (100*SUM(status='P')/COUNT(*)) >= 75 AS eligible
FROM attendance GROUP BY student_id, subject_id;

-- ===== 6. Assignments / tests / reminders =====
CREATE TABLE assignments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, subject_id INT NOT NULL, created_by BIGINT NOT NULL,   -- id: unique id of the row · subject_id: subject (subjects.id) · created_by: username who made it
  branch_code VARCHAR(10) NOT NULL, year TINYINT NOT NULL,   -- branch_code: branch (branches.code) · year: study year 1-3
  kind ENUM('Assignment','Test') NOT NULL, title VARCHAR(200) NOT NULL, description TEXT,   -- kind: kind · title: title · description: description
  max_marks DECIMAL(5,2), deadline DATETIME NOT NULL, auto_grade TINYINT(1) DEFAULT 0,   -- max_marks: maximum marks · deadline: deadline · auto_grade: auto grade
  FOREIGN KEY (subject_id) REFERENCES subjects(id), FOREIGN KEY (created_by) REFERENCES faculty(user_id)
);
-- Work handed in by students.
CREATE TABLE submissions (
  assignment_id BIGINT NOT NULL, student_id BIGINT NOT NULL,   -- assignment_id: assignment id · student_id: the student (students.id)
  file_id BIGINT NULL, answer_text MEDIUMTEXT, submitted_at DATETIME,   -- file_id: stored file (stored_files.id) · answer_text: answer text · submitted_at: when it was handed in
  score DECIMAL(5,2), graded_at DATETIME,   -- score: score · graded_at: graded at
  PRIMARY KEY (assignment_id, student_id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id), FOREIGN KEY (student_id) REFERENCES students(user_id)
);
-- 3 reminders before deadline; a job sends only to students with no submission
CREATE TABLE reminders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, assignment_id BIGINT NOT NULL, student_id BIGINT NOT NULL,   -- id: unique id of the row · assignment_id: assignment id · student_id: the student (students.id)
  reminder_no TINYINT NOT NULL, send_at DATETIME NOT NULL, sent_at DATETIME NULL,   -- reminder_no: reminder no · send_at: send at · sent_at: sent at
  UNIQUE (assignment_id, student_id, reminder_no),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id), FOREIGN KEY (student_id) REFERENCES students(user_id)
);
-- In-app notifications.
CREATE TABLE notifications (                    -- private: shown only to recipient_id
  id BIGINT PRIMARY KEY AUTO_INCREMENT, recipient_id BIGINT NOT NULL,   -- id: unique id of the row · recipient_id: recipient id
  title VARCHAR(200) NOT NULL, body VARCHAR(500), kind VARCHAR(30),   -- title: title · body: message text · kind: kind
  is_read TINYINT(1) DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,   -- is_read: is read · created_at: when the row was made
  INDEX (recipient_id, is_read), FOREIGN KEY (recipient_id) REFERENCES users(id)
);
-- Phone push tokens.
CREATE TABLE push_tokens (user_id BIGINT NOT NULL, token VARCHAR(300) PRIMARY KEY, platform VARCHAR(20),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);

-- ===== 7. Doubts / Q&A / mock tests =====
CREATE TABLE doubts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, student_id BIGINT NOT NULL, subject_id INT NOT NULL,   -- id: unique id of the row · student_id: the student (students.id) · subject_id: subject (subjects.id)
  expert_faculty_id BIGINT NULL, title VARCHAR(200) NOT NULL, details TEXT,   -- expert_faculty_id: expert faculty id · title: title · details: details
  status ENUM('Pending','In Discussion','Resolved') DEFAULT 'Pending', asked_at DATETIME DEFAULT CURRENT_TIMESTAMP,   -- status: current status · asked_at: asked at
  FOREIGN KEY (student_id) REFERENCES students(user_id), FOREIGN KEY (subject_id) REFERENCES subjects(id)
);
-- Replies to doubts.
CREATE TABLE doubt_replies (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, doubt_id BIGINT NOT NULL, sender_id BIGINT NOT NULL,   -- id: unique id of the row · doubt_id: the doubt (doubts.id) · sender_id: sender id
  message TEXT NOT NULL, sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,   -- message: message text · sent_at: sent at
  FOREIGN KEY (doubt_id) REFERENCES doubts(id) ON DELETE CASCADE
);
-- Mock interview / quiz attempts.
CREATE TABLE mock_attempts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, student_id BIGINT NOT NULL, subject_id INT,   -- id: unique id of the row · student_id: the student (students.id) · subject_id: subject (subjects.id)
  total_q SMALLINT, correct_q SMALLINT, difficulty_level TINYINT, taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,   -- total_q: total q · correct_q: correct q · difficulty_level: difficulty level · taken_at: taken at
  FOREIGN KEY (student_id) REFERENCES students(user_id)
);

-- ===== 8. Placement, alumni, mentorship =====
CREATE TABLE companies (
  id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(150) NOT NULL, branch_code VARCHAR(10) NOT NULL,   -- id: unique id of the row · name: full name · branch_code: branch (branches.code)
  sector VARCHAR(80), roles_offered VARCHAR(255), package_lpa DECIMAL(5,2), location VARCHAR(120),   -- sector: sector · roles_offered: roles offered · package_lpa: package lpa · location: place
  eligibility VARCHAR(255), website VARCHAR(200), FOREIGN KEY (branch_code) REFERENCES branches(code)   -- eligibility: eligibility · website: website
);
-- Interview question bank.
CREATE TABLE placement_questions (              -- 200-300 company-wise Q&A
  id INT PRIMARY KEY AUTO_INCREMENT, company_id INT NULL, branch_code VARCHAR(10),   -- id: unique id of the row · company_id: company (companies.id) · branch_code: branch (branches.code)
  question TEXT NOT NULL, answer TEXT, FOREIGN KEY (company_id) REFERENCES companies(id)   -- question: question text · answer: model answer
);
-- Student applications to drives.
CREATE TABLE placement_applications (
  student_id BIGINT NOT NULL, company_id INT NOT NULL,   -- student_id: the student (students.id) · company_id: company (companies.id)
  status ENUM('Applied','Shortlisted','Interview','Selected','Rejected') DEFAULT 'Applied',   -- status: current status
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (student_id, company_id),   -- applied_at: when the student applied
  FOREIGN KEY (student_id) REFERENCES students(user_id), FOREIGN KEY (company_id) REFERENCES companies(id)
);
-- Former students (alumni).
CREATE TABLE alumni (
  id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(120) NOT NULL, passout_year SMALLINT, branch_code VARCHAR(10),   -- id: unique id of the row · name: full name · passout_year: passout year · branch_code: branch (branches.code)
  company VARCHAR(150), designation VARCHAR(100), contact VARCHAR(150), open_to_mentor TINYINT(1) DEFAULT 1   -- company: company name · designation: designation, e.g. Lecturer · contact: contact · open_to_mentor: open to mentor
);
-- Alumni mentoring students.
CREATE TABLE mentorships (
  id INT PRIMARY KEY AUTO_INCREMENT, alumni_id INT NOT NULL, student_id BIGINT NOT NULL,   -- id: unique id of the row · alumni_id: alumni id · student_id: the student (students.id)
  topic VARCHAR(200), status ENUM('Requested','Active','Completed') DEFAULT 'Requested',   -- topic: topic taught · status: current status
  FOREIGN KEY (alumni_id) REFERENCES alumni(id), FOREIGN KEY (student_id) REFERENCES students(user_id)
);

-- ===== 9. Files (photos, documents), audit, offline sync =====
CREATE TABLE files (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, kind ENUM('photo','document','resume','submission'),   -- id: unique id of the row · owner_id: owner id · kind: kind
  storage_url VARCHAR(500) NOT NULL, mime VARCHAR(80), size_bytes INT, uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,   -- storage_url: storage url · mime: mime · size_bytes: size bytes · uploaded_at: uploaded at
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
ALTER TABLE users ADD FOREIGN KEY (photo_file_id) REFERENCES files(id);
-- Security / audit log.
CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, actor_id BIGINT, action VARCHAR(40), entity VARCHAR(40), entity_id VARCHAR(40),   -- id: unique id of the row · actor_id: actor id · action: what was done · entity: kind of thing (student, test ...) · entity_id: id of that thing
  old_value JSON, new_value JSON, ip VARCHAR(45), at DATETIME DEFAULT CURRENT_TIMESTAMP, INDEX (entity, entity_id)   -- old_value: old value · new_value: new value · ip: IP address · at: when
);
-- Changes waiting to be sent from offline devices.
CREATE TABLE sync_queue (                       -- offline changes replayed when server is back
  id BIGINT PRIMARY KEY AUTO_INCREMENT, client_id VARCHAR(60), user_id BIGINT, op ENUM('insert','update','delete'),   -- id: unique id of the row · client_id: client id · user_id: the user (users.id) · op: op
  entity VARCHAR(40), payload JSON, created_at DATETIME, synced_at DATETIME NULL   -- entity: kind of thing (student, test ...) · payload: data waiting to be sent (JSON) · created_at: when the row was made · synced_at: when it reached the server
);

-- ===== Seed essentials =====
INSERT INTO roles VALUES (1,'admin'),(2,'faculty'),(3,'student');
INSERT INTO branches VALUES ('CSE','Computer Science & Engineering'),('CIVIL','Civil Engineering');
INSERT INTO academic_years (label,start_date,end_date,is_current) VALUES ('2025-26','2025-07-01','2026-06-30',0),('2026-27','2026-07-01','2027-06-30',1);
INSERT INTO permissions (role_id,resource,can_read,can_create,can_update,can_delete) VALUES
 (1,'students',1,1,1,1),(1,'faculty',1,1,1,1),(1,'curriculum',1,1,1,1),(1,'attendance',1,1,1,1),(1,'marks',1,1,1,1),
 (2,'students',1,1,0,0),(2,'attendance',1,1,1,0),(2,'marks',1,1,1,0),(2,'assignments',1,1,1,1),
 (3,'students',1,0,0,0),(3,'marks',1,0,0,0),(3,'attendance',1,0,0,0),(3,'doubts',1,1,0,0);
