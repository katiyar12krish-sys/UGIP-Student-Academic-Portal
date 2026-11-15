// ===================================================================================================
// Browser calls for the Data Center (filters, counts, downloads, bulk upload).
// ===================================================================================================
import { call } from './academicApi';
import type { ExportTable } from '../utils/exporter';

// Data shape: dc filter.
export interface DcFilter { branch: string; year: string; semester: string; gender: string; category: string; status: string; q: string }
// Data shape: dc summary.
export interface DcSummary {
  total: number; byGender: Record<string, number>; byCategory: Record<string, number>;
  matrix: Record<string, Record<string, number>>; byClass: { branch: string; year: number; total: number; Male: number; Female: number; Other: number; Unknown: number }[];
}
// Data shape: dc row.
export interface DcRow { id: string; rollNo: string; name: string; branch: string; year: number; semester: number; gender: string | null; category: string | null; status: string | null }
// Data shape: import result.
export interface ImportResult { summary: { total: number; created: number; updated: number; unchanged: number; errors: number; applied: boolean }; results: { row: number; rollNo: string; name: string; action: 'create' | 'update' | 'unchanged' | 'error'; message: string }[] }

// Qs.
const qs = (f: Partial<DcFilter>) => new URLSearchParams(Object.entries(f).filter(([, v]) => v && v !== 'all') as [string, string][]).toString();

export const dataCenterApi = {
  students: (f: Partial<DcFilter>) => call<{ summary: DcSummary; rows: DcRow[] }>('GET', `/api/data/students?${qs(f)}`),
  table: (dataset: string, f: Partial<DcFilter>) => call<ExportTable>('GET', `/api/data/export/${dataset}?${qs(f)}`),
  importStudents: (rows: unknown[], apply: boolean) => call<ImportResult>('POST', '/api/data/students/import', { rows, apply }),
};
