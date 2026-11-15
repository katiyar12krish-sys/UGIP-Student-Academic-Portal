// ===================================================================================================
// Admin / faculty actions that issue a one-time temporary password and show it once in a pop-up.
// ===================================================================================================
import { authApi } from './authApi';

/** Admin/faculty action: issue a new one-time temporary password and show it once. Passwords can never be viewed afterwards. */
export async function issueTempPasswordFor(userId: string, label: string): Promise<void> {
  if (!window.confirm(`Issue a NEW temporary password for ${label}?\nTheir current password stops working and they are logged out.`)) return;
  const r = await authApi.issueCredentials(userId);
  if (!r.ok) {
    window.alert(`Could not issue password: ${r.error}`);
    return;
  }
  window.alert(
    `Login for ${label}\n\nUsername: ${r.data.username}\nTemporary password: ${r.data.tempPassword}\n\nShown only once. Share it privately. They must set a new password at first login.`,
  );
}

/** Admin/faculty action: create a parent login for a student and show the one-time password once. */
export async function createParentFor(studentId: string, studentLabel: string): Promise<void> {
  const name = window.prompt(`Parent / guardian name for ${studentLabel}:`);
  if (!name || !name.trim()) return;
  const relation = window.prompt('Relation (e.g. Father, Mother, Guardian):', 'Father') || undefined;
  const phone = window.prompt('Parent phone (optional):') || undefined;
  const r = await authApi.createParent(studentId, name.trim(), relation, phone);
  if (!r.ok) {
    window.alert(`Could not create parent login: ${r.error}`);
    return;
  }
  window.alert(
    `Parent login for ${studentLabel}\n\nUsername: ${r.data.username}\nTemporary password: ${r.data.tempPassword}\n\nShown only once. Share it privately with the parent. They must set a new password at first login.`,
  );
}
