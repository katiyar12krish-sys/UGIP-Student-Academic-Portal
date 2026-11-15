// Run: npm run test:auth   (uses a throw-away temp database, never touches data/portal.db)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.MFA_REQUIRED_ROLES = '';   // Step 1 tests: authenticator-app rule is covered in mfa.test.ts
process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-auth-'));
const { db, DATA_DIR } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const pw = await import('./password');
const svc = await import('./service');
const ses = await import('./session');
const mw = await import('./middleware');
const consent = await import('./consent');
const { saveStudent } = await import('../db/studentsRepo');

seedIfEmpty();
svc.seedStaffIfEmpty();
svc.syncStudentUsers();

const creds = Object.fromEntries(
  fs.readFileSync(path.join(DATA_DIR, 'initial-credentials.txt'), 'utf8').split('\n').slice(2).filter(Boolean)
    .map((l) => { const [, u, p] = l.trim().split(/\s+/); return [u, p]; }),
);
// Fake res.
const fakeRes = () => { const r: any = { code: 200, body: null, status(c: number) { r.code = c; return r; }, json(b: any) { r.body = b; return r; } }; return r; };

test('password hashing', () => {
  const h = pw.hashPassword('Sunrise2026x');
  assert.ok(h.startsWith('scrypt$'));
  assert.ok(pw.verifyPassword('Sunrise2026x', h));
  assert.ok(!pw.verifyPassword('sunrise2026x', h));
  assert.ok(!pw.verifyPassword('x', null));
  assert.notEqual(h, pw.hashPassword('Sunrise2026x')); // random salt
  assert.ok(pw.validatePasswordStrength('short1'));
  assert.ok(pw.validatePasswordStrength('admin@2026'));
  assert.ok(pw.validatePasswordStrength('onlyletters'));
  assert.equal(pw.validatePasswordStrength('Sunrise2026x'), null);
});

test('seeding: staff get random passwords, students get no password', () => {
  assert.equal(Object.keys(creds).length, 8);
  assert.ok(new Set(Object.values(creds)).size === 8);
  assert.ok(!Object.values(creds).includes('admin@2026'));
  assert.equal((db.prepare("SELECT COUNT(*) c FROM users WHERE role='student'").get() as any).c, 18);
  assert.equal((db.prepare("SELECT COUNT(*) c FROM users WHERE role='student' AND password_hash IS NOT NULL").get() as any).c, 0);
  assert.equal((db.prepare("SELECT COUNT(*) c FROM faculty_subject_assignments").get() as any).c, 10);
  const r = svc.login('24090050007', 'anurag@2026', { ip: 'seed' });   // old guessable password
  assert.equal(r.ok, false);
});

test('old hardcoded / guessable passwords do not work', () => {
  for (const [u, p] of [['admin', 'admin@2026'], ['admin', 'admin2026'], ['jitendra_cse', 'jp@cse2026'], ['jitendra_cse', 'faculty@2026']]) {
    assert.equal(svc.login(u, p, { ip: 'old' }).ok, false);
  }
});

test('login, role check, must-change flag, sessions', () => {
  const bad = svc.login('admin', creds.admin, { ip: 'r1', role: 'faculty' });
  assert.equal(bad.ok, false);                                  // right password, wrong portal
  const r = svc.login('admin', creds.admin, { ip: 'r1', role: 'admin' });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.user.role, 'admin');
  assert.equal(r.user.mustChangePassword, true);
  const s = ses.loadSession(r.token);
  assert.equal(s?.user.username, 'admin');
  // raw token is never stored
  assert.equal((db.prepare('SELECT COUNT(*) c FROM sessions WHERE id_hash=?').get(r.token) as any).c, 0);
  // must-change users are blocked from normal routes
  const res = fakeRes(); let called = false;
  mw.requireRole('admin')({ user: s!.user } as any, res, () => { called = true; });
  assert.equal(called, false); assert.equal(res.code, 403); assert.equal(res.body.error, 'password_change_required');
  // change password
  assert.ok(svc.changeOwnPassword(r.user.id, 'wrong', 'Newpass2026a'));
  assert.ok(svc.changeOwnPassword(r.user.id, creds.admin, 'weak'));
  const other = svc.login('admin', creds.admin, { ip: 'r2' }); assert.ok(other.ok);
  assert.equal(svc.changeOwnPassword(r.user.id, creds.admin, 'Newpass2026a', s!.hash), null);
  assert.ok(ses.loadSession(r.token));                           // current session survives
  if (other.ok) assert.equal(ses.loadSession(other.token), null); // other devices logged out
  const again = svc.login('admin', 'Newpass2026a', { ip: 'r3' });
  assert.ok(again.ok && !again.user.mustChangePassword);
  assert.equal(svc.login('admin', creds.admin, { ip: 'r3' }).ok, false);
  const ok = fakeRes(); let nextCalled = false;
  if (again.ok) {
    const blocked = fakeRes();
    mw.requireRole('admin')({ user: again.user } as any, blocked, () => {});
    assert.equal(blocked.body.error, 'consent_required');                       // Step 3: privacy notice comes before anything else
    consent.saveOwn(again.user, { service: true }, {});
    mw.requireRole('admin')({ user: ses.loadSession(again.token)!.user } as any, ok, () => { nextCalled = true; });
  }
  assert.ok(nextCalled);
});

test('session expiry (absolute + idle) and logout', () => {
  const r = svc.login('vijay_bs', creds.vijay_bs, { ip: 'e1' });
  assert.ok(r.ok); if (!r.ok) return;
  const h = ses.loadSession(r.token)!.hash;
  db.prepare('UPDATE sessions SET last_seen_at=? WHERE id_hash=?').run(Date.now() - 9 * 3600_000, h);
  assert.equal(ses.loadSession(r.token), null);                  // idle > 8h
  const r2 = svc.login('vijay_bs', creds.vijay_bs, { ip: 'e1' }); assert.ok(r2.ok); if (!r2.ok) return;
  db.prepare('UPDATE sessions SET expires_at=? WHERE user_id=?').run(Date.now() - 1, r2.user.id);
  assert.equal(ses.loadSession(r2.token), null);                 // absolute expiry
  const r3 = svc.login('vijay_bs', creds.vijay_bs, { ip: 'e1' }); assert.ok(r3.ok); if (!r3.ok) return;
  ses.destroySession(ses.loadSession(r3.token)!.hash);
  assert.equal(ses.loadSession(r3.token), null);
  assert.equal(ses.loadSession('garbage'), null);
  assert.equal(ses.loadSession(undefined), null);
});

test('account lockout after 5 failures, and per-IP/user rate limit', () => {
  for (let i = 0; i < 5; i++) assert.equal((svc.login('richa_math', 'Wrongpass1', { ip: 'L' + i }) as any).status, 401);
  const locked = svc.login('richa_math', creds.richa_math, { ip: 'L9' }) as any;
  assert.equal(locked.ok, false); assert.equal(locked.status, 429);           // correct password still refused while locked
  db.prepare('UPDATE users SET locked_until=NULL WHERE username=?').run('richa_math');
  assert.ok(svc.login('richa_math', creds.richa_math, { ip: 'L9' }).ok);
  let last: any;
  for (let i = 0; i < 12; i++) last = svc.login('nobody', 'x' + i, { ip: 'flood' });
  assert.equal(last.status, 429);                                              // user-name bucket (10 / 15 min)
});

test('issue credentials for students; deleted/inactive users cannot log in', () => {
  const sid = (db.prepare("SELECT id FROM users WHERE username='24090050007'").get() as any).id;
  const t = svc.issueTempPassword(sid, 'test')!;
  assert.match(t.tempPassword, /^[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}$/);
  const r = svc.login('24090050007', t.tempPassword, { ip: 's1', role: 'student' });
  assert.ok(r.ok); if (!r.ok) return;
  assert.equal(r.user.studentId, 'stu-anurag');
  assert.equal(r.user.mustChangePassword, true);
  db.prepare('UPDATE users SET is_active=0 WHERE id=?').run(sid);
  assert.equal(ses.loadSession(r.token), null);                  // live session dies when account is deactivated
  assert.equal(svc.login('24090050007', t.tempPassword, { ip: 's2' }).ok, false);
});

test('new student gets a login row automatically; password-less until issued', () => {
  saveStudent({ name: 'Test Student', rollNo: '99900000001', branch: 'CSE', year: 1, semester: 1 }, 'test');
  const u = db.prepare("SELECT * FROM users WHERE username='99900000001'").get() as any;
  assert.equal(u.role, 'student'); assert.equal(u.password_hash, null);
  assert.equal(svc.login('99900000001', '', { ip: 'n' }).ok, false);
});

test('sameOriginOnly blocks cross-site writes', () => {
  // Run.
  const run = (method: string, origin: string | undefined, host: string) => {
    const res = fakeRes(); let ok = false;
    mw.sameOriginOnly({ method, headers: { origin, host } } as any, res, () => { ok = true; });
    return { ok, code: res.code };
  };
  assert.ok(run('GET', 'https://evil.example', 'portal.test').ok);
  assert.ok(run('POST', undefined, 'portal.test').ok);
  assert.ok(run('POST', 'https://portal.test', 'portal.test').ok);
  assert.equal(run('POST', 'https://evil.example', 'portal.test').code, 403);
  assert.equal(run('DELETE', 'null', 'portal.test').code, 403);
});

test('cookie helpers', () => {
  assert.deepEqual(ses.parseCookies('a=1; ugip_sid=abc%2Bdef; b=2'), { a: '1', ugip_sid: 'abc+def', b: '2' });
  const c = ses.cookieHeader('tok', Date.now() + 1000);
  assert.ok(/HttpOnly/.test(c) && /SameSite=Lax/.test(c));
});

test('parent role: created by staff, linked to one child, login works', () => {
  const r = svc.createParent('stu-anurag', { name: 'Mr Parent', phone: '9999999999', relation: 'Father' }, 'test') as any;
  assert.equal(r.username, 'p24090050007');
  assert.match(r.tempPassword, /^[a-zA-Z2-9]{4}-/);
  const r2 = svc.createParent('stu-anurag', { name: 'Mrs Parent', relation: 'Mother' }, 'test') as any;
  assert.equal(r2.username, 'p24090050007_2');
  assert.ok('error' in (svc.createParent('no-such', { name: 'x' }, 't') as any));
  assert.ok('error' in (svc.createParent('stu-anurag', { name: '  ' }, 't') as any));
  const l = svc.login(r.username, r.tempPassword, { ip: 'par1', role: 'parent' });
  assert.ok(l.ok); if (!l.ok) return;
  assert.equal(l.user.role, 'parent');
  assert.deepEqual(l.user.childIds, ['stu-anurag']);
  assert.equal(svc.login(r.username, r.tempPassword, { ip: 'par2', role: 'student' }).ok, false);   // wrong portal
});
