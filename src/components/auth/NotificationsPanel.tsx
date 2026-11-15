// ===================================================================================================
// Privacy & Security -> Notifications: switch phone / browser alerts on or off for this device.
// ===================================================================================================
import React, { useEffect, useState } from 'react';
import { Bell, Smartphone, Trash2 } from 'lucide-react';
import { ErrorBox } from './SignInSteps';
import { pushApi, pushSupported, enableThisDevice, disableThisDevice, thisDeviceSubscription, type PushConfig, type PushDevice } from '../../services/pushApi';

/** Privacy & Security -> Notifications: turn phone / browser notifications on or off for THIS device, test them, remove old devices. */
export const NotificationsPanel: React.FC<{ onGoPrivacy: () => void }> = ({ onGoPrivacy }) => {
  // Cfg (kept in screen state)
  const [cfg, setCfg] = useState<PushConfig | null>(null);
  // List of devices shown on this screen
  const [devices, setDevices] = useState<PushDevice[]>([]);
  // Here (kept in screen state)
  const [here, setHere] = useState(false);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);
  // Err (kept in screen state)
  const [err, setErr] = useState('');
  // Msg (kept in screen state)
  const [msg, setMsg] = useState('');

  // Loads the data from the server.
  const load = async () => {
    const c = await pushApi.config();
    if (!c.ok) { setErr(c.error); return; }
    setCfg(c.data);
    const d = await pushApi.devices();
    if (d.ok) setDevices(d.data);
    setHere(!!(await thisDeviceSubscription()));
  };
  // Runs once when this part of the screen opens.
  useEffect(() => { load(); }, []);

  // Turn on.
  const turnOn = async () => {
    if (!cfg?.publicKey || busy) return;
    setBusy(true); setErr(''); setMsg('');
    const r = await enableThisDevice(cfg.publicKey);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setMsg('Notifications are on for this device.');
    await load();
  };
  // Turn off.
  const turnOff = async () => { setBusy(true); setErr(''); setMsg(''); await disableThisDevice(); setBusy(false); await load(); };
  // Test.
  const test = async () => {
    setErr(''); setMsg('');
    const r = await pushApi.test();
    if (!r.ok) return setErr(r.error);
    setMsg(r.data.pushEnabled ? 'Test sent. It can take up to a minute to arrive (and is held between 9 pm and 7 am).' : 'Test added to your bell. Phone push is not set up on this server.');
  };
  // Remove.
  const remove = async (id: number) => { await pushApi.removeDevice(id); await load(); };

  const btn = 'px-4 py-2 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-60';
  return (
    <div className="p-6 space-y-4">
      <ErrorBox msg={err} />
      {msg && <p className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">{msg}</p>}
      {!cfg ? <p className="text-xs text-slate-500">Loading…</p> : (
        <>
          <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200">
            <Bell className="w-4 h-4 mt-0.5 text-slate-500 shrink-0" />
            <span>You get exam reminders, new marks and attendance alerts in the bell inside the portal. On a phone or computer you can also get them as notifications, even when the portal is closed (sent between 7 am and 9 pm).</span>
          </div>
          {!cfg.consent ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {cfg.needsParent
                  ? 'Notifications are switched off. Because you are under 18, a parent or guardian has to allow them from their Parent login (Privacy & consent).'
                  : 'Notifications are switched off. Allow “Notifications” under Privacy & consent first.'}
              </p>
              {!cfg.needsParent && <button onClick={onGoPrivacy} className={`${btn} bg-blue-600 text-white`}>Go to Privacy &amp; consent</button>}
            </div>
          ) : !cfg.enabled ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">Phone notifications are not set up on this server yet (the administrator has to add the push keys). The bell inside the portal still works.</p>
          ) : !pushSupported() ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">This browser cannot show notifications. On an iPhone, open the portal in Safari, choose Share → Add to Home Screen, and open it from there.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {here ? <button onClick={turnOff} disabled={busy} className={`${btn} bg-rose-50 text-rose-700 border border-rose-200`}>Turn off on this device</button>
                    : <button onClick={turnOn} disabled={busy} className={`${btn} bg-blue-600 text-white`}>{busy ? 'Working…' : 'Turn on for this device'}</button>}
              <button onClick={test} className={`${btn} bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700`}>Send a test</button>
            </div>
          )}
          {devices.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Devices</p>
              {devices.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="flex items-center gap-2 min-w-0"><Smartphone className="w-3.5 h-3.5 shrink-0 text-slate-400" /><span className="truncate">{(d.userAgent || 'Device').slice(0, 60)} · added {new Date(d.createdAt).toLocaleDateString()}</span></span>
                  <button onClick={() => remove(d.id)} aria-label="Remove device" className="p-1 text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
