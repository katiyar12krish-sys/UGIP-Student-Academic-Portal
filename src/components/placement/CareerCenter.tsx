// =====================================================================================================
// Career Center (Step 19) - three parts of the placement portal
// -----------------------------------------------------------------------------------------------------
//   <ResumeCenter/>  student: upload ONE resume (PDF / Word) that is saved on the server, download or delete it;
//                    staff: list of every student's resume to download. Plus 5 SAMPLE resumes (fresher CSE,
//                    fresher Civil, internship / apprenticeship, experienced CSE, experienced Civil) that open
//                    ready to print as PDF or download as a Word file and fill in.
//   <CareerGuide/>   plain advice: internships, applying for jobs, realistic starting salary for a diploma
//                    holder (and what NOT to expect), professional behaviour at work.
//   <JobLinksHub/>   trusted job / apprenticeship portals for CSE and Civil (government + private), with
//                    the search already filled in, and how to switch on job alerts so jobs come to the student.
// Server: server/routes/resumes.ts (the file is uploaded with POST /api/files first, like study materials).
// =====================================================================================================
import React, { useEffect, useState } from 'react';
import { FileText, Upload, Download, Trash2, Eye, Briefcase, GraduationCap, HardHat, Laptop, Lightbulb, IndianRupee, Handshake, BellRing, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';
import { call } from '../../services/academicApi';
import { uploadFile } from '../../services/materialsApi';
import { notify, confirmDialog } from '../common/ui/feedback';

// =====================================================================================================
// 1) RESUMES
// =====================================================================================================
interface ResumeRow { studentId: string; name: string; rollNo: string; branch: string; year: number; semester: number; fileName: string; size: number; uploadedAt: string }

/** The 5 sample resumes. Names, phone numbers and e-mails are made-up placeholders to be replaced. */
const SAMPLES: { id: string; title: string; who: string; icon: React.ElementType; html: string }[] = [
  {
    id: 'fresher-cse', title: 'Fresher – Diploma CSE', who: 'Final-year / just passed CSE student applying for the first job', icon: Laptop,
    html: resume({
      name: 'Rahul Bisht', role: 'Diploma in Computer Science & Engineering (Fresher)', contact: 'Tanakpur, Champawat, Uttarakhand · +91 90000 00000 · rahul.bisht@email.com · linkedin.com/in/rahulbisht',
      sections: [
        ['Career Objective', '<p>Hard-working Diploma CSE graduate looking for an entry-level role as an IT Support / Junior Web Developer, where I can use my skills in programming, networking and computer hardware and keep learning on the job.</p>'],
        ['Education', table([['Diploma in CSE (UBTER)', 'Uttarakhand Government Institute of Polytechnic', '2024 – 2027', 'SGPA 8.2 (till Sem 5)'], ['Class 12 (UK Board)', 'GIC Tanakpur', '2024', '72%'], ['Class 10 (UK Board)', 'GIC Tanakpur', '2022', '78%']])],
        ['Technical Skills', ul(['Programming: C, Python (basic), HTML, CSS, JavaScript', 'Database: MySQL / RDBMS – SQL queries, joins', 'Hardware & Networking: PC assembly, OS installation, LAN cabling, IP configuration', 'Tools: MS Office, Excel formulas, Git (basic)'])],
        ['Projects', ul(['<b>College Portal (team of 3):</b> student marks and attendance pages using HTML, JavaScript and MySQL.', '<b>Library Management System:</b> C program with file handling – issue / return of books.'])],
        ['Training / Internship', ul(['4-week summer training in Computer Hardware & Networking – (Company / Institute name), June 2026'])],
        ['Certifications', ul(['NPTEL / Swayam: Programming in Python (Elite)', 'Cisco Networking Academy: Introduction to Networks'])],
        ['Strengths', ul(['Quick learner, punctual, good team player', 'Comfortable with Hindi and English'])],
        ['Personal Details', '<p>Date of birth: 01-01-2007 · Languages: Hindi, English · Willing to relocate: Yes</p>'],
      ],
    }),
  },
  {
    id: 'fresher-civil', title: 'Fresher – Diploma Civil', who: 'Civil student applying for Site Supervisor / Junior Engineer Trainee', icon: HardHat,
    html: resume({
      name: 'Pooja Negi', role: 'Diploma in Civil Engineering (Fresher)', contact: 'Lohaghat, Champawat, Uttarakhand · +91 90000 00001 · pooja.negi@email.com',
      sections: [
        ['Career Objective', '<p>Diploma Civil Engineer seeking a Site Supervisor / Junior Engineer Trainee role in building or road construction, to apply my knowledge of surveying, estimation and quality checks on site.</p>'],
        ['Education', table([['Diploma in Civil Engg. (UBTER)', 'Uttarakhand Government Institute of Polytechnic', '2024 – 2027', '74%'], ['Class 12', 'GGIC Lohaghat', '2024', '70%'], ['Class 10', 'GGIC Lohaghat', '2022', '81%']])],
        ['Technical Skills', ul(['Surveying: chain, compass, levelling, plane table, total station (basic)', 'Drawing: AutoCAD 2D building plans, elevations and sections', 'Estimation & costing, BBS (bar bending schedule), rate analysis', 'Material testing: slump test, cube test, sieve analysis, brick tests'])],
        ['Site Training', ul(['6-week training with PWD / (Contractor name): supervision of RCC slab work, record of material and labour, daily progress report'])],
        ['Projects', ul(['<b>Estimate of a G+1 residential building</b> – quantities, BBS and cost (final-year project)', '<b>Survey of college campus road</b> – levelling and L-section'])],
        ['Software', ul(['AutoCAD, MS Excel (estimation sheets), MS Word'])],
        ['Personal Details', '<p>Date of birth: 05-05-2006 · Languages: Hindi, English, Kumaoni · Ready for site work and travel</p>'],
      ],
    }),
  },
  {
    id: 'internship', title: 'Internship / Apprenticeship', who: '2nd / 3rd year student asking for summer internship or NATS apprenticeship', icon: GraduationCap,
    html: resume({
      name: 'Aman Joshi', role: 'Diploma CSE – 2nd Year · Seeking Summer Internship (4–8 weeks)', contact: 'Banbasa, Champawat · +91 90000 00002 · aman.joshi@email.com · github.com/amanjoshi',
      sections: [
        ['Objective', '<p>Second-year Diploma CSE student looking for a 4–8 week internship in web development or IT support to gain practical experience. Available from 1 June to 31 July.</p>'],
        ['Education', table([['Diploma in CSE (UBTER) – pursuing', 'Uttarakhand Government Institute of Polytechnic', '2025 – 2028', 'Sem 3: SGPA 8.0'], ['Class 12', 'GIC Banbasa', '2025', '75%']])],
        ['Skills', ul(['C programming, HTML, CSS, basic JavaScript', 'MS Office, Excel, typing 35 wpm (English & Hindi)', 'Basic computer hardware and Windows installation'])],
        ['Mini Projects', ul(['Personal portfolio website (HTML / CSS) – link on GitHub', 'Student result calculator in C'])],
        ['Achievements & Activities', ul(['2nd prize, college technical quiz 2025', 'NSS volunteer – digital literacy camp in village'])],
        ['What I can do for you', ul(['Data entry and documentation, basic website updates, help-desk / computer maintenance'])],
      ],
    }),
  },
  {
    id: 'exp-cse', title: 'Experienced – CSE (2–3 years)', who: 'Diploma holder with work experience applying for a better job', icon: Briefcase,
    html: resume({
      name: 'Deepak Pant', role: 'IT Support Engineer · 3 years experience', contact: 'Haldwani, Uttarakhand · +91 90000 00003 · deepak.pant@email.com · linkedin.com/in/deepakpant',
      sections: [
        ['Professional Summary', '<p>IT Support Engineer with 3 years of experience in desktop support, networking and user help-desk for 150+ users. Reduced repeated tickets by 30% through a self-help guide. Looking for a System / Network Administrator role.</p>'],
        ['Work Experience', `<p><b>IT Support Engineer</b> – ABC Technologies, Dehradun <i>(Jul 2024 – Present)</i></p>${ul(['Look after 150+ desktops, printers and Wi-Fi for 3 offices', 'Windows 10/11 & Office 365 setup, user accounts in Active Directory', 'Network issues: switches, IP conflicts, router setup; average ticket closed in 4 hours'])}
          <p><b>Junior Computer Operator</b> – XYZ Pvt. Ltd., Rudrapur <i>(Jul 2023 – Jun 2024)</i></p>${ul(['Data entry, backups, basic hardware repair, MIS reports in Excel'])}`],
        ['Skills', ul(['Windows Server, Active Directory, DHCP, DNS', 'LAN / Wi-Fi setup, cabling, CCTV basics', 'Linux commands, shell basics, MySQL', 'Help-desk tools (ticketing), Excel MIS'])],
        ['Education', table([['Diploma in CSE (UBTER)', 'Uttarakhand Government Institute of Polytechnic', '2020 – 2023', '76%']])],
        ['Certifications', ul(['CCNA (Cisco) – 2025', 'Microsoft 365 Fundamentals (MS-900)'])],
      ],
    }),
  },
  {
    id: 'exp-civil', title: 'Experienced – Civil (Site Engineer)', who: 'Civil diploma holder with site experience', icon: HardHat,
    html: resume({
      name: 'Kamal Rawat', role: 'Site Engineer (Civil) · 4 years experience', contact: 'Pithoragarh, Uttarakhand · +91 90000 00004 · kamal.rawat@email.com',
      sections: [
        ['Professional Summary', '<p>Diploma Civil Engineer with 4 years of site experience in hill roads and RCC buildings. Handled teams of 25+ workers, measurement books and billing. Known for safety and finishing work on time.</p>'],
        ['Work Experience', `<p><b>Site Engineer</b> – (Construction Company), PMGSY road projects <i>(2023 – Present)</i></p>${ul(['Execution of 12 km hill road: cutting, retaining walls, culverts, PCC / bitumen work', 'Daily progress reports, measurement book, sub-contractor bills', 'Quality tests: cube, slump, compaction (field density)'])}
          <p><b>Junior Site Supervisor</b> – (Builder), Haldwani <i>(2022 – 2023)</i></p>${ul(['G+3 RCC building: layout, shuttering and reinforcement checks, BBS'])}`],
        ['Skills', ul(['Site execution & supervision, quantity surveying, billing', 'AutoCAD, MS Excel, MS Project (basic)', 'Total station & auto level', 'Safety (PPE, toolbox talks), labour management'])],
        ['Education', table([['Diploma in Civil Engg. (UBTER)', 'Uttarakhand Government Institute of Polytechnic', '2019 – 2022', '72%']])],
        ['Achievements', ul(['Completed 4 km stretch 20 days before deadline (2024)', 'Zero lost-time accidents on site for 18 months'])],
      ],
    }),
  },
];

/** Build a clean one-page resume as HTML (opens in the browser to print as PDF, or in Word as .doc). */
function resume(r: { name: string; role: string; contact: string; sections: [string, string][] }) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${r.name} – Resume</title>
<style>body{font-family:Calibri,Arial,sans-serif;color:#1f2937;max-width:800px;margin:24px auto;padding:0 24px;line-height:1.45;font-size:14px}
h1{margin:0;font-size:26px;color:#064e3b}.role{font-size:15px;font-weight:600;margin:2px 0}.c{color:#4b5563;font-size:12.5px;border-bottom:2px solid #065f46;padding-bottom:10px;margin-bottom:12px}
h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#065f46;border-bottom:1px solid #d1d5db;padding-bottom:3px;margin:16px 0 6px}
ul{margin:4px 0 4px 18px;padding:0}li{margin:2px 0}table{border-collapse:collapse;width:100%;font-size:13px}td{border:1px solid #e5e7eb;padding:4px 6px}p{margin:4px 0}
.note{margin-top:22px;font-size:11px;color:#6b7280;border-top:1px dashed #d1d5db;padding-top:6px}@media print{.note{display:none}}</style></head><body>
<h1>${r.name}</h1><div class="role">${r.role}</div><div class="c">${r.contact}</div>
${r.sections.map(([h, b]) => `<h2>${h}</h2>${b}`).join('\n')}
<p class="note">SAMPLE resume from the college portal – replace every detail with your own (name, marks, projects). Print → "Save as PDF" to make a PDF.</p>
</body></html>`;
}
// Ul.
function ul(items: string[]) { return `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`; }
// Table.
function table(rows: string[][]) { return `<table>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`; }

/** Open a sample in a new tab (to read / print as PDF). */
const viewSample = (html: string) => {
  const w = window.open('', '_blank');
  if (!w) return notify.warning('Please allow pop-ups to open the sample resume.');
  w.document.write(html); w.document.close();
};
/** Download a sample as a Word file (.doc opens the HTML in MS Word, ready to edit). */
const downloadSample = (id: string, html: string) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + html], { type: 'application/msword' }));
  a.download = `Sample_Resume_${id}.doc`;
  a.click(); URL.revokeObjectURL(a.href);
};

// Screen part: resume center.
export const ResumeCenter: React.FC = () => {
  const { authUser } = useCollege();
  const isStudent = authUser?.role === 'student';
  const isStaff = authUser?.role === 'admin' || authUser?.role === 'faculty';
  // Mine (kept in screen state)
  const [mine, setMine] = useState<ResumeRow | null>(null);
  // All (kept in screen state)
  const [all, setAll] = useState<ResumeRow[]>([]);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);

  // Loads the data from the server.
  const load = async () => {
    if (isStudent) { const r = await call<ResumeRow | null>('GET', '/api/resumes/me'); if (r.ok) setMine(r.data); }
    if (isStaff) { const r = await call<ResumeRow[]>('GET', '/api/resumes'); if (r.ok) setAll(r.data); }
  };
  // Runs automatically whenever these change: authUser?.id.
  useEffect(() => { load(); }, [authUser?.id]);

  // Called when: upload.
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) return notify.warning('Please choose a PDF or Word (.docx) file.');
    setBusy(true);
    const up = await uploadFile(file);                                         // step 1: the file itself
    const r = up.ok ? await call<ResumeRow>('POST', '/api/resumes/me', { fileId: up.data.fileId }) : up;   // step 2: make it my resume
    setBusy(false);
    if (!r.ok) return notify.error('Could not upload the resume', r.error);
    setMine(r.data as ResumeRow);
    notify.success('Resume saved', 'It is kept safely on the college server. You can download it any time.');
  };

  // Remove.
  const remove = async () => {
    if (!(await confirmDialog({ title: 'Delete your resume?', message: 'The placement cell will no longer see it. You can upload a new one any time.', danger: true }))) return;
    const r = await call('DELETE', '/api/resumes/me');
    if (!r.ok) return notify.error('Could not delete', r.error);
    setMine(null); notify.success('Resume deleted');
  };

  // Kb.
  const kb = (n: number) => `${Math.max(1, Math.round(n / 1024))} KB`;
  return (
    <div className="space-y-5">
      {isStudent && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5 text-blue-700" /> My resume</h3>
          <p className="text-sm text-slate-500 mt-1">Upload one PDF or Word file (max 10 MB). It is saved on the college server and the placement cell can see it when they shortlist students.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {mine ? (
              <div className="flex-1 min-w-60 flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="min-w-0"><p className="text-sm font-semibold truncate">{mine.fileName}</p><p className="text-xs text-slate-500">{kb(mine.size)} · uploaded {mine.uploadedAt.slice(0, 10)}</p></div>
              </div>
            ) : <p className="flex-1 text-sm text-slate-500">No resume uploaded yet.</p>}
            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold cursor-pointer ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
              <Upload className="w-4 h-4" /> {busy ? 'Uploading…' : mine ? 'Replace' : 'Upload resume'}
              <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={onUpload} />
            </label>
            {mine && <>
              <a href={`/api/resumes/${encodeURIComponent(mine.studentId)}/file`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"><Download className="w-4 h-4" /> Download</a>
              <button onClick={remove} aria-label="Delete resume" className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
            </>}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-white">5 sample resumes</h3>
        <p className="text-sm text-slate-500 mt-1">Pick the one closest to you, download it as a Word file, replace every detail with your own, then save as PDF and upload above.</p>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SAMPLES.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-2">
              <s.icon className="w-5 h-5 text-blue-700" />
              <p className="font-semibold text-sm">{s.title}</p>
              <p className="text-xs text-slate-500 flex-1">{s.who}</p>
              <div className="flex gap-2">
                <button onClick={() => viewSample(s.html)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold hover:bg-slate-200 cursor-pointer"><Eye className="w-3.5 h-3.5" /> View / PDF</button>
                <button onClick={() => downloadSample(s.id, s.html)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 cursor-pointer"><Download className="w-3.5 h-3.5" /> Word</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {isStaff && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <h3 className="px-5 pt-5 font-bold text-slate-900 dark:text-white">Students' resumes ({all.length})</h3>
          {all.length === 0 ? <p className="px-5 pb-5 pt-2 text-sm text-slate-500">No student has uploaded a resume yet.</p> : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 text-left"><tr><th className="px-5 py-2">Roll no</th><th className="px-5 py-2">Name</th><th className="px-5 py-2">Class</th><th className="px-5 py-2">File</th><th className="px-5 py-2" /></tr></thead>
                <tbody>{all.map((r) => (
                  <tr key={r.studentId} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-5 py-2 font-mono text-xs">{r.rollNo}</td><td className="px-5 py-2">{r.name}</td><td className="px-5 py-2">{r.branch} · Year {r.year}</td>
                    <td className="px-5 py-2 text-xs text-slate-500">{r.fileName} · {kb(r.size)}</td>
                    <td className="px-5 py-2 text-right"><a href={`/api/resumes/${encodeURIComponent(r.studentId)}/file`} className="text-xs font-semibold text-blue-700 hover:underline">Download</a></td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

// =====================================================================================================
// 2) CAREER GUIDE
// =====================================================================================================
const Card: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Icon className="w-5 h-5 text-blue-700" /> {title}</h3>
    <div className="mt-3 text-sm text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">{children}</div>
  </section>
);
// Do.
const Do: React.FC<{ ok?: boolean; children: React.ReactNode }> = ({ ok = true, children }) => (
  <li className="flex gap-2">{ok ? <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}<span>{children}</span></li>
);

// Screen part: career guide.
export const CareerGuide: React.FC = () => (
  <div className="grid lg:grid-cols-2 gap-5">
    <Card icon={GraduationCap} title="Internship – what is right for you">
      <ul className="space-y-1.5">
        <Do>Do a 4–8 week internship in the summer after 2nd year (or the training in your syllabus) – in the field of your branch.</Do>
        <Do>CSE: IT support, hardware & networking, web development, data entry with Excel, computer centres of govt. offices. Civil: PWD / PMGSY / Jal Nigam sites, contractors, builders, survey firms.</Do>
        <Do>For a paid, certified one-year training after the diploma, register on the <b>NATS apprenticeship portal</b> (Board of Apprenticeship Training) – a stipend is paid and the certificate counts as experience.</Do>
        <Do>Use the AICTE Internship portal and Internshala; ask the T&P cell for a letter from the college.</Do>
        <Do>Keep a diary of what you did each day; ask for a completion certificate and a short reference.</Do>
        <Do ok={false}>Never pay money to get an internship or a job "placement". Genuine companies do not charge fees.</Do>
      </ul>
    </Card>
    <Card icon={Briefcase} title="Applying for a job – checklist">
      <ul className="space-y-1.5">
        <Do>One-page resume (see samples), PDF named like <i>Name_Diploma_CSE.pdf</i>. Spelling checked, phone and e-mail correct.</Do>
        <Do>Keep ready: marksheets of all semesters, diploma / provisional certificate, 10th & 12th, Aadhaar, 2 photos, training certificate.</Do>
        <Do>Read the job post: qualification, age limit, location, last date. Apply only where you fit.</Do>
        <Do>Prepare basics of your subjects (OS, networking, C, DBMS / surveying, RCC, estimation) – most interviews ask these first.</Do>
        <Do>Use a professional e-mail id and a clear LinkedIn profile with a photo.</Do>
        <Do>After an interview, send a short thank-you message; follow up once after a week.</Do>
        <Do ok={false}>Do not apply with a fake experience certificate – it is checked and can end your career.</Do>
      </ul>
    </Card>
    <Card icon={IndianRupee} title="Starting salary – what to expect (approximate)">
      <p className="text-xs text-slate-500">Rough 2025-26 figures for a 3-year diploma holder in Uttarakhand / North India. They change with city, company and your skills.</p>
      <table className="w-full text-sm mt-1">
        <tbody className="[&_td]:py-1.5 [&_td]:pr-3 [&_tr]:border-b [&_tr]:border-slate-100 dark:[&_tr]:border-slate-800">
          <tr><td>Apprenticeship (NATS)</td><td className="font-semibold">₹8,000 – 10,000 / month stipend</td></tr>
          <tr><td>CSE fresher – IT support, operator, junior developer</td><td className="font-semibold">₹10,000 – 20,000 / month</td></tr>
          <tr><td>Civil fresher – site supervisor / trainee JE (private)</td><td className="font-semibold">₹12,000 – 22,000 / month</td></tr>
          <tr><td>Big companies' diploma trainee schemes</td><td className="font-semibold">₹18,000 – 30,000 / month</td></tr>
          <tr><td>Government Junior Engineer (after exam)</td><td className="font-semibold">Pay Level 6 – about ₹35,400 basic + allowances</td></tr>
        </tbody>
      </table>
      <ul className="space-y-1.5 mt-2">
        <Do>Salary grows fastest in the first 3 years with skills and certifications (CCNA, AutoCAD, etc.).</Do>
        <Do ok={false}>Do not expect B.Tech-level packages (₹4–6 LPA) as a fresh diploma holder – be ready to start smaller and grow.</Do>
        <Do ok={false}>"₹50,000 per month for freshers, pay registration fee" – this is almost always a fraud.</Do>
        <Do>Ask clearly: monthly in-hand salary, PF / ESI, working hours, site allowance, probation period – before you join.</Do>
      </ul>
    </Card>
    <Card icon={Handshake} title="Professional behaviour at work">
      <ul className="space-y-1.5">
        <Do>Be on time, every day. Inform early if you are late or on leave.</Do>
        <Do>Clean, simple clothes; safety shoes and helmet on site (Civil), ID card always.</Do>
        <Do>Speak politely with seniors, workers and customers; say "sorry" and "thank you".</Do>
        <Do>When you do not know something, ask – then write it down so you do not ask twice.</Do>
        <Do>Keep company data and passwords private; do not post work photos on social media without permission.</Do>
        <Do>Finish what you promise; report problems early instead of hiding them.</Do>
        <Do ok={false}>No mobile phone games / reels during work, no gossip, no arguments in groups.</Do>
      </ul>
    </Card>
  </div>
);

// =====================================================================================================
// 3) JOB LINKS (CSE + Civil)
// =====================================================================================================
const LINKS: { group: string; icon: React.ElementType; items: { name: string; url: string; note: string }[] }[] = [
  { group: 'Government & apprenticeship (both branches)', icon: Briefcase, items: [
    { name: 'National Career Service (NCS)', url: 'https://www.ncs.gov.in/', note: 'Govt. of India job portal – register once, get matching jobs and job fairs' },
    { name: 'NATS – Apprenticeship for diploma holders', url: 'https://nats.education.gov.in/', note: '1-year paid apprenticeship with stipend and certificate' },
    { name: 'Apprenticeship India', url: 'https://www.apprenticeshipindia.gov.in/', note: 'Apprenticeships in private and public companies' },
    { name: 'AICTE Internship Portal', url: 'https://internship.aicte-india.org/', note: 'Internships for AICTE-approved institutes' },
    { name: 'UKSSSC (Uttarakhand)', url: 'https://sssc.uk.gov.in/', note: 'Junior Engineer, Computer Operator and other state posts' },
    { name: 'UKPSC (Uttarakhand)', url: 'https://psc.uk.gov.in/', note: 'State engineering services and other exams' },
    { name: 'Staff Selection Commission (SSC)', url: 'https://ssc.gov.in/', note: 'SSC JE (Civil), other central government jobs' },
  ] },
  { group: 'Computer Science (CSE) jobs', icon: Laptop, items: [
    { name: 'Naukri – diploma computer jobs', url: 'https://www.naukri.com/diploma-computer-science-jobs', note: 'Turn on job alerts after login' },
    { name: 'LinkedIn – diploma CSE / IT support', url: 'https://www.linkedin.com/jobs/search/?keywords=diploma%20computer%20science', note: 'Follow companies, use "Easy Apply"' },
    { name: 'Indeed – IT support / computer operator', url: 'https://in.indeed.com/jobs?q=diploma+computer+science', note: 'Many local jobs in Uttarakhand & NCR' },
    { name: 'Internshala – CSE internships', url: 'https://internshala.com/internships/computer-science-internship/', note: 'Internships with stipend, also work-from-home' },
  ] },
  { group: 'Civil Engineering jobs', icon: HardHat, items: [
    { name: 'Naukri – diploma civil engineer', url: 'https://www.naukri.com/diploma-civil-engineer-jobs', note: 'Site supervisor, JE trainee, surveyor' },
    { name: 'LinkedIn – diploma civil', url: 'https://www.linkedin.com/jobs/search/?keywords=diploma%20civil%20engineer', note: 'Construction companies and consultants' },
    { name: 'Indeed – site supervisor / civil', url: 'https://in.indeed.com/jobs?q=diploma+civil+engineer', note: 'Builders, road and water projects' },
    { name: 'Internshala – civil internships', url: 'https://internshala.com/internships/civil-engineering-internship/', note: 'Site and design internships' },
  ] },
];

// Screen part: job links hub.
export const JobLinksHub: React.FC = () => (
  <div className="space-y-5">
    <section className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20 p-5">
      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><BellRing className="w-5 h-5 text-blue-700" /> Let jobs come to you</h3>
      <ol className="mt-2 text-sm text-slate-700 dark:text-slate-300 list-decimal ml-5 space-y-1">
        <li>Register on <b>NCS</b> and <b>NATS</b> (government, free) with your diploma details.</li>
        <li>Make a profile on Naukri / LinkedIn / Indeed with your uploaded resume and switch on <b>job alerts</b> for "diploma {`CSE`} / diploma civil" and your city – new jobs then arrive by e-mail / SMS.</li>
        <li>Inside this portal: campus drives posted by the T&P cell appear under <b>Campus Placements</b> and you get a notification on the bell.</li>
      </ol>
    </section>
    {LINKS.map((g) => (
      <section key={g.group} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><g.icon className="w-5 h-5 text-blue-700" /> {g.group}</h3>
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          {g.items.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="group flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500">
              <span><span className="font-semibold text-sm text-slate-900 dark:text-white">{l.name}</span><span className="block text-xs text-slate-500">{l.note}</span></span>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-700 shrink-0 mt-0.5" />
            </a>
          ))}
        </div>
      </section>
    ))}
    <p className="text-xs text-slate-500 flex items-center gap-1.5"><Lightbulb className="w-4 h-4" /> Always apply on the official website of the company / commission. Never share OTPs or pay "registration fees" to agents.</p>
  </div>
);
