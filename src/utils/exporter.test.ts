// ===================================================================================================
// Tests for the Excel / PDF / CSV exporter (run: npm run test:export).
// ===================================================================================================
import assert from 'assert';
import { buildXlsx, buildCsv, buildPrintHtml, type ExportTable } from './exporter';

const t: ExportTable = {
  title: 'Class <b>list</b>', columns: ['Roll', 'नाम', 'Marks'], filename: 'x',
  rows: [['2409005001', 'अमित कुमार', 45], ['2409005002', '=HYPERLINK("http://x")', 38.5], ['3', '<script>alert(1)</script>', 'a & b']],
};
const x = buildXlsx([t]);
assert.strictEqual(String.fromCharCode(x[0], x[1]), 'PK', 'xlsx is a zip');
const asText = Buffer.from(x).toString('utf8');
for (const part of ['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/styles.xml']) assert(asText.includes(part), part);
assert(asText.includes('अमित कुमार'), 'Hindi kept');
assert(asText.includes('&lt;script&gt;'), 'xml escaped');
assert(!asText.includes('<script>'), 'no raw script in xlsx');
assert(asText.includes('<v>38.5</v>'), 'numbers stay numbers');

const csv = buildCsv(t);
assert(csv.includes(`"'=HYPERLINK`), 'formula neutralised in csv');

const html = buildPrintHtml(t, false);
assert(!html.includes('<script>alert'), 'html escaped');
assert(html.includes('&lt;script&gt;'), 'html escaped 2');
assert(html.includes('landscape') === false, '3 columns = portrait');
assert(buildPrintHtml({ ...t, columns: Array(9).fill('c'), rows: [] }, false).includes('landscape'), 'wide = landscape');
console.log('export tests: ok');
