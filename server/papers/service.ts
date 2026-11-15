// ===================================================================================================
// Question papers: built-in sample papers (2 per subject, made from the syllabus) + old / new papers that
// staff upload, each with an optional answer key. The files are stored INSIDE the database
// (exam_paper_files.data), so data/portal.db alone carries every paper and answer key.
//
// Who may do what (every rule is in this file; the routes only call it):
//   see / open / download papers and answer keys : admin, faculty (all) · student (common 1st-year + own branch) · parent: none
//   upload a new paper (with or without answer key) : admin, faculty
//   upload / replace the answer key of any paper    : admin, faculty
//   remove a paper                                  : admin (any) · faculty (only papers they uploaded)
// The admin can switch the upload rights off for a teacher ("Question papers & answer keys" in Faculty permissions).
// ===================================================================================================
import crypto from 'crypto';
import { db } from '../db/connection';
import { findFile, fileOnDisk, removeFile, kindOfMime } from '../files/store';
import { studentRow } from '../academic/access';
import { hasFeature } from '../auth/permissions';
import { istParts } from '../notify/time';
import type { SessionUser } from '../auth/session';
import { ALL_SAMPLE_SUBJECTS } from './content';
import { PREVIOUS_PAPERS } from './content/previous';
import { paperPdf, answerPdf, oldAnswerPdf } from './pdf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PREVIOUS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'previous');

export type Result<T = {}> = ({ ok: true } & T) | { ok: false; status: number; error: string };
const fail = (status: number, error: string) => ({ ok: false as const, status, error });
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const newId = (p: string) => `${p}-${crypto.randomBytes(12).toString('hex')}`;
export const KINDS = ['sample', 'previous', 'model'] as const;
const BRANCHES = ['All', 'CSE', 'Civil'];
const sizeLabel = (n: number): string => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// ---------------------------------------------------------------------------------------------------
// files kept in the database
// ---------------------------------------------------------------------------------------------------
function putBlob(name: string, mime: string, data: Buffer, now = Date.now()): string {
  const id = newId('qf');
  db.prepare('INSERT INTO exam_paper_files (id,original_name,mime,size,sha256,data,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, name, mime, data.length, crypto.createHash('sha256').update(data).digest('hex'), data, now);
  return id;
}
const dropBlob = (id: string | null | undefined) => { if (id) db.prepare('DELETE FROM exam_paper_files WHERE id=?').run(id); };

/** Take a file the person uploaded a moment ago (POST /api/files, still pending) into the database. */
function takePending(u: SessionUser, fileId: unknown, label: string): Result<{ blobId: string }> {
  const f = typeof fileId === 'string' ? findFile(fileId) : undefined;
  if (!f || f.uploaded_by !== u.id || f.attached_to) return fail(400, `The ${label} file was not found. Please choose it again.`);
  const kind = kindOfMime(f.mime);
  if (kind !== 'pdf' && kind !== 'image' && kind !== 'doc') return fail(415, `The ${label} must be a PDF, a photo (JPEG / PNG) or a Word file.`);
  let data: Buffer;
  try { data = fs.readFileSync(fileOnDisk(f.id)); } catch { return fail(400, `The ${label} file was not found. Please choose it again.`); }
  const blobId = putBlob(f.original_name, f.mime, data);
  removeFile(f.id);                                           // the copy on disk is no longer needed
  return { ok: true, blobId };
}

// ---------------------------------------------------------------------------------------------------
// built-in sample papers
// ---------------------------------------------------------------------------------------------------
const hashOf = (v: unknown) => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 24);
const fileBase = (code: string, name: string, set: string) => `${code} ${name} - Sample Paper Set ${set}`.replace(/[^\w\- .&()]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Create the built-in sample papers that are missing (first start), and rebuild those whose question text
 * changed. An answer key that a teacher replaced by hand is never overwritten; a removed sample is not made again.
 */
export async function seedSamplePapers(now = Date.now()): Promise<string[]> {
  const out: string[] = [];
  let made = 0, rebuilt = 0;
  for (const s of ALL_SAMPLE_SUBJECTS) {
    for (const p of s.papers) {
      const key = `sample:${s.key}:${p.set}`, hash = hashOf({ s: { code: s.code, name: s.name, semester: s.semester, branch: s.branch }, p });
      const row = db.prepare('SELECT * FROM exam_papers WHERE seed_key=?').get(key) as any;
      if (row && (row.deleted_at || row.content_hash === hash)) continue;
      const base = fileBase(s.code, s.name, p.set);
      const paper = await paperPdf(s, p);
      const keepAnswer = row && row.answer_updated_by_name;   // replaced by a teacher: keep theirs
      const answer = keepAnswer ? null : await answerPdf(s, p);
      db.exec('BEGIN');
      try {
        const paperId = putBlob(`${base}.pdf`, 'application/pdf', paper, now);
        const answerId = answer ? putBlob(`${base} - Answer Key.pdf`, 'application/pdf', answer, now) : row.answer_file_id;
        if (!row) {
          db.prepare(`INSERT INTO exam_papers (id,seed_key,content_hash,kind,title,subject_code,subject_name,branch,semester,exam_year,paper_file_id,answer_file_id,
              uploaded_by_user_id,uploaded_by_name,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
            .run(newId('qp'), key, hash, 'sample', `Sample Paper – Set ${p.set}`, s.code, s.name, s.branch, s.semester, null, paperId, answerId, 'system', 'Portal (from syllabus)', now, now);
          made++;
        } else {
          db.prepare('UPDATE exam_papers SET content_hash=?, subject_code=?, subject_name=?, branch=?, semester=?, paper_file_id=?, answer_file_id=?, updated_at=? WHERE id=?')
            .run(hash, s.code, s.name, s.branch, s.semester, paperId, answerId, now, row.id);
          dropBlob(row.paper_file_id);
          if (answer) dropBlob(row.answer_file_id);
          rebuilt++;
        }
        db.exec('COMMIT');
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    }
  }
  if (made) out.push(`${made} sample question papers + answer keys created`);
  if (rebuilt) out.push(`${rebuilt} sample question papers rebuilt (question text changed)`);
  const old = await seedPreviousPapers(now);
  if (old.added) out.push(`${old.added} old board papers added`);
  if (old.keys) out.push(`${old.keys} answer keys for old board papers created`);
  return out;
}

/** The old board papers the college gave (server/papers/previous/*.pdf): added once, never overwritten.
 *  Their institute answer key (content/old-answers) is added, and rebuilt when its text changes,
 *  unless a teacher has uploaded an answer key of their own for that paper. */
/** Download name: letters, digits and a few safe signs only. */
const cleanFileName = (n: string) => n.replace(/[^\w\- .&()·]+/g, ' ').replace(/\s+/g, ' ').trim();

async function seedPreviousPapers(now: number): Promise<{ added: number; keys: number }> {
  let added = 0, keys = 0;
  for (const p of PREVIOUS_PAPERS) {
    const key = `previous:${p.file}`;
    let row = db.prepare('SELECT * FROM exam_papers WHERE seed_key=?').get(key) as any;
    if (!row) {
      let data: Buffer;
      try { data = fs.readFileSync(path.join(PREVIOUS_DIR, p.file)); } catch { console.warn(`[question papers] missing file server/papers/previous/${p.file}`); continue; }
      const fid = putBlob(cleanFileName(`${p.subjectName} - ${p.title}.pdf`), 'application/pdf', data, now);
      db.prepare(`INSERT INTO exam_papers (id,seed_key,content_hash,kind,title,subject_code,subject_name,branch,semester,exam_year,paper_file_id,answer_file_id,
          uploaded_by_user_id,uploaded_by_name,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(newId('qp'), key, null, 'previous', p.title, p.subjectCode, p.subjectName, p.branch, p.semester, p.examYear || null, fid, null, 'system', 'College (old board paper)', now, now);
      added++;
      row = db.prepare('SELECT * FROM exam_papers WHERE seed_key=?').get(key);
    }
    if (!p.answers || row.deleted_at || row.answer_updated_by_name) continue;   // removed on purpose, or a teacher's own key
    const hash = hashOf(p.answers);
    if (row.answer_file_id && row.content_hash === hash) continue;              // already up to date
    const pdf = await oldAnswerPdf(p, p.answers);
    db.exec('BEGIN');
    try {
      const aid = putBlob(cleanFileName(`${p.subjectName} - ${p.title} - Answer Key.pdf`), 'application/pdf', pdf, now);
      db.prepare('UPDATE exam_papers SET answer_file_id=?, content_hash=?, updated_at=? WHERE id=?').run(aid, hash, now, row.id);
      dropBlob(row.answer_file_id);
      db.exec('COMMIT');
      keys++;
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  return { added, keys };
}

// ---------------------------------------------------------------------------------------------------
// reading
// ---------------------------------------------------------------------------------------------------
const SQL = `SELECT q.*, pf.original_name AS p_name, pf.mime AS p_mime, pf.size AS p_size,
    af.original_name AS a_name, af.mime AS a_mime, af.size AS a_size
  FROM exam_papers q JOIN exam_paper_files pf ON pf.id=q.paper_file_id LEFT JOIN exam_paper_files af ON af.id=q.answer_file_id`;

export function canSee(u: SessionUser, r: { branch: string }): boolean {
  if (u.role === 'admin' || u.role === 'faculty') return true;
  if (u.role !== 'student' || !u.studentId) return false;
  const st = studentRow(u.studentId);
  return !!st && (r.branch === 'All' || r.branch === st.branch);
}
const canManage = (u: SessionUser) => u.role === 'admin' || (u.role === 'faculty' && hasFeature(u, 'question_papers'));
const canRemove = (u: SessionUser, r: any) => u.role === 'admin' || (u.role === 'faculty' && r.uploaded_by_user_id === u.id);

export const toDto = (r: any, u: SessionUser) => ({
  id: r.id, kind: r.kind as typeof KINDS[number], title: r.title, builtIn: !!r.seed_key,
  subjectCode: r.subject_code, subjectName: r.subject_name, branch: r.branch, semester: r.semester, examYear: r.exam_year || undefined,
  paper: { name: r.p_name, mime: r.p_mime, size: sizeLabel(r.p_size), url: `/api/question-papers/${encodeURIComponent(r.id)}/paper` },
  answer: r.answer_file_id ? { name: r.a_name, mime: r.a_mime, size: sizeLabel(r.a_size), url: `/api/question-papers/${encodeURIComponent(r.id)}/answer`, updatedBy: r.answer_updated_by_name || undefined, updatedAt: r.answer_updated_at ? istParts(r.answer_updated_at).date : undefined } : null,
  uploadedBy: r.uploaded_by_name, uploadedAt: istParts(r.created_at).date, downloads: r.download_count,
  canEdit: canManage(u), canRemove: canRemove(u, r),
});

export function listFor(u: SessionUser) {
  if (u.role === 'parent') return [];
  const rows = db.prepare(SQL + ' WHERE q.deleted_at IS NULL ORDER BY q.semester, q.subject_name, q.kind, q.title').all() as any[];
  return rows.filter((r) => canSee(u, r)).map((r) => toDto(r, u));
}
export const findPaper = (id: string): any => db.prepare(SQL + ' WHERE q.id=? AND q.deleted_at IS NULL').get(id);

/** Subjects offered in the "upload a paper" form: the portal's subject list + every subject that has sample papers. */
export function subjectChoices() {
  const seen = new Map<string, { code: string; name: string; semester: number; branch: string }>();
  for (const s of ALL_SAMPLE_SUBJECTS) seen.set(`${s.code}|${s.name}`, { code: s.code, name: s.name, semester: s.semester, branch: s.branch });
  for (const r of db.prepare('SELECT DISTINCT code, name, semester, branch FROM subjects ORDER BY semester, name').all() as any[]) {
    const branch = r.semester <= 2 ? 'All' : r.branch;
    const k = `${r.code}|${r.name}`;
    if (!seen.has(k) && ![...seen.values()].some((v) => v.name.toLowerCase() === String(r.name).toLowerCase() && v.semester === r.semester)) seen.set(k, { code: r.code, name: r.name, semester: r.semester, branch });
  }
  return [...seen.values()].sort((a, b) => a.semester - b.semester || a.name.localeCompare(b.name));
}

/** The file itself (paper or answer key), after the "who may see" check. */
export function openFile(u: SessionUser, id: string, which: 'paper' | 'answer', countIt: boolean): Result<{ data: Buffer; mime: string; name: string }> {
  const r = findPaper(id);
  if (!r || !canSee(u, r)) return fail(404, 'Paper not found');
  const fid = which === 'paper' ? r.paper_file_id : r.answer_file_id;
  if (!fid) return fail(404, 'No answer key has been added for this paper yet');
  const f = db.prepare('SELECT original_name, mime, data FROM exam_paper_files WHERE id=?').get(fid) as any;
  if (!f) return fail(404, 'File not found');
  if (countIt) db.prepare('UPDATE exam_papers SET download_count=download_count+1 WHERE id=?').run(id);
  return { ok: true, data: Buffer.from(f.data), mime: f.mime, name: f.original_name };
}

// ---------------------------------------------------------------------------------------------------
// changes
// ---------------------------------------------------------------------------------------------------
/** Add a new paper: the file(s) were uploaded a moment ago with POST /api/files. */
export function createPaper(u: SessionUser, b: any, now = Date.now()): Result<{ id: string }> {
  if (!canManage(u)) return fail(403, 'Only staff can add question papers');
  const kind = KINDS.includes(b?.kind) ? b.kind : 'previous';
  const subjectCode = str(b?.subjectCode, 30), subjectName = str(b?.subjectName, 150);
  const branch = BRANCHES.includes(b?.branch) ? b.branch : 'All';
  const semester = Number(b?.semester);
  const examYear = str(b?.examYear, 20) || null;
  const title = str(b?.title, 150) || (kind === 'previous' ? `Board Paper${examYear ? ' ' + examYear : ''}` : kind === 'sample' ? 'Sample Paper' : 'Model Paper');
  if (!subjectName) return fail(400, 'Choose the subject');
  if (!Number.isInteger(semester) || semester < 1 || semester > 6) return fail(400, 'Choose the semester (1 to 6)');
  if (!b?.paperFileId) return fail(400, 'Choose the question paper file');
  db.exec('BEGIN');
  try {
    const p = takePending(u, b.paperFileId, 'question paper');
    if (!p.ok) { db.exec('ROLLBACK'); return p; }
    let answerId: string | null = null;
    if (b?.answerFileId) {
      const a = takePending(u, b.answerFileId, 'answer key');
      if (!a.ok) { db.exec('ROLLBACK'); return a; }
      answerId = a.blobId;
    }
    const id = newId('qp');
    db.prepare(`INSERT INTO exam_papers (id,kind,title,subject_code,subject_name,branch,semester,exam_year,paper_file_id,answer_file_id,uploaded_by_user_id,uploaded_by_name,
        answer_updated_by_name,answer_updated_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, kind, title, subjectCode || '-', subjectName, branch, semester, examYear, p.blobId, answerId, u.id, u.name, answerId ? u.name : null, answerId ? now : null, now, now);
    db.exec('COMMIT');
    return { ok: true, id };
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

/** Upload or replace the answer key of a paper. */
export function setAnswer(u: SessionUser, id: string, fileId: unknown, now = Date.now()): Result {
  if (!canManage(u)) return fail(403, 'Only staff can change answer keys');
  const r = findPaper(id);
  if (!r) return fail(404, 'Paper not found');
  db.exec('BEGIN');
  try {
    const a = takePending(u, fileId, 'answer key');
    if (!a.ok) { db.exec('ROLLBACK'); return a; }
    db.prepare('UPDATE exam_papers SET answer_file_id=?, answer_updated_by_name=?, answer_updated_at=?, updated_at=? WHERE id=?').run(a.blobId, u.name, now, now, id);
    dropBlob(r.answer_file_id);
    db.exec('COMMIT');
    return { ok: true };
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

/** Replace the question-paper file itself (e.g. a clearer scan). */
export function setPaperFile(u: SessionUser, id: string, fileId: unknown, now = Date.now()): Result {
  const r = findPaper(id);
  if (!r) return fail(404, 'Paper not found');
  if (!canRemove(u, r)) return fail(403, 'Only the admin or the teacher who added this paper can replace it');
  db.exec('BEGIN');
  try {
    const p = takePending(u, fileId, 'question paper');
    if (!p.ok) { db.exec('ROLLBACK'); return p; }
    db.prepare('UPDATE exam_papers SET paper_file_id=?, updated_at=? WHERE id=?').run(p.blobId, now, id);
    dropBlob(r.paper_file_id);
    db.exec('COMMIT');
    return { ok: true };
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

/** Remove a paper (and its files). A removed built-in sample is not created again. */
export function deletePaper(u: SessionUser, id: string, now = Date.now()): Result<{ title: string }> {
  const r = findPaper(id);
  if (!r) return fail(404, 'Paper not found');
  if (!canRemove(u, r)) return fail(403, 'Only the admin or the teacher who added this paper can remove it');
  db.exec('BEGIN');
  try {
    if (r.seed_key) {
      db.prepare('UPDATE exam_papers SET deleted_at=?, updated_at=? WHERE id=?').run(now, now, id);   // remember: do not create again
    } else {
      db.prepare('DELETE FROM exam_papers WHERE id=?').run(id);
      dropBlob(r.paper_file_id); dropBlob(r.answer_file_id);
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return { ok: true, title: `${r.subject_name} – ${r.title}` };
}

/** Admin: bring back every built-in sample paper that was removed, with its original answer key. */
export async function restoreSamples(u: SessionUser): Promise<Result<{ restored: number }>> {
  if (u.role !== 'admin') return fail(403, 'Only the admin can restore the built-in sample papers');
  const gone = db.prepare('SELECT id, paper_file_id, answer_file_id FROM exam_papers WHERE seed_key IS NOT NULL AND deleted_at IS NOT NULL').all() as any[];
  for (const r of gone) {
    db.prepare('DELETE FROM exam_papers WHERE id=?').run(r.id);
    dropBlob(r.paper_file_id); dropBlob(r.answer_file_id);
  }
  await seedSamplePapers();
  return { ok: true, restored: gone.length };
}

