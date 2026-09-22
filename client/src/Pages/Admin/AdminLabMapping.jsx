import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  BookOpen,
  Building2,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import api from '../../api/axios';

export default function AdminLabMapping() {
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [section, setSection] = useState('CSE-A');
  const [semester, setSemester] = useState('Semester III');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/labs/data');
      setCourses(res.data.courses || []);
      setFaculty(res.data.faculty || []);
      setMappings(res.data.mappings || []);
      if (res.data.courses?.length > 0) setSelectedCourse(res.data.courses[0].id);
      if (res.data.faculty?.length > 0) setSelectedFaculty(res.data.faculty[0].id);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/admin/labs/mappings', {
        course_id: parseInt(selectedCourse),
        faculty_id: parseInt(selectedFaculty),
        section,
        semester,
        academic_year: academicYear
      });
      showToast('Faculty lab mapping assigned successfully!', 'success');
      fetchData();
    } catch {
      showToast('Failed to save mapping.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this faculty mapping?')) return;
    try {
      await api.delete(`/admin/labs/mappings/${id}`);
      showToast('Mapping removed.', 'success');
      fetchData();
    } catch {
      showToast('Failed to delete mapping.', 'error');
    }
  };

  const inputClass = "w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] transition-all";

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold ${
          toast.type === 'error'
            ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/30'
            : 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/30'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="pb-4 border-b border-[var(--border)]">
        <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
          <Building2 className="w-6 h-6 text-[var(--accent)]" />
          Faculty–Student Lab Course Mapping
        </h1>
        <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
          Assign faculty members as Lab Incharges for specific lab courses, academic years, semesters, and student sections.
        </p>
      </div>

      {/* Assignment Form */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] space-y-5">
        <h2 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[var(--accent)]" />
          Assign New Lab Incharge
        </h2>

        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)]">Lab Course</label>
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className={inputClass}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.course_code} — {c.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)]">Faculty (Lab Incharge)</label>
            <select value={selectedFaculty} onChange={(e) => setSelectedFaculty(e.target.value)} className={inputClass}>
              {faculty.map((f) => (
                <option key={f.id} value={f.id}>{f.name} — {f.email}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)]">Student Section / Batch</label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. CSE-A or ALL"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)]">Semester</label>
            <input type="text" value={semester} onChange={(e) => setSemester(e.target.value)} className={inputClass} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)]">Academic Year</label>
            <input type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={inputClass} />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shadow-[var(--shadow-sm)]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Save Assignment
            </button>
          </div>
        </form>
      </div>

      {/* Mappings Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] space-y-4">
        <h2 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[var(--accent)]" />
          Active Lab Mappings
          <span className="text-[11px] font-mono text-[var(--text-muted)] ml-1">({mappings.length})</span>
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-[var(--text-muted)] gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
            <span className="text-sm">Loading mappings...</span>
          </div>
        ) : mappings.length === 0 ? (
          <div className="py-10 text-center text-[var(--text-muted)] text-sm">
            No faculty lab mappings configured yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-3 pr-4 text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">Course</th>
                  <th className="pb-3 pr-4 text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">Lab Incharge</th>
                  <th className="pb-3 pr-4 text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">Section</th>
                  <th className="pb-3 pr-4 text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">Semester</th>
                  <th className="pb-3 text-right text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-[var(--bg-raised)] transition-colors">
                    <td className="py-3 pr-4 font-semibold text-[var(--text-primary)]">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] mr-1.5">
                        {m.course?.course_code}
                      </span>
                      <span className="text-[var(--text-secondary)]">{m.course?.title}</span>
                    </td>
                    <td className="py-3 pr-4 text-[var(--text-primary)] font-medium">{m.faculty?.name}</td>
                    <td className="py-3 pr-4">
                      <span className="font-mono text-[var(--accent)] text-[11px] px-1.5 py-0.5 rounded bg-[var(--accent-dim)] border border-[var(--border-accent)]">
                        {m.section}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[var(--text-secondary)]">{m.semester} ({m.academic_year})</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/20 hover:bg-[var(--red)]/15 cursor-pointer transition-all"
                        title="Remove mapping"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
