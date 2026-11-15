// ===================================================================================================
// Warnings printed at start-up about settings that are fine on a laptop but dangerous on the real server.
// ===================================================================================================
import fs from 'fs';
import path from 'path';

// Step 14: loud warnings at start-up about settings that are fine on a laptop but dangerous on the real server.
export interface Finding { level: 'warn' | 'info'; text: string }

// Startup findings.
export function startupFindings(env: NodeJS.ProcessEnv = process.env, dataDir?: string): Finding[] {
  const prod = env.NODE_ENV === 'production';
  const out: Finding[] = [];
  // W.
  const w = (text: string) => out.push({ level: 'warn', text });
  if (env.ADMIN_PASSWORD_RESET === '1') w('ADMIN_PASSWORD_RESET=1 is set: the admin password is forced back to ADMIN_PASSWORD on EVERY start. Remove this line after you have logged in once.');
  if (env.ADMIN_PASSWORD) w('ADMIN_PASSWORD is written in .env. Once the admin has chosen their own password, delete this line (anyone who can read .env can otherwise try it).');
  if (env.DEV_STAFF_PASSWORD) w(prod ? 'DEV_STAFF_PASSWORD is set. It is ignored in production, but delete it from .env.' : 'DEV_STAFF_PASSWORD gives every teacher one known password. For testing only: never put it on the real server.');
  if (env.SMS_PROVIDER === 'console') w('SMS_PROVIDER=console only prints codes in the log: testing only.');
  if (dataDir && fs.existsSync(path.join(dataDir, 'initial-credentials.txt'))) w('data/initial-credentials.txt still exists. Hand the passwords out and delete the file.');
  if (prod) {
    if (env.INSECURE_COOKIES === '1') w('INSECURE_COOKIES=1: logins travel without HTTPS. Use HTTPS (nginx + a free Let\'s Encrypt certificate).');
    if (!env.TRUST_PROXY) w('TRUST_PROXY is not set. Behind nginx / a load balancer set TRUST_PROXY=1, otherwise login limits see only the proxy\'s address.');
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) out.push({ level: 'info', text: 'No VAPID keys: phone push messages are off (the bell inside the portal still works). Make them with: npm run vapid' });
    out.push({ level: 'info', text: 'Backups: run "npm run backup" every night (cron). See docs/DEPLOY.md.' });
  }
  return out;
}

// Print startup findings.
export function printStartupFindings(env: NodeJS.ProcessEnv = process.env, dataDir?: string) {
  for (const f of startupFindings(env, dataDir)) (f.level === 'warn' ? console.warn : console.log)(`[setup ${f.level}] ${f.text}`);
}
