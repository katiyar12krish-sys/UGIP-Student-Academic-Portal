// ===================================================================================================
// Makes the question-paper PDF and the answer-key PDF for a built-in sample paper, laid out like the
// UBTER "Diploma Semester Examination" papers (Section A / B / C, questions numbered straight through).
// Uses PDFKit with the free DejaVu fonts (they have ∫ √ π ² ≤ and the other maths signs).
// ===================================================================================================
import PDFDocument from 'pdfkit';
import { createRequire } from 'module';
import path from 'path';
import type { SamplePaper, SubjectPapers } from './content/types';

const require = createRequire(import.meta.url);
const FONT_DIR = path.join(path.dirname(require.resolve('dejavu-fonts-ttf/package.json')), 'ttf');
const F = { reg: path.join(FONT_DIR, 'DejaVuSans.ttf'), bold: path.join(FONT_DIR, 'DejaVuSans-Bold.ttf'), serif: path.join(FONT_DIR, 'DejaVuSerif.ttf'), serifBold: path.join(FONT_DIR, 'DejaVuSerif-Bold.ttf') };

export const INSTITUTE = 'Uttarakhand Government Institute of Polytechnic';
export const INSTITUTE_CODE = '090';
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const YEAR = ['', 'I', 'I', 'II', 'II', 'III', 'III'];
const SECTION = ['A', 'B', 'C', 'D'];
const M = 56;   // page margin left / right

export const sectionMarks = (s: { pick: number; each: number }) => s.pick * s.each;
export const paperMarks = (p: SamplePaper) => p.sections.reduce((t, s) => t + sectionMarks(s), 0);
const course = (b: string) => (b === 'All' ? 'Common to All Branches' : b === 'CSE' ? 'Computer Science & Engineering' : 'Civil Engineering');
const marksText = (each: number) => String(each).replace('.5', '½');

function render(build: (doc: PDFKit.PDFDocument) => void, title: string, code: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 60, left: M, right: M }, bufferPages: true, info: { Title: title, Author: INSTITUTE, Creator: 'UGIP Portal' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.registerFont('reg', F.reg).registerFont('bold', F.bold).registerFont('serif', F.serif).registerFont('serifBold', F.serifBold);
    build(doc);
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;                                // writing in the footer must not start a new page
      const y = doc.page.height - 42, W = doc.page.width - 2 * M;
      doc.font('serifBold').fontSize(9).fillColor('#0f172a').text(code, M, y, { width: W, lineBreak: false });
      doc.font('serif').text(`[ ${i + 1} ]`, M, y, { width: W, align: 'center', lineBreak: false });
      doc.font('reg').fontSize(7.5).fillColor('#64748b').text(i + 1 < range.count ? 'P.T.O.' : 'UGIP · Sample paper', M, y, { width: W, align: 'right', lineBreak: false });
    }
    doc.end();
  });
}

function header(doc: PDFKit.PDFDocument, s: SubjectPapers, p: SamplePaper, answer: boolean) {
  const W = doc.page.width - 2 * M;
  doc.font('reg').fontSize(8.5).fillColor('#475569').text(`UGIP (Institute Code ${INSTITUTE_CODE})  ·  practice paper – not an official UBTER paper`, { align: 'center' });
  doc.moveDown(0.5);
  doc.font('serifBold').fontSize(15).fillColor('#0f172a').text('DIPLOMA SEMESTER EXAMINATION', { align: 'center' });
  doc.font('bold').fontSize(11).fillColor(answer ? '#047857' : '#1e3a8a')
    .text(answer ? `ANSWER KEY / MODEL ANSWERS  –  SAMPLE PAPER, SET ${p.set}` : `SAMPLE PAPER  –  SET ${p.set}`, { align: 'center' });
  doc.moveDown(0.5);
  const rows: [string, string][] = [['Course', course(s.branch)], ['Code', s.code], ['Subject', s.name], ['Year / Sem.', `${YEAR[s.semester]} Year / ${ROMAN[s.semester]} Sem.`]];
  const x1 = M + W * 0.24, x2 = x1 + 80;
  for (const [k, v] of rows) {
    const y = doc.y;
    doc.font('serif').fontSize(11).fillColor('#0f172a').text(k, x1, y, { width: 78 });
    doc.text(`:  ${v}`, x2, y, { width: M + W - x2 });
  }
  doc.moveDown(0.4);
  const y = doc.y;
  doc.font('serifBold').fontSize(11).text('Time : 2½ Hours ]', M, y, { width: W / 2 });
  doc.text(`[ Max. Marks : ${paperMarks(p)}`, M + W / 2, y, { width: W / 2, align: 'right' });
  doc.moveTo(M, doc.y + 3).lineTo(M + W, doc.y + 3).lineWidth(1).strokeColor('#0f172a').stroke();
  doc.moveDown(0.6);
  doc.x = M;
  if (answer) {
    doc.font('reg').fontSize(8.5).fillColor('#475569').text('Model answers / key points for checking and self-study. Any correct method, equivalent wording or neat diagram that shows the same idea gets full credit.');
  } else {
    const n = p.sections.map((x) => WORDS[x.pick] || x.pick);
    doc.font('serifBold').fontSize(10).fillColor('#0f172a')
      .text(`Note : Attempt ${n[0]} questions from Section A, ${n[1]} questions from Section B and ${n[2]} questions from Section C. Illustrate answers with neat diagrams wherever necessary.`);
  }
}

/** Text with "\n" lines; lines starting with two spaces are indented a little more. */
function block(doc: PDFKit.PDFDocument, text: string, x: number, width: number, font: string, size: number, color: string) {
  doc.font(font).fontSize(size).fillColor(color);
  for (const line of text.split('\n')) {
    const extra = /^ {2,}/.test(line) ? 14 : 0;
    doc.text(line.trimStart() || ' ', x + extra, doc.y, { width: width - extra, lineGap: 1.5 });
  }
}
const ensureSpace = (doc: PDFKit.PDFDocument, need: number) => { if (doc.y + need > doc.page.height - doc.page.margins.bottom) doc.addPage(); };

function sectionTitle(doc: PDFKit.PDFDocument, i: number, pick: number, each: number) {
  ensureSpace(doc, 70);
  doc.moveDown(0.6);
  const W = doc.page.width - 2 * M;
  doc.font('serifBold').fontSize(12).fillColor('#0f172a').text(`SECTION – ${SECTION[i]}`, M, doc.y, { width: W, align: 'center', underline: true });
  doc.moveDown(0.25);
  const y = doc.y;
  doc.font('serifBold').fontSize(10.5).text(`Note : Attempt any ${WORDS[pick] || pick} questions.`, M, y, { width: W * 0.7 });
  doc.font('serif').text(`${pick}×${marksText(each)} = ${pick * each}`, M, y, { width: W, align: 'right' });
  doc.moveDown(0.35);
}

function questions(doc: PDFKit.PDFDocument, p: SamplePaper, withAnswers: boolean) {
  const W = doc.page.width - 2 * M;
  let n = 0;
  p.sections.forEach((sec, i) => {
    sectionTitle(doc, i, sec.pick, sec.each);
    for (const it of sec.items) {
      n++;
      ensureSpace(doc, withAnswers ? 50 : 28);
      const y = doc.y;
      doc.font(withAnswers ? 'serifBold' : 'serif').fontSize(10.5).fillColor('#0f172a').text(`${n}.`, M, y, { width: 26 });
      doc.y = y;
      block(doc, it.q, M + 28, W - 28, withAnswers ? 'serifBold' : 'serif', 10.5, '#0f172a');
      if (withAnswers) {
        doc.moveDown(0.15);
        doc.font('bold').fontSize(8.5).fillColor('#047857').text(`Answer  [${marksText(sec.each)} mark${sec.each > 1 ? 's' : ''}]`, M + 28, doc.y);
        block(doc, it.a, M + 28, W - 28, 'reg', 9.5, '#1f2937');
        doc.moveDown(0.55);
      } else doc.moveDown(0.3);
    }
  });
  doc.moveDown(1);
  doc.font('serifBold').fontSize(10).fillColor('#0f172a').text('* * * * *', M, doc.y, { width: W, align: 'center' });
}

export function paperPdf(s: SubjectPapers, p: SamplePaper): Promise<Buffer> {
  return render((doc) => { header(doc, s, p, false); questions(doc, p, false); }, `${s.code} ${s.name} – Sample Paper Set ${p.set}`, s.code);
}
export function answerPdf(s: SubjectPapers, p: SamplePaper): Promise<Buffer> {
  return render((doc) => { header(doc, s, p, true); questions(doc, p, true); }, `${s.code} ${s.name} – Answer Key Set ${p.set}`, s.code);
}

// ---------------------------------------------------------------------------------------------------
// Answer key for an OLD board paper (the college's scanned paper). Its layout follows that paper:
// any number of parts ("Paper 1 – 2025 Winter, Q.1 …"), each with questions and model answers.
// ---------------------------------------------------------------------------------------------------
export interface OldAnswerKey { note?: string; parts: { title: string; items: [string, string][] }[] }
export interface OldPaperMeta { subjectCode: string; subjectName: string; branch: string; semester: number; title: string }

export function oldAnswerPdf(m: OldPaperMeta, key: OldAnswerKey): Promise<Buffer> {
  return render((doc) => {
    const W = doc.page.width - 2 * M;
    doc.font('reg').fontSize(8.5).fillColor('#475569').text(`UGIP (Institute Code ${INSTITUTE_CODE})  ·  model answers prepared by the institute – not issued by UBTER`, { align: 'center' });
    doc.moveDown(0.5);
    doc.font('serifBold').fontSize(15).fillColor('#0f172a').text('ANSWER KEY / MODEL ANSWERS', { align: 'center' });
    doc.font('bold').fontSize(11).fillColor('#047857').text(`Old board paper: ${m.title}`, { align: 'center' });
    doc.moveDown(0.4);
    doc.font('serif').fontSize(11).fillColor('#0f172a').text(`${m.subjectCode}  ·  ${m.subjectName}  ·  Sem ${ROMAN[m.semester]}  ·  ${course(m.branch)}`, { align: 'center' });
    doc.moveTo(M, doc.y + 4).lineTo(M + W, doc.y + 4).lineWidth(1).strokeColor('#0f172a').stroke();
    doc.moveDown(0.6);
    doc.font('reg').fontSize(8.5).fillColor('#475569').text(key.note || 'Questions are given in short; read the full question in the paper. Any correct method, equivalent wording or neat diagram gets full credit.', M, doc.y, { width: W });
    for (const part of key.parts) {
      ensureSpace(doc, 70);
      doc.moveDown(0.7);
      doc.font('serifBold').fontSize(12).fillColor('#0f172a').text(part.title, M, doc.y, { width: W, underline: true });
      doc.moveDown(0.3);
      for (const [q, a] of part.items) {
        ensureSpace(doc, 50);
        block(doc, q, M, W, 'serifBold', 10, '#0f172a');
        doc.moveDown(0.1);
        block(doc, a, M + 14, W - 14, 'reg', 9.5, '#1f2937');
        doc.moveDown(0.5);
      }
    }
    doc.moveDown(1);
    doc.font('serifBold').fontSize(10).fillColor('#0f172a').text('* * * * *', M, doc.y, { width: W, align: 'center' });
  }, `${m.subjectCode} ${m.subjectName} – Answer Key (old paper)`, m.subjectCode);
}
