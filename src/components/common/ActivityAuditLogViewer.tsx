// ===================================================================================================
// Admin: security audit log viewer (who did what, when), with export.
// ===================================================================================================
import React, { useState, useMemo } from 'react';
import ExportMenu from './ExportMenu';
import type { ExportTable } from '../../utils/exporter';
import { useCollege } from '../../context/CollegeContext';
import {
  ShieldCheck,
  Search,
  Filter,
  Lock,
  KeyRound,
  Download,
  Terminal,
  Activity,
  User,
  CheckCircle2,
} from 'lucide-react';

// Screen part: activity audit log viewer.
export const ActivityAuditLogViewer: React.FC = () => {
  const { activityLogs } = useCollege();
  // Text typed in the search box
  const [searchQuery, setSearchQuery] = useState('');
  // Role filter (kept in screen state)
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      if (roleFilter !== 'all' && log.actorRole !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAction = log.action.toLowerCase().includes(q);
        const matchesDetails = log.details.toLowerCase().includes(q);
        const matchesActor = log.actorName.toLowerCase().includes(q);
        return matchesAction || matchesDetails || matchesActor;
      }
      return true;
    });
  }, [activityLogs, roleFilter, searchQuery]);

  // Build audit export.
  const buildAuditExport = (): ExportTable => ({
    title: 'Activity / Audit Log',
    subtitle: `Filter: ${roleFilter}${searchQuery ? ' | search: ' + searchQuery : ''}`,
    filename: `Audit_Logs_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Audit log',
    columns: ['Time', 'Role', 'Name', 'Action', 'Details', 'IP', 'Security hash'],
    rows: filteredLogs.map((l) => [l.timestamp, l.actorRole, l.actorName, l.action, l.details, l.ipAddress || '-', l.securityHash || '-']),
  });

  return (
    <div id="activity-audit-log-viewer" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                Security & Compliance
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                Real-Time Institutional Audit Trail & Security Ledger
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Cryptographically tracked audit logs for all administrative modifications, faculty actions, marks entry, student enrollment, and logins.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>AES-256 Storage Active</span>
          </div>
          <ExportMenu build={buildAuditExport} compact />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, student name, or details..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Actor Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="faculty">Faculty</option>
            <option value="student">Student</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Actor / Performed By</th>
                <th className="p-3">Action Description</th>
                <th className="p-3">Event Details</th>
                <th className="p-3">Audit Security Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="font-bold text-slate-900 dark:text-white">{log.actorName}</span>
                    <span className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300 max-w-md">
                    {log.details}
                  </td>
                  <td className="p-3 font-mono text-[10px] text-slate-400 truncate max-w-[140px]" title={log.securityHash}>
                    {log.securityHash || 'sha256:verified'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
