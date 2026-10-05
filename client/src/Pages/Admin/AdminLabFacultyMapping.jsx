import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UsersRound,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  ArrowLeft,
  X,
  Save,
  UserCheck,
  BookOpen,
  Info,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  FlaskConical,
  GraduationCap,
  Calendar
} from 'lucide-react';
import api from '../../api/axios';
import SearchableSelect from '../../Components/SearchableSelect';
import ConfirmModal from '../../Components/ConfirmModal';

const inputCls =
  'w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all';
const sectionCls =
  'bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4 shadow-[var(--shadow-xs)]';
const labelCls = 'text-[12px] font-semibold text-[var(--text-secondary)]';

export default function AdminLabFacultyMapping() {
  const navigate = useNavigate();

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Batches from localStorage
  const [batches, setBatches] = useState(() => {
    try {
      const raw = localStorage.getItem('lab_batches_v2');
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return [
      { id: '1', name: 'CSE-A', semester: 'Semester III', academic_year: '2025-2026', department: 'CSE' },
      { id: '2', name: 'CSE-B', semester: 'Semester III', academic_year: '2025-2026', department: 'CSE' },
      { id: '3', name: 'AI&DS-A', semester: 'Semester III', academic_year: '2025-2026', department: 'AI&DS' },
      { id: '4', name: 'AI&DS-B', semester: 'Semester III', academic_year: '2025-2026', department: 'AI&DS' },
    ];
  });

  // Courses & Faculty
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [mappingsLoading, setMappingsLoading] = useState(true);

  // Faculty mapping form
  const emptyMapping = { course_id: '', faculty_id: '', batch_name: '' };
  const [mappingForm, setMappingForm] = useState(emptyMapping);
  const [editingMapping, setEditingMapping] = useState(null);
  const [mappingSubmitting, setMappingSubmitting] = useState(false);

  // Batch Student direct mapper
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [studentPagination, setStudentPagination] = useState({
    total_pages: 1,
    total_records: 0,
    has_next: false,
    has_prev: false,
  });
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [studentFilterSection, setStudentFilterSection] = useState('ALL');
  const [studentMappingForm, setStudentMappingForm] = useState({
    course_id: '',
    faculty_id: '',
    batch_name: '',
  });
  const [studentMappingSubmitting, setStudentMappingSubmitting] = useState(false);

  const STUDENT_LIMIT = 15;

  const fetchCoursesAndAdminData = async () => {
    try {
      setMappingsLoading(true);
      const [coursesRes, adminDataRes] = await Promise.all([
        api.get('/labs/courses'),
        api.get('/admin/labs/data'),
      ]);
      setCourses(coursesRes?.courses || []);
      setMappings(adminDataRes?.mappings || []);
      setFaculty(adminDataRes?.faculty || []);
    } catch {
      showToast('Failed to load mapping data.', 'error');
    } finally {
      setMappingsLoading(false);
    }
  };

  const fetchStudents = useCallback(async () => {
    try {
      setStudentsLoading(true);
      const params = {
        page: studentPage,
        limit: STUDENT_LIMIT,
        search: studentSearch.trim() || undefined,
        role: 'student',
      };
      if (studentFilterSection && studentFilterSection !== 'ALL') {
        params.section = studentFilterSection;
      }
      const res = await api.get('/admin/users', { params });
      setStudents(Array.isArray(res.data) ? res.data : []);
      if (res.pagination) setStudentPagination(res.pagination);
    } catch {
      // silently handle
    } finally {
      setStudentsLoading(false);
    }
  }, [studentPage, studentSearch, studentFilterSection]);

  useEffect(() => {
    fetchCoursesAndAdminData();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Debounce student search
  useEffect(() => {
    const t = setTimeout(() => {
      setStudentPage(1);
      fetchStudents();
    }, 300);
    return () => clearTimeout(t);
  }, [studentSearch, studentFilterSection]);

  // Handle Faculty Mapping Form Submit
  const handleMappingSubmit = async (e) => {
    e.preventDefault();
    if (!mappingForm.course_id || !mappingForm.faculty_id) {
      showToast('Please select both a course and a faculty member.', 'error');
      return;
    }

    const matchedBatch = batches.find((b) => b.name === mappingForm.batch_name);
    const semToUse = matchedBatch ? matchedBatch.semester : 'Semester III';
    const yrToUse = matchedBatch ? matchedBatch.academic_year : '2025-2026';

    try {
      setMappingSubmitting(true);
      if (editingMapping) {
        await api.delete(`/admin/labs/mappings/${editingMapping.id}`).catch(() => {});
      }
      await api.post('/admin/labs/mappings', {
        course_id: Number(mappingForm.course_id),
        faculty_id: Number(mappingForm.faculty_id),
        section: mappingForm.batch_name || 'ALL',
        semester: semToUse,
        academic_year: yrToUse,
      });

      showToast(editingMapping ? 'Faculty mapping updated!' : 'Faculty mapping created successfully!');
      setMappingForm(emptyMapping);
      setEditingMapping(null);
      fetchCoursesAndAdminData();
    } catch {
      showToast('Failed to save faculty mapping.', 'error');
    } finally {
      setMappingSubmitting(false);
    }
  };

  const [deletingMappingId, setDeletingMappingId] = useState(null);

  const executeDeleteMapping = async () => {
    if (!deletingMappingId) return;
    const id = deletingMappingId;
    setDeletingMappingId(null);
    try {
      await api.delete(`/admin/labs/mappings/${id}`);
      showToast('Faculty mapping deleted.');
      fetchCoursesAndAdminData();
    } catch {
      showToast('Failed to delete mapping.', 'error');
    }
  };

  const openEditMapping = (m) => {
    setEditingMapping(m);
    setMappingForm({
      course_id: String(m.course_id || m.course?.id || ''),
      faculty_id: String(m.faculty_id || m.faculty?.id || ''),
      batch_name: m.section === 'ALL' ? '' : m.section || '',
    });
  };

  const closeEditMapping = () => {
    setEditingMapping(null);
    setMappingForm(emptyMapping);
  };

  // Batch Student to Course Mapping Submit
  const handleStudentBatchMapping = async () => {
    if (selectedStudentIds.size === 0) {
      showToast('Please select at least one student.', 'error');
      return;
    }
    if (!studentMappingForm.course_id || !studentMappingForm.faculty_id) {
      showToast('Please select both course and faculty.', 'error');
      return;
    }

    const matchedBatch = batches.find((b) => b.name === studentMappingForm.batch_name);
    const semToUse = matchedBatch ? matchedBatch.semester : 'Semester III';
    const yrToUse = matchedBatch ? matchedBatch.academic_year : '2025-2026';

    try {
      setStudentMappingSubmitting(true);
      await api.post('/admin/labs/mappings', {
        course_id: Number(studentMappingForm.course_id),
        faculty_id: Number(studentMappingForm.faculty_id),
        section: studentMappingForm.batch_name || 'ALL',
        semester: semToUse,
        academic_year: yrToUse,
      });

      showToast(`Mapped ${selectedStudentIds.size} student(s) to course!`);
      setSelectedStudentIds(new Set());
      fetchCoursesAndAdminData();
    } catch {
      showToast('Failed to assign students.', 'error');
    } finally {
      setStudentMappingSubmitting(false);
    }
  };

  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllStudents = () => {
    if (selectedStudentIds.size === students.length && students.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  };

  // Select Options
  const courseOptions = courses.map((c) => ({
    value: String(c.id),
    label: `${c.course_code} — ${c.title}`,
  }));

  const facultyOptions = faculty.map((f) => ({
    value: String(f.id),
    label: `${f.name} (${f.department || f.email})`,
  }));

  const batchOptions = batches.map((b) => ({
    value: b.name,
    label: `${b.name} (${b.semester} · ${b.academic_year})`,
  }));

  const selectedBatchInfo = batches.find((b) => b.name === mappingForm.batch_name);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold transition-all ${
            toast.type === 'error'
              ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/30'
              : 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/labs/config')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-[var(--shadow-sm)] shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
            Back to Config
          </button>
          <div>
            <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
              <UsersRound className="w-6 h-6 text-[var(--accent)]" />
              Faculty Lab Incharge Mapping
            </h1>
            <p className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
              Map lab courses and student batches to responsible faculty incharges with automatic semester synchronization.
            </p>
          </div>
        </div>

        <button
          onClick={fetchCoursesAndAdminData}
          className="p-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          title="Refresh mappings"
        >
          <RefreshCw className={`w-4 h-4 ${mappingsLoading ? 'animate-spin text-[var(--accent)]' : ''}`} />
        </button>
      </div>

      {/* Top Split: Form + Active Mappings */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Create / Edit Mapping Form */}
        <div className={`${sectionCls} xl:col-span-1`}>
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
            <h2 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[var(--accent)]" />
              {editingMapping ? 'Edit Faculty Mapping' : 'New Faculty Lab Mapping'}
            </h2>
            {editingMapping && (
              <button
                onClick={closeEditMapping}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--red)] cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleMappingSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className={labelCls}>
                Lab Course <span className="text-[var(--red)]">*</span>
              </label>
              <SearchableSelect
                options={courseOptions}
                value={String(mappingForm.course_id)}
                onChange={(v) => setMappingForm((p) => ({ ...p, course_id: v }))}
                placeholder="Select lab course..."
                searchPlaceholder="Search course code or name..."
                fullWidth
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>
                Faculty (Lab Incharge) <span className="text-[var(--red)]">*</span>
              </label>
              <SearchableSelect
                options={facultyOptions}
                value={String(mappingForm.faculty_id)}
                onChange={(v) => setMappingForm((p) => ({ ...p, faculty_id: v }))}
                placeholder="Select faculty..."
                searchPlaceholder="Search faculty name, email, dept..."
                fullWidth
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Student Section / Batch</label>
              <SearchableSelect
                options={[{ value: 'ALL', label: 'ALL (Entire Class)' }, ...batchOptions]}
                value={mappingForm.batch_name}
                onChange={(v) => setMappingForm((p) => ({ ...p, batch_name: v }))}
                placeholder="Select batch (e.g. CSE-A)..."
                fullWidth
                clearable
              />
            </div>

            {/* Batch Inherited Semester & Year Info */}
            {selectedBatchInfo ? (
              <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--accent-dim)]/50 border border-[var(--border-accent)] space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[var(--accent)]">
                  <Info className="w-3.5 h-3.5" />
                  <span>Linked Batch Parameters</span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Semester: <strong className="text-[var(--text-primary)]">{selectedBatchInfo.semester}</strong> · Year:{' '}
                  <strong className="text-[var(--text-primary)]">{selectedBatchInfo.academic_year}</strong>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Semester and year will be synchronized from the batch configuration.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={mappingSubmitting}
              className="w-full py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-[var(--shadow-sm)]"
            >
              {mappingSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {editingMapping ? 'Update Mapping' : 'Create Faculty Mapping'}
            </button>
          </form>
        </div>

        {/* Active Mappings Grid */}
        <div className={`${sectionCls} xl:col-span-2`}>
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
            <h2 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--accent)]" />
              Active Faculty Lab Mappings
              <span className="text-[11px] font-mono text-[var(--text-muted)] ml-1">
                ({mappings.length})
              </span>
            </h2>
          </div>

          {mappingsLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-[var(--text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
              <span className="text-xs">Loading mappings...</span>
            </div>
          ) : mappings.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)] text-xs">
              No faculty lab mappings configured yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mappings.map((m) => (
                <div
                  key={m.id}
                  className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 flex flex-col justify-between space-y-3 transition-all hover:border-[var(--border-accent)] shadow-[var(--shadow-xs)]"
                >
                  <div className="space-y-2.5">
                    {/* Header: Badges & Action Buttons */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                          {m.course?.course_code || 'LAB'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--bg-raised)] text-[var(--accent)] border border-[var(--border)]">
                          Batch: {m.section || 'ALL'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditMapping(m)}
                          className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer transition-all"
                          title="Edit mapping"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingMappingId(m.id)}
                          className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--red-bg)] border border-[var(--red)]/20 text-[var(--red)] hover:bg-[var(--red)]/15 cursor-pointer transition-all"
                          title="Remove mapping"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Course Title */}
                    <div>
                      <h4 className="text-[14px] font-bold text-[var(--text-primary)] leading-tight">
                        {m.course?.title || 'Course Title'}
                      </h4>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {m.semester} · {m.academic_year}
                      </div>
                    </div>

                    {/* Faculty Incharge Info */}
                    <div className="flex items-center gap-2 p-2 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)]">
                      <div className="w-6 h-6 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center font-bold text-[10px] shrink-0">
                        {m.faculty?.name?.charAt(0) || 'F'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                          {m.faculty?.name || 'Faculty Incharge'}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] truncate">
                          {m.faculty?.email || 'Faculty'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Link */}
                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)] font-mono">
                      {m.course?.total_experiments || 7} Experiments
                    </span>
                    {m.course?.id && (
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/labs/courses/${m.course.id}/experiments`)}
                        className="text-[var(--accent)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        Configure Exps &rarr;
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Batch Student Direct Course Mapper */}
      <div className={sectionCls}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-[var(--accent)]" />
              Batch Student Lab Course Enrolment
              {selectedStudentIds.size > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                  {selectedStudentIds.size} selected
                </span>
              )}
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Map selected students directly to a lab course and incharge faculty member.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          <div className="space-y-1.5">
            <label className={labelCls}>Lab Course</label>
            <SearchableSelect
              options={courseOptions}
              value={String(studentMappingForm.course_id)}
              onChange={(v) => setStudentMappingForm((p) => ({ ...p, course_id: v }))}
              placeholder="Select course..."
              searchPlaceholder="Search course..."
              fullWidth
              clearable
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Faculty (Incharge)</label>
            <SearchableSelect
              options={facultyOptions}
              value={String(studentMappingForm.faculty_id)}
              onChange={(v) => setStudentMappingForm((p) => ({ ...p, faculty_id: v }))}
              placeholder="Select faculty..."
              searchPlaceholder="Search faculty..."
              fullWidth
              clearable
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Batch / Section</label>
            <SearchableSelect
              options={[{ value: 'ALL', label: 'ALL' }, ...batchOptions]}
              value={studentMappingForm.batch_name}
              onChange={(v) => setStudentMappingForm((p) => ({ ...p, batch_name: v }))}
              placeholder="Select batch..."
              fullWidth
              clearable
            />
          </div>
        </div>

        {selectedStudentIds.size > 0 && (
          <button
            onClick={handleStudentBatchMapping}
            disabled={studentMappingSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-[var(--shadow-sm)]"
          >
            {studentMappingSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserCheck className="w-3.5 h-3.5" />
            )}
            Assign {selectedStudentIds.size} Selected Student
            {selectedStudentIds.size > 1 ? 's' : ''} to Course
          </button>
        )}

        {/* Student Table with Search + Batch Filter */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students by name, roll number, email..."
                className={`${inputCls} pl-9`}
              />
            </div>

            <div className="w-52 shrink-0">
              <SearchableSelect
                options={[{ value: 'ALL', label: 'All Batches' }, ...batchOptions]}
                value={studentFilterSection}
                onChange={(v) => {
                  setStudentFilterSection(v);
                  setStudentPage(1);
                }}
                placeholder="Filter by batch..."
                fullWidth
              />
            </div>

            <button
              onClick={toggleAllStudents}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer transition-all shrink-0"
            >
              {selectedStudentIds.size === students.length && students.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              {selectedStudentIds.size === students.length && students.length > 0
                ? 'Deselect All'
                : 'Select All on Page'}
            </button>
          </div>

          {studentsLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-[var(--text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
              <span className="text-xs">Loading students...</span>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[var(--border)] rounded-[var(--radius-md)]">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-raised)]">
                    <th className="py-2.5 px-3 w-9"></th>
                    <th className="py-2.5 pr-4 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="py-2.5 pr-4 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Roll No
                    </th>
                    <th className="py-2.5 pr-4 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Department
                    </th>
                    <th className="py-2.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Section / Batch
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[var(--text-muted)] text-xs">
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => {
                      const isSelected = selectedStudentIds.has(s.id);
                      return (
                        <tr
                          key={s.id}
                          onClick={() => toggleStudent(s.id)}
                          className={`cursor-pointer transition-colors hover:bg-[var(--bg-raised)] ${
                            isSelected ? 'bg-[var(--accent-dim)]/50' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                            ) : (
                              <Square className="w-4 h-4 text-[var(--text-muted)]" />
                            )}
                          </td>
                          <td className="py-2.5 pr-4 font-medium text-[var(--text-primary)]">
                            <div>{s.name}</div>
                            <div className="text-[11px] text-[var(--text-muted)]">{s.email}</div>
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-[var(--text-secondary)]">
                            {s.roll_no || '—'}
                          </td>
                          <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{s.department || '—'}</td>
                          <td className="py-2.5">
                            {s.section ? (
                              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                                {s.section}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[var(--text-muted)] italic">Unassigned</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {studentPagination.total_pages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <span className="text-[11px] text-[var(--text-muted)]">
                {studentPagination.total_records} students · Page {studentPage} of {studentPagination.total_pages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={!studentPagination.has_prev}
                  onClick={() => setStudentPage((p) => p - 1)}
                  className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(studentPagination.total_pages, 5) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setStudentPage(p)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                        studentPage === p
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  disabled={!studentPagination.has_next}
                  onClick={() => setStudentPage((p) => p + 1)}
                  className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Mapping Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingMappingId)}
        onClose={() => setDeletingMappingId(null)}
        onConfirm={executeDeleteMapping}
        title="Delete Faculty Mapping"
        message="Are you sure you want to delete this faculty lab mapping?"
        confirmText="Delete Mapping"
        variant="danger"
        isDanger={true}
      />
    </div>
  );
}
