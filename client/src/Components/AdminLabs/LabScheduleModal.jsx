import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Users,
  User,
  Layers,
  Sparkles,
  ShieldAlert,
  Trash2,
  Plus,
  RefreshCw,
  Lock,
  Unlock,
  Sliders
} from 'lucide-react';
import api from '../../api/axios';

export default function LabScheduleModal({
  isOpen,
  onClose,
  courses = [],
  sections = [],
  experiments = [],
  students = [],
  studentOverrides = [],
  initialCourseId = '',
  initialStudentId = '',
  initialExpId = '',
  onSuccess,
}) {
  const [activeMode, setActiveMode] = useState('bulk'); // 'bulk' | 'individual' | 'manage_overrides'
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId || (courses[0]?.id ? String(courses[0].id) : ''));
  
  // Bulk Mode State
  const [bulkSection, setBulkSection] = useState('ALL');
  const [selectedExpIds, setSelectedExpIds] = useState(new Set());
  const [bulkIsUnlocked, setBulkIsUnlocked] = useState(true);
  const [bulkStartsAt, setBulkStartsAt] = useState('');
  const [bulkEndsAt, setBulkEndsAt] = useState('');
  const [bulkMaxAttempts, setBulkMaxAttempts] = useState(0);
  const [bulkNotes, setBulkNotes] = useState('');

  // Individual Student Override State
  const [targetStudentId, setTargetStudentId] = useState(initialStudentId || '');
  const [targetExpId, setTargetExpId] = useState(initialExpId || '');
  const [studentSearch, setStudentSearch] = useState('');
  const [indivIsUnlocked, setIndivIsUnlocked] = useState(true);
  const [indivStartsAt, setIndivStartsAt] = useState('');
  const [indivEndsAt, setIndivEndsAt] = useState('');
  const [indivMaxAttempts, setIndivMaxAttempts] = useState(0);
  const [indivNotes, setIndivNotes] = useState('Individual faculty extension');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [deletingOverrideId, setDeletingOverrideId] = useState(null);

  // Sync course experiments
  const currentCourseExps = experiments.filter((e) => String(e.course_id) === String(selectedCourseId));

  useEffect(() => {
    if (isOpen) {
      if (initialCourseId) setSelectedCourseId(String(initialCourseId));
      if (initialStudentId) {
        setTargetStudentId(String(initialStudentId));
        setActiveMode('individual');
      }
      if (initialExpId) setTargetExpId(String(initialExpId));
      
      // Select all course experiments by default for bulk
      const expSet = new Set(currentCourseExps.map((e) => e.id));
      setSelectedExpIds(expSet);
      
      // Default dates: Starts now, Ends in 7 days
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const toLocalISO = (d) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
      };
      
      setBulkStartsAt(toLocalISO(now));
      setBulkEndsAt(toLocalISO(nextWeek));
      setIndivStartsAt(toLocalISO(now));
      setIndivEndsAt(toLocalISO(nextWeek));
    }
  }, [isOpen, selectedCourseId, initialCourseId, initialStudentId, initialExpId]);

  const toggleExpSelection = (id) => {
    setSelectedExpIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllExps = () => {
    setSelectedExpIds(new Set(currentCourseExps.map((e) => e.id)));
  };

  const clearAllExps = () => {
    setSelectedExpIds(new Set());
  };

  // Filter students for individual override
  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.roll_no?.toLowerCase().includes(q) || s.section?.toLowerCase().includes(q);
  });

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (selectedExpIds.size === 0) {
      setErrorMsg('Please select at least one experiment.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await api.post('/lab-incharge/unlocks/schedule', {
        course_id: Number(selectedCourseId),
        experiment_ids: Array.from(selectedExpIds),
        section: bulkSection,
        is_unlocked: bulkIsUnlocked,
        starts_at: bulkStartsAt ? new Date(bulkStartsAt).toISOString() : null,
        ends_at: bulkEndsAt ? new Date(bulkEndsAt).toISOString() : null,
        max_attempts: Number(bulkMaxAttempts) || 0,
        notes: bulkNotes,
      });

      if (onSuccess) onSuccess('Experiment attendance window configured successfully!');
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to save bulk schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIndividualSubmit = async (e) => {
    e.preventDefault();
    if (!targetStudentId) {
      setErrorMsg('Please select a student.');
      return;
    }
    if (!targetExpId) {
      setErrorMsg('Please select an experiment.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await api.post('/lab-incharge/unlocks/student-override', {
        course_id: Number(selectedCourseId),
        experiment_id: Number(targetExpId),
        student_id: Number(targetStudentId),
        is_unlocked: indivIsUnlocked,
        starts_at: indivStartsAt ? new Date(indivStartsAt).toISOString() : null,
        ends_at: indivEndsAt ? new Date(indivEndsAt).toISOString() : null,
        max_attempts: Number(indivMaxAttempts) || 0,
        notes: indivNotes,
      });

      if (onSuccess) onSuccess('Individual student window override saved successfully!');
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to save student override.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOverride = async (id) => {
    if (!window.confirm('Revoke this student window override?')) return;
    try {
      setDeletingOverrideId(id);
      await api.delete(`/lab-incharge/unlocks/student-override/${id}`);
      if (onSuccess) onSuccess('Student override revoked successfully.');
    } catch {
      setErrorMsg('Failed to delete student override.');
    } finally {
      setDeletingOverrideId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Experiment Attendance Window & Scheduling
                </h2>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Control start & end availability windows, unlock status, and student-specific exemptions.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--red)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Navigation */}
        <div className="flex border-b border-[var(--border)] bg-[var(--bg-card)] px-6 pt-3 gap-2">
          <button
            onClick={() => { setActiveMode('bulk'); setErrorMsg(''); }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeMode === 'bulk'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Bulk Section Window
          </button>
          <button
            onClick={() => { setActiveMode('individual'); setErrorMsg(''); }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeMode === 'individual'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Individual Student Override
          </button>
          <button
            onClick={() => { setActiveMode('manage_overrides'); setErrorMsg(''); }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeMode === 'manage_overrides'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Active Overrides ({studentOverrides.length})
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* ============================================================ */}
          {/* TAB 1: BULK SECTION WINDOW                                    */}
          {/* ============================================================ */}
          {activeMode === 'bulk' && (
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Target Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Target Section / Batch
                  </label>
                  <select
                    value={bulkSection}
                    onChange={(e) => setBulkSection(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="ALL">ALL Sections (Course Wide)</option>
                    {sections.map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Experiments Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Select Experiments ({selectedExpIds.size}/{currentCourseExps.length})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllExps}
                      className="text-[10px] text-[var(--accent)] font-semibold hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-[var(--text-muted)]">•</span>
                    <button
                      type="button"
                      onClick={clearAllExps}
                      className="text-[10px] text-[var(--text-muted)] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-[var(--bg-input)] rounded-xl border border-[var(--border)]">
                  {currentCourseExps.map((exp) => {
                    const isSelected = selectedExpIds.has(exp.id);
                    return (
                      <div
                        key={exp.id}
                        onClick={() => toggleExpSelection(exp.id)}
                        className={`p-2 rounded-lg border text-xs flex items-center gap-2 cursor-pointer transition-all select-none ${
                          isSelected
                            ? 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--accent)] font-semibold'
                            : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-[var(--accent)] focus:ring-0 cursor-pointer"
                        />
                        <span className="font-mono text-[10px] font-bold opacity-80">Ex {exp.experiment_no}</span>
                        <span className="truncate">{exp.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Window DateTime Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border)]">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Window Opens At (Start)
                  </label>
                  <input
                    type="datetime-local"
                    value={bulkStartsAt}
                    onChange={(e) => setBulkStartsAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Window Closes At (Deadline)
                  </label>
                  <input
                    type="datetime-local"
                    value={bulkEndsAt}
                    onChange={(e) => setBulkEndsAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Access Permission
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        checked={bulkIsUnlocked === true}
                        onChange={() => setBulkIsUnlocked(true)}
                        className="text-[var(--accent)]"
                      />
                      <span className="text-[var(--green)] font-semibold flex items-center gap-1">
                        <Unlock className="w-3.5 h-3.5" /> Unlocked / Open
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        checked={bulkIsUnlocked === false}
                        onChange={() => setBulkIsUnlocked(false)}
                        className="text-[var(--accent)]"
                      />
                      <span className="text-[var(--red)] font-semibold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Locked
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Max Submissions Attempt Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    placeholder="0 = Unlimited attempts"
                    value={bulkMaxAttempts}
                    onChange={(e) => setBulkMaxAttempts(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <span className="text-[10px] text-[var(--text-muted)]">Set 0 for unlimited code runs</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Faculty Broadcast Note / Instructions
                </label>
                <textarea
                  rows={2}
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="e.g. Practical lab session window. Complete Ex 1 & 2 before 5:00 PM."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting || selectedExpIds.size === 0}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-md"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Apply Bulk Window Schedule
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* ============================================================ */}
          {/* TAB 2: INDIVIDUAL STUDENT OVERRIDE                             */}
          {/* ============================================================ */}
          {activeMode === 'individual' && (
            <form onSubmit={handleIndividualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Select Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} - {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Select Experiment
                  </label>
                  <select
                    value={targetExpId}
                    onChange={(e) => setTargetExpId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">-- Choose Experiment --</option>
                    {currentCourseExps.map((exp) => (
                      <option key={exp.id} value={exp.id}>
                        Ex {exp.experiment_no}: {exp.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Target Student
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search student by Roll Number, Name, or Section..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <Users className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-3" />
                </div>

                <div className="max-h-36 overflow-y-auto p-2 bg-[var(--bg-input)] rounded-xl border border-[var(--border)] space-y-1">
                  {filteredStudents.slice(0, 30).map((st) => {
                    const isSelected = String(targetStudentId) === String(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => setTargetStudentId(String(st.id))}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--accent)] font-semibold'
                            : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-[var(--text-primary)]">
                            {st.roll_no || `ID#${st.id}`}
                          </span>
                          <span>{st.name}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-muted)] font-mono">
                          {st.section ? `Sec ${st.section}` : 'General'}
                        </span>
                      </div>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <div className="p-3 text-center text-xs text-[var(--text-muted)]">
                      No students found matching your search.
                    </div>
                  )}
                </div>
              </div>

              {/* Student Override Window Config */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border)]">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Special Window Opens At
                  </label>
                  <input
                    type="datetime-local"
                    value={indivStartsAt}
                    onChange={(e) => setIndivStartsAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Special Window Closes At
                  </label>
                  <input
                    type="datetime-local"
                    value={indivEndsAt}
                    onChange={(e) => setIndivEndsAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Override Status
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        checked={indivIsUnlocked === true}
                        onChange={() => setIndivIsUnlocked(true)}
                        className="text-[var(--accent)]"
                      />
                      <span className="text-[var(--green)] font-semibold flex items-center gap-1">
                        <Unlock className="w-3.5 h-3.5" /> Granted / Open
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="radio"
                        checked={indivIsUnlocked === false}
                        onChange={() => setIndivIsUnlocked(false)}
                        className="text-[var(--accent)]"
                      />
                      <span className="text-[var(--red)] font-semibold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Revoked / Locked
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Max Attempts Allowed
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    placeholder="0 = Unlimited"
                    value={indivMaxAttempts}
                    onChange={(e) => setIndivMaxAttempts(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Reason / Faculty Remarks
                </label>
                <input
                  type="text"
                  value={indivNotes}
                  onChange={(e) => setIndivNotes(e.target.value)}
                  placeholder="e.g. 24-hour extension granted for medical absence."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !targetStudentId || !targetExpId}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-md"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Student Override
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* ============================================================ */}
          {/* TAB 3: MANAGE ACTIVE STUDENT OVERRIDES                         */}
          {/* ============================================================ */}
          {activeMode === 'manage_overrides' && (
            <div className="space-y-3">
              {studentOverrides.length === 0 ? (
                <div className="p-8 text-center bg-[var(--bg-input)]/40 rounded-2xl border border-[var(--border)] space-y-2">
                  <ShieldAlert className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">No Active Student Overrides</h4>
                  <p className="text-[11px] text-[var(--text-secondary)] max-w-sm mx-auto">
                    Individual exemptions, re-test unlocks, or deadline extensions granted to specific students will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {studentOverrides.map((ov) => {
                    const st = ov.student;
                    const exp = ov.experiment;
                    const isDeleting = deletingOverrideId === ov.id;
                    const starts = ov.starts_at ? new Date(ov.starts_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Immediate';
                    const ends = ov.ends_at ? new Date(ov.ends_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Indefinite';

                    return (
                      <div
                        key={ov.id}
                        className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-between gap-3 hover:border-[var(--accent)]/40 transition-all"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                              {st?.roll_no || `Student #${ov.student_id}`}
                            </span>
                            <span className="text-xs text-[var(--text-secondary)] font-medium">{st?.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-bold">
                              Ex {exp?.experiment_no || ov.experiment_id}: {exp?.title || 'Experiment'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] flex-wrap">
                            <span>Window: <strong className="text-[var(--text-primary)]">{starts} → {ends}</strong></span>
                            {ov.max_attempts > 0 && <span>Max Attempts: <strong className="text-[var(--text-primary)]">{ov.max_attempts}</strong></span>}
                            {ov.notes && <span className="italic text-[var(--text-secondary)]">"{ov.notes}"</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDeleteOverride(ov.id)}
                          className="p-2 rounded-lg bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/20 hover:opacity-80 transition-all cursor-pointer disabled:opacity-50"
                          title="Revoke student override"
                        >
                          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
