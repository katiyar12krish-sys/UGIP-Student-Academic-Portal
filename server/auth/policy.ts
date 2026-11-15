// Small shared constants (kept free of imports so session / mfa / consent can all use them without import cycles).
export const NOTICE_VERSION = '2026-10-v1';   // bump when the privacy notice changes: everyone must accept again at next login

/** Roles that MUST use an authenticator app. Default: people who can change marks and records.
 *  Env MFA_REQUIRED_ROLES="admin,faculty,student,parent" (or "" for nobody). */
export function mfaRequiredFor(role: string): boolean {
  const raw = process.env.MFA_REQUIRED_ROLES ?? 'admin,faculty';
  return raw.split(',').map((s) => s.trim()).filter(Boolean).includes(role);
}
