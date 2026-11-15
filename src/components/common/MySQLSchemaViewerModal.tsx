// ===================================================================================================
// Shows the database design (tables and columns) for the MySQL version of the portal.
// ===================================================================================================
import React, { useState } from 'react';
import {
  Database,
  Table,
  Key,
  Download,
  Copy,
  Check,
  Search,
  Layers,
  ShieldCheck,
  Terminal,
  FileCode,
  X,
  Lock,
} from 'lucide-react';
import { MYSQL_TABLES_SCHEMA, generateMySQLDump, TableDefinition } from '../../data/mysqlSchema';
import { useCollege } from '../../context/CollegeContext';

// Data shape: my sql schema viewer modal props.
interface MySQLSchemaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Screen part: my sql schema viewer modal.
export const MySQLSchemaViewerModal: React.FC<MySQLSchemaViewerModalProps> = ({ isOpen, onClose }) => {
  const { users, subjects, attendanceSessions } = useCollege();
  // The table chosen by the user (filter / list selection)
  const [selectedTable, setSelectedTable] = useState<TableDefinition>(MYSQL_TABLES_SCHEMA[0]);
  // The category chosen by the user (filter / list selection)
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  // Text typed in the search box
  const [searchFilter, setSearchFilter] = useState('');
  // Copied (kept in screen state)
  const [copied, setCopied] = useState(false);
  // Which tab is open right now
  const [activeTab, setActiveTab] = useState<'tables' | 'er-diagram' | 'sql-export' | 'query-sandbox'>('tables');

  // Text typed in the search box
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 5;');
  // Query output (kept in screen state)
  const [queryOutput, setQueryOutput] = useState<any[] | null>(null);
  // Error message to show (query error); empty = no error
  const [queryError, setQueryError] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = ['All', 'Core Academic', 'Authentication & Security', 'Attendance', 'Class & Subject Dispatch', 'Evaluations', 'Audit Logs'];

  const filteredTables = MYSQL_TABLES_SCHEMA.filter((t) => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch =
      t.tableName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.description.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Runs when the user does this on screen: copy sql.
  const handleCopySQL = () => {
    const sql = generateMySQLDump();
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Runs when the user does this on screen: download sql.
  const handleDownloadSQL = () => {
    const sql = generateMySQLDump();
    const blob = new Blob([sql], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ugip_polytechnic_schema_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Runs when the user does this on screen: run query.
  const handleRunQuery = () => {
    setQueryError(null);
    const q = sqlQuery.trim().toLowerCase();
    try {
      if (q.startsWith('show tables')) {
        setQueryOutput(MYSQL_TABLES_SCHEMA.map((t) => ({ Tables_in_ugip_db: t.tableName, Category: t.category, Columns: t.columns.length })));
      } else if (q.includes('from users')) {
        const userRecords = users.map((u) => ({
          user_id: u.id,
          full_name: u.name,
          email: u.email,
          role: u.role,
          encrypted_password: '•••••••••••• (AES-256)',
          student_password: '[NOT STORED IN BROWSER]',
        }));
        setQueryOutput(userRecords);
      } else if (q.includes('from students')) {
        const studentRecords = users
          .filter((u) => u.role === 'student')
          .map((s) => ({
            student_id: s.id,
            full_name: s.name,
            roll_number: s.rollNo || '',
            branch_code: s.branch || 'CSE',
            current_semester: s.semester || 5,
            saved_student_password: '[HASHED ON SERVER]',
            attendance_pct: s.attendanceOverall != null ? `${s.attendanceOverall}%` : 'NULL',
          }));
        setQueryOutput(studentRecords);
      } else if (q.includes('from subjects')) {
        const subjectRecords = subjects.map((sub) => ({
          subject_id: sub.id,
          subject_code: sub.code,
          subject_name: sub.name,
          branch_code: sub.branch,
          semester_id: sub.semester,
          credits: sub.credits,
        }));
        setQueryOutput(subjectRecords);
      } else {
        setQueryOutput([
          { query_status: 'SUCCESS', rows_affected: 1, message: 'Simulated relational query executed successfully on UGIP secure encrypted schema.' },
        ]);
      }
    } catch (err: any) {
      setQueryError(err.message || 'Syntax error in SQL query');
    }
  };

  return (
    <div id="mysql-schema-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">MySQL Relational Engine & Encrypted Storage</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> AES-256 Vault
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {MYSQL_TABLES_SCHEMA.length} Tables
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Uttarakhand Government Institute of Polytechnic · Relational Schema & Production DDL
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySQL}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'SQL Copied!' : 'Copy SQL'}
            </button>
            <button
              onClick={handleDownloadSQL}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download .sql
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex gap-2 text-xs">
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-3 font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'tables'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400'
            }`}
          >
            <Table className="w-4 h-4" />
            Table Definitions ({MYSQL_TABLES_SCHEMA.length})
          </button>
          <button
            onClick={() => setActiveTab('query-sandbox')}
            className={`px-4 py-3 font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'query-sandbox'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400'
            }`}
          >
            <Terminal className="w-4 h-4" />
            SQL Console
          </button>
          <button
            onClick={() => setActiveTab('sql-export')}
            className={`px-4 py-3 font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'sql-export'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Raw DDL Script
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden">
          {/* Tab "tables" */}
          {activeTab === 'tables' && (
            <div className="h-full flex">
              <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-850">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search tables..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1">
                  {filteredTables.map((tbl) => {
                    const isSelected = selectedTable.tableName === tbl.tableName;
                    return (
                      <button
                        key={tbl.tableName}
                        onClick={() => setSelectedTable(tbl)}
                        className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 font-semibold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Table className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="text-xs truncate font-mono">{tbl.tableName}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                          {tbl.columns.length} cols
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Table Schema Details */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white dark:bg-slate-900">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-mono font-bold text-slate-900 dark:text-white">{selectedTable.tableName}</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {selectedTable.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedTable.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Engine: InnoDB</span>
                    <span className="text-xs text-slate-500 block">Collation: utf8mb4_unicode_ci</span>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-4 font-mono">Column Name</th>
                        <th className="py-2.5 px-4 font-mono">Data Type</th>
                        <th className="py-2.5 px-3">Key</th>
                        <th className="py-2.5 px-3">Nullable</th>
                        <th className="py-2.5 px-3">Default</th>
                        <th className="py-2.5 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedTable.columns.map((col) => (
                        <tr key={col.name} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {col.key === 'PRI' && <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            {col.key === 'UNI' && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                            {col.name}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-indigo-700 dark:text-indigo-400">{col.type}</td>
                          <td className="py-2.5 px-3">
                            {col.key === 'PRI' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">PRI</span>
                            ) : (
                              col.key || '-'
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {col.nullable ? <span className="text-emerald-600">YES</span> : <span className="text-rose-600">NO</span>}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{col.defaultVal || 'NULL'}</td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{col.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab "query-sandbox" */}
          {activeTab === 'query-sandbox' && (
            <div className="h-full flex flex-col p-6 bg-slate-900 text-white space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-bold text-slate-200 font-mono">Interactive MySQL Console</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSqlQuery('SELECT * FROM users LIMIT 5;')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300"
                  >
                    SELECT users
                  </button>
                  <button
                    onClick={() => setSqlQuery('SHOW TABLES;')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300"
                  >
                    SHOW TABLES
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  rows={3}
                  className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-400 focus:outline-none resize-none"
                  placeholder="Enter MySQL query..."
                />
                <button
                  onClick={handleRunQuery}
                  className="px-5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-colors shadow-lg cursor-pointer"
                >
                  <Terminal className="w-5 h-5" />
                  Run SQL
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-slate-950 rounded-xl border border-slate-800 p-3 font-mono text-xs">
                {queryOutput ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          {Object.keys(queryOutput[0] || {}).map((key) => (
                            <th key={key} className="py-2 px-3">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {queryOutput.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            {Object.values(row).map((val: any, colIdx) => (
                              <td key={colIdx} className="py-2 px-3 text-slate-200">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-slate-500 text-center py-8">Click "Run SQL" to execute queries against encrypted database.</div>
                )}
              </div>
            </div>
          )}

          {/* Tab "sql-export" */}
          {activeTab === 'sql-export' && (
            <div className="h-full flex flex-col p-6 bg-slate-900 text-slate-200 space-y-4">
              <div className="flex-1 bg-slate-950 rounded-xl p-4 font-mono text-xs overflow-auto border border-slate-800 text-emerald-400 leading-relaxed">
                <pre>{generateMySQLDump()}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
