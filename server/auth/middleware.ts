// ===================================================================================================
// Express middleware used by every /api route.
// attachUser reads the session cookie and sets req.user; sameOriginOnly blocks cross-site writes;
// requireAuth / requireRole stop requests from people who are not signed in or have the wrong role.
// ===================================================================================================
import type { Request, Response, NextFunction } from 'express';
import { COOKIE, loadSession, parseCookies, type SessionUser } from './session';

declare module 'express-serve-static-core' {
  // Data shape: request.
  interface Request { user?: SessionUser; sessionHash?: string }
}

/** Reads the session cookie on every request (cheap) and sets req.user if valid. */
export function attachUser(req: Request, _res: Response, next: NextFunction) {
  const s = loadSession(parseCookies(req.headers.cookie)[COOKIE]);
  if (s) { req.user = s.user; req.sessionHash = s.hash; }
  next();
}

/** Blocks cross-site state-changing requests (defence in depth on top of SameSite=Lax). */
export function sameOriginOnly(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin) {
    let ok = false;
    try { ok = new URL(origin).host === req.headers.host; } catch { /* bad origin */ }
    if (!ok) return res.status(403).json({ error: 'Cross-origin request blocked' });
  }
  next();
}

/** A person who is logged in but has not finished the sign-in steps (new password, authenticator app, privacy notice) gets nothing. */
function pendingStep(u: NonNullable<Request['user']>): string | null {
  if (u.mustChangePassword) return 'password_change_required';
  if (u.mfaSetupRequired) return 'mfa_setup_required';
  if (u.consentRequired) return 'consent_required';
  return null;
}

// Require auth.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  const p = pendingStep(req.user);
  if (p) return res.status(403).json({ error: p });
  next();
}

// Require role.
export const requireRole = (...roles: SessionUser['role'][]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  const p = pendingStep(req.user);
  if (p) return res.status(403).json({ error: p });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Not allowed for your role' });
  next();
};
