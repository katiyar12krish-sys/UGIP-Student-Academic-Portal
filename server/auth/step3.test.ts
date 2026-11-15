// Run: npm run test:step3   (throw-away temp database; never touches data/portal.db)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-step3-'));
delete process.env.MFA_REQUIRED_ROLES;          // default policy: admin + faculty must use an authenticator app
process.env.SMS_PROVIDER = 'console';
const { db, DATA_DIR } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { decrypt, encrypt } = await import('../db/crypto');
const svc = await import('./service');
const ses = await import('./session');
const mw = await import('./middleware');
const totp = await import('./totp');
const mfa = await import('./mfa');
const consent = await import('./consent');
const otp = await import('./otpReset');
const sms = await import('./sms');
const { cleanJpeg } = await import('../db/jpeg');
const { photoFile } = await import('../db/photoStore');
const { hashPassword } = await import('./password');

seedIfEmpty();
svc.seedStaffIfEmpty();
svc.syncStudentUsers();
const creds = Object.fromEntries(
  fs.readFileSync(path.join(DATA_DIR, 'initial-credentials.txt'), 'utf8').split('\n').slice(2).filter(Boolean)
    .map((l) => { const [, u, p] = l.trim().split(/\s+/); return [u, p]; }),
);
// Fake res.
const fakeRes = () => { const r: any = { code: 200, body: null, status(c: number) { r.code = c; return r; }, json(b: any) { r.body = b; return r; } }; return r; };
// Gate.
const gate = (user: any) => { const r = fakeRes(); let next = false; mw.requireRole(user.role)({ user } as any, r, () => { next = true; }); return { next, error: r.body?.error }; };
/** Sets a known password so tests can log in. */
const setPw = (username: string, pw: string) => db.prepare('UPDATE users SET password_hash=?, must_change_password=0 WHERE username=?').run(hashPassword(pw), username);
const PW = 'Sunrise2026x';

test('TOTP matches the RFC 6238 test vectors', () => {
  const secret = totp.base32Encode(Buffer.from('12345678901234567890'));
  assert.equal(secret, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  assert.equal(totp.hotp(secret, Math.floor(59 / 30)), '287082');
  assert.equal(totp.hotp(secret, Math.floor(1111111109 / 30)), '081804');
  assert.equal(totp.base32Decode(secret).toString(), '12345678901234567890');
  // drift: previous / next step accepted, two steps away rejected
  const now = 1_700_000_000_000, st = totp.stepAt(now);
  assert.equal(totp.verifyTotp(secret, totp.hotp(secret, st - 1), now), st - 1);
  assert.equal(totp.verifyTotp(secret, totp.hotp(secret, st + 1), now), st + 1);
  assert.equal(totp.verifyTotp(secret, totp.hotp(secret, st + 2), now), null);
  assert.equal(totp.verifyTotp(secret, '12345', now), null);
  assert.equal(totp.verifyTotp(secret, 'abcdef', now), null);
  assert.match(totp.otpauthUrl(secret, 'jitendra_cse'), /^otpauth:\/\/totp\/UGIP%3Ajitendra_cse\?secret=GEZD/);
});

test('staff without an authenticator app are blocked until they set one up', () => {
  setPw('jitendra_cse', PW);
  const r = svc.login('jitendra_cse', PW, { ip: 'm1' });
  assert.ok(r.ok); if (!r.ok) return;
  assert.equal(r.user.mfaSetupRequired, true);
  assert.equal(gate(r.user).error, 'mfa_setup_required');
  assert.equal(r.user.photoUrl, null);
});

// helpers shared by the next tests: enrol faculty "jitendra_cse" for real
let facId = '', secret = '', recovery: string[] = [];
test('enrolment: wrong code rejected, right code enables and returns 8 recovery codes once', () => {
  const u = db.prepare("SELECT id, username FROM users WHERE username='jitendra_cse'").get() as any;
  facId = u.id;
  // startEnrollment needs the qrcode package for the picture; the secret handling is what we test here
  db.prepare('INSERT INTO user_mfa (user_id,secret_enc,enabled,last_step,created_at) VALUES (?,?,0,0,?)')
    .run(u.id, encrypt(totp.generateSecret()), Date.now());
  secret = decrypt((db.prepare('SELECT secret_enc FROM user_mfa WHERE user_id=?').get(u.id) as any).secret_enc);
  const bad = mfa.confirmEnrollment(u, '000000') as any;
  assert.ok(bad.error);
  const ok = mfa.confirmEnrollment(u, totp.hotp(secret, totp.stepAt())) as any;
  assert.equal(ok.recoveryCodes.length, 8);
  recovery = ok.recoveryCodes;
  assert.ok(mfa.isMfaEnabled(u.id));
  assert.equal(mfa.recoveryCodesLeft(u.id), 8);
  // stored only as hashes, secret only encrypted
  const raw = JSON.stringify(db.prepare('SELECT * FROM mfa_recovery_codes').all()) + JSON.stringify(db.prepare('SELECT * FROM user_mfa').all());
  assert.ok(!raw.includes(secret) && !raw.includes(recovery[0]));
});

test('login with MFA: password alone gives NO session; code completes it; same code cannot be replayed', () => {
  ses.destroyAllSessions(facId);                                    // drop the session from the earlier test
  const r = svc.login('jitendra_cse', PW, { ip: 'm2' });
  assert.equal(r.ok, false);
  assert.ok(r.mfaRequired && r.challenge);
  assert.equal((db.prepare('SELECT COUNT(*) c FROM sessions WHERE user_id=?').get(facId) as any).c, 0);
  const code = totp.hotp(secret, totp.stepAt() + 1);                // a step the enrolment code did not use
  const wrong = mfa.completeMfaLogin(r.challenge!, '123456', { ip: 'm2' });
  assert.equal(wrong.ok, false);
  const done = mfa.completeMfaLogin(r.challenge!, code, { ip: 'm2' });
  assert.ok(done.ok); if (!done.ok) return;
  const user = ses.loadSession(done.token)!.user;
  assert.equal(user.mfaEnabled, true); assert.equal(user.mfaSetupRequired, false);
  assert.equal(gate(user).error, 'consent_required');               // still has to accept the privacy notice
  // replay: same code, fresh challenge
  const r2 = svc.login('jitendra_cse', PW, { ip: 'm3' });
  const replay = mfa.completeMfaLogin(r2.challenge!, code, { ip: 'm3' });
  assert.equal(replay.ok, false);
  // the challenge is single-use
  assert.equal(mfa.completeMfaLogin(r.challenge!, code, { ip: 'm2' }).ok, false);
});

test('5 wrong codes kill the challenge; a recovery code works once', () => {
  const r = svc.login('jitendra_cse', PW, { ip: 'm4' });
  for (let i = 0; i < 5; i++) assert.equal(mfa.completeMfaLogin(r.challenge!, '000000', { ip: 'm4' }).ok, false);
  const code = totp.hotp(secret, totp.stepAt() + 1);
  assert.equal(mfa.completeMfaLogin(r.challenge!, code, { ip: 'm4' }).ok, false);   // even the right code: start again
  db.exec("DELETE FROM mfa_challenges");
  const r2 = svc.login('jitendra_cse', PW, { ip: 'm5' });
  const ok = mfa.completeMfaLogin(r2.challenge!, recovery[0], { ip: 'm5' });
  assert.ok(ok.ok);
  assert.equal(mfa.recoveryCodesLeft(facId), 7);
  const r3 = svc.login('jitendra_cse', PW, { ip: 'm6' });
  assert.equal(mfa.completeMfaLogin(r3.challenge!, recovery[0], { ip: 'm6' }).ok, false);   // used already
});

test('required roles cannot switch MFA off; admin reset ends sessions and forces re-enrolment', () => {
  const u = { id: facId, username: 'jitendra_cse', role: 'faculty' };
  assert.equal((mfa.disableMfa(u, PW, recovery[1]) as any).status, 403);
  assert.ok(mfa.adminResetMfa(facId, 'admin'));
  assert.equal(mfa.isMfaEnabled(facId), false);
  const r = svc.login('jitendra_cse', PW, { ip: 'm7' });
  assert.ok(r.ok && r.user.mfaSetupRequired);
  assert.ok(db.prepare("SELECT 1 FROM audit_logs WHERE action='mfa_reset'").get());
});

test('optional MFA for a student can be turned off with password + code', () => {
  const stu = db.prepare("SELECT id, username, role FROM users WHERE role='student' LIMIT 1").get() as any;
  setPw(stu.username, PW);
  const s = totp.generateSecret();
  db.prepare('INSERT INTO user_mfa (user_id,secret_enc,enabled,last_step,created_at) VALUES (?,?,0,0,?)').run(stu.id, encrypt(s), Date.now());
  const done = mfa.confirmEnrollment(stu, totp.hotp(s, totp.stepAt())) as any;
  assert.ok(done.recoveryCodes);
  assert.ok((mfa.disableMfa(stu, 'wrong-password1', done.recoveryCodes[0]) as any).error);
  assert.ok((mfa.disableMfa(stu, PW, done.recoveryCodes[0]) as any).ok);
  assert.equal(mfa.isMfaEnabled(stu.id), false);
});

// ---------------- DPDP consent ----------------
test('consent: required for everyone, re-asked when the notice version changes', () => {
  const adm = db.prepare("SELECT * FROM users WHERE username='admin'").get() as any;
  let u = ses.toSessionUser(adm);
  assert.equal(u.consentRequired, true);
  assert.equal(consent.saveOwn(u, { service: false }, {}).ok, false);          // cannot "accept" by saying no
  assert.equal(consent.saveOwn(u, { service: true, photo: true }, { ip: '1.2.3.4' }).ok, true);
  u = ses.toSessionUser(adm);
  assert.equal(u.consentRequired, false);
  assert.equal(consent.hasConsent(adm.id, 'photo'), true);
  assert.equal(consent.hasConsent(adm.id, 'notifications'), false);             // optional = off unless asked
  // an older notice version no longer counts
  db.prepare("UPDATE consent_records SET notice_version='old' WHERE purpose='service'").run();
  assert.equal(ses.toSessionUser(adm).consentRequired, true);
  db.prepare("UPDATE consent_records SET notice_version=? WHERE purpose='service'").run(consent.NOTICE_VERSION);
  // ledger keeps history
  consent.saveOwn(u, { service: true, photo: false }, {});
  const rows = db.prepare("SELECT granted FROM consent_records WHERE subject_user_id=? AND purpose='photo' ORDER BY id").all(adm.id) as any[];
  assert.deepEqual(rows.map((r) => r.granted), [1, 0]);
});

test('consent: a minor student cannot grant optional purposes; the linked parent can; other parents cannot', () => {
  const stu = db.prepare("SELECT * FROM users WHERE role='student' ORDER BY username LIMIT 1 OFFSET 1").get() as any;
  const other = db.prepare("SELECT * FROM users WHERE role='student' ORDER BY username LIMIT 1 OFFSET 2").get() as any;
  const su = ses.toSessionUser(stu);
  assert.equal(su.minor, true);
  const r = consent.saveOwn(su, { service: true, photo: true, notifications: true }, {}) as any;
  assert.deepEqual(r.ignored, ['photo', 'notifications']);
  assert.equal(consent.hasConsent(stu.id, 'photo'), false);
  const p = svc.createParent(stu.id, { name: 'Parent One' }, 'admin') as any;
  const p2 = svc.createParent(other.id, { name: 'Parent Two' }, 'admin') as any;
  const pu = ses.toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(p.id));
  const pu2 = ses.toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(p2.id));
  assert.equal((consent.saveForChild(pu2, stu.id, { photo: true }, {}) as any).status, 403);
  assert.equal(consent.saveForChild(pu, stu.id, { photo: true }, {}).ok, true);
  assert.equal(consent.hasConsent(stu.id, 'photo'), true);
  // 18+ confirmed by admin: parent's optional consents stop counting
  assert.ok(consent.setAdultVerified(stu.id, true, 'admin'));
  assert.equal(consent.hasConsent(stu.id, 'photo'), false);
  assert.equal(consent.saveOwn(ses.toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(stu.id)), { service: true, photo: true }, {}).ok, true);
  assert.equal(consent.hasConsent(stu.id, 'photo'), true);
  assert.equal((consent.saveForChild(pu, stu.id, { photo: false }, {}) as any).status, 400);    // adults decide for themselves
});

test('withdrawing photo consent deletes the stored photo; withdrawing service ends sessions', () => {
  const adm = db.prepare("SELECT * FROM users WHERE username='admin'").get() as any;
  consent.saveOwn(ses.toSessionUser(adm), { service: true, photo: true }, {});
  fs.writeFileSync(photoFile(adm.id), Buffer.from([1, 2, 3]));
  db.prepare('UPDATE users SET photo_version=? WHERE id=?').run(Date.now(), adm.id);
  consent.saveOwn(ses.toSessionUser(adm), { service: true, photo: false }, {});
  assert.equal(fs.existsSync(photoFile(adm.id)), false);
  assert.equal((db.prepare('SELECT photo_version v FROM users WHERE id=?').get(adm.id) as any).v, null);
  const s = ses.createSession(adm.id);
  consent.withdrawService(adm, {});
  assert.equal(ses.loadSession(s.token), null);
  assert.equal(ses.toSessionUser(adm).consentRequired, true);
});

// ---------------- photo upload ----------------
function makeJpeg(w: number, h: number, withExif = true) {
  // Be.
  const be = (n: number) => Buffer.from([n >> 8, n & 255]);
  // Seg.
  const seg = (m: number, body: Buffer) => Buffer.concat([Buffer.from([0xff, m]), be(body.length + 2), body]);
  const parts = [Buffer.from([0xff, 0xd8])];
  if (withExif) parts.push(seg(0xe1, Buffer.from('Exif\0\0GPS-LAT-12.34,LNG-56.78')));
  parts.push(seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0')));
  parts.push(seg(0xfe, Buffer.from('camera comment')));
  parts.push(seg(0xc0, Buffer.concat([Buffer.from([8]), be(h), be(w), Buffer.from([3, 1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1])])));
  parts.push(seg(0xda, Buffer.from([3, 1, 0, 2, 0x11, 3, 0x11, 0, 63, 0])));
  parts.push(Buffer.from([0x12, 0x34, 0x56, 0xff, 0x00, 0x78]));    // scan data (with a stuffed 0xFF00)
  parts.push(Buffer.from([0xff, 0xd9]));
  return Buffer.concat(parts);
}
test('photo: only real JPEGs; EXIF/GPS/comments stripped; size limits', () => {
  const good = makeJpeg(320, 320);
  const c = cleanJpeg(good) as any;
  assert.equal(c.width, 320); assert.equal(c.height, 320);
  assert.ok(!c.bytes.includes(Buffer.from('GPS-LAT')) && !c.bytes.includes(Buffer.from('camera comment')));
  assert.ok(c.bytes.includes(Buffer.from([0x12, 0x34, 0x56, 0xff, 0x00, 0x78])));      // image data untouched
  assert.ok(c.bytes.length < good.length);
  assert.ok((cleanJpeg(Buffer.from('GIF89a....')) as any).error);                 // not a JPEG
  assert.ok((cleanJpeg(Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from('<script>alert(1)</script>')])) as any).error);
  assert.ok((cleanJpeg(makeJpeg(20, 20)) as any).error);                          // too small
  assert.ok((cleanJpeg(makeJpeg(4000, 3000)) as any).error);                      // too large
  assert.ok((cleanJpeg(good.subarray(0, 40)) as any).error);                      // truncated
});
test('photo: file names cannot escape the photo folder', () => {
  assert.throws(() => photoFile('../../etc/passwd'));
  assert.throws(() => photoFile('a/b'));
  assert.ok(photoFile('stu-24090050007').startsWith(path.join(DATA_DIR, 'photos')));
});

// ---------------- SMS OTP (password reset) ----------------
test('SMS: Indian mobile numbers only; provider off by default', () => {
  assert.equal(sms.normalizeIndianMobile('+91 98765 43210'), '9876543210');
  assert.equal(sms.normalizeIndianMobile('09876543210'), '9876543210');
  assert.equal(sms.normalizeIndianMobile('12345'), null);
  assert.equal(sms.normalizeIndianMobile('5876543210'), null);
  assert.equal(sms.normalizeIndianMobile('9198765432'), '9198765432');      // a real number that starts with 91 must not be cut
  assert.equal(sms.normalizeIndianMobile('+919198765432'), '9198765432');
  assert.equal(sms.normalizeIndianMobile('919198765432'), '9198765432');
  assert.equal(sms.maskPhone('9876543210'), '******3210');
});
test('password reset by OTP: same answer for unknown users, 5 tries, single use, expires, admin excluded', async () => {
  const stu = db.prepare("SELECT * FROM users WHERE role='student' ORDER BY username LIMIT 1 OFFSET 3").get() as any;
  db.prepare('UPDATE users SET phone=? WHERE id=?').run('9876543210', stu.id);
  const sent: string[] = [];
  const orig = console.log; console.log = (...a: any[]) => { const m = String(a[0]); const x = m.match(/OTP for \d+: (\d{6})/); if (x) sent.push(x[1]); };
  try {
    const a = await otp.requestPasswordResetOtp(stu.username, 'student', 'ipA') as any;
    const b = await otp.requestPasswordResetOtp('no-such-user', 'student', 'ipB') as any;
    assert.deepEqual(a, b);                                                      // cannot be used to find usernames
    assert.equal(sent.length, 1);
    const code = sent[0];
    assert.ok(!JSON.stringify(db.prepare('SELECT * FROM sms_otps').all()).includes(code));   // only a hash is stored
    assert.equal((otp.resetPasswordWithOtp(stu.username, '000000', 'Newpass2026a', 'ipC') as any).ok, false);
    assert.equal((otp.resetPasswordWithOtp(stu.username, code, 'weak', 'ipC') as any).ok, false);        // weak password rejected, code not burnt
    const good = otp.resetPasswordWithOtp(stu.username, code, 'Newpass2026a', 'ipC') as any;
    assert.equal(good.ok, true);
    assert.equal(svc.login(stu.username, 'Newpass2026a', { ip: 'ipD' }).ok, true);
    assert.equal((otp.resetPasswordWithOtp(stu.username, code, 'Another2026b', 'ipC') as any).ok, false);   // single use
    // lock after 5 wrong tries
    await otp.requestPasswordResetOtp(stu.username, 'student', 'ipE');
    const code2 = sent[1];
    for (let i = 0; i < 5; i++) otp.resetPasswordWithOtp(stu.username, '111111', 'Newpass2026a', 'ipF');
    assert.equal((otp.resetPasswordWithOtp(stu.username, code2, 'Newpass2026a', 'ipF') as any).ok, false);
    // expiry
    await otp.requestPasswordResetOtp(stu.username, 'student', 'ipG');
    const code3 = sent[2];
    db.prepare("UPDATE sms_otps SET expires_at=? WHERE user_id=?").run(Date.now() - 1, stu.id);
    assert.equal((otp.resetPasswordWithOtp(stu.username, code3, 'Newpass2026a', 'ipH') as any).ok, false);
    // admin accounts are never reset by SMS
    db.prepare("UPDATE users SET phone='9876543211' WHERE username='admin'").run();
    await otp.requestPasswordResetOtp('admin', undefined, 'ipI');
    assert.equal(sent.length, 3);
  } finally { console.log = orig; }
});
test('SMS off: reset request says so instead of pretending', async () => {
  const keep = process.env.SMS_PROVIDER; process.env.SMS_PROVIDER = 'none';
  const r = await otp.requestPasswordResetOtp('x', undefined, 'ipZ') as any;
  process.env.SMS_PROVIDER = keep;
  assert.equal(r.ok, false); assert.equal(r.status, 503);
});
test('password reset by registered mobile number: unique match works, shared number matches nobody, admin never', async () => {
  const [a, b] = db.prepare("SELECT * FROM users WHERE role='student' ORDER BY username LIMIT 2 OFFSET 5").all() as any[];
  db.prepare('UPDATE users SET phone=? WHERE id=?').run('+91 98111 22333', a.id);
  db.prepare('UPDATE users SET phone=? WHERE id=?').run('9811122444', b.id);
  assert.equal(otp.findResetUser('9811122333', 'student')?.id, a.id);        // typed as plain 10 digits, saved with +91 and spaces
  assert.equal(otp.findResetUser(a.username, 'student')?.id, a.id);          // roll number still works
  assert.equal(otp.findResetUser('9811122333', 'faculty'), null);            // wrong role
  db.prepare('UPDATE users SET phone=? WHERE id=?').run('9811122333', b.id); // two students share one number
  assert.equal(otp.findResetUser('9811122333', 'student'), null);            // ambiguous: roll number must be used
  assert.equal(otp.findResetUser('9876543211', undefined), null);            // that number belongs to the admin
  const sent: string[] = [];
  const orig = console.log; console.log = (...x: any[]) => { const m = String(x[0]).match(/OTP for \d+: (\d{6})/); if (m) sent.push(m[1]); };
  try {
    db.prepare('UPDATE users SET phone=? WHERE id=?').run('9811122555', b.id);
    await otp.requestPasswordResetOtp('9811122555', 'student', 'ipM');
    assert.equal(sent.length, 1);
    assert.equal((otp.resetPasswordWithOtp('9811122555', sent[0], 'Mobile2026ab', 'ipN', 'student') as any).ok, true);
    assert.equal(svc.login(b.username, 'Mobile2026ab', { ip: 'ipO' }).ok, true);
  } finally { console.log = orig; }
});
