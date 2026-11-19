// ===================================================================================================
// Study materials hub: upload, list, download, edit and delete materials (server decides who sees what).
// ===================================================================================================
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCollege } from '../../context/CollegeContext';
import { BranchCode, UserProfile, DocumentMaterialItem } from '../../types';
import { materialsApi, uploadFile } from '../../services/materialsApi';
import {
  FolderDown,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Download,
  Upload,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  BookOpen,
  Calendar,
  Eye,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Layers,
  GraduationCap,
  Sparkles,
  Tag,
  X,
  FileCheck,
  Check,
  Loader2,
} from 'lucide-react';

// Data shape: document material hub props.
interface DocumentMaterialHubProps {
  mode?: 'faculty' | 'student' | 'admin';
  initialBranch?: BranchCode | 'All';
  initialSemester?: number | 'All';
  forceMobileView?: boolean;
}

// Screen part: document material hub.
export const DocumentMaterialHub: React.FC<DocumentMaterialHubProps> = ({
  mode,
  initialBranch,
  initialSemester,
  forceMobileView = false,
}) => {
  const { currentUser, subjects } = useCollege();

  const currentMode = mode || (currentUser.role === 'student' ? 'student' : 'faculty');
  const isAdminUser = currentUser.role === 'admin';

  // Materials come from the server (Step 9): it decides which ones this person may see. Nothing is kept in the browser.
  const [materials, setMaterials] = useState<DocumentMaterialItem[]>([]);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [loading, setLoading] = useState(true);
  // Error message to show (load error); empty = no error
  const [loadError, setLoadError] = useState<string | null>(null);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [saving, setSaving] = useState(false);
  // Error message to show (form error); empty = no error
  const [formError, setFormError] = useState<string | null>(null);
  // Picked file (kept in screen state)
  const [pickedFile, setPickedFile] = useState<File | null>(null);

  // Reload.
  const reload = async () => {
    const r = await materialsApi.list();
    if (r.ok) { setMaterials(r.data); setLoadError(null); } else setLoadError(r.error);
    setLoading(false);
  };
  // Runs once when this part of the screen opens.
  useEffect(() => {
    reload();
    const t = setInterval(reload, 60_000);
    return () => clearInterval(t);
  }, []);

  // Student Enrollment Context Filters
  const studentBranch = currentUser.branch || 'CSE';
  const studentSem = currentUser.semester || 5;

  // Toggle for Student Filter
  const [filterOnlyMyCourse, setFilterOnlyMyCourse] = useState<boolean>(currentMode === 'student');

  // Search & General Filters
  const [searchQuery, setSearchQuery] = useState('');
  // The branch filter chosen by the user (filter / list selection)
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>(
    currentMode === 'student' ? studentBranch : 'All'
  );
  // The semester filter chosen by the user (filter / list selection)
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>(
    currentMode === 'student' ? String(studentSem) : 'All'
  );
  // The type filter chosen by the user (filter / list selection)
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'pdf' | 'image' | 'doc' | 'link'>('all');
  // The category filter chosen by the user (filter / list selection)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Expanded descriptions state: { [id: string]: boolean }
  const [expandedDescMap, setExpandedDescMap] = useState<Record<string, boolean>>({});

  // Toggle expand desc.
  const toggleExpandDesc = (id: string) => {
    setExpandedDescMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Upload Modal State (Faculty/Admin)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  // The material id being edited right now (null = nothing open)
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);

  // Form type (kept in screen state)
  const [formType, setFormType] = useState<'file' | 'link'>('file');
  // Form title (kept in screen state)
  const [formTitle, setFormTitle] = useState('');
  // Form description (kept in screen state)
  const [formDescription, setFormDescription] = useState('');
  // Form category (kept in screen state)
  const [formCategory, setFormCategory] = useState<DocumentMaterialItem['category']>('Lecture Notes');
  // Form branch (kept in screen state)
  const [formBranch, setFormBranch] = useState<BranchCode | 'All'>('CSE');
  // Form semester (kept in screen state)
  const [formSemester, setFormSemester] = useState<number | 'All'>(currentUser.semester || 5);
  // Form subject id (kept in screen state)
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  // Form file url (kept in screen state)
  const [formFileUrl, setFormFileUrl] = useState('');
  // Form file name (kept in screen state)
  const [formFileName, setFormFileName] = useState('');
  // List of form tags shown on this screen
  const [formTags, setFormTags] = useState('');
  // Toast message (kept in screen state)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Subjects this person may publish for: a teacher only their own (the server checks again); the admin any, narrowed by the class chosen.
  const availableFormSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (!isAdminUser) return (currentUser.assignedSubjectIds || []).includes(s.id);
      if (formBranch !== 'All' && s.branch !== formBranch) return false;
      if (formSemester !== 'All' && s.semester !== formSemester) return false;
      return true;
    });
  }, [subjects, formBranch, formSemester, isAdminUser, currentUser.assignedSubjectIds]);

  // Flash.
  const flash = (m: string) => { setToastMessage(m); setTimeout(() => setToastMessage(null), 3500); };

  // Publish = (1) send the file to the server, (2) create the material that uses it. Editing changes only the text.
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setFormError(null);
    const tags = formTags.split(',').map((t) => t.trim()).filter(Boolean);
    if (!formTitle.trim()) { setFormError('Please provide a document title.'); return; }
    setSaving(true);
    try {
      if (editingMaterialId) {
        const r = await materialsApi.update(editingMaterialId, {
          title: formTitle, description: formDescription, category: formCategory, tags,
          ...(formType === 'link' ? { linkUrl: formFileUrl } : {}),
        });
        if (!r.ok) { setFormError(r.error); return; }
        flash('Material updated.');
      } else {
        if (!isAdminUser && !formSubjectId) { setFormError('Choose the subject this material is for.'); return; }
        let fileId: string | undefined;
        if (formType === 'file') {
          if (!pickedFile) { setFormError('Choose a file to upload.'); return; }
          const up = await uploadFile(pickedFile);
          if (!up.ok) { setFormError(up.error); return; }
          fileId = up.data.fileId;
        }
        const r = await materialsApi.create({
          kind: formType, title: formTitle, description: formDescription, category: formCategory, tags,
          subjectId: formSubjectId || undefined, branch: formBranch, semester: formSemester,
          fileId, linkUrl: formType === 'link' ? formFileUrl : undefined,
        });
        if (!r.ok) { setFormError(r.error); return; }
        flash('New material published. Students of the class are notified.');
      }
      await reload();
      resetForm();
      setIsUploadModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  // Reset form.
  const resetForm = () => {
    setEditingMaterialId(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Lecture Notes');
    setFormType('file');
    setFormSubjectId('');
    setFormFileUrl('');
    setFormFileName('');
    setFormTags('');
    setPickedFile(null);
    setFormError(null);
  };

  // Runs when the user does this on screen: edit click.
  const handleEditClick = (mat: DocumentMaterialItem) => {
    setEditingMaterialId(mat.id);
    setFormTitle(mat.title);
    setFormDescription(mat.description);
    setFormType(mat.type === 'link' ? 'link' : 'file');
    setFormCategory(mat.category);
    setFormBranch(mat.branch);
    setFormSemester(mat.semester);
    setFormSubjectId(mat.subjectId || '');
    setFormFileUrl(mat.type === 'link' ? mat.fileUrl || '' : '');
    setFormFileName(mat.fileName || '');
    setFormTags(mat.tags.join(', '));
    setPickedFile(null);
    setFormError(null);
    setIsUploadModalOpen(true);
  };

  // Runs when the user does this on screen: delete click.
  const handleDeleteClick = async (id: string) => {
    if (!confirm('Delete this material? The uploaded file is removed from the server.')) return;
    const r = await materialsApi.remove(id);
    if (!r.ok) { flash(r.error); return; }
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    flash('Material deleted.');
  };

  // Links open in a new tab; files come from the server only after it has checked this person may have them.
  const handleDownloadMaterial = (mat: DocumentMaterialItem) => {
    if (mat.type === 'link') {
      if (mat.fileUrl) window.open(mat.fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const a = document.createElement('a');
    a.href = `${mat.fileUrl}?download=1`;
    a.download = mat.fileName || '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (currentMode === 'student') setMaterials((prev) => prev.map((m) => (m.id === mat.id ? { ...m, downloadCount: m.downloadCount + 1 } : m)));
  };

  // Runs when the user does this on screen: local file input.
  const handleLocalFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setPickedFile(f);
    setFormFileName(f ? f.name : '');
    setFormError(null);
  };

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((mat) => {
      // Student enrollment filter
      if (currentMode === 'student' && filterOnlyMyCourse) {
        if (mat.branch !== 'All' && mat.branch !== studentBranch) return false;
        if (mat.semester !== 'All' && Number(mat.semester) !== Number(studentSem)) return false;
      }

      // Branch filter
      if (selectedBranchFilter !== 'All') {
        if (mat.branch !== 'All' && mat.branch !== selectedBranchFilter) return false;
      }

      // Semester filter
      if (selectedSemesterFilter !== 'All') {
        if (mat.semester !== 'All' && String(mat.semester) !== selectedSemesterFilter) return false;
      }

      // Type filter
      if (selectedTypeFilter !== 'all' && mat.type !== selectedTypeFilter) {
        return false;
      }

      // Category filter
      if (selectedCategoryFilter !== 'all' && mat.category !== selectedCategoryFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = mat.title.toLowerCase().includes(q);
        const matchesDesc = mat.description.toLowerCase().includes(q);
        const matchesSub = mat.subjectCode.toLowerCase().includes(q) || mat.subjectName.toLowerCase().includes(q);
        const matchesTags = mat.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesSub && !matchesTags) return false;
      }

      return true;
    });
  }, [
    materials,
    currentMode,
    filterOnlyMyCourse,
    studentBranch,
    studentSem,
    selectedBranchFilter,
    selectedSemesterFilter,
    selectedTypeFilter,
    selectedCategoryFilter,
    searchQuery,
  ]);

  return (
    <div id="document-and-material-hub" className="space-y-6">
      {loadError && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{loadError}</span>
        </div>
      )}
      {loading && !loadError && (
        <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading materials…</span>
        </div>
      )}
      {/* Toast Alert */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold shadow-lg flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <FolderDown className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Academic Document & E-Library Hub
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-xs text-slate-500 font-semibold">
                  PDFs · Images · Web Links
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                {currentMode === 'student' ? 'My Course Documents & Study Material Downloads' : 'Unified Document & Material Hub (Staff Upload)'}
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
            {currentMode === 'student'
              ? 'Access verified lecture notes, lab manuals, CAD drawings, and reference video links filtered specifically for your course enrollment.'
              : 'Upload and organize official course documents for students across branches. Staff can attach PDFs, technical images/diagrams, and external resource links with detailed descriptions.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {(currentMode === 'faculty' || currentMode === 'admin') && (
            <button
              onClick={() => {
                resetForm();
                setIsUploadModalOpen(true);
              }}
              className="w-full sm:w-auto justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document / Link</span>
            </button>
          )}

          {currentMode === 'student' && (
            <button
              onClick={() => setFilterOnlyMyCourse(!filterOnlyMyCourse)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                filterOnlyMyCourse
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{filterOnlyMyCourse ? `Filtered for ${studentBranch} Sem ${studentSem}` : 'Showing All Courses'}</span>
            </button>
          )}
        </div>
      </div>

      {/* STUDENT ENROLLMENT BADGE (When Viewing in Student Mode) */}
      {currentMode === 'student' && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-2xl border border-blue-500/30 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <GraduationCap className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200">
                  Enrolled Scholar Profile
                </span>
                <span className="text-xs text-blue-200 font-bold">
                  {currentUser.name} (Roll: {currentUser.rollNo || ''})
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Target Course: <strong>{studentBranch} Engineering</strong> · Year {currentUser.year || 3} (Semester {studentSem})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-blue-200">
              Found <strong>{filteredMaterials.length}</strong> matching learning resources
            </span>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH CONSOLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, subject, topics, tags..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
            />
          </div>

          {/* Type Filters: All / PDF / Image / Link */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: 'all', label: 'All Types', icon: Layers },
              { id: 'pdf', label: 'PDF Documents', icon: FileText },
              { id: 'image', label: 'Images & CAD', icon: ImageIcon },
              { id: 'doc', label: 'Word / PPT / Excel', icon: FileText },
              { id: 'link', label: 'Web Links', icon: LinkIcon },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTypeFilter(t.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedTypeFilter === t.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-Filters: Branch, Semester, Category */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Branch:</span>
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="All">All Branches</option>
              <option value="CSE">CSE Department</option>
              <option value="Civil">Civil Engineering</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Semester:</span>
            <select
              value={selectedSemesterFilter}
              onChange={(e) => setSelectedSemesterFilter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="All">All Semesters</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
              <option value="3">Semester 3</option>
              <option value="4">Semester 4</option>
              <option value="5">Semester 5</option>
              <option value="6">Semester 6</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Category:</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="Lecture Notes">Lecture Notes</option>
              <option value="Lab Manual">Lab Manual</option>
              <option value="Question Bank">Question Bank</option>
              <option value="Syllabus & Curriculum">Syllabus & Curriculum</option>
              <option value="Online Video / Lecture">Online Video / Lecture</option>
            </select>
          </div>
        </div>
      </div>

      {/* DOCUMENT & MATERIAL CARDS GRID */}
      {!loading && filteredMaterials.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="font-bold text-base text-slate-800 dark:text-white">
            No Materials Found
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No documents matched your chosen branch, semester, or search filter. Try clearing filters or switching to "Showing All Courses".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedBranchFilter('All');
              setSelectedSemesterFilter('All');
              setSelectedTypeFilter('all');
              setSelectedCategoryFilter('all');
              setFilterOnlyMyCourse(false);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className={`grid ${forceMobileView ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-5`}>
          {filteredMaterials.map((mat) => {
            const isExpanded = !!expandedDescMap[mat.id];
            const isEnrolledMatch =
              (mat.branch === 'All' || mat.branch === studentBranch) &&
              (mat.semester === 'All' || Number(mat.semester) === Number(studentSem));

            return (
              <div
                key={mat.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
              >
                {/* Card Top: Type & Subject Badge */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Type Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 ${
                          mat.type === 'pdf'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : mat.type === 'image'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {mat.type === 'pdf' || mat.type === 'doc' ? (
                          <FileText className="w-3.5 h-3.5" />
                        ) : mat.type === 'image' ? (
                          <ImageIcon className="w-3.5 h-3.5" />
                        ) : (
                          <LinkIcon className="w-3.5 h-3.5" />
                        )}
                        <span>{mat.type.toUpperCase()} · {mat.category}</span>
                      </span>

                      {/* Course / Branch Badge */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {mat.branch} · {mat.semester === 'All' ? 'All Sem' : `Sem ${mat.semester}`}
                      </span>

                      {/* Student Course Match Highlight */}
                      {currentMode === 'student' && isEnrolledMatch && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          <span>Course Match</span>
                        </span>
                      )}
                    </div>

                    {/* Faculty Action buttons (Edit / Delete) */}
                    {(currentMode === 'faculty' || currentMode === 'admin') && (isAdminUser || mat.mine) && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditClick(mat)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit material"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(mat.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Subject */}
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                      {mat.title}
                    </h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
                      [{mat.subjectCode}] {mat.subjectName}
                    </p>
                  </div>

                  {/* Image Thumbnail Preview if Image Type */}
                  {mat.type === 'image' && mat.fileUrl && (
                    <div
                      onClick={() => setPreviewImage({ url: mat.fileUrl!, title: mat.title })}
                      className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer group/img"
                    >
                      <img
                        src={mat.fileUrl}
                        alt={mat.title}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1.5">
                        <Eye className="w-4 h-4" />
                        <span>Click to Preview Image</span>
                      </div>
                    </div>
                  )}

                  {/* DESCRIPTION WITH 'READ MORE' / 'READ LESS' EXPANDER */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {isExpanded
                        ? mat.description
                        : mat.description.length > 130
                        ? `${mat.description.slice(0, 130)}...`
                        : mat.description}
                    </p>

                    {mat.description.length > 130 && (
                      <button
                        onClick={() => toggleExpandDesc(mat.id)}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Read Less' : 'Read More Details'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Tags */}
                  {mat.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {mat.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Bottom: Metadata & Download / Access Button */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5 text-slate-400 text-[11px]">
                    <p className="truncate max-w-[200px]">
                      By <strong>{mat.uploadedByFacultyName}</strong>
                    </p>
                    <p className="font-mono">
                      {mat.uploadedAt} · {mat.fileSizeBytes || 'File'} · {mat.downloadCount} Downloads
                    </p>
                  </div>

                  {/* PDFs can also be read in the browser */}
                  {mat.type === 'pdf' && mat.fileUrl && (
                    <a
                      href={mat.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl text-xs font-extrabold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </a>
                  )}

                  {/* Main Action Button */}
                  <button
                    onClick={() => handleDownloadMaterial(mat)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                      mat.type === 'link'
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : mat.type === 'image'
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {mat.type === 'link' ? (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Web Link</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download {mat.type === 'doc' ? 'FILE' : mat.type.toUpperCase()}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* UPLOAD / EDIT MATERIAL MODAL (FOR STAFF) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {editingMaterialId ? 'Edit Document & Material' : 'Upload Course Document / Resource'}
                </h3>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-4 text-xs">
              {/* What is being published: a file or a web link (not changeable when editing) */}
              {!editingMaterialId && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Select Material Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'file', label: 'File (PDF, image, Word, PPT, Excel)', icon: FileText },
                      { id: 'link', label: 'Web URL / Link', icon: LinkIcon },
                    ].map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setFormType(t.id as 'file' | 'link')}
                          className={`p-2.5 rounded-xl border text-center transition-all flex items-center justify-center gap-2 cursor-pointer font-bold ${
                            formType === t.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Unit 3: Cloud Microservices Complete Lecture Notes & Solved Papers"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                />
              </div>

              {/* Class: a teacher's subject decides it. Only the admin may pick a class (or everybody) without a subject. */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {isAdminUser && (
                  <>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Branch (if no subject)</label>
                      <select
                        value={formBranch}
                        disabled={!!editingMaterialId || !!formSubjectId}
                        onChange={(e) => setFormBranch(e.target.value as any)}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white cursor-pointer disabled:opacity-50"
                      >
                        <option value="CSE">CSE Department</option>
                        <option value="Civil">Civil Engineering</option>
                        <option value="All">All Branches</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Semester (if no subject)</label>
                      <select
                        value={formSemester}
                        disabled={!!editingMaterialId || !!formSubjectId}
                        onChange={(e) => setFormSemester(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white cursor-pointer disabled:opacity-50"
                      >
                        <option value="All">All Semesters</option>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>Semester {n}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="Lecture Notes">Lecture Notes</option>
                    <option value="Lab Manual">Lab Manual</option>
                    <option value="Question Bank">Question Bank</option>
                    <option value="Syllabus & Curriculum">Syllabus</option>
                    <option value="Assignment / Tutorial">Assignment</option>
                    <option value="Reference E-Book">Reference E-Book</option>
                    <option value="Online Video / Lecture">Online Video</option>
                    {isAdminUser && <option value="Official Circular">Official Circular</option>}
                  </select>
                </div>
              </div>

              {/* Subject selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isAdminUser ? 'Subject (optional: it decides the class)' : 'Your Subject * (it decides the class)'}
                </label>
                <select
                  value={formSubjectId}
                  disabled={!!editingMaterialId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white cursor-pointer disabled:opacity-50"
                >
                  <option value="">{isAdminUser ? '-- No subject (use the class above) --' : '-- Choose a subject --'}</option>
                  {availableFormSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.code}] {s.name} ({s.branch} Sem {s.semester})
                    </option>
                  ))}
                </select>
                {editingMaterialId && (
                  <p className="text-[11px] text-slate-500 mt-1">The subject, class and file cannot be changed. To change them, delete this material and publish it again.</p>
                )}
              </div>

              {/* Detailed Description with Read More Preview */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Detailed Document Description & Syllabus Topics (Expandable via 'Read More') *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Provide comprehensive details: chapter breakdown, governing codes (e.g. IS 456), lab exercises, learning objectives, and formulas. This description will be smoothly expandable by students using the 'Read More' expander."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white leading-relaxed"
                />
              </div>

              {/* File Attachment / URL Input */}
              {formType === 'link' ? (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    External Resource URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={formFileUrl}
                    onChange={(e) => setFormFileUrl(e.target.value)}
                    placeholder="https://nptel.ac.in/... or https://youtube.com/..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>
              ) : editingMaterialId ? (
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>File: {formFileName || 'uploaded file'}</span>
                </p>
              ) : (
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select File *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.docx,.pptx,.xlsx,application/pdf,image/jpeg,image/png"
                    onChange={handleLocalFileInput}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                  <p className="text-[11px] text-slate-500">PDF, JPEG, PNG, Word, PowerPoint or Excel, up to 10 MB. The server checks the file itself, not its name.</p>
                  {pickedFile && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Ready: {pickedFile.name} ({(pickedFile.size / 1048576).toFixed(1)} MB)</span>
                    </p>
                  )}
                </div>
              )}

              {/* Tags Input */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Keywords & Search Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="e.g. Express, Docker, IS 456, UBTER 2026"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {formError && (
                <p className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>{formError}</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-extrabold rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{saving ? 'Saving…' : editingMaterialId ? 'Update Material' : 'Publish Document to Hub'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL FOR IMAGES */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-white cursor-default"
          >
            <div className="p-3 bg-slate-850 flex items-center justify-between border-b border-slate-800">
              <span className="font-bold text-xs truncate">{previewImage.title}</span>
              <button onClick={() => setPreviewImage(null)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[80vh] flex items-center justify-center bg-black">
              <img src={previewImage.url} alt={previewImage.title} className="max-w-full max-h-[75vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
