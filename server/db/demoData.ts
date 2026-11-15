// =====================================================================================================
// Real data from the college's papers + RANDOM sample data (Step 18)
// -----------------------------------------------------------------------------------------------------
// Two separate things live in this file:
//
// 1) importRealData()  - REAL data typed in from the college's scanned papers (server/db/seed-real-2025-26.json):
//      * 37 CSE students of batch 2024-27 / lateral 2025-27 (name, father's name, date of birth)
//      * their UBTER 3rd-semester board result 2025-26 (Winter), subject by subject
//      * the RDBMS sessional record 2025-26 (CT-1..CT-5, MCQ-1..MCQ-5, each out of 10)
//      * the 18 practicals of the "Computer Hardware" practical file
//    Runs ONCE per database (remembered in app_settings), never overwrites something already there.
//
// 2) seedDemoData()    - RANDOM sample data, because real marks of the current 1st and 2nd year are not available yet:
//      * 1st year (admitted 2026) and 2nd year (admitted 2025) students of CSE and Civil
//      * exams (Sessional 1 & 2, class tests, assignment, practical/viva) with marks
//      * attendance sessions, practical records, online assignments with submissions
//      * last year's (2025-26) exams + board results for today's 2nd year, so the multi-year history can be seen
//    Every row made here has is_demo = 1 (or belongs to a demo student) and is shown with a "Sample" badge.
//    The admin removes ALL of it with one button (Admin -> Academic Year -> "Delete sample data").
//    Switch it off before the first start with DEMO_DATA=0 in .env.
//
// The random numbers come from a fixed seed, so every installation gets the same sample data.
// =====================================================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './connection';
import { saveStudent } from './studentsRepo';
import { getSetting, setSetting } from '../academic/promotion';
import { academicYearOf, semesterFor, startYearOf, yearLabel } from '../academic/calendar';


const here = path.dirname(fileURLToPath(import.meta.url));

// ---------------- small helpers ----------------

/** Repeatable pseudo-random numbers (mulberry32). Same seed -> same "random" data on every computer. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Data shape: rand.
type Rand = () => number;
const pick = <T,>(r: Rand, list: T[]): T => list[Math.floor(r() * list.length)];
// Clamp.
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Marks for a student of `ability` (0..1) in an exam out of `max`, rounded to 0.5. */
const marksFor = (r: Rand, ability: number, max: number) => Math.round(clamp(ability + (r() - 0.5) * 0.35, 0.05, 1) * max * 2) / 2;
// Pad.
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
// Id.
const id = (prefix: string, r: Rand) => `${prefix}-${Math.floor(r() * 36 ** 8).toString(36).padStart(8, '0')}`;

/** Academic-calendar date 'YYYY-MM-DD' inside the semester: odd semesters Aug..Nov, even semesters Feb..Apr. */
function semesterDate(r: Rand, ayStart: number, even: boolean, latest?: string): string {
  const y = even ? ayStart + 1 : ayStart;
  const months = even ? [2, 3, 4] : [8, 9, 10, 11];
  // pick a random day; if it falls after "latest" (today), try again a few times so dates stay spread out
  for (let i = 0; i < 12; i++) {
    const d = `${y}-${pad(pick(r, months))}-${pad(1 + Math.floor(r() * 27))}`;
    if (!latest || d <= latest) return d;
  }
  return latest!;                                        // never in the future
}
// Today str.
const todayStr = () => new Date().toISOString().slice(0, 10);

/** The faculty member assigned to a subject (or the admin if nobody is). Needed because some tables require a real user. */
function teacherOf(subjectId: string): { id: string; name: string } {
  const r = db.prepare(`SELECT u.id, u.name FROM faculty_subject_assignments a JOIN users u ON u.id=a.user_id WHERE a.subject_id=? LIMIT 1`).get(subjectId) as any;
  if (r) return r;
  return (db.prepare("SELECT id, name FROM users WHERE role='admin' ORDER BY created_at LIMIT 1").get() as any) || { id: 'usr-admin-1', name: 'Admin' };
}

/** Subjects of a class that get exams / attendance (General Proficiency and Industrial Exposure are graded differently). */
function teachingSubjects(branch: string, semester: number): any[] {
  return (db.prepare('SELECT * FROM subjects WHERE branch=? AND semester=? ORDER BY code').all(branch, semester) as any[])
    .filter((s) => !/proficiency|industrial exposure/i.test(s.name));
}

/** Write "student was in this class during that academic year" (keeps an existing row). */
function remember(studentId: string, ay: string, branch: string, year: number, semester: number, status = 'Active / Enrolled') {
  db.prepare('INSERT OR IGNORE INTO student_class_history (student_id,academic_year,branch,year,semester,record_status) VALUES (?,?,?,?,?,?)')
    .run(studentId, ay, branch, year, semester, status);
}

// =====================================================================================================
// 1) REAL DATA
// =====================================================================================================

/** The 18 practicals of the "COMPUTER HARDWARE1 PRA" practical file (titles + aims as written in the file). */
const HARDWARE_PRACTICALS: [string, string][] = [
  ['Identification of system layout: front panel indicators, switches, front and rear connectors; positions of SMPS, motherboard, HDD, DVD and add-on cards; BIOS setup and troubleshooting', 'To study the layout of a computer system, identify its components and configure / troubleshoot using the BIOS setup utility.'],
  ['Install hard disk, configure CMOS setup, partition and format hard disk, identify master / slave / IDE devices, practice ScanDisk, disk cleanup, defragmentation and virus scan', 'To install and prepare a hard disk and keep it healthy using standard disk utilities.'],
  ['Install and configure a DVD writer and a Blu-ray disc writer; record a DVD and a Blu-ray disc', 'To install optical drives and record data on DVD / Blu-ray media.'],
  ['Printer installation and servicing: install and configure dot-matrix and laser printers; troubleshoot the printers', 'To install, configure and troubleshoot dot-matrix and laser printers.'],
  ['Assemble a system with add-on cards, check its working condition and install dual operating systems', 'To assemble a complete computer system and install two operating systems on it.'],
  ['Identification of basic mobile phone components; study of ICs and switches in the network and power sections of a mobile PCB', 'To identify the parts of a mobile phone and the functions of ICs in its network and power sections.'],
  ['Assembling and disassembling of mobile phones; fault finding in earpiece, microphone, keypad and display sections', 'To assemble / disassemble a mobile phone and troubleshoot common faults.'],
  ['Flashing, unlocking and formatting memory cards in mobile phones', 'To flash firmware, unlock a handset and format memory cards safely.'],
  ['Cable crimping: standard (straight-through) cabling, cross cabling, I/O connector crimping and testing with a cable tester', 'To make and test straight-through and crossover network cables.'],
  ['Configure host IP address, subnet mask and default gateway; configure Internet connection and use IPCONFIG, PING, TRACERT and NETSTAT', 'To configure TCP/IP on a host and test connectivity with network commands.'],
  ['Install and configure hub, switch and router; install and configure wired and wireless NIC', 'To set up basic network devices and network interface cards.'],
  ['Transfer files between systems in a LAN using FTP; install a printer in the LAN and share it', 'To share files and a printer over a local area network.'],
  ['Installation of Windows Server 2008 / 2012', 'To install a Windows server operating system.'],
  ['Installation and configuration of DHCP server', 'To install a DHCP server and give IP addresses to clients automatically.'],
  ['Installation and configuration of mail server', 'To install and configure a mail server and send / receive e-mail between computers.'],
  ['Installation of Red Hat Linux using VMware', 'To install Red Hat Linux in a virtual machine.'],
  ['Configuring and troubleshooting of /etc/grub.conf', 'To understand and repair the GRUB boot-loader configuration.'],
  ['Configuring and troubleshooting of /etc/grub.conf (part b) and boot recovery', 'To recover a Linux system that does not boot because of a GRUB problem.'],
];

// Import real data.
export function importRealData(): string[] {
  const done: string[] = [];
  const file = path.join(here, 'seed-real-2025-26.json');
  if (!fs.existsSync(file)) return done;
  if (getSetting('real_data_2025_26') === 'done') return done;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ayNow = academicYearOf();

  db.exec('BEGIN');
  try {
    // --- students: add the missing ones, complete the existing ones (never overwrite a value already typed in) ---
    let added = 0, fixed = 0;
    for (const s of data.students) {
      const cur = db.prepare('SELECT * FROM students WHERE roll_no=?').get(s.rollNo) as any;
      const sid = cur ? cur.id : 'stu-' + s.rollNo;
      if (!cur) {
        // Batch 2024-27 (regular) and 2025-27 (lateral) are both in the 3rd year in 2026-27.
        const year = clamp(startYearOf(ayNow) - Number(s.batch.slice(0, 4)) + (s.entryType === 'Lateral' ? 2 : 1), 1, 3);
        saveStudent({ id: sid, rollNo: s.rollNo, name: s.name, fatherName: s.fatherName, branch: 'CSE', year, semester: semesterFor(year),
          batch: s.batch, entryType: s.entryType } as any, 'import');
        added++;
      } else if (cur.branch !== 'CSE') {
        // The UBTER cross list (branch 05 - CSE) is the official record: correct the branch once.
        db.prepare('UPDATE students SET branch=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run('CSE', sid);
        fixed++;
      }
      db.prepare('UPDATE students SET dob=COALESCE(dob,?), father=COALESCE(father,?), admission_year=COALESCE(admission_year,?) WHERE id=?')
        .run(s.dob, s.fatherName, Number(s.batch.slice(0, 4)), sid);
      // Class history: 2025-26 = 2nd year (semesters 3 and 4); regular students were in 1st year in 2024-25.
      remember(sid, '2025-26', 'CSE', 2, 4);
      if (s.entryType !== 'Lateral') remember(sid, '2024-25', 'CSE', 1, 2);
    }
    done.push(`Real students: ${added} added, ${fixed} branch corrected to CSE (as on the UBTER cross list)`);

    // --- UBTER 3rd semester board results ---
    let results = 0;
    for (const r of data.boardResults) {
      const sid = (db.prepare('SELECT id FROM students WHERE roll_no=?').get(r.rollNo) as any)?.id;
      if (!sid || db.prepare('SELECT 1 FROM board_results WHERE student_id=? AND semester=? AND exam_session=?').get(sid, r.semester, r.examSession)) continue;
      const rid = 'res-real-' + r.rollNo + '-s' + r.semester;
      db.prepare(`INSERT INTO board_results (id,student_id,semester,exam_session,theory_total,practical_total,gp,ie,sem_total,max_total,sgpa,result,promoted,back_papers,remarks,created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(rid, sid, r.semester, r.examSession, r.theoryTotal, r.practicalTotal, r.gp, r.ie, r.semTotal, r.maxTotal,
        r.sgpa, r.result, r.promoted === true ? 1 : r.promoted === false ? 0 : null, r.backPapers, r.remarks, 'import');
      for (const s of r.subjects) {
        db.prepare(`INSERT INTO board_result_subjects (result_id,subject_code,subject_name,theory,practical,theory_note,practical_note,grade,grade_point) VALUES (?,?,?,?,?,?,?,?,?)`)
          .run(rid, s.code, s.name, s.theory, s.practical, s.theoryNote || null, s.practicalNote || null, s.grade, s.gradePoint);
      }
      // keep the simple semester table (profile, placement eligibility) in step: percentage = total / 1000
      db.prepare(`INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (?,?,?,?)
        ON CONFLICT(student_id,semester) DO UPDATE SET percentage=excluded.percentage, cgpa=COALESCE(excluded.cgpa, cgpa)`)
        .run(sid, r.semester, Math.round((r.semTotal / r.maxTotal) * 1000) / 10, r.sgpa);
      results++;
    }
    done.push(`UBTER 3rd semester results: ${results}`);

    // --- RDBMS sessional record 2025-26 (CSE semester 4): 10 tests, each out of 10 ---
    const rd = data.rdbmsSessional;
    const subj = db.prepare('SELECT id FROM subjects WHERE id=?').get('sub-cse-rdbms') as any;
    if (subj && !db.prepare("SELECT 1 FROM tests WHERE id LIKE 'tst-real-rdbms-%'").get()) {
      rd.tests.forEach((title: string, i: number) => {
        const tid = `tst-real-rdbms-${i + 1}`;
        const date = `2026-${pad(2 + Math.floor(i / 4))}-${pad(5 + (i % 4) * 6)}`;   // spread over Feb..Apr 2026
        db.prepare(`INSERT INTO tests (id,title,type,subject_id,max_marks,date,status,branch,semester,created_by,academic_year,instructions)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(tid, `RDBMS ${title}`, title.startsWith('MCQ') ? 'MCQ Test' : 'Class Test', 'sub-cse-rdbms', rd.maxEach, date,
          'Completed', 'CSE', rd.semester, 'import', rd.academicYear, 'From the RDBMS sessional marks record 2025-26 (best four tests count for 40).');
        for (const row of rd.rows) {
          const sid = (db.prepare('SELECT id FROM students WHERE roll_no=?').get(row.rollNo) as any)?.id;
          if (sid) db.prepare('INSERT OR IGNORE INTO test_marks (test_id,student_id,marks_obtained,updated_by) VALUES (?,?,?,?)').run(tid, sid, row.marks[i], 'import');
        }
      });
      done.push('RDBMS sessional marks 2025-26: 10 tests');
    }

    // --- Computer Hardware practical file: 18 practicals (real titles, no marks) ---
    if (db.prepare('SELECT 1 FROM subjects WHERE id=?').get('sub-cse-hw') && !db.prepare("SELECT 1 FROM practical_experiments WHERE id LIKE 'prc-real-hw-%'").get()) {
      const sub = db.prepare('SELECT * FROM subjects WHERE id=?').get('sub-cse-hw') as any;
      HARDWARE_PRACTICALS.forEach(([title, aim], i) => {
        db.prepare(`INSERT INTO practical_experiments (id,subject_id,branch,semester,academic_year,experiment_no,title,details,max_marks,created_by,created_by_name)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(`prc-real-hw-${i + 1}`, sub.id, sub.branch, sub.semester, ayNow, i + 1, title,
          JSON.stringify({ objective: aim, apparatus: [], procedureSteps: [], vivaQuestions: [], inputType: 'typed' }), 10, 'import', 'Practical file (Computer Hardware)');
      });
      done.push('Computer Hardware practicals: 18');
    }
    setSetting('real_data_2025_26', 'done');
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return done;
}

// =====================================================================================================
// 2) RANDOM SAMPLE DATA
// =====================================================================================================

const FIRST = { m: ['Aarav', 'Aditya', 'Akash', 'Aman', 'Ankit', 'Arjun', 'Ayush', 'Bhupesh', 'Deepak', 'Devendra', 'Gaurav', 'Harish', 'Himanshu', 'Kamal', 'Karan', 'Lalit', 'Manish', 'Mohit', 'Naveen', 'Nitin', 'Pankaj', 'Pawan', 'Rahul', 'Rajat', 'Rohit', 'Sachin', 'Sandeep', 'Saurabh', 'Shubham', 'Sumit', 'Tarun', 'Vikas', 'Vivek', 'Yogesh'],
  f: ['Aarti', 'Anjali', 'Ankita', 'Bhawna', 'Deepa', 'Divya', 'Ekta', 'Garima', 'Isha', 'Jyoti', 'Kajal', 'Kanchan', 'Kavita', 'Khushi', 'Komal', 'Manisha', 'Meenakshi', 'Neha', 'Nisha', 'Pooja', 'Priya', 'Rashmi', 'Riya', 'Sakshi', 'Shalini', 'Shivani', 'Simran', 'Sneha', 'Tanuja', 'Vandana'] };
const LAST = ['Adhikari', 'Bhatt', 'Bisht', 'Bohra', 'Chand', 'Chauhan', 'Joshi', 'Kapri', 'Karki', 'Kumar', 'Mahara', 'Negi', 'Pandey', 'Pant', 'Rana', 'Rawat', 'Samant', 'Singh', 'Tamta', 'Tiwari', 'Upadhyay', 'Verma', 'Bora', 'Dhami', 'Kunwar'];
const FATHER = ['Ramesh', 'Suresh', 'Mahesh', 'Dinesh', 'Rajendra', 'Mohan', 'Govind', 'Harish', 'Prakash', 'Kailash', 'Bhagwan', 'Narendra', 'Trilok', 'Jagdish', 'Kundan', 'Bhuwan'];
const MOTHER = ['Sunita', 'Geeta', 'Kamla', 'Anita', 'Pushpa', 'Janki', 'Basanti', 'Hema', 'Laxmi', 'Radha', 'Saraswati', 'Kamla', 'Meena'];
const PLACES = ['Tanakpur, Champawat', 'Banbasa, Champawat', 'Lohaghat, Champawat', 'Champawat', 'Khatima, Udham Singh Nagar', 'Sitarganj, Udham Singh Nagar', 'Pithoragarh', 'Tanakpur, Champawat', 'Chalthi, Champawat', 'Pati, Champawat'];
const CATEGORIES = ['General', 'General', 'General', 'OBC', 'OBC', 'SC', 'SC', 'ST', 'EWS'];

/** Practical titles per subject code for the sample data (first-year labs + a few CSE / Civil labs). */
const SAMPLE_LABS: Record<string, string[]> = {
  '991001': ['Self introduction and listening practice', 'Group discussion on a current topic', 'Formal letter and application writing', 'Presentation skills practice'],
  '991003': ['Vernier calipers: measure diameter of a cylinder', 'Screw gauge: thickness of a glass plate', 'Simple pendulum: value of g', 'Verification of Hooke\'s law'],
  '991004': ['Preparation of standard solution', 'Titration: acid-base (NaOH vs HCl)', 'Determination of hardness of water (EDTA)', 'pH of given samples'],
  '991005': ['Parts of a computer and booting', 'MS Word: format a letter', 'MS Excel: marks sheet with formulas', 'Internet, e-mail and safe browsing'],
  '991006': ['Lettering and dimensioning', 'Geometrical constructions', 'Orthographic projections of simple solids', 'Isometric view of a block'],
  '991007': ['Fitting shop: filing and marking job', 'Carpentry shop: T-joint', 'Welding shop: butt joint', 'Sheet metal: tray making'],
  '25053004': ['HTML page with headings, lists and links', 'Table and form in HTML', 'Style a page with external CSS', 'JavaScript: form validation'],
  '25053005': ['Install a Linux distribution', 'Git: create, commit and push a repository', 'Set up a LAMP stack', 'Fork a project and open a pull request'],
  '25053006': ['Mail merge in MS Word', 'Charts and pivot tables in Excel', 'Slide show with animations', 'Simple database in MS Access'],
  '25053003': ['Basic Linux commands', 'File permissions and users', 'Process management commands', 'Shell script: simple calculator'],
  '25053001': ['Hello world, input and output', 'If-else: largest of three numbers', 'Loops: factorial and Fibonacci', 'Arrays: sort ten numbers', 'Functions and recursion', 'Pointers and strings'],
  '023001': ['Law of parallelogram of forces', 'Lami\'s theorem', 'Friction on an inclined plane', 'Simple screw jack: efficiency'],
  '023003': ['Chain surveying: ranging a line', 'Compass traverse', 'Levelling: fly levelling', 'Plane table: radiation method'],
  '023004': ['Tests on bricks: water absorption', 'Fineness of cement', 'Bulking of sand', 'Workability of concrete: slump test'],
  '023005': ['Plan of a one-room building', 'Elevation and section', 'Doors and windows details', 'Staircase drawing'],
  '023006': ['Verification of Bernoulli\'s theorem', 'Coefficient of discharge: venturimeter', 'Flow through orifice', 'Reynolds experiment'],
  '023.6': ['Study of electrical wiring', 'Measure power with wattmeter', 'Study of a centrifugal pump', 'Study of an IC engine'],
};
const RECORD_STATUSES = ['Completed', 'Completed', 'Completed', 'Completed', 'Pending', 'Needs Revision', 'Absent'];

/** Make the sample students of one class and return [{id, ability}] (ability 0..1 decides their usual marks). */
function makeClass(r: Rand, branch: 'CSE' | 'Civil', admitted: number, count: number, ayNow: string) {
  const year = startYearOf(ayNow) - admitted + 1;           // 2026 -> 1st year in 2026-27, 2025 -> 2nd year
  const sem = semesterFor(year);
  const out: { id: string; ability: number }[] = [];
  for (let i = 1; i <= count; i++) {
    // Roll no like the real ones: YY + 090 (institute) + 05 CSE / 02 Civil + serial  ->  26090050001
    const roll = `${admitted % 100}090${branch === 'CSE' ? '05' : '02'}${String(i).padStart(4, '0')}`;
    if (db.prepare('SELECT 1 FROM students WHERE roll_no=?').get(roll)) continue;        // a real student already has this roll no
    const female = r() < 0.4;
    const last = pick(r, LAST);
    const sid = 'stu-' + roll;
    saveStudent({
      id: sid, rollNo: roll, name: `${pick(r, female ? FIRST.f : FIRST.m)} ${last}`, branch, year, semester: sem,
      batch: `${admitted}-${admitted + 3}`, entryType: 'Regular', gender: female ? 'Female' : 'Male', category: pick(r, CATEGORIES),
      phone: `9${Math.floor(100000000 + r() * 899999999)}`, fatherName: `${pick(r, FATHER)} ${last === 'Kumar' ? 'Prasad' : last}`, motherName: `${pick(r, MOTHER)} Devi`,
      fullAddress: pick(r, PLACES) + ', Uttarakhand', tenthPercentage: Math.round((55 + r() * 40) * 10) / 10, twelfthPercentage: Math.round((50 + r() * 42) * 10) / 10,
    } as any, 'sample-data');
    db.prepare('UPDATE students SET is_demo=1, admission_year=?, dob=? WHERE id=?')
      .run(admitted, `${admitted - 16 - Math.floor(r() * 2)}-${pad(1 + Math.floor(r() * 12))}-${pad(1 + Math.floor(r() * 27))}`, sid);
    remember(sid, ayNow, branch, year, sem);
    if (year >= 2) remember(sid, yearLabel(startYearOf(ayNow) - 1), branch, year - 1, (year - 1) * 2);   // last year's class
    out.push({ id: sid, ability: 0.35 + r() * 0.6 });
  }
  return { students: out, year, sem };
}

/** Exams + marks of one class for one semester of one academic year. */
function makeExams(r: Rand, branch: string, semester: number, ay: string, students: { id: string; ability: number }[]) {
  const ayStart = startYearOf(ay), even = semester % 2 === 0;
  const today = todayStr();
  let n = 0;
  for (const sub of teachingSubjects(branch, semester)) {
    const plan: [string, string, number][] = [
      ['Sessional 1', 'Sessional 1', 30], ['Sessional 2', 'Sessional 2', 30], ['Class Test', 'Class Test 1', 10], ['Class Test', 'Class Test 2', 10], ['Assignment', 'Assignment 1', 10],
    ];
    if (sub.has_practical) plan.push(['Practical / Viva', 'Practical / Viva', 30]);
    for (const [type, title, max] of plan) {
      const tid = id('tst-demo', r);
      const date = semesterDate(r, ayStart, even, ay === academicYearOf() ? today : undefined);
      db.prepare(`INSERT INTO tests (id,title,type,subject_id,max_marks,date,status,branch,semester,created_by,academic_year,is_demo,room)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?)`).run(tid, `${sub.code} ${title}`, type, sub.id, max, date, 'Completed', branch, semester, 'sample-data', ay, `Room ${100 + Math.floor(r() * 20)}`);
      for (const s of students) {
        if (r() < 0.04) continue;                              // a few students were absent: no marks
        db.prepare('INSERT INTO test_marks (test_id,student_id,marks_obtained,updated_by) VALUES (?,?,?,?)').run(tid, s.id, marksFor(r, s.ability, max), 'sample-data');
      }
      n++;
    }
  }
  return n;
}

/** Attendance sessions (closed) with present / absent records for the current semester. */
function makeAttendance(r: Rand, branch: string, semester: number, ay: string, students: { id: string; ability: number }[]) {
  const ayStart = startYearOf(ay), even = semester % 2 === 0, today = todayStr();
  let n = 0;
  for (const sub of teachingSubjects(branch, semester)) {
    const t = teacherOf(sub.id);
    for (let k = 0; k < 10; k++) {
      const sid = id('att-demo', r);
      const date = semesterDate(r, ayStart, even, today);
      const at = new Date(date + 'T10:00:00+05:30').getTime();
      db.prepare(`INSERT INTO attendance_sessions (id,subject_id,faculty_id,branch,semester,date,time_slot,topic,qr_token,pin,status,expires_at,created_at,closed_at,academic_year,is_demo)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`).run(sid, sub.id, t.id, branch, semester, date, '10:00 - 11:00', `${sub.name}: unit ${1 + (k % 5)}`,
        id('qr', r) + k, String(1000 + Math.floor(r() * 9000)), 'Closed', at + 3600_000, at, at + 3600_000, ay);
      for (const s of students) {
        const present = r() < 0.55 + s.ability * 0.4;          // better students come more often
        db.prepare('INSERT INTO attendance_records (session_id,student_id,status,marked_via,marked_by,marked_at) VALUES (?,?,?,?,?,?)')
          .run(sid, s.id, present ? (r() < 0.07 ? 'Late' : 'Present') : 'Absent', 'Manual', 'sample-data', at + 600_000);
      }
      n++;
    }
  }
  return n;
}

/** 3-4 practicals per lab subject with each student's record. */
function makePracticals(r: Rand, branch: string, semester: number, ay: string, students: { id: string; ability: number }[]) {
  let n = 0;
  for (const sub of teachingSubjects(branch, semester).filter((s) => s.has_practical)) {
    const titles = SAMPLE_LABS[sub.code] || ['Introduction to the lab and safety rules', 'Experiment 2', 'Experiment 3'];
    titles.forEach((title, i) => {
      const pid = id('prc-demo', r);
      db.prepare(`INSERT INTO practical_experiments (id,subject_id,branch,semester,academic_year,experiment_no,title,details,max_marks,is_demo,created_by,created_by_name)
        VALUES (?,?,?,?,?,?,?,?,?,1,?,?)`).run(pid, sub.id, branch, semester, ay, i + 1, title,
        JSON.stringify({ objective: `To perform: ${title}.`, apparatus: ['As per lab manual'], procedureSteps: ['Follow the lab manual', 'Record observations', 'Get the file checked'], vivaQuestions: [], inputType: 'typed' }),
        10, 'sample-data', 'Sample data');
      for (const s of students) {
        const st = pick(r, RECORD_STATUSES);
        db.prepare('INSERT INTO practical_records (experiment_id,student_id,status,marks,updated_by) VALUES (?,?,?,?,?)')
          .run(pid, s.id, st, st === 'Completed' || st === 'Needs Revision' ? marksFor(r, s.ability, 10) : null, 'sample-data');
      }
      n++;
    });
  }
  return n;
}

/** Two online assignments per class (one already past its deadline) with submissions. */
function makeAssignments(r: Rand, branch: string, year: number, semester: number, ay: string, students: { id: string; ability: number }[]) {
  const subs = teachingSubjects(branch, semester);
  let n = 0;
  for (let k = 0; k < 2 && subs.length; k++) {
    const sub = subs[(k * 2) % subs.length];
    const t = teacherOf(sub.id);
    const now = Date.now();
    const deadline = k === 0 ? now - 7 * 86400_000 : now + 10 * 86400_000;     // one finished, one still open
    const d = new Date(deadline + 330 * 60_000).toISOString();
    const tid = id('otst-demo', r);
    db.prepare(`INSERT INTO online_tests (id,title,subject_id,branch,year,semester,deadline_date,deadline_time,deadline_at,total_marks,description,created_by,created_by_name,status,created_at,academic_year,is_demo)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`).run(tid, `${sub.name}: Assignment ${k + 1}`, sub.id, branch, year, semester, d.slice(0, 10), '17:00', deadline, 10,
      'Write answers in your notebook and upload a photo / PDF. (Sample assignment)', t.id, t.name, k === 0 ? 'expired' : 'active', now - 20 * 86400_000, ay);
    for (const s of students) {
      if (r() < (k === 0 ? 0.85 : 0.45)) {
        db.prepare('INSERT INTO online_test_submissions (test_id,student_id,score,total,percentage,grade,attempts,submitted_at) VALUES (?,?,?,?,?,?,?,?)')
          .run(tid, s.id, null, 10, null, null, 1, deadline - Math.floor(r() * 5) * 86400_000);
      }
    }
    n++;
  }
  return n;
}

/** Random UBTER board result of one semester (for last year's semesters of today's 2nd year). */
function makeBoardResult(r: Rand, studentId: string, branch: string, semester: number, session: string, ability: number) {
  const subs = teachingSubjects(branch, semester);
  const rid = id('res-demo', r);
  let th = 0, pr = 0, gpSum = 0, crSum = 0;
  const lines: any[] = [];
  for (const s of subs) {
    const theory = s.has_practical && /workshop|graphics/i.test(s.name) ? null : Math.round(clamp(ability + (r() - 0.5) * 0.3, 0.3, 0.97) * 100);
    const practical = s.has_practical ? Math.round(clamp(ability + 0.08 + (r() - 0.5) * 0.25, 0.35, 0.98) * 90) : null;
    const pct = ((theory ?? 0) + (practical ?? 0)) / ((theory !== null ? 100 : 0) + (practical !== null ? 90 : 0)) * 100;
    // UBTER grade table: >90 O(10), >80 A+(9), >70 A(8), >60 B+(7), >50 B(6), >40 C(5), 33-40 P(4), <33 F(0)
    const [grade, gp] = pct > 90 ? ['O', 10] : pct > 80 ? ['A+', 9] : pct > 70 ? ['A', 8] : pct > 60 ? ['B+', 7] : pct > 50 ? ['B', 6] : pct > 40 ? ['C', 5] : pct >= 33 ? ['P', 4] : ['F', 0];
    th += theory ?? 0; pr += practical ?? 0; gpSum += (gp as number) * (s.credits || 1); crSum += s.credits || 1;
    lines.push([s.code, s.name, theory, practical, grade, gp]);
  }
  const max = lines.reduce((a, l) => a + (l[2] !== null ? 100 : 0) + (l[3] !== null ? 90 : 0), 0) + 50;
  const total = th + pr + 50;
  const sgpa = Math.round(((gpSum + 20) / (crSum + 2)) * 100) / 100;
  const fail = lines.some((l) => l[4] === 'F');
  db.prepare(`INSERT INTO board_results (id,student_id,semester,exam_session,theory_total,practical_total,gp,ie,sem_total,max_total,sgpa,result,promoted,is_demo,created_by)
    VALUES (?,?,?,?,?,?,25,25,?,?,?,?,?,1,?)`).run(rid, studentId, semester, session, th, pr, total, max, sgpa, fail ? 'PBP' : 'PASS', 1, 'sample-data');
  for (const l of lines) db.prepare(`INSERT INTO board_result_subjects (result_id,subject_code,subject_name,theory,practical,grade,grade_point) VALUES (?,?,?,?,?,?,?)`).run(rid, ...l);
  db.prepare('INSERT OR REPLACE INTO semester_results (student_id,semester,percentage,cgpa) VALUES (?,?,?,?)').run(studentId, semester, Math.round((total / max) * 1000) / 10, sgpa);
}

/**
 * Make all the sample data, once. Called at start-up from server/index.ts.
 * Skipped when DEMO_DATA=0, or when it was made before (also after the admin deleted it: it does not come back).
 */
export function seedDemoData(force = false): string[] {
  if (!force && (process.env.DEMO_DATA === '0' || getSetting('demo_data') !== null)) return [];
  const r = rng(20261109);
  const ay = academicYearOf();
  const prev = yearLabel(startYearOf(ay) - 1);
  const out: string[] = [];
  db.exec('BEGIN');
  try {
    for (const [branch, count] of [['CSE', 25], ['Civil', 20]] as const) {
      // ---- 1st year (admitted this year) ----
      const y1 = makeClass(r, branch, startYearOf(ay), count, ay);
      // ---- 2nd year (admitted last year) ----
      const y2 = makeClass(r, branch, startYearOf(ay) - 1, count, ay);
      let exams = 0, att = 0, prc = 0, asg = 0;
      for (const c of [y1, y2]) {
        exams += makeExams(r, branch, c.sem, ay, c.students);
        att += makeAttendance(r, branch, c.sem, ay, c.students);
        prc += makePracticals(r, branch, c.sem, ay, c.students);
        asg += makeAssignments(r, branch, c.year, c.sem, ay, c.students);
      }
      // ---- last year (1st year, semesters 1 and 2) of today's 2nd year: exams + board results ----
      for (const sem of [1, 2]) {
        exams += makeExams(r, branch, sem, prev, y2.students);
        for (const s of y2.students) makeBoardResult(r, s.id, branch, sem, `${prev} (${sem === 1 ? 'Winter' : 'Summer'})`, s.ability);
      }
      out.push(`${branch}: ${y1.students.length} first-year + ${y2.students.length} second-year sample students, ${exams} exams, ${att} attendance sessions, ${prc} practicals, ${asg} assignments`);
    }
    setSetting('demo_data', 'created ' + new Date().toISOString());
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return out;
}

/** How many sample rows there are (for the admin screen). */
export function demoDataCounts() {
  // C.
  const c = (sql: string) => (db.prepare(sql).get() as any).n as number;
  return {
    students: c('SELECT COUNT(*) n FROM students WHERE is_demo=1'),
    exams: c('SELECT COUNT(*) n FROM tests WHERE is_demo=1 AND deleted_at IS NULL'),
    attendanceSessions: c('SELECT COUNT(*) n FROM attendance_sessions WHERE is_demo=1'),
    practicals: c('SELECT COUNT(*) n FROM practical_experiments WHERE is_demo=1 AND deleted_at IS NULL'),
    assignments: c('SELECT COUNT(*) n FROM online_tests WHERE is_demo=1 AND deleted_at IS NULL'),
    boardResults: c('SELECT COUNT(*) n FROM board_results WHERE is_demo=1'),
    createdAt: getSetting('demo_data'),
  };
}

/**
 * Delete EVERY sample row (and everything that belongs to sample students). Real data is not touched:
 * only rows with is_demo = 1 are removed. Runs in one transaction.
 */
export function removeDemoData() {
  const before = demoDataCounts();
  db.exec('BEGIN');
  try {
    const demo = "(SELECT id FROM students WHERE is_demo=1)";
    // tables that point at students WITHOUT "on delete cascade" must be cleaned first
    db.exec(`DELETE FROM dispatch_submissions WHERE student_id IN ${demo}`);
    db.exec(`DELETE FROM placement_applications WHERE student_id IN ${demo}`);
    db.exec('DELETE FROM tests WHERE is_demo=1');                         // their marks go with them (cascade)
    db.exec('DELETE FROM attendance_sessions WHERE is_demo=1');           // records go with them
    db.exec('DELETE FROM practical_experiments WHERE is_demo=1');         // records go with them
    db.exec('DELETE FROM online_tests WHERE is_demo=1');                  // questions + submissions go with them
    db.exec('DELETE FROM board_results WHERE is_demo=1');                 // subject lines go with them
    db.exec('DELETE FROM students WHERE is_demo=1');                      // + their logins, marks, attendance, history (cascade)
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  setSetting('demo_data', 'deleted ' + new Date().toISOString());        // so it is not created again at the next start
  return before;
}
