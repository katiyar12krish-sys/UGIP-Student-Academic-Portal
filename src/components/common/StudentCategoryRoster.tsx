// ===================================================================================================
// Category-wise roster (General / OBC / SC / ST / EWS, boys / girls) with export.
// ===================================================================================================
import React, { useState, useMemo } from 'react';
import ExportMenu from './ExportMenu';
import type { ExportTable } from '../../utils/exporter';
import { useCollege } from '../../context/CollegeContext';
import { BranchCode, StudentCategory } from '../../types';
import {
  Users,
  Search,
  Filter,
  Download,
  Printer,
  Shield,
  Building2,
  Layers,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';

// Data shape: student category roster props.
interface StudentCategoryRosterProps {
  initialBranch?: BranchCode | 'all';
  isFacultyView?: boolean;
}

const CATEGORIES: StudentCategory[] = ['General', 'OBC', 'SC', 'ST', 'EWS', 'TFW'];

// Screen part: student category roster.
export const StudentCategoryRoster: React.FC<StudentCategoryRosterProps> = ({
  initialBranch = 'all',
  isFacultyView = false,
}) => {
  const { users, updateUser, currentUser, getAttendancePercent } = useCollege();
  // The branch chosen by the user (filter / list selection)
  const [selectedBranch, setSelectedBranch] = useState<BranchCode | 'all'>(initialBranch);
  // The category chosen by the user (filter / list selection)
  const [selectedCategory, setSelectedCategory] = useState<StudentCategory | 'all'>('all');
  // The semester chosen by the user (filter / list selection)
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
  // Text typed in the search box
  const [searchQuery, setSearchQuery] = useState('');
  // The student id being edited right now (null = nothing open)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  // Temp category (kept in screen state)
  const [tempCategory, setTempCategory] = useState<StudentCategory>('General');

  const allStudents = useMemo(() => {
    return users.filter((u) => u.role === 'student');
  }, [users]);

  const facultyDept = isFacultyView && currentUser.department ? currentUser.department : null;

  const filteredStudents = useMemo(() => {
    return allStudents.filter((student) => {
      if (facultyDept && student.branch !== facultyDept) return false;
      if (selectedBranch !== 'all' && student.branch !== selectedBranch) return false;
      if (selectedCategory !== 'all' && student.category !== selectedCategory) return false;
      if (selectedSemester !== 'all' && student.semester !== selectedSemester) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = student.name.toLowerCase().includes(query);
        const matchesRoll = student.rollNo?.toLowerCase().includes(query) || false;
        const matchesEnroll = student.enrollmentNo?.toLowerCase().includes(query) || false;
        const matchesCategory = student.category?.toLowerCase().includes(query) || false;
        return matchesName || matchesRoll || matchesEnroll || matchesCategory;
      }
      return true;
    });
  }, [allStudents, facultyDept, selectedBranch, selectedCategory, selectedSemester, searchQuery]);

  const categoryStats = useMemo(() => {
    const baseList = facultyDept ? allStudents.filter((s) => s.branch === facultyDept) : allStudents;
    const total = baseList.length;
    const counts: Record<StudentCategory, number> = {
      General: 0,
      OBC: 0,
      SC: 0,
      ST: 0,
      EWS: 0,
      TFW: 0,
    };
    baseList.forEach((s) => {
      const cat = (s.category as StudentCategory) || 'General';
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts.General++;
      }
    });
    return { total, counts };
  }, [allStudents, facultyDept]);

  // Runs when the user does this on screen: update category.
  const handleUpdateCategory = (studentId: string) => {
    updateUser(studentId, { category: tempCategory });
    setEditingStudentId(null);
  };

  // Runs when the user does this on screen: print.
  const handlePrint = () => {
    window.print();
  };

  // Build roster export.
  const buildRosterExport = (): ExportTable => ({
    title: 'Student Social Category & Reservation Roster 2026-27',
    filename: 'Student_Category_Register_2026_27',
    sheetName: 'Category roster',
    columns: ['Roll No', 'Enrollment No', 'Student Name', 'Branch', 'Semester', 'Category', 'Gender', 'Domicile', 'Quota', 'Attendance %'],
    rows: filteredStudents.map((s) => [
      s.rollNo || '-', s.enrollmentNo || '-', s.name, s.branch || '-', `Sem ${s.semester || '-'}`, s.category || 'General',
      s.gender || 'Not Specified', s.domicile || 'Uttarakhand', s.admissionQuota || '-', getAttendancePercent(s.id) === null ? '' : (getAttendancePercent(s.id) as number),
    ]),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3.5 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="w-full">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>Official Institutional Records · Session 2026-2027</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Student Social Category & Reservation Roster
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Verified roster for General, OBC, SC, ST, EWS, and TFW quotas as mandated by UBTER and AICTE norms.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden pt-0.5">
          <ExportMenu build={buildRosterExport} compact />
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Print Official Roster"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Register</span>
          </button>
        </div>
      </div>

      {/* Category Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Enrolled</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">{categoryStats.total}</div>
          <div className="text-[10px] text-slate-400 mt-1">Active Students</div>
        </div>
        {CATEGORIES.map((cat) => {
          const count = categoryStats.counts[cat] || 0;
          const percentage = categoryStats.total > 0 ? Math.round((count / categoryStats.total) * 100) : 0;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 dark:bg-blue-950/40 dark:border-blue-500 shadow-2xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{cat}</span>
                <span className="text-[10px] text-slate-400 font-mono">{percentage}%</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">{count}</div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll no, or enrollment no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {!facultyDept && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Branch:</span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value as BranchCode | 'all')}
                  className="bg-transparent font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer text-xs"
                >
                  <option value="all">All Branches (CSE & Civil)</option>
                  <option value="CSE">CSE</option>
                  <option value="Civil">Civil</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Semester:</span>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-transparent font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer text-xs"
              >
                <option value="all">All Semesters</option>
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
                <option value={3}>Semester 3</option>
                <option value={4}>Semester 4</option>
                <option value={5}>Semester 5</option>
                <option value={6}>Semester 6</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as StudentCategory | 'all')}
                className="bg-transparent font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer text-xs"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Student Category Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Roll No & Enrollment</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Branch & Semester</th>
                <th className="py-3 px-4">Category</th>
                                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">Domicile</th>
                <th className="py-3 px-4 text-right">Attendance</th>
                {!isFacultyView && <th className="py-3 px-4 text-center print:hidden">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">No students match criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isEditing = editingStudentId === student.id;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-900 dark:text-white font-medium">
                        <div>{student.rollNo || '-'}</div>
                        <div className="text-[10px] text-slate-400 font-sans">{student.enrollmentNo || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            name={student.name}
                            avatar={student.avatar}
                            role="student"
                            size="sm"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{student.name}</div>
                            <div className="text-[10px] text-slate-400">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{student.branch}</div>
                        <div className="text-[11px] text-slate-500">
                          Semester {student.semester} · Year {student.year}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={tempCategory}
                              onChange={(e) => setTempCategory(e.target.value as StudentCategory)}
                              className="text-xs border border-blue-500 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleUpdateCategory(student.id)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] font-medium hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingStudentId(null)}
                              className="px-1.5 py-1 text-slate-500 hover:text-slate-700 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
                              student.category === 'General'
                                ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                                : student.category === 'OBC'
                                ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : student.category === 'SC'
                                ? 'bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                : student.category === 'ST'
                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                            }`}
                          >
                            {student.category || 'General'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {student.gender || 'Not Specified'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {student.domicile || 'Uttarakhand'}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        <span
                          className={`font-semibold font-mono ${
                            (getAttendancePercent(student.id) ?? 0) >= 75
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {getAttendancePercent(student.id) === null ? '-' : `${getAttendancePercent(student.id)}%`}
                        </span>
                      </td>
                      {!isFacultyView && (
                        <td className="py-3 px-4 text-center print:hidden">
                          {!isEditing && (
                            <button
                              onClick={() => {
                                setEditingStudentId(student.id);
                                setTempCategory((student.category as StudentCategory) || 'General');
                              }}
                              className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                            >
                              Edit Category
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
