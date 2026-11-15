// ===================================================================================================
// Privacy consent (DPDP Act 2023).
// Records what each person agreed to (portal services, photo, SMS / notifications), consent given by a parent
// for a minor, withdrawal, and whether consent is still required before the person can use the portal.
// ===================================================================================================
import { db } from '../db/connection';
import { destroyAllSessions } from './session';
import { audit } from './service';
import { NOTICE_VERSION } from './policy';
import fs from 'fs';
import { photoFile } from '../db/photoStore';
import { dropAllNotificationData } from '../notify/subs';

/**
 * DPDP Act 2023 consent, kept as an append-only ledger (consent_records).
 *  - service        required to use the portal (notice acknowledgement). Asked again whenever NOTICE_VERSION changes.
 *  - photo          optional: store a profile photo on the server
 *  - notifications  optional: SMS / alerts about attendance, marks, notices
 * Students are treated as MINORS until staff confirm they are 18+ (users.adult_verified). For a minor the optional
 * purposes can only be granted/withdrawn by a linked parent login (DPDP s.9: verifiable parental consent).
 */
export { NOTICE_VERSION };
// Data shape: purpose.
export type Purpose = 'service' | 'photo' | 'notifications';
export const PURPOSES: Purpose[] = ['service', 'photo', 'notifications'];
export const OPTIONAL: Purpose[] = ['photo', 'notifications'];

// true / false: is minor?
export const isMinor = (u: { role: string; adult_verified?: number }) => u.role === 'student' && !u.adult_verified;

// Latest.
function latest(subjectId: string, purpose: Purpose) {
  return db.prepare('SELECT granted, notice_version FROM consent_records WHERE subject_user_id=? AND purpose=? ORDER BY id DESC LIMIT 1').get(subjectId, purpose) as any;
}

/** Has this person acknowledged the CURRENT notice? (gate for every logged-in request) */
export function serviceAcknowledged(userId: string): boolean {
  const r = latest(userId, 'service');
  return !!r && !!r.granted && r.notice_version === NOTICE_VERSION;
}

// true / false: has consent?
export function hasConsent(subjectId: string, purpose: Purpose): boolean {
  if (purpose === 'service') return serviceAcknowledged(subjectId);
  const r = latest(subjectId, purpose);
  return !!r && !!r.granted;
}

// Consent state.
export function consentState(subjectId: string): Record<Purpose, boolean> {
  return { service: hasConsent(subjectId, 'service'), photo: hasConsent(subjectId, 'photo'), notifications: hasConsent(subjectId, 'notifications') };
}

// Write.
function write(subjectId: string, actorId: string, purpose: Purpose, granted: boolean, ctx: { ip?: string; ua?: string }) {
  db.prepare('INSERT INTO consent_records (subject_user_id,actor_user_id,purpose,granted,notice_version,ip,user_agent) VALUES (?,?,?,?,?,?,?)')
    .run(subjectId, actorId, purpose, granted ? 1 : 0, NOTICE_VERSION, ctx.ip ?? null, (ctx.ua ?? '').slice(0, 200));
}

/** Withdrawing photo consent erases the stored photo. */
function onWithdrawn(subjectId: string, purpose: Purpose) {
  if (purpose === 'photo') {
    try { fs.rmSync(photoFile(subjectId), { force: true }); } catch { /* already gone */ }
    db.prepare('UPDATE users SET photo_version=NULL WHERE id=?').run(subjectId);
  }
  if (purpose === 'notifications') dropAllNotificationData(subjectId);   // devices are forgotten, queued pushes are cancelled
}

// Data shape: ctx.
type Ctx = { ip?: string; ua?: string };
// Data shape: consent result.
export type ConsentResult = { ok: true; ignored?: Purpose[] } | { ok: false; status: number; error: string };

/** The logged-in person records their own choices. Optional purposes of a minor are ignored (their parent decides). */
export function saveOwn(user: { id: string; role: string; username: string }, grants: Partial<Record<Purpose, unknown>>, ctx: Ctx): ConsentResult {
  if (grants.service !== true) return { ok: false, status: 400, error: 'You need to accept the privacy notice to use the portal. You can also withdraw and leave.' };
  const row = db.prepare('SELECT role, adult_verified FROM users WHERE id=?').get(user.id) as any;
  const minor = isMinor(row);
  if (!serviceAcknowledged(user.id)) write(user.id, user.id, 'service', true, ctx);
  const ignored: Purpose[] = [];
  for (const p of OPTIONAL) {
    if (!(p in grants)) continue;
    if (minor) { ignored.push(p); continue; }
    const want = grants[p] === true;
    if (want !== hasConsent(user.id, p)) { write(user.id, user.id, p, want, ctx); if (!want) onWithdrawn(user.id, p); }
  }
  audit(user.username, 'consent_saved', 'user', user.id, `v=${NOTICE_VERSION}`);
  return { ok: true, ignored: ignored.length ? ignored : undefined };
}

/** A parent records the optional choices for a linked child who is still a minor. */
export function saveForChild(parent: { id: string; username: string; childIds: string[] }, childId: string, grants: Partial<Record<Purpose, unknown>>, ctx: Ctx): ConsentResult {
  if (!parent.childIds.includes(childId)) return { ok: false, status: 403, error: 'Not your child' };
  const child = db.prepare('SELECT id, role, adult_verified FROM users WHERE id=?').get(childId) as any;
  if (!child) return { ok: false, status: 404, error: 'Student not found' };
  if (!isMinor(child)) return { ok: false, status: 400, error: 'This student is an adult and gives their own consent' };
  for (const p of OPTIONAL) {
    if (!(p in grants)) continue;
    const want = grants[p] === true;
    if (want !== hasConsent(childId, p)) { write(childId, parent.id, p, want, ctx); if (!want) onWithdrawn(childId, p); }
  }
  audit(parent.username, 'consent_saved_for_child', 'user', childId, `v=${NOTICE_VERSION}`);
  return { ok: true };
}

/** Withdrawing "service" ends the person's sessions; they must accept again (or stop using the portal). */
export function withdrawService(user: { id: string; username: string }, ctx: Ctx) {
  write(user.id, user.id, 'service', false, ctx);
  for (const p of OPTIONAL) if (hasConsent(user.id, p)) { write(user.id, user.id, p, false, ctx); onWithdrawn(user.id, p); }
  destroyAllSessions(user.id);
  audit(user.username, 'consent_withdrawn_service', 'user', user.id);
}

/** Admin confirms a student is 18+. Optional consents given by the parent no longer count: the student is asked again. */
export function setAdultVerified(studentUserId: string, adult: boolean, actor: string): boolean {
  const u = db.prepare("SELECT id FROM users WHERE id=? AND role='student'").get(studentUserId);
  if (!u) return false;
  db.prepare('UPDATE users SET adult_verified=? WHERE id=?').run(adult ? 1 : 0, studentUserId);
  for (const p of OPTIONAL) if (hasConsent(studentUserId, p)) { write(studentUserId, actor, p, false, {}); onWithdrawn(studentUserId, p); }
  audit(actor, adult ? 'adult_verified' : 'adult_unverified', 'user', studentUserId);
  return true;
}

// ---------- the notice itself (draft wording: have the institute / legal adviser review it before go-live) ----------
const grievance = () => process.env.GRIEVANCE_EMAIL || 'the college office (grievance officer contact to be configured by the administrator)';
// Notice text.
export function noticeText() {
  return {
    version: NOTICE_VERSION,
    en: {
      title: 'Privacy Notice (Digital Personal Data Protection Act, 2023)',
      sections: [
        { h: 'Who is responsible', p: 'Uttarakhand Government Institute of Polytechnic is the Data Fiduciary for the information you give or that the portal creates about you.' },
        { h: 'What we keep', p: 'Name, roll number, contact number, address, parents\' names, category, 10th/12th and semester results, attendance, internal marks, Aadhaar number (stored encrypted, never shown in full), login activity, and, only if you allow it, your profile photo.' },
        { h: 'Why', p: 'To run admissions records, attendance, marks, results, notices and your login. Staff of the institute see only what their role needs. Your question to the AI study assistant is sent to Google\'s Gemini service to get an answer; do not type personal secrets into it.' },
        { h: 'Children', p: 'Students under 18 are treated as children. A parent / guardian login must give the optional choices (photo, notifications) for them.' },
        { h: 'How long', p: 'While you are enrolled or employed and for the period the institute must keep academic records by law. Photos are deleted when you or your parent withdraw consent.' },
        { h: 'Your rights', p: `You may ask to see, correct or erase your data, withdraw any optional consent at any time (Privacy & Security menu), and complain to ${grievance()}. If unresolved you may approach the Data Protection Board of India.` },
      ],
    },
    hi: {
      title: 'गोपनीयता सूचना (डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023)',
      sections: [
        { h: 'ज़िम्मेदार कौन', p: 'उत्तराखंड राजकीय पॉलिटेक्निक संस्थान आपकी जानकारी का डेटा फिड्यूशियरी है।' },
        { h: 'क्या रखा जाता है', p: 'नाम, रोल नंबर, संपर्क नंबर, पता, माता-पिता के नाम, श्रेणी, 10वीं/12वीं व सेमेस्टर परिणाम, उपस्थिति, आंतरिक अंक, आधार नंबर (एन्क्रिप्टेड, पूरा कभी नहीं दिखता), लॉगिन गतिविधि और, केवल आपकी अनुमति से, प्रोफ़ाइल फ़ोटो।' },
        { h: 'किसलिए', p: 'प्रवेश रिकॉर्ड, उपस्थिति, अंक, परिणाम, सूचनाएँ और आपके लॉगिन के लिए। स्टाफ़ को केवल अपनी भूमिका के अनुसार जानकारी दिखती है। AI स्टडी असिस्टेंट में लिखा प्रश्न उत्तर पाने के लिए Google के Gemini को भेजा जाता है; उसमें निजी गोपनीय बातें न लिखें।' },
        { h: 'बच्चे', p: '18 वर्ष से कम के विद्यार्थी बच्चे माने जाते हैं। उनके वैकल्पिक विकल्प (फ़ोटो, सूचनाएँ) माता-पिता / अभिभावक के लॉगिन से दिए जाएँगे।' },
        { h: 'कितने समय तक', p: 'जब तक आप नामांकित या कार्यरत हैं और उतने समय तक जितना कानून के अनुसार शैक्षिक रिकॉर्ड रखना ज़रूरी है। सहमति वापस लेने पर फ़ोटो हटा दी जाती है।' },
        { h: 'आपके अधिकार', p: `आप अपना डेटा देखने, सुधारने या मिटाने का अनुरोध कर सकते हैं, कोई भी वैकल्पिक सहमति कभी भी वापस ले सकते हैं (Privacy & Security मेनू), और शिकायत ${grievance()} को कर सकते हैं। समाधान न होने पर भारतीय डेटा संरक्षण बोर्ड से संपर्क किया जा सकता है।` },
      ],
    },
    purposes: [
      { id: 'service', required: true, en: 'I have read the privacy notice and agree to the institute processing my data for portal services.', hi: 'मैंने गोपनीयता सूचना पढ़ ली है और पोर्टल सेवाओं के लिए अपने डेटा के उपयोग से सहमत हूँ।' },
      { id: 'photo', required: false, en: 'Store my profile photo on the portal server.', hi: 'मेरी प्रोफ़ाइल फ़ोटो पोर्टल सर्वर पर रखें।' },
      { id: 'notifications', required: false, en: 'Send me SMS / alerts about attendance, marks and notices.', hi: 'उपस्थिति, अंक और सूचनाओं के SMS / अलर्ट भेजें।' },
    ],
  };
}
