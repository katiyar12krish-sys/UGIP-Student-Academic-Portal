// Reads an uploaded .xlsx or .csv file in the browser and returns rows as objects keyed by the header text.
// No npm package: a .xlsx is a zip of XML files; the zip is opened with the browser's built-in DecompressionStream.
// The header row is found automatically (files exported from this portal have the college name / title above the table).

// Data shape: sheet row.
export type SheetRow = Record<string, string | number>;

const dec = new TextDecoder('utf-8');

// Inflate raw.
async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Minimal zip reader (central directory): returns { path: bytes }. */
export async function unzip(buf: Uint8Array): Promise<Record<string, Uint8Array>> {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let end = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error('This is not an Excel (.xlsx) file');
  const count = v.getUint16(end + 10, true);
  let p = v.getUint32(end + 16, true);
  const out: Record<string, Uint8Array> = {};
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('Damaged Excel file');
    const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true);
    const nlen = v.getUint16(p + 28, true), xlen = v.getUint16(p + 30, true), clen = v.getUint16(p + 32, true), lho = v.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen));
    const lnlen = v.getUint16(lho + 26, true), lxlen = v.getUint16(lho + 28, true);
    const start = lho + 30 + lnlen + lxlen;
    const raw = buf.subarray(start, start + csize);
    if (/^xl\/(worksheets\/sheet\d+|sharedStrings|workbook)\.xml$/.test(name)) {
      out[name] = method === 0 ? raw : method === 8 ? await inflateRaw(raw) : (() => { throw new Error('Unsupported Excel compression'); })();
    }
    p += 46 + nlen + xlen + clen;
  }
  return out;
}

// Unesc.
const unesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, '&');
// Col index.
const colIndex = (ref: string) => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
// Text of.
const textOf = (xml: string) => [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unesc(m[1])).join('');

/** All cells of the first sheet as a grid of strings / numbers. */
export async function readXlsxGrid(bytes: Uint8Array): Promise<(string | number)[][]> {
  const z = await unzip(bytes);
  const wb = z['xl/workbook.xml'] ? dec.decode(z['xl/workbook.xml']) : '';
  void wb;
  const sheetName = Object.keys(z).filter((k) => /worksheets\/sheet\d+\.xml$/.test(k)).sort((a, b) => parseInt(a.match(/(\d+)\.xml/)![1]) - parseInt(b.match(/(\d+)\.xml/)![1]))[0];
  if (!sheetName) throw new Error('No sheet found in the Excel file');
  const shared = z['xl/sharedStrings.xml'] ? [...dec.decode(z['xl/sharedStrings.xml']).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1])) : [];
  const xml = dec.decode(z[sheetName]);
  const grid: (string | number)[][] = [];
  for (const row of xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r: (string | number)[] = [];
    for (const c of (row[1] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1], body = c[2] || '';
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
      const t = attrs.match(/\bt="(\w+)"/)?.[1];
      let val: string | number = '';
      if (t === 'inlineStr') val = textOf(body);
      else {
        const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (v !== undefined) val = t === 's' ? shared[+v] ?? '' : t === 'str' || t === 'e' ? unesc(v) : t === 'b' ? (v === '1' ? 'TRUE' : 'FALSE') : Number.isFinite(Number(v)) ? Number(v) : unesc(v);
      }
      const idx = ref ? colIndex(ref) : r.length;
      while (r.length < idx) r.push('');
      r[idx] = val;
    }
    grid.push(r);
  }
  return grid;
}

/** CSV with quotes, "" escapes, commas or semicolons, and a leading BOM. */
export function parseCsv(textIn: string): string[][] {
  const t = textIn.replace(/^\ufeff/, '');
  const first = t.split(/\r?\n/, 1)[0] || '';
  const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : first.includes('\t') && !first.includes(',') ? '\t' : ',';
  const rows: string[][] = []; let row: string[] = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

/** Turns a grid into row objects. The header row is the first row that has at least `minHeaders` of the expected header words. */
export function gridToRows(grid: (string | number)[][], expect: string[] = ['roll', 'name']): SheetRow[] {
  // Norm.
  const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  let h = grid.findIndex((r) => expect.every((e) => r.some((c) => norm(c).includes(e))));
  if (h < 0) h = grid.findIndex((r) => r.filter((c) => String(c).trim() !== '').length >= 2);
  if (h < 0) return [];
  const head = grid[h].map((c) => String(c ?? '').trim());
  const out: SheetRow[] = [];
  for (const r of grid.slice(h + 1)) {
    if (r.every((c) => String(c ?? '').trim() === '')) continue;
    const o: SheetRow = {};
    head.forEach((k, i) => { if (k && r[i] !== undefined && String(r[i]).trim() !== '') o[k] = typeof r[i] === 'number' ? (r[i] as number) : String(r[i]).trim(); });
    if (Object.keys(o).length) out.push(o);
  }
  return out;
}

// Read sheet file.
export async function readSheetFile(file: File, expect?: string[]): Promise<SheetRow[]> {
  if (file.size > 8_000_000) throw new Error('File is too big (more than 8 MB)');
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) return gridToRows(await readXlsxGrid(new Uint8Array(await file.arrayBuffer())), expect);
  if (name.endsWith('.csv') || name.endsWith('.txt')) return gridToRows(parseCsv(await file.text()), expect);
  if (name.endsWith('.xls')) throw new Error('Old .xls files are not supported. In Excel choose Save As > Excel Workbook (.xlsx)');
  throw new Error('Choose an Excel (.xlsx) or CSV file');
}
