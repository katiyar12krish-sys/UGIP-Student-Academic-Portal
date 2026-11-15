// Who may see SAMPLE (random demo) data and the database viewer: the admin and the HOD of Computer Science.
// The server already leaves sample rows out for everybody else (server/auth/sample.ts); this hook only decides
// whether the "SAMPLE" badges and the MySQL / database button are drawn.
import { useCollege } from '../context/CollegeContext';

export function seesSampleUser(u: { role?: string; designation?: string | null } | null | undefined): boolean {
  if (!u) return false;
  if (u.role === 'admin') return true;
  const d = u.designation || '';
  return u.role === 'faculty' && /\bHOD\b/i.test(d) && /computer\s*science/i.test(d);
}

export function useSeesSample(): boolean {
  const { authUser } = useCollege();
  return seesSampleUser(authUser);
}
