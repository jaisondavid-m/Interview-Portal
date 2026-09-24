import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
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
  FlaskConical,
  GraduationCap,
  Layers,
  ChevronRight
} from 'lucide-react';
import api from '../../api/axios';
import SearchableSelect from '../../Components/SearchableSelect';

const inputCls =
  'w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all';
const labelCls = 'text-[12px] font-semibold text-[var(--text-secondary)]';

const SEMESTER_OPTIONS = [
  { value: 'Semester I', label: 'Semester I' },
  { value: 'Semester II', label: 'Semester II' },
  { value: 'Semester III', label: 'Semester III' },
  { value: 'Semester IV', label: 'Semester IV' },
  { value: 'Semester V', label: 'Semester V' },
  { value: 'Semester VI', label: 'Semester VI' },
  { value: 'Semester VII', label: 'Semester VII' },
  { value: 'Semester VIII', label: 'Semester VIII' },
];

const REGULATION_OPTIONS = [
  { value: '2022', label: 'Regulation 2022' },
  { value: '2026', label: 'Regulation 2026' },
  { value: '2018', label: 'Regulation 2018' },
];

export default function AdminLabCourses() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  // Modal State
  const [courseModal, setCourseModal] = useState(null); // null | 'create' | 'edit'
  const [editingCourse, setEditingCourse] = useState(null);
  const emptyCourse = {
    course_code: '',
    title: '',
    department: '',
    degree: 'B.Tech',
    semester: 'Semester III',
    regulation: '2022',
    total_experiments: 7,
    description: '',
  };
  const [courseForm, setCourseForm] = useState(emptyCourse);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchCoursesAndData();
  }, []);

  const fetchCoursesAndData = async () => {
    try {
      setLoading(true);
      const [coursesRes, adminDataRes] = await Promise.all([
        api.get('/labs/courses'),
        api.get('/admin/labs/data').catch(() => ({ mappings: [] })),
      ]);
      setCourses(coursesRes?.courses || []);
      setMappings(adminDataRes?.mappings || []);
    } catch {
      showToast('Failed to load lab courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreateCourse = () => {
    setCourseForm(emptyCourse);
    setEditingCourse(null);
    setCourseModal('create');
  };

  const openEditCourse = (c) => {
    setCourseForm({
      course_code: c.course_code || '',
      title: c.title || '',
      department: c.department || '',
      degree: c.degree || 'B.Tech',
      semester: c.semester || 'Semester III',
      regulation: c.regulation || '2022',
      total_experiments: c.total_experiments || 7,
      description: c.description || '',
    });
    setEditingCourse(c);
    setCourseModal('edit');
  };

  const closeCourseModal = () => {
    setCourseModal(null);
    setEditingCourse(null);
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    if (!courseForm.course_code.trim() || !courseForm.title.trim()) {
      showToast('Course code and title are required.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...courseForm,
        course_code: courseForm.course_code.trim().toUpperCase(),
        title: courseForm.title.trim(),
        total_experiments: Number(courseForm.total_experiments) || 7,
      };

      if (courseModal === 'create') {
        const res = await api.post('/labs/courses', payload);
        showToast(res?.message || 'Lab course created successfully!');
      } else if (courseModal === 'edit' && editingCourse) {
        const res = await api.put(`/labs/courses/${editingCourse.id}`, payload);
        showToast(res?.message || 'Lab course updated successfully!');
      }

      closeCourseModal();
      fetchCoursesAndData();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to save lab course.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the lab course "${title}"?`)) return;
    try {
      await api.delete(`/labs/courses/${id}`);
      showToast('Lab course deleted successfully.');
      fetchCoursesAndData();
    } catch {
      showToast('Failed to delete lab course.', 'error');
    }
  };

  const filteredCourses = courses.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.course_code?.toLowerCase().includes(q) ||
      c.department?.toLowerCase().includes(q) ||
      c.semester?.toLowerCase().includes(q) ||
      c.regulation?.toLowerCase().includes(q)
    );
  });

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
              <BookOpen className="w-6 h-6 text-[var(--accent)]" />
              Lab Courses Curriculum
            </h1>
            <p className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
              Configure practical laboratory courses, experiment problem statements, and academic syllabus.
            </p>
          </div>
        </div>

        <button
          onClick={openCreateCourse}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)] shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Lab Course
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-4 shadow-[var(--shadow-xs)]">
        <div className="relative w-full max-w-md flex items-center">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lab courses (e.g. 22AI304, Data Structures, Python)..."
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-9 pr-8 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Courses Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
          <span className="text-sm">Loading lab courses...</span>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-12 text-center space-y-3">
          <FlaskConical className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
          <p className="text-[14px] font-semibold text-[var(--text-primary)]">
            {search ? 'No lab courses matching your search.' : 'No practical lab courses configured yet.'}
          </p>
          <p className="text-[12px] text-[var(--text-muted)] max-w-md mx-auto">
            {search
              ? 'Try modifying your search keywords or clear the filter.'
              : 'Get started by creating your first academic lab course with code, curriculum, and experiments.'}
          </p>
          {!search && (
            <button
              onClick={openCreateCourse}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-[var(--shadow-sm)] mt-2"
            >
              <Plus className="w-4 h-4" />
              Add Lab Course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((c) => {
            const mappedFaculty = mappings.filter((m) => m.course_id === c.id);
            const facultyCount = mappedFaculty.length;
            const totalExperiments = c.total_experiments || 0;

            return (
              <div
                key={c.id}
                className="group relative bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-[var(--radius-lg)] p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                onClick={() => navigate(`/admin/labs/courses/${c.id}/experiments`)}
              >
                <div className="space-y-3.5">
                  {/* Top Row: Icon + Badges + Action Buttons */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] flex items-center justify-center shrink-0">
                      <FlaskConical className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditCourse(c);
                        }}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition cursor-pointer"
                        title="Edit Course Details"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCourse(c.id, c.title);
                        }}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--red)] rounded hover:bg-[var(--red-bg)] transition cursor-pointer"
                        title="Delete Course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Course Meta Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                      {c.course_code}
                    </span>
                    {c.semester && (
                      <span className="text-[10px] font-mono text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                        {c.semester}
                      </span>
                    )}
                    {(c.regulation || c.academic_year) && (
                      <span className="text-[10px] font-mono text-[var(--accent)] font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] border border-[var(--border-accent)]">
                        {c.regulation ? (c.regulation.toLowerCase().includes('regulation') ? c.regulation : `Regulation ${c.regulation.replace(/^r/i, '')}`) : 'Regulation 2022'}
                      </span>
                    )}
                  </div>

                  {/* Title & Department */}
                  <div>
                    <h3 className="text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                      {c.title}
                    </h3>
                    <p className="text-[12px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                      {c.department || c.description || 'Practical laboratory curriculum and assessment modules.'}
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[var(--text-primary)] font-semibold">
                      {totalExperiments} {totalExperiments === 1 ? 'Exp' : 'Exps'}
                    </span>
                    <span>•</span>
                    <span>
                      {facultyCount} {facultyCount === 1 ? 'Faculty' : 'Faculty'}
                    </span>
                  </div>
                  <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Configure &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Create / Edit Lab Course */}
      {courseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[var(--accent)]" />
                {courseModal === 'edit' ? 'Edit Lab Course' : 'Add New Lab Course'}
              </h3>
              <button
                onClick={closeCourseModal}
                className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--red)] cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCourseSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>
                    Course Code <span className="text-[var(--red)]">*</span>
                  </label>
                  <input
                    value={courseForm.course_code}
                    onChange={(e) => setCourseForm((p) => ({ ...p, course_code: e.target.value }))}
                    placeholder="e.g. 22AI304"
                    className={inputCls}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Degree</label>
                  <input
                    value={courseForm.degree}
                    onChange={(e) => setCourseForm((p) => ({ ...p, degree: e.target.value }))}
                    placeholder="B.Tech"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>
                  Course Title <span className="text-[var(--red)]">*</span>
                </label>
                <input
                  value={courseForm.title}
                  onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Principles of Programming Laboratory"
                  className={inputCls}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Department</label>
                <input
                  value={courseForm.department}
                  onChange={(e) => setCourseForm((p) => ({ ...p, department: e.target.value }))}
                  placeholder="Artificial Intelligence and Data Science"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>Semester</label>
                  <SearchableSelect
                    options={SEMESTER_OPTIONS}
                    value={courseForm.semester}
                    onChange={(v) => setCourseForm((p) => ({ ...p, semester: v }))}
                    placeholder="Select semester..."
                    fullWidth
                    clearable
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Regulation</label>
                  <SearchableSelect
                    options={REGULATION_OPTIONS}
                    value={courseForm.regulation || '2022'}
                    onChange={(v) => setCourseForm((p) => ({ ...p, regulation: v }))}
                    placeholder="Select regulation..."
                    fullWidth
                    clearable
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Total Experiments</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={courseForm.total_experiments}
                  onChange={(e) =>
                    setCourseForm((p) => ({
                      ...p,
                      total_experiments: parseInt(e.target.value) || 7,
                    }))
                  }
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Description</label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of the lab course curriculum..."
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {courseModal === 'edit' ? 'Save Changes' : 'Create Course'}
                </button>
                <button
                  type="button"
                  onClick={closeCourseModal}
                  className="px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
