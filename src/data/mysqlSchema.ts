// Rebuilt file: the original src/data folder was missing from the step-16 zip.
// Staff and subjects come from server/db/seed-staff.json and seed-subjects.json.
// Sample content that cannot be recovered (syllabus topics, demo quizzes, videos, placement figures) is left empty or zero.
export interface ColumnDefinition { name: string; type: string; key: string; nullable: boolean; defaultVal: string | null; description: string }
export interface TableDefinition { tableName: string; category: string; description: string; columns: ColumnDefinition[] }

// Generated from server/db/schema.sql (the tables the app really uses).
export const MYSQL_TABLES_SCHEMA: TableDefinition[] = [
 {
  "tableName": "students",
  "category": "Core Academic",
  "description": "Students table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "aadhar_enc",
    "type": "TEXT,",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "branch",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "year",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "'Regular'",
    "description": ""
   },
   {
    "name": "category",
    "type": "TEXT,",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "record_status",
    "type": "TEXT",
    "key": "",
    "nullable": true,
    "defaultVal": "'Active",
    "description": ""
   },
   {
    "name": "created_at",
    "type": "TEXT",
    "key": "",
    "nullable": true,
    "defaultVal": "CURRENT_TIMESTAMP",
    "description": ""
   }
  ]
 },
 {
  "tableName": "semester_results",
  "category": "Core Academic",
  "description": "Semester results table",
  "columns": [
   {
    "name": "student_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "percentage",
    "type": "REAL,",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "year_results",
  "category": "Core Academic",
  "description": "Year results table",
  "columns": [
   {
    "name": "student_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "percentage",
    "type": "REAL,",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "status_history",
  "category": "Core Academic",
  "description": "Status history table",
  "columns": [
   {
    "name": "id",
    "type": "INTEGER",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "status",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "CURRENT_TIMESTAMP",
    "description": ""
   }
  ]
 },
 {
  "tableName": "audit_logs",
  "category": "Audit Logs",
  "description": "Audit logs table",
  "columns": [
   {
    "name": "id",
    "type": "INTEGER",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "detail",
    "type": "TEXT,",
    "key": "",
    "nullable": true,
    "defaultVal": "CURRENT_TIMESTAMP",
    "description": ""
   }
  ]
 },
 {
  "tableName": "users",
  "category": "Authentication & Security",
  "description": "Users table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "username",
    "type": "TEXT",
    "key": "UNI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "role",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "name",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "email",
    "type": "TEXT,",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "student_id",
    "type": "TEXT",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "password_hash",
    "type": "TEXT,",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "must_change_password",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   },
   {
    "name": "failed_attempts",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   },
   {
    "name": "locked_until",
    "type": "INTEGER,",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "is_active",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "1",
    "description": ""
   },
   {
    "name": "last_login_at",
    "type": "TEXT",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "created_at",
    "type": "TEXT",
    "key": "",
    "nullable": true,
    "defaultVal": "CURRENT_TIMESTAMP",
    "description": ""
   }
  ]
 },
 {
  "tableName": "sessions",
  "category": "Authentication & Security",
  "description": "Sessions table",
  "columns": [
   {
    "name": "id_hash",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "created_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "ip",
    "type": "TEXT,",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "faculty_subject_assignments",
  "category": "Core Academic",
  "description": "Faculty subject assignments table",
  "columns": [
   {
    "name": "user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "subject_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "parent_student_links",
  "category": "Core Academic",
  "description": "Parent student links table",
  "columns": [
   {
    "name": "parent_user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "student_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "relation",
    "type": "TEXT,",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "subjects",
  "category": "Core Academic",
  "description": "Subjects table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "branch",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "credits",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   },
   {
    "name": "created_at",
    "type": "TEXT",
    "key": "",
    "nullable": true,
    "defaultVal": "CURRENT_TIMESTAMP",
    "description": ""
   }
  ]
 },
 {
  "tableName": "tests",
  "category": "Evaluations",
  "description": "Tests table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "subject_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "max_marks",
    "type": "REAL",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "date",
    "type": "TEXT,",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "status",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "'Upcoming'",
    "description": ""
   },
   {
    "name": "branch",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "created_by",
    "type": "TEXT,",
    "key": "",
    "nullable": true,
    "defaultVal": "CURRENT_TIMESTAMP",
    "description": ""
   }
  ]
 },
 {
  "tableName": "test_marks",
  "category": "Evaluations",
  "description": "Test marks table",
  "columns": [
   {
    "name": "test_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "student_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "marks_obtained",
    "type": "REAL",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "remarks",
    "type": "TEXT,",
    "key": "",
    "nullable": true,
    "defaultVal": "CURRENT_TIMESTAMP",
    "description": ""
   }
  ]
 },
 {
  "tableName": "attendance_sessions",
  "category": "Attendance",
  "description": "Attendance sessions table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "subject_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "faculty_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "branch",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "date",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "qr_token",
    "type": "TEXT",
    "key": "UNI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "status",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "'Active'",
    "description": ""
   },
   {
    "name": "expires_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "attendance_records",
  "category": "Attendance",
  "description": "Attendance records table",
  "columns": [
   {
    "name": "session_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "student_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "status",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "marked_via",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "marked_by",
    "type": "TEXT,",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "marks_access_grants",
  "category": "Evaluations",
  "description": "Marks access grants table",
  "columns": [
   {
    "name": "owner_user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "grantee_user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "granted_by",
    "type": "TEXT,",
    "key": "",
    "nullable": true,
    "defaultVal": "CURRENT_TIMESTAMP",
    "description": ""
   }
  ]
 },
 {
  "tableName": "user_mfa",
  "category": "Authentication & Security",
  "description": "User mfa table",
  "columns": [
   {
    "name": "user_id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "secret_enc",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "enabled",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   },
   {
    "name": "last_step",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   },
   {
    "name": "created_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "mfa_recovery_codes",
  "category": "Authentication & Security",
  "description": "Mfa recovery codes table",
  "columns": [
   {
    "name": "user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "code_hash",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "mfa_challenges",
  "category": "Authentication & Security",
  "description": "Mfa challenges table",
  "columns": [
   {
    "name": "id_hash",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "created_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   }
  ]
 },
 {
  "tableName": "consent_records",
  "category": "Authentication & Security",
  "description": "Consent records table",
  "columns": [
   {
    "name": "id",
    "type": "INTEGER",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "subject_user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "actor_user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "purpose",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "granted",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "at",
    "type": "TEXT",
    "key": "",
    "nullable": true,
    "defaultVal": "CURRENT_TIMESTAMP",
    "description": ""
   }
  ]
 },
 {
  "tableName": "sms_otps",
  "category": "Authentication & Security",
  "description": "Sms otps table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "code_hash",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   }
  ]
 },
 {
  "tableName": "notifications",
  "category": "Core Academic",
  "description": "Notifications table",
  "columns": [
   {
    "name": "id",
    "type": "INTEGER",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "kind",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "title",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "dedupe_key",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "created_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "push_state",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "'pending'",
    "description": ""
   },
   {
    "name": "push_attempts",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   }
  ]
 },
 {
  "tableName": "push_subscriptions",
  "category": "Core Academic",
  "description": "Push subscriptions table",
  "columns": [
   {
    "name": "id",
    "type": "INTEGER",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "endpoint",
    "type": "TEXT",
    "key": "UNI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "user_agent",
    "type": "TEXT,",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   }
  ]
 },
 {
  "tableName": "online_tests",
  "category": "Evaluations",
  "description": "Online tests table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "subject_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "branch",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "deadline_date",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "total_marks",
    "type": "REAL",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "created_by",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "status",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "'active'",
    "description": ""
   },
   {
    "name": "reminders_sent",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   },
   {
    "name": "created_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "online_test_questions",
  "category": "Evaluations",
  "description": "Online test questions table",
  "columns": [
   {
    "name": "test_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "question",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "correct_index",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "online_test_submissions",
  "category": "Evaluations",
  "description": "Online test submissions table",
  "columns": [
   {
    "name": "test_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "student_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "score",
    "type": "REAL,",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "answers",
    "type": "TEXT,",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "attempts",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "1",
    "description": ""
   }
  ]
 },
 {
  "tableName": "notices",
  "category": "Core Academic",
  "description": "Notices table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "title",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "category",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "priority",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "content",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "published_by",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "target_branch",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "'All'",
    "description": ""
   },
   {
    "name": "target_semesters",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "'[]'",
    "description": ""
   },
   {
    "name": "created_by_user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "direct_notices",
  "category": "Core Academic",
  "description": "Direct notices table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "student_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "title",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "priority",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "sent_by_user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "created_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "doubts",
  "category": "Core Academic",
  "description": "Doubts table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "student_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "subject_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "branch",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "title",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "status",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "'Pending'",
    "description": ""
   },
   {
    "name": "created_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "doubt_replies",
  "category": "Core Academic",
  "description": "Doubt replies table",
  "columns": [
   {
    "name": "id",
    "type": "INTEGER",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "doubt_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "sender_user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "sender_name",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "text",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "stored_files",
  "category": "Class & Subject Dispatch",
  "description": "Stored files table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "original_name",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "mime",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "size",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "uploaded_by",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "attached_to",
    "type": "TEXT",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "materials",
  "category": "Class & Subject Dispatch",
  "description": "Materials table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "title",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "''",
    "description": ""
   },
   {
    "name": "kind",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "category",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "subject_id",
    "type": "TEXT",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "branch",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "'All'",
    "description": ""
   },
   {
    "name": "semester",
    "type": "INTEGER,",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "file_id",
    "type": "TEXT",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "tags",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "'[]'",
    "description": ""
   },
   {
    "name": "uploaded_by_user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "download_count",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   },
   {
    "name": "created_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "dispatches",
  "category": "Class & Subject Dispatch",
  "description": "Dispatches table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "subject_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "type",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "title",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "''",
    "description": ""
   },
   {
    "name": "file_id",
    "type": "TEXT",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "due_date",
    "type": "TEXT,",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "sent_by_user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "created_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "dispatch_submissions",
  "category": "Class & Subject Dispatch",
  "description": "Dispatch submissions table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "dispatch_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "student_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "content",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "''",
    "description": ""
   },
   {
    "name": "file_id",
    "type": "TEXT",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "submitted_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "1",
    "description": ""
   },
   {
    "name": "marks",
    "type": "REAL,",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "placement_drives",
  "category": "Core Academic",
  "description": "Placement drives table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "title",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "branch",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "type",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "ctc",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "''",
    "description": ""
   },
   {
    "name": "deadline",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "vacancies",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "1",
    "description": ""
   },
   {
    "name": "description",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "''",
    "description": ""
   },
   {
    "name": "min_percentage",
    "type": "REAL",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   },
   {
    "name": "selection_process",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "'[]'",
    "description": ""
   },
   {
    "name": "apply_url",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "''",
    "description": ""
   },
   {
    "name": "is_active",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "1",
    "description": ""
   },
   {
    "name": "posted_by_user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "created_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "placement_applications",
  "category": "Core Academic",
  "description": "Placement applications table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "drive_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "student_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "applied_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "status",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "'Applied'",
    "description": ""
   },
   {
    "name": "status_by",
    "type": "TEXT,",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "placement_jobs",
  "category": "Core Academic",
  "description": "Placement jobs table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "title",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "branch",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "job_type",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "exam_or_post",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "''",
    "description": ""
   },
   {
    "name": "vacancies",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   },
   {
    "name": "official_link",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "''",
    "description": ""
   },
   {
    "name": "application_deadline",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "''",
    "description": ""
   },
   {
    "name": "is_active",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "1",
    "description": ""
   },
   {
    "name": "posted_by_user_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "created_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   }
  ]
 },
 {
  "tableName": "chat_threads",
  "category": "Core Academic",
  "description": "Chat threads table",
  "columns": [
   {
    "name": "id",
    "type": "TEXT",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "user_lo",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "user_hi",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "student_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "''",
    "description": ""
   },
   {
    "name": "created_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "last_read_lo",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   },
   {
    "name": "last_read_hi",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": "0",
    "description": ""
   }
  ]
 },
 {
  "tableName": "chat_messages",
  "category": "Core Academic",
  "description": "Chat messages table",
  "columns": [
   {
    "name": "id",
    "type": "INTEGER",
    "key": "PRI",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "thread_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "sender_id",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "kind",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "body",
    "type": "TEXT",
    "key": "",
    "nullable": false,
    "defaultVal": "''",
    "description": ""
   },
   {
    "name": "file_id",
    "type": "TEXT,",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "duration_ms",
    "type": "INTEGER,",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "created_at",
    "type": "INTEGER",
    "key": "",
    "nullable": false,
    "defaultVal": null,
    "description": ""
   },
   {
    "name": "deleted_at",
    "type": "INTEGER",
    "key": "",
    "nullable": true,
    "defaultVal": null,
    "description": ""
   }
  ]
 }
];

export function generateMySQLDump(): string {
  const lines: string[] = ['-- UGIP Portal schema (generated)', ''];
  for (const t of MYSQL_TABLES_SCHEMA) {
    lines.push(`CREATE TABLE \`${t.tableName}\` (`);
    lines.push(t.columns.map((c) => `  \`${c.name}\` ${c.type}${c.nullable ? '' : ' NOT NULL'}${c.key === 'PRI' ? ' PRIMARY KEY' : ''}${c.defaultVal !== null ? ' DEFAULT ' + c.defaultVal : ''}`).join(',\n'));
    lines.push(');', '');
  }
  return lines.join('\n');
}
