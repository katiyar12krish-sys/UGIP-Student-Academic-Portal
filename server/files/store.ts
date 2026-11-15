// ===================================================================================================
// Uploaded files (Step 9): one place that stores them on disk, checks type and size, and removes
// files that were uploaded but never used.
// ===================================================================================================
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db, DATA_DIR } from '../db/connection';

// Step 9: one place that stores uploaded files. Materials use it now; notices, submissions and doubts can use it later.
//  - files live in data/uploads/<id>; the name on disk is random, nothing the user typed ever reaches a path
//  - the type is decided here from the file's first bytes (the browser's file name and Content-Type are not trusted)
//  - only PDF, JPEG, PNG and Word / PowerPoint / Excel (.docx .pptx .xlsx) are accepted; no HTML, SVG, scripts, programs, archives

export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const MAX_UPLOAD_BYTES = Math.max(1, Number(process.env.MAX_UPLOAD_MB) || 10) * 1024 * 1024;
export const MAX_PENDING_PER_USER = 10;
export const PENDING_MAX_AGE_MS = 3600_000;

// Data shape: sniffed.
export interface Sniffed { mime: string; ext: string; kind: 'pdf' | 'image' | 'doc' | 'audio' }
const OFFICE: [string, string, string][] = [
  ['word/document.xml', 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['ppt/presentation.xml', 'pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ['xl/workbook.xml', 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
];

/** What is this file really? null = not an accepted type. */
export function sniff(b: Buffer): Sniffed | null {
  if (b.length < 8) return null;
  if (b.subarray(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf', kind: 'pdf' };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg', kind: 'image' };
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png', kind: 'image' };
  // Voice recordings (Step 13, chat only: savePending refuses audio unless the caller says audio is allowed).
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { mime: 'audio/webm', ext: 'webm', kind: 'audio' };        // Chrome / Firefox / Android
  if (b.subarray(0, 4).toString('latin1') === 'OggS') return { mime: 'audio/ogg', ext: 'ogg', kind: 'audio' };
  if (b.subarray(4, 8).toString('latin1') === 'ftyp') return { mime: 'audio/mp4', ext: 'm4a', kind: 'audio' };                          // Safari / iPhone
  if (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WAVE') return { mime: 'audio/wav', ext: 'wav', kind: 'audio' };
  if (b.subarray(0, 3).toString('latin1') === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { mime: 'audio/mpeg', ext: 'mp3', kind: 'audio' };
  // Office files are zip files that contain [Content_Types].xml plus the part that names the program.
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4 && b.subarray(0, 4096).includes('[Content_Types].xml')) {
    for (const [part, ext, mime] of OFFICE) if (b.includes(part)) return { mime, ext, kind: 'doc' };
  }
  return null;
}

/** A file name that is safe to show and to put in a download header: no folders, no control characters, right extension. */
export function cleanName(raw: string, ext: string): string {
  const last = String(raw || '').split(/[\\/]/).pop() || '';                      // some browsers send a full path: keep only the last part
  const n = last.normalize('NFC').replace(/[\u0000-\u001f\u007f"*:?<>|;]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').trim();
  const dot = n.lastIndexOf('.');
  const base = (dot > 0 ? n.slice(0, dot) : n).trim().slice(0, 100) || 'file';
  return `${base}.${ext}`;                                                           // the extension always matches what the file really is
}

const ID_RE = /^f-[a-f0-9]{24}$/;
// File on disk.
export const fileOnDisk = (id: string): string => {
  if (!ID_RE.test(id)) throw new Error('bad file id');
  return path.join(UPLOAD_DIR, id);
};

// Data shape: save result.
export type SaveResult = { ok: true; file: StoredFileDto } | { ok: false; status: number; error: string };
// Data shape: stored file dto.
export interface StoredFileDto { fileId: string; name: string; size: number; mime: string; kind: Sniffed['kind'] }
// Dto.
const dto = (r: any, k: Sniffed['kind']): StoredFileDto => ({ fileId: r.id, name: r.original_name, size: r.size, mime: r.mime, kind: k });

/** Step one of an upload: check the bytes, store them, remember them as PENDING for this user. */
export function savePending(userId: string, body: unknown, rawName: string, now = Date.now(), opts: { audio?: boolean } = {}): SaveResult {
  if (!Buffer.isBuffer(body) || !body.length) return { ok: false, status: 400, error: 'No file received' };
  if (body.length > MAX_UPLOAD_BYTES) return { ok: false, status: 413, error: `The file is larger than ${Math.round(MAX_UPLOAD_BYTES / 1048576)} MB` };
  const t = sniff(body);
  if (!t || (t.kind === 'audio' && !opts.audio)) return { ok: false, status: 415, error: 'Only PDF, JPEG, PNG, Word (.docx), PowerPoint (.pptx) and Excel (.xlsx) files are accepted' };
  const pending = db.prepare('SELECT COUNT(*) n FROM stored_files WHERE uploaded_by=? AND attached_to IS NULL').get(userId) as any;
  if (pending.n >= MAX_PENDING_PER_USER) return { ok: false, status: 429, error: 'Too many uploaded files are waiting to be used. Finish or wait an hour.' };
  const id = `f-${crypto.randomBytes(12).toString('hex')}`;
  const p = fileOnDisk(id), tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, body, { mode: 0o600 });
  fs.renameSync(tmp, p);
  const name = cleanName(rawName, t.ext);
  db.prepare('INSERT INTO stored_files (id,original_name,mime,size,sha256,uploaded_by,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, name, t.mime, body.length, crypto.createHash('sha256').update(body).digest('hex'), userId, now);
  return { ok: true, file: dto({ id, original_name: name, size: body.length, mime: t.mime }, t.kind) };
}

// Find file.
export const findFile = (id: string): any => (ID_RE.test(id) ? db.prepare('SELECT * FROM stored_files WHERE id=?').get(id) : undefined);
// Kind of mime.
export const kindOfMime = (mime: string): Sniffed['kind'] => (mime === 'application/pdf' ? 'pdf' : mime.startsWith('image/') ? 'image' : mime.startsWith('audio/') ? 'audio' : 'doc');

/** Delete the file from disk and the table. */
export function removeFile(id: string) {
  if (!ID_RE.test(id)) return;
  try { fs.rmSync(fileOnDisk(id), { force: true }); } catch { /* already gone */ }
  db.prepare('DELETE FROM stored_files WHERE id=?').run(id);
}

/** Pending files nobody used within an hour, and files on disk that have no row (a crash between the two steps). */
export function sweepUploads(now = Date.now()): number {
  let n = 0;
  for (const r of db.prepare('SELECT id FROM stored_files WHERE attached_to IS NULL AND created_at < ?').all(now - PENDING_MAX_AGE_MS) as any[]) { removeFile(r.id); n++; }
  for (const f of fs.readdirSync(UPLOAD_DIR)) {
    const full = path.join(UPLOAD_DIR, f);
    const known = ID_RE.test(f) && db.prepare('SELECT 1 FROM stored_files WHERE id=?').get(f);
    if (known) continue;
    try { if (now - fs.statSync(full).mtimeMs > PENDING_MAX_AGE_MS) { fs.rmSync(full, { force: true }); n++; } } catch { /* ignore */ }
  }
  return n;
}
