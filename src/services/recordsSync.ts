// =====================================================================================================
// useServerList (Step 20): keep one list of the shared state in step with its database table
// -----------------------------------------------------------------------------------------------------
// The shared state (CollegeContext) still holds these lists in React state, so no screen had to change.
// This hook adds two things:
//   1. LOAD  - after sign-in it asks the server for the list (GET /api/records/<collection>) and puts it in state.
//   2. SAVE  - whenever the list changes in the browser (an item added, changed or removed), it compares the new
//              list with the last list the server confirmed and sends only the differences:
//                 new or changed item  -> PUT    /api/records/<collection>/<id>
//                 removed item         -> DELETE /api/records/<collection>/<id>
// If the server refuses a change (no permission, no connection), the user sees a message and the list is
// loaded again from the server, so the screen never shows something that was not saved.
// Server side (tables + permission rules): server/routes/records.ts
// =====================================================================================================
import { useEffect, useRef } from 'react';
import { call } from './academicApi';
import { notify } from '../components/common/ui/feedback';

// Data shape: item.
type Item = { id?: string } & Record<string, any>;   // every saved item needs an id (items without one are skipped)

/**
 * @param collection name of the server list (see COLLECTIONS in server/routes/records.ts)
 * @param list       the React state array
 * @param setList    its setter
 * @param signedIn   true once the person is fully signed in
 * @param opts.keepRemoved  true = items removed in the browser are NOT deleted on the server (activity log history)
 */
export function useServerList<T extends Item>(collection: string, list: T[], setList: (v: T[]) => void, signedIn: boolean, opts: { keepRemoved?: boolean } = {}) {
  const confirmed = useRef<Map<string, string> | null>(null);   // id -> item as the server last confirmed it (null = not loaded yet)
  const latest = useRef<T[]>(list);                              // always the newest list in the browser
  const saving = useRef(false);                                  // one save loop at a time
  latest.current = list;

  /** Load the list from the server and remember it as "confirmed". */
  const load = async () => {
    const r = await call<T[]>('GET', `/api/records/${collection}`);
    if (!r.ok) return;                                           // not allowed to read (e.g. a student and the activity log): keep empty
    confirmed.current = new Map(r.data.filter((x) => x.id).map((x) => [x.id as string, JSON.stringify(x)]));
    setList(r.data);
  };

  /** Send the differences between the newest list and the confirmed one; repeat until nothing is left. */
  const flush = async () => {
    if (saving.current) return;
    saving.current = true;
    let failed = '';
    try {
      for (let round = 0; round < 20; round++) {
        const base = confirmed.current;
        if (!base) break;
        const now = new Map(latest.current.filter((x) => x && x.id).map((x) => [x.id as string, JSON.stringify(x)]));
        const puts = [...now].filter(([id, json]) => base.get(id) !== json);    // new or changed
        const dels = opts.keepRemoved ? [] : [...base.keys()].filter((id) => !now.has(id));   // removed
        if (!puts.length && !dels.length) break;
        for (const [id, json] of puts) {
          const r = await call('PUT', `/api/records/${collection}/${encodeURIComponent(id)}`, JSON.parse(json));
          if (r.ok) base.set(id, json); else { failed = r.error; base.set(id, json); }       // mark as handled so we do not retry forever
        }
        if (opts.keepRemoved) for (const id of [...base.keys()]) if (!now.has(id)) base.delete(id);   // just forget them locally
        for (const id of dels) {
          const r = await call('DELETE', `/api/records/${collection}/${encodeURIComponent(id)}`);
          if (!r.ok && r.status !== 404) failed = r.error;
          base.delete(id);
        }
      }
    } finally { saving.current = false; }
    if (failed) { notify.error('Could not save the change', failed); await load(); }   // show the real (server) list again
  };

  // 1. LOAD after sign-in; forget everything after sign-out
  useEffect(() => {
    if (signedIn) load();
    else confirmed.current = null;
  }, [signedIn, collection]);

  // 2. SAVE whenever the list changes (only after the first load, so the empty start list never deletes anything)
  useEffect(() => {
    if (signedIn && confirmed.current) flush();
  }, [list, signedIn, collection]);
}
