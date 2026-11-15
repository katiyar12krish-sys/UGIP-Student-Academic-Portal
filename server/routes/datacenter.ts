// ===================================================================================================
// Data Center routes (Step 16): filtered student lists and counts, downloads (Excel / PDF / CSV),
// admin bulk upload of students and of one exam's marks.
// ===================================================================================================
import { Router } from 'express';
import { requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { seesSample } from '../auth/sample';
import type { SessionUser } from '../auth/session';
import { filterStudents, summarize, datasetTable, importStudents, DATASETS, type StudentFilter } from '../datacenter/service';

export const dataCenterRouter = Router();
const staff = requireRole('admin', 'faculty');
// S.
const s = (v: unknown) => (typeof v === 'string' ? v.slice(0, 60) : undefined);
// Filter of.
const filterOf = (q: any, u?: SessionUser): StudentFilter => ({ branch: s(q.branch), year: s(q.year), semester: s(q.semester), gender: s(q.gender), category: s(q.category), status: s(q.status), q: s(q.q), realOnly: !seesSample(u) });

// Filtered students + counts. Example: girls of all years -> /api/data/students?gender=Female
// Counts (total, boys / girls, category x gender, class-wise) are for exactly the filtered list.
dataCenterRouter.get('/data/students', staff, (req, res) => {
  const f = filterOf(req.query, req.user!);
  const rows = filterStudents(f);
  res.json({ summary: summarize(rows), rows: rows.map((r) => ({ id: r.id, rollNo: r.roll_no, name: r.name, branch: r.branch, year: r.year, semester: r.semester, gender: r.gender, category: r.category, status: r.record_status })) });
});

// A ready-to-export table: students | faculty (admin only) | subjects | marks | attendance
dataCenterRouter.get('/data/export/:dataset', staff, (req, res) => {
  const name = String(req.params.dataset);
  if (!(DATASETS as readonly string[]).includes(name)) return res.status(404).json({ error: 'Unknown data set' });
  const t = datasetTable(name, req.user!, filterOf(req.query, req.user!));
  if (!t) return res.status(403).json({ error: 'Only admin can download this' });
  audit(req.user!.username, 'export', `data_${name}`, null, `${t.rows.length} rows`);
  res.set('Cache-Control', 'no-store').json(t);
});

// Bulk upload of students (new + updates). Admin only. dryRun (default) only checks; apply:true saves.
dataCenterRouter.post('/data/students/import', requireRole('admin'), (req, res) => {
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'The file has no rows' });
  if (rows.length > 1500) return res.status(400).json({ error: 'Upload at most 1500 students at a time' });
  if (rows.some((r: unknown) => !r || typeof r !== 'object' || Array.isArray(r))) return res.status(400).json({ error: 'Rows are not in the expected format' });
  res.json(importStudents(rows, req.user!.username, req.body?.apply === true));
});
