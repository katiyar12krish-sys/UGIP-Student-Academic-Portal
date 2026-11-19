// Thin client for the server login (cookie session). The cookie is HttpOnly - JavaScript never sees it.
import { handleMockApi } from './mockApiHandler';

export interface AuthUser {
  id: string; username: string; role: 'admin' | 'faculty' | 'student' | 'parent'; name: string;
  email: string | null; phone: string | null; department: string | null; designation: string | null;
  studentId: string | null; subjectIds: string[]; childIds: string[]; mustChangePassword: boolean;
  // Step 3: sign-in steps still to do (the server refuses everything else until they are done)
  mfaEnabled: boolean; mfaSetupRequired: boolean; consentRequired: boolean;
  minor: boolean; photoUrl: string | null;
  subjectScope?: string | null;   // faculty: the one subject this login is for
}
/** True while the person is logged in but has not finished new password / authenticator app / privacy notice. */
export const signInIncomplete = (u: AuthUser | null | undefined) => !!u && (u.mustChangePassword || u.mfaSetupRequired || u.consentRequired);

// Data shape: consent purpose.
export type ConsentPurpose = 'service' | 'photo' | 'notifications';
// Data shape: consent info.
export interface ConsentInfo {
  notice: {
    version: string;
    en: { title: string; sections: { h: string; p: string }[] };
    hi: { title: string; sections: { h: string; p: string }[] };
    purposes: { id: ConsentPurpose; required: boolean; en: string; hi: string }[];
  };
  mine: Record<ConsentPurpose, boolean>;
  minor: boolean;
  children: { userId: string; name: string; rollNo: string; adult: boolean; consents: Record<ConsentPurpose, boolean> }[];
}
// Data shape: pw status.
export type PwStatus = 'not_issued' | 'temporary' | 'changed';
// Data shape: login row.
export interface LoginRow {
  studentId: string; name: string; rollNo: string; branch: string; year: number; semester: number; fatherName: string | null; motherName: string | null;
  student: { userId: string; username: string; status: PwStatus; tempPassword: string | null; lastLoginAt: string | null; active: boolean };
  parents: { userId: string; username: string; name: string; relation: string | null; status: PwStatus; tempPassword: string | null; lastLoginAt: string | null }[];
}
// Data shape: my login info.
export interface MyLoginInfo {
  role: string; username: string; name: string; rollNo?: string; branch?: string; year?: number; semester?: number;
  parents?: { username: string; relation: string | null; state: 'not_issued' | 'not_used_yet' | 'active' }[];
  children?: { name: string; rollNo: string; branch: string; year: number }[];
}
// Data shape: result.
type Result<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

// Req.
async function req<T>(method: string, url: string, body?: unknown): Promise<Result<T>> {
  try {
    const isStatic = typeof window !== 'undefined' && (
      window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('github.io') ||
      window.location.hostname.includes('netlify.app')
    );
    if (isStatic) {
      const mockResult = handleMockApi(method, url, body);
      if (mockResult) {
        if (mockResult.status >= 400) {
          return { ok: false, status: mockResult.status, error: mockResult.data?.error || 'गलत पासवर्ड या अमान्य विवरण।' };
        }
        return { ok: true, data: mockResult.data as T };
      }
    }

    const res = await fetch(url, {
      method, credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || contentType.includes('text/html')) {
      const mockResult = handleMockApi(method, url, body);
      if (mockResult) {
        if (mockResult.status >= 400) {
          return { ok: false, status: mockResult.status, error: mockResult.data?.error || 'गलत पासवर्ड या अमान्य विवरण।' };
        }
        return { ok: true, data: mockResult.data as T };
      }
      const json = await res.json().catch(() => ({}));
      return { ok: false, status: res.status, error: json?.error || `Request failed (${res.status})` };
    }
    const json = await res.json();
    return { ok: true, data: json as T };
  } catch {
    const mockResult = handleMockApi(method, url, body);
    if (mockResult) {
      if (mockResult.status >= 400) {
        return { ok: false, status: mockResult.status, error: mockResult.data?.error || 'गलत पासवर्ड या अमान्य विवरण।' };
      }
      return { ok: true, data: mockResult.data as T };
    }
    return { ok: false, status: 0, error: 'Cannot reach the server. Check your connection.' };
  }
}

const DEMO_USERS: Record<string, AuthUser> = {
  admin: {
    id: 'usr-admin-1',
    username: 'admin',
    role: 'admin',
    name: 'Principal / Administrator',
    email: 'admin@ugip.ac.in',
    phone: '9876543210',
    department: 'Administration',
    designation: 'Principal',
    studentId: null,
    subjectIds: [],
    childIds: [],
    mustChangePassword: false,
    mfaEnabled: false,
    mfaSetupRequired: false,
    consentRequired: false,
    minor: false,
    photoUrl: null,
  },
  jitendra_cse: {
    id: 'usr-fac-1',
    username: 'jitendra_cse',
    role: 'faculty',
    name: 'Er. Jitendra Kumar',
    email: 'jitendra@ugip.ac.in',
    phone: '9876543211',
    department: 'CSE',
    designation: 'HOD / Lecturer CSE',
    studentId: null,
    subjectIds: ['053001', '053002', '053003'],
    childIds: [],
    mustChangePassword: false,
    mfaEnabled: false,
    mfaSetupRequired: false,
    consentRequired: false,
    minor: false,
    photoUrl: null,
  },
};

export const authApi = {
  me: async () => {
    return req<{ user: AuthUser }>('GET', '/api/auth/me');
  },
  login: async (username: string, password: string, role: string, subjectId?: string) => {
    const res = await req<{ user?: AuthUser; mfaRequired?: true; challenge?: string }>('POST', '/api/auth/login', { username, password, role, subjectId });
    if (res.ok) {
      if (res.data.user) {
        try { localStorage.setItem('ugip_offline_user', JSON.stringify(res.data.user)); } catch {}
      }
      return res;
    }

    return res;
  },
  loginMfa: (challenge: string, code: string) => req<{ user: AuthUser }>('POST', '/api/auth/login/mfa', { challenge, code }),
  logout: async () => {
    try { localStorage.removeItem('ugip_offline_user'); } catch {}
    return req<{ ok: true }>('POST', '/api/auth/logout', {});
  },
  changePassword: (currentPassword: string, newPassword: string) => req<{ ok: true }>('POST', '/api/auth/change-password', { currentPassword, newPassword }),
  // admin only: new one-time temporary password for a user (faculty id or student id)
  issueCredentials: (userId: string) => req<{ username: string; tempPassword: string }>('POST', `/api/admin/users/${encodeURIComponent(userId)}/issue-credentials`),
  createParent: (studentId: string, name: string, relation?: string, phone?: string) =>
    req<{ id: string; username: string; tempPassword: string }>('POST', '/api/admin/parents', { studentId, name, relation, phone }),
  // Step 12: class-wise logins (staff) and "my login" (student / parent)
  listLogins: (f: { branch?: string; year?: number; q?: string }) => {
    const qs = new URLSearchParams(); if (f.branch) qs.set('branch', f.branch); if (f.year) qs.set('year', String(f.year)); if (f.q) qs.set('q', f.q);
    return req<LoginRow[]>('GET', `/api/admin/logins?${qs}`);
  },
  createParentLogin: (studentId: string, relation?: string) => req<{ id: string; username: string; tempPassword: string }>('POST', '/api/admin/logins/parent', { studentId, relation }),
  bulkLogins: (f: { branch?: string; year?: number }, o: { students: boolean; parents: boolean }) =>
    req<{ studentsIssued: number; parentsCreated: number; alreadyHadLogin: number }>('POST', '/api/admin/logins/bulk', { ...f, ...o }),
  myLoginInfo: () => req<MyLoginInfo>('GET', '/api/me/login-info'),
  // two-step verification (authenticator app)
  mfaStatus: () => req<{ enabled: boolean; required: boolean; recoveryCodesLeft: number }>('GET', '/api/auth/mfa'),
  mfaSetup: () => req<{ secret: string; otpauthUrl: string; qrDataUrl: string }>('POST', '/api/auth/mfa/setup', {}),
  mfaConfirm: (code: string) => req<{ recoveryCodes: string[] }>('POST', '/api/auth/mfa/confirm', { code }),
  mfaDisable: (password: string, code: string) => req<{ ok: true }>('POST', '/api/auth/mfa/disable', { password, code }),
  mfaNewRecoveryCodes: (password: string, code: string) => req<{ recoveryCodes: string[] }>('POST', '/api/auth/mfa/recovery-codes', { password, code }),
  // privacy consent (DPDP)
  consent: () => req<ConsentInfo>('GET', '/api/auth/consent'),
  saveConsent: (grants: Partial<Record<ConsentPurpose, boolean>>) =>
    req<{ ok: true; ignored?: ConsentPurpose[]; mine: Record<ConsentPurpose, boolean> }>('POST', '/api/auth/consent', { grants }),
  saveChildConsent: (studentId: string, grants: Partial<Record<ConsentPurpose, boolean>>) =>
    req<{ ok: true; consents: Record<ConsentPurpose, boolean> }>('POST', `/api/auth/consent/child/${encodeURIComponent(studentId)}`, { grants }),
  withdrawService: () => req<{ ok: true }>('POST', '/api/auth/consent/withdraw-service', {}),
  // forgot password by SMS code (only when the server has an SMS provider)
  smsStatus: async () => {
    const res = await req<{ enabled: boolean }>('GET', '/api/auth/sms-status');
    if (res.ok) return res;
    return { ok: true, data: { enabled: false } };
  },
  forgotRequest: (username: string, role: string) => req<{ ok: true; message: string }>('POST', '/api/auth/forgot/request', { username, role }),
  forgotVerify: (username: string, code: string, newPassword: string, role?: string) => req<{ ok: true }>('POST', '/api/auth/forgot/verify', { username, code, newPassword, role }),
  // profile photo (stored on the server; JPEG only)
  uploadPhoto: async (userId: string, jpeg: Blob): Promise<
    { ok: true; data: { photoUrl: string } } | { ok: false; status: number; error: string; code?: string; canSelfConsent?: boolean }
  > => {
    try {
      const res = await fetch(`/api/photos/${encodeURIComponent(userId)}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'image/jpeg' }, body: jpeg });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, status: res.status, error: json?.message || json?.error || `Upload failed (${res.status})`, code: json?.error, canSelfConsent: json?.canSelfConsent };
      return { ok: true, data: json };
    } catch { return { ok: false, status: 0, error: 'Cannot reach the server. Check your connection.' }; }
  },
  deletePhoto: (userId: string) => req<{ ok: true }>('DELETE', `/api/photos/${encodeURIComponent(userId)}`),
  verifyPassword: (password: string) => req<{ ok: boolean }>('POST', '/api/auth/verify-password', { password }),
};
