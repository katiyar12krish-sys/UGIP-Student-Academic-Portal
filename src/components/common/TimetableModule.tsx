// ===================================================================================================
// Class timetable: view, and (staff) add / edit / delete periods.
// ===================================================================================================
import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Trash2,
  FlaskConical,
  BookOpen,
  Printer,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';
import { BranchCode, DayOfWeek, TimetableSlot } from '../../types';
import { TimetablePicture } from './TimetablePicture';     // photo / PDF of the printed timetable
import { DayTimetableForm } from './DayTimetableForm';     // type a whole day (4-5 periods) at once

// Data shape: timetable module props.
interface TimetableModuleProps {
  allowEdit?: boolean;
  defaultBranch?: string;
  defaultSemester?: number;
}

// Screen part: timetable module.
export const TimetableModule: React.FC<TimetableModuleProps> = ({
  allowEdit = false,
  defaultBranch = 'CSE',
  defaultSemester = 5,
}) => {
  const { currentUser, subjects, users, timetableSlots, addTimetableSlot, deleteTimetableSlot } = useCollege();
  // The branch chosen by the user (filter / list selection)
  const [selectedBranch, setSelectedBranch] = useState<string>(currentUser.role === 'student' && currentUser.branch ? currentUser.branch : defaultBranch);
  // The class semester shown (students: their own)
  const [viewSemester, setViewSemester] = useState<number>(currentUser.role === 'student' && currentUser.semester ? currentUser.semester : defaultSemester);
  // Is the 'whole day' form open?
  const [showDayForm, setShowDayForm] = useState(false);
  // The day chosen by the user (filter / list selection)
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  // Is the 'add pop-up' shown on screen? (true / false)
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [periodNumber, setPeriodNumber] = useState<number>(1);
  // Time slot (kept in screen state)
  const [timeSlot, setTimeSlot] = useState<string>('09:30 AM - 10:30 AM');
  // The subject id chosen by the user (filter / list selection)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  // The faculty id chosen by the user (filter / list selection)
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  // Room no (kept in screen state)
  const [roomNo, setRoomNo] = useState<string>('Room 201');
  // Is it lab? (true / false)
  const [isLab, setIsLab] = useState<boolean>(false);
  // Slot day (kept in screen state)
  const [slotDay, setSlotDay] = useState<DayOfWeek>('Monday');
  // Semester (kept in screen state)
  const [semester, setSemester] = useState<number>(defaultSemester);

  const daysOfWeek: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const canEdit = allowEdit || currentUser.role === 'admin' || currentUser.role === 'faculty';

  const branchSubjects = subjects.filter((s) => s.branch === selectedBranch);
  const facultyUsers = users.filter((u) => u.role === 'faculty');

  const filteredSlots = timetableSlots
    .filter((slot) => slot.branch === selectedBranch && slot.semester === viewSemester && slot.day === selectedDay)
    .sort((a, b) => a.periodNumber - b.periodNumber);

  // Runs when the user does this on screen: add slot.
  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const sub = subjects.find((s) => s.id === selectedSubjectId) || branchSubjects[0] || subjects[0];
    const fac = users.find((u) => u.id === selectedFacultyId) || facultyUsers[0] || currentUser;

    addTimetableSlot({
      branch: selectedBranch as BranchCode,
      year: semester <= 2 ? 1 : semester <= 4 ? 2 : 3,
      semester: semester as any,
      day: slotDay,
      periodNumber: Number(periodNumber) || 1,
      timeSlot: timeSlot.trim() || '09:30 AM - 10:30 AM',
      subjectId: sub.id,
      subjectCode: sub.code,
      subjectName: sub.name,
      facultyId: fac.id,
      facultyName: fac.name,
      roomNo: roomNo.trim() || 'Room 101',
      isLab,
    });

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Academic Timetable & Lecture Schedule</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Weekly periods, practical laboratory sessions, and room assignments for UBTER curriculum.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value as any)}
              className="text-xs font-semibold bg-transparent text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="CSE">Computer Science (CSE)</option>
              <option value="Civil">Civil Engineering</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Semester:</span>
            <select value={viewSemester} onChange={(e) => setViewSemester(Number(e.target.value))} className="text-xs font-semibold bg-transparent text-slate-800 dark:text-white focus:outline-none cursor-pointer" aria-label="Semester">
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Semester {n}</option>)}
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          {canEdit && (
            <button
              onClick={() => setShowDayForm(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Calendar className="w-4 h-4" />
              <span>Fill whole {selectedDay}</span>
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Timetable Slot</span>
            </button>
          )}
        </div>
      </div>

      <TimetablePicture branch={selectedBranch} semester={viewSemester} canEdit={canEdit} />
      {showDayForm && <DayTimetableForm branch={selectedBranch} semester={viewSemester} day={selectedDay as DayOfWeek} onClose={() => setShowDayForm(false)} />}

      {/* Day Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
        {daysOfWeek.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedDay === day
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSlots.length > 0 ? (
          filteredSlots.map((slot) => (
            <div
              key={slot.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs space-y-3 flex flex-col justify-between hover:border-blue-400 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="font-bold text-xs text-blue-600 dark:text-blue-400">Period {slot.periodNumber}</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {slot.timeSlot}
                  </span>
                </div>
                <div className="pt-2">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{slot.subjectName}</h4>
                    {slot.isLab && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-1 shrink-0">
                        <FlaskConical className="w-3 h-3" /> Lab
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{slot.subjectCode} · Sem {slot.semester}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-[140px]">{slot.facultyName}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[11px]">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {slot.roomNo}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => deleteTimetableSlot(slot.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                      title="Delete slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="font-bold text-sm">No lecture periods scheduled for {selectedDay} ({selectedBranch} Semester {viewSemester}).</p>
            {canEdit && (
              <button
                onClick={() => setShowDayForm(true)}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                + Fill {selectedDay} (4–5 periods)
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODAL: Add Timetable Slot */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Add Timetable Lecture Slot</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Branch *</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    <option value="CSE">CSE</option>
                    <option value="Civil">Civil</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Semester *</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Day *</label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value as DayOfWeek)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    {daysOfWeek.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Period Number *</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={periodNumber}
                    onChange={(e) => setPeriodNumber(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Time Slot *</label>
                  <input
                    type="text"
                    placeholder="e.g. 09:30 AM - 10:30 AM"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Room / Hall *</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 201 / Lab 1"
                    value={roomNo}
                    onChange={(e) => setRoomNo(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subject *</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                >
                  {branchSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      [{sub.code}] {sub.name} (Sem {sub.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Faculty Teacher *</label>
                <select
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                >
                  {facultyUsers.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name} — {fac.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is-lab-check"
                  checked={isLab}
                  onChange={(e) => setIsLab(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <label htmlFor="is-lab-check" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Is Practical Laboratory Period
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Timetable Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
