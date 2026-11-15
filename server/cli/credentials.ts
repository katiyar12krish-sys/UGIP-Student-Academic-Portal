// Issue temporary passwords from the command line (works without any UI):
//   npm run credentials -- --user jitendra_cse
//   npm run credentials -- --role student --branch CSE --year 2 --out data/cse-year2.csv
//   npm run credentials -- --role faculty
//   npm run credentials -- --role student --password Ugip@2026   (LOCAL TESTING: same known password for all selected)
//   npm run credentials -- --reset-mfa admin     (lost phone + lost recovery codes: removes the authenticator app; they set it up again at next login)
import fs from 'fs';
import { db } from '../db/connection';
import { issueTempPassword, syncStudentUsers, seedStaffIfEmpty } from '../auth/service';
import { adminResetMfa } from '../auth/mfa';
import { hashPassword, validatePasswordStrength } from '../auth/password';
import { seedIfEmpty } from '../db/seed';
import { seedSubjectsIfEmpty } from '../academic/seed';
import { rememberPassword } from '../auth/passwordVault';   // Step 19

const args = process.argv.slice(2);
// Returns the .
const get = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };

seedIfEmpty();
seedSubjectsIfEmpty();
seedStaffIfEmpty();
syncStudentUsers();

if (get('reset-mfa')) {
  const t = db.prepare('SELECT id FROM users WHERE username=?').get(get('reset-mfa')!) as any;
  if (!t) { console.error('No such user'); process.exit(1); }
  adminResetMfa(t.id, 'cli');
  console.log(`Authenticator app removed for ${get('reset-mfa')}; all their sessions ended. They set it up again at next login.`);
  process.exit(0);
}

let ids: string[] = [];
if (get('user')) {
  const u = db.prepare('SELECT id FROM users WHERE username=?').get(get('user')!) as any;
  if (!u) { console.error('No such user'); process.exit(1); }
  ids = [u.id];
} else if (get('role') === 'student') {
  let sql = "SELECT u.id FROM users u JOIN students s ON s.id=u.student_id WHERE u.role='student' AND u.is_active=1";
  const p: any[] = [];
  if (get('branch')) { sql += ' AND s.branch=?'; p.push(get('branch')); }
  if (get('year')) { sql += ' AND s.year=?'; p.push(Number(get('year'))); }
  ids = (db.prepare(sql + ' ORDER BY s.roll_no').all(...p) as any[]).map((r) => r.id);
} else if (get('role') === 'faculty' || get('role') === 'parent') {
  ids = (db.prepare("SELECT id FROM users WHERE role=? AND is_active=1").all(get('role')!) as any[]).map((r) => r.id);
} else {
  console.error('Usage: --user <username>  |  --role student [--branch CSE --year 2]  |  --role faculty|parent  [--out file.csv]');
  process.exit(1);
}

const fixed = get('password');   // local testing: give everyone selected the same known password (no forced change)
if (fixed) {
  const weak = validatePasswordStrength(fixed);
  if (weak) { console.error(weak); process.exit(1); }
  if (process.env.NODE_ENV === 'production') { console.error('--password is for local testing only'); process.exit(1); }
}
const rows = ids.map((id) => {
  if (fixed) {
    db.prepare('UPDATE users SET password_hash=?, must_change_password=0, failed_attempts=0, locked_until=NULL WHERE id=?').run(hashPassword(fixed), id);
    rememberPassword(id, fixed);   // Step 19
    const u = db.prepare('SELECT username,name FROM users WHERE id=?').get(id) as any;
    return { username: u.username, name: u.name, tempPassword: fixed };
  }
  const r = issueTempPassword(id, 'cli')!;
  const u = db.prepare('SELECT name FROM users WHERE id=?').get(id) as any;
  return { username: r.username, name: u.name, tempPassword: r.tempPassword };
});
rows.forEach((r) => console.log(`${r.username.padEnd(20)} ${r.name.padEnd(28)} ${r.tempPassword}`));
if (get('out')) {
  fs.writeFileSync(get('out')!, 'Username,Name,Temporary Password\n' + rows.map((r) => `"${r.username}","${r.name}","${r.tempPassword}"`).join('\n') + '\n', { mode: 0o600 });
  console.log(`\nSaved to ${get('out')} - hand it out, then delete the file.`);
}
console.log('\nEach person must set a new password at first login.');
