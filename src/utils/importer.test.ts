// ===================================================================================================
// Tests for the Excel / CSV importer used by bulk upload (run: npm run test:importer).
// ===================================================================================================
import assert from 'assert';
import { buildXlsx } from './exporter';
import { readXlsxGrid, gridToRows, parseCsv } from './importer';

const cols = ['Roll No', 'नाम', 'Gender', '10th %'];
const bytes = buildXlsx([{ title: 'Students', subtitle: 'x', columns: cols, filename: 'f', rows: [['2409001', 'अमित <कुमार> & Co', 'Female', 81.5], ['2409002', '=SUM(A1)', '', 70]] }]);
const rows = gridToRows(await readXlsxGrid(bytes), ['roll']);
assert.strictEqual(rows.length, 2, 'title rows above the header are skipped');
assert.deepStrictEqual(rows[0], { 'Roll No': '2409001', 'नाम': 'अमित <कुमार> & Co', Gender: 'Female', '10th %': 81.5 });
assert.strictEqual(rows[1].Gender, undefined, 'blank cell is left out');

const csv = parseCsv('\ufeffRoll No,Name,Address\r\n"1","A, B","line ""x"""\r\n\r\n2,C,\r\n');
assert.deepStrictEqual(csv[1], ['1', 'A, B', 'line "x"']);
assert.strictEqual(gridToRows(csv, ['roll']).length, 2);
assert.strictEqual(parseCsv('Roll;Name\n1;A')[0].length, 2, 'semicolon separated');
console.log('importer tests: ok');
