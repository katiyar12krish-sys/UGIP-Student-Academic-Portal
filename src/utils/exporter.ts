// Export any table as a real Excel file (.xlsx), a PDF (via the browser's "Save as PDF") or CSV.
// No extra npm package: the .xlsx file is written here (a .xlsx is a zip of small XML files).
// Hindi / English text both work. Numbers stay numbers in Excel; everything else is text.

// Data shape: cell.
export type Cell = string | number | null | undefined;
// Data shape: export table.
export interface ExportTable {
  title: string;               // shown at the top of the sheet / page
  subtitle?: string;           // e.g. "CSE - Year 2 - printed 26 Oct 2026"
  columns: string[];           // header row
  rows: Cell[][];              // one array per row, same length as columns
  filename: string;            // without extension
  sheetName?: string;          // Excel tab name (max 31 chars)
  footer?: string;             // e.g. "Confidential - for college use only"
}

const COLLEGE = 'Uttarakhand Government Institute of Polytechnic';
const enc = new TextEncoder();

// Safe name.
const safeName = (s: string) => (s || 'export').replace(/[^\w\-.\u0900-\u097F]+/g, '_').slice(0, 80);
// Xml esc.
const xmlEsc = (s: string) =>
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A text that Excel would run as a formula (=, +, -, @) is stored as plain text so nobody can plant a formula in a student name.
const isNum = (v: Cell): v is number => typeof v === 'number' && Number.isFinite(v);
// Text.
const text = (v: Cell) => (v === null || v === undefined ? '' : String(v));

// Col name.
function colName(i: number) {
  let n = i + 1, s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// ---------- minimal zip writer (no compression) ----------
let CRC_TABLE: Uint32Array | null = null;
// Crc32.
function crc32(buf: Uint8Array) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC_TABLE[n] = c >>> 0; }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Zip store.
export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const dosTime = 0, dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, f.data.length, true); lh.setUint32(22, f.data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, f.data.length, true); ch.setUint32(24, f.data.length, true); ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + f.data.length;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
  let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}

// ---------- .xlsx ----------
export function buildXlsx(tables: ExportTable[]): Uint8Array {
  const sheets = tables.map((t, i) => {
    const hdrRow = 4; // 1 college, 2 title, 3 subtitle, then the table
    const widths = t.columns.map((c, ci) => {
      let w = c.length;
      for (const r of t.rows) w = Math.max(w, text(r[ci]).length);
      return Math.min(Math.max(w + 2, 8), 45);
    });
    // Cell.
    const cell = (ref: string, v: Cell, style: number) =>
      isNum(v) ? `<c r="${ref}" s="${style}"><v>${v}</v></c>` : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(text(v))}</t></is></c>`;
    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`;
    xml += `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${hdrRow}" topLeftCell="A${hdrRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
    xml += `<cols>${widths.map((w, k) => `<col min="${k + 1}" max="${k + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>`;
    xml += `<row r="1">${cell('A1', COLLEGE, 1)}</row><row r="2">${cell('A2', t.title, 1)}</row><row r="3">${cell('A3', t.subtitle || '', 0)}</row>`;
    xml += `<row r="${hdrRow}">${t.columns.map((c, k) => cell(colName(k) + hdrRow, c, 2)).join('')}</row>`;
    t.rows.forEach((r, ri) => {
      const rn = hdrRow + 1 + ri;
      xml += `<row r="${rn}">${t.columns.map((_, k) => cell(colName(k) + rn, r[k], isNum(r[k]) ? 3 : 0)).join('')}</row>`;
    });
    if (t.footer) { const rn = hdrRow + t.rows.length + 2; xml += `<row r="${rn}">${cell('A' + rn, t.footer, 0)}</row>`; }
    xml += `</sheetData><autoFilter ref="A${hdrRow}:${colName(Math.max(t.columns.length - 1, 0))}${hdrRow + Math.max(t.rows.length, 1)}"/></worksheet>`;
    return xml;
  });
  const names = tables.map((t, i) => xmlEsc((t.sheetName || t.title || `Sheet${i + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)));
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="12"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBBBBBB"/></left><right style="thin"><color rgb="FFBBBBBB"/></right><top style="thin"><color rgb="FFBBBBBB"/></top><bottom style="thin"><color rgb="FFBBBBBB"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment wrapText="1" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment horizontal="right"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files = [
    { name: '[Content_Types].xml', data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`) },
    { name: '_rels/.rels', data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
    { name: 'xl/workbook.xml', data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) },
    { name: 'xl/styles.xml', data: enc.encode(styles) },
    ...sheets.map((x, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(x) })),
  ];
  return zipStore(files);
}

// ---------- CSV ----------
export function buildCsv(t: ExportTable): string {
  // Q.
  const q = (v: Cell) => {
    let s = text(v);
    if (/^[=+\-@]/.test(s) && Number.isNaN(Number(s))) s = "'" + s; // stop spreadsheet formulas
    return `"${s.replace(/"/g, '""')}"`;
  };
  return '\ufeff' + [t.columns, ...t.rows].map((r) => r.map(q).join(',')).join('\r\n');
}

// ---------- PDF (browser print dialog -> "Save as PDF"; keeps Hindi text exactly) ----------
const htmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Build print html.
export function buildPrintHtml(t: ExportTable, autoPrint = true): string {
  const landscape = t.columns.length > 7;
  const when = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  return `<!doctype html><html><head><meta charset="utf-8"><title>${htmlEsc(safeName(t.filename))}</title><style>
@page{size:A4 ${landscape ? 'landscape' : 'portrait'};margin:12mm}
body{font-family:'Segoe UI','Noto Sans Devanagari','Mangal',Arial,sans-serif;color:#111;font-size:${t.columns.length > 12 ? 8 : 10.5}px}
h1{font-size:16px;margin:0}h2{font-size:13px;margin:2px 0 0}p{margin:2px 0 8px;color:#444}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:3px 5px;text-align:left;vertical-align:top;word-break:break-word}
th{background:#1e3a8a;color:#fff}thead{display:table-header-group}tr{page-break-inside:avoid}tbody tr:nth-child(even){background:#f3f4f6}
.f{margin-top:10px;font-size:9px;color:#555}
</style></head><body><h1>${COLLEGE}</h1><h2>${htmlEsc(t.title)}</h2><p>${htmlEsc(t.subtitle || '')} &nbsp; Printed: ${htmlEsc(when)} &nbsp; Rows: ${t.rows.length}</p>
<table><thead><tr>${t.columns.map((c) => `<th>${htmlEsc(c)}</th>`).join('')}</tr></thead><tbody>
${t.rows.length ? t.rows.map((r) => `<tr>${t.columns.map((_, k) => `<td>${htmlEsc(text(r[k]))}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${t.columns.length}">No data</td></tr>`}
</tbody></table><div class="f">${htmlEsc(t.footer || 'Confidential - for college use only')}</div>${autoPrint ? '<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},300)}<\/script>' : ''}</body></html>`;
}

// Download.
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Export excel.
export function exportExcel(...tables: ExportTable[]) {
  const bytes = buildXlsx(tables);
  download(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), safeName(tables[0].filename) + '.xlsx');
}
// Export csv.
export function exportCsv(t: ExportTable) {
  download(new Blob([buildCsv(t)], { type: 'text/csv;charset=utf-8' }), safeName(t.filename) + '.csv');
}
// Export pdf.
export function exportPdf(t: ExportTable) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow!.document;
  doc.open(); doc.write(buildPrintHtml(t)); doc.close();
  setTimeout(() => iframe.remove(), 60_000);
}
