import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  Unlock,
  Lock,
  Calendar,
  Sliders,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  MessageSquareCheck,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  Search,
  Filter,
  Save,
  RotateCcw,
  UserPlus,
  Trash2,
  Check,
  X,
  Info,
  ArrowRight,
  Loader2,
  UserCheck,
  CheckSquare,
  Square,
  RefreshCw,
  GitBranch,
  ShieldCheck,
  ListOrdered,
  Users
} from 'lucide-react';
import api from '../../api/axios';

const inputCls =
  'w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all';
const labelCls = 'text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider';

export default function FacultyLabScheduling() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Unlock Matrix & Schedule State
  const [unlockData, setUnlockData] = useState({
    courses: [],
    mappings: [],
    unlocks: [],
    student_overrides: [],
    experiments: [],
    sections: [],
    students: [],
  });
  const [selectedUnlockCourseId, setSelectedUnlockCourseId] = useState('');
  const [selectedUnlockSection, setSelectedUnlockSection] = useState('ALL');
  const [togglingExpId, setTogglingExpId] = useState(null);
  const [savingScheduleExpId, setSavingScheduleExpId] = useState(null);

  // Inline Experiment Schedule Drafts: { [expId]: { is_unlocked, starts_at, ends_at, max_attempts, allow_late_submission, notes } }
  const [scheduleDrafts, setScheduleDrafts] = useState({});

  // Multi-Select Student & Experiment Override Inline Form State
  const [selectedOverrideStudentIds, setSelectedOverrideStudentIds] = useState([]);
  const [selectedOverrideExpIds, setSelectedOverrideExpIds] = useState([]);
  const [overrideStudentSection, setOverrideStudentSection] = useState('ALL');
  const [overrideStudentQuery, setOverrideStudentQuery] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const studentSearchRef = useRef(null);
  const [overrideForm, setOverrideForm] = useState({
    is_unlocked: true,
    bypass_prerequisite: false,
    starts_at: '',
    ends_at: '',
    max_attempts: 0,
    allow_late_submission: false,
    notes: '',
  });
  const [overrideSearch, setOverrideSearch] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchUnlockMatrix();
  }, []);

  const fetchUnlockMatrix = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lab-incharge/unlocks');
      setUnlockData(res || {
        courses: [],
        mappings: [],
        unlocks: [],
        student_overrides: [],
        experiments: [],
        sections: [],
        students: [],
      });
      if (res?.courses?.length > 0 && !selectedUnlockCourseId) {
        setSelectedUnlockCourseId(String(res.courses[0].id));
      }
    } catch {
      showToast('Failed to load lab schedules.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const currentCourse = unlockData.courses.find((c) => String(c.id) === String(selectedUnlockCourseId));
  const activeCourseExperiments = unlockData.experiments.filter(
    (e) => String(e.course_id) === String(selectedUnlockCourseId)
  );

  // Initialize schedule drafts whenever selected course or section changes
  useEffect(() => {
    if (!selectedUnlockCourseId) return;
    const drafts = {};
    activeCourseExperiments.forEach((exp) => {
      const existingUnlock = unlockData.unlocks.find(
        (u) =>
          u.experiment_id === exp.id &&
          (u.section === selectedUnlockSection || u.section === 'ALL')
      );

      drafts[exp.id] = {
        is_unlocked: existingUnlock ? existingUnlock.is_unlocked : false,
        starts_at: existingUnlock?.starts_at ? formatDateForInput(existingUnlock.starts_at) : '',
        ends_at: existingUnlock?.ends_at ? formatDateForInput(existingUnlock.ends_at) : '',
        max_attempts: existingUnlock?.max_attempts || 0,
        allow_late_submission: existingUnlock?.allow_late_submission || false,
        notes: existingUnlock?.notes || '',
      };
    });
    setScheduleDrafts(drafts);

    if (activeCourseExperiments.length > 0 && selectedOverrideExpIds.length === 0) {
      setSelectedOverrideExpIds([activeCourseExperiments[0].id]);
    }
  }, [selectedUnlockCourseId, selectedUnlockSection, unlockData.unlocks, activeCourseExperiments.length]);

  // Close student dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (studentSearchRef.current && !studentSearchRef.current.contains(e.target)) {
        setIsStudentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Multi-select helpers for Override Form
  const availableMatchingStudents = (unlockData.students || []).filter((s) => {
    const isAlreadySelected = selectedOverrideStudentIds.includes(s.id);
    if (isAlreadySelected) return false;
    const matchesSec =
      overrideStudentSection === 'ALL' ||
      !s.section ||
      s.section.toUpperCase() === overrideStudentSection.toUpperCase();
    if (!matchesSec) return false;
    if (!overrideStudentQuery.trim()) return true;
    const q = overrideStudentQuery.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.roll_no?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  const selectedStudentsData = (unlockData.students || []).filter((s) =>
    selectedOverrideStudentIds.includes(s.id)
  );

  const addStudentToSelection = (sId) => {
    if (!selectedOverrideStudentIds.includes(sId)) {
      setSelectedOverrideStudentIds((prev) => [...prev, sId]);
    }
  };

  const removeStudentFromSelection = (sId) => {
    setSelectedOverrideStudentIds((prev) => prev.filter((id) => id !== sId));
  };

  const addAllMatchingStudents = () => {
    const idsToAdd = availableMatchingStudents.map((s) => s.id);
    setSelectedOverrideStudentIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    setIsStudentDropdownOpen(false);
  };

  const toggleExpSelection = (eId) => {
    setSelectedOverrideExpIds((prev) =>
      prev.includes(eId) ? prev.filter((id) => id !== eId) : [...prev, eId]
    );
  };

  const handleSelectAllExperiments = () => {
    const allExpIds = activeCourseExperiments.map((e) => e.id);
    const allSelected =
      allExpIds.length > 0 && allExpIds.every((id) => selectedOverrideExpIds.includes(id));
    if (allSelected) {
      setSelectedOverrideExpIds([]);
    } else {
      setSelectedOverrideExpIds(allExpIds);
    }
  };

  const applyOverrideQuickWindow = (hours) => {
    const now = new Date();
    const end = new Date(now.getTime() + hours * 60 * 60 * 1000);
    setOverrideForm((prev) => ({
      ...prev,
      starts_at: formatDateForInput(now),
      ends_at: formatDateForInput(end),
    }));
  };

  // 6. Save Multi-Student / Multi-Experiment Override Inline
  const handleSaveStudentOverride = async (e) => {
    e.preventDefault();
    if (selectedOverrideStudentIds.length === 0) {
      showToast('Please select at least one student.', 'error');
      return;
    }
    if (selectedOverrideExpIds.length === 0) {
      showToast('Please select at least one experiment.', 'error');
      return;
    }
    try {
      setOverrideSubmitting(true);
      await api.post('/lab-incharge/unlocks/student-override', {
        course_id: Number(selectedUnlockCourseId),
        student_ids: selectedOverrideStudentIds,
        experiment_ids: selectedOverrideExpIds,
        is_unlocked: overrideForm.is_unlocked,
        bypass_prerequisite: overrideForm.bypass_prerequisite,
        starts_at: overrideForm.starts_at ? new Date(overrideForm.starts_at).toISOString() : null,
        ends_at: overrideForm.ends_at ? new Date(overrideForm.ends_at).toISOString() : null,
        max_attempts: Number(overrideForm.max_attempts) || 0,
        allow_late_submission: overrideForm.allow_late_submission,
        notes: overrideForm.notes || '',
      });
      showToast(
        `Override granted to ${selectedOverrideStudentIds.length} student(s) for ${selectedOverrideExpIds.length} experiment(s)!`
      );
      setSelectedOverrideStudentIds([]);
      fetchUnlockMatrix();
    } catch {
      showToast('Failed to save student override.', 'error');
    } finally {
      setOverrideSubmitting(false);
    }
  };

  // 7. Delete Student Override
  const handleDeleteOverride = async (id) => {
    try {
      await api.delete(`/lab-incharge/unlocks/student-override/${id}`);
      showToast('Student override removed.');
      fetchUnlockMatrix();
    } catch {
      showToast('Failed to delete override.', 'error');
    }
  };

  // Filtered Student Overrides
  const activeCourseOverrides = unlockData.student_overrides.filter((o) => {
    const matchesCourse = String(o.course_id) === String(selectedUnlockCourseId);
    if (!matchesCourse) return false;
    if (!overrideSearch.trim()) return true;
    const q = overrideSearch.toLowerCase();
    return (
      o.student?.name?.toLowerCase().includes(q) ||
      o.student?.roll_no?.toLowerCase().includes(q) ||
      o.student?.email?.toLowerCase().includes(q) ||
      o.experiment?.title?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
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
      <div className="pb-4 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <Link to="/faculty/labs" className="hover:text-[var(--accent)] transition-colors">
              Lab Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[var(--text-primary)] font-semibold">Attendance Windows & Scheduling</span>
          </div>
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-[var(--accent)]" />
            Experiment Attendance Windows & Progression Scheduling
          </h1>
          <p className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Configure live release windows, linear milestone completion prerequisites, and individual student extensions without popups.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/faculty/labs')}
            className="px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-[var(--shadow-sm)] flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Student Analytics
          </button>
          <button
            type="button"
            onClick={() => navigate('/faculty/labs/evaluation')}
            className="px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-[var(--shadow-sm)] flex items-center gap-1.5"
          >
            <MessageSquareCheck className="w-3.5 h-3.5" />
            Evaluation Queue
          </button>
        </div>
      </div>

      {/* Target Selector Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-xs)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="space-y-1 min-w-[260px]">
            <label className={labelCls}>Active Lab Course</label>
            <select
              value={selectedUnlockCourseId}
              onChange={(e) => setSelectedUnlockCourseId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              {unlockData.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 min-w-[180px]">
            <label className={labelCls}>Target Section / Batch</label>
            <select
              value={selectedUnlockSection}
              onChange={(e) => setSelectedUnlockSection(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="ALL">ALL Sections (Classwide)</option>
              {unlockData.sections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={fetchUnlockMatrix}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer transition-all shrink-0 self-start md:self-end"
          title="Reload Matrix"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--accent)]' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Experiment Release Roster & Window Timings (NO MODALS) */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4 shadow-[var(--shadow-xs)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--accent)]" />
              Experiment Release Roster & Schedule Windows
              <span className="text-[11px] font-mono text-[var(--text-muted)] ml-1">
                (Section: {selectedUnlockSection})
              </span>
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
              Set attendance window start/end times, attempt quotas, and toggle live unlocks directly inline.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleBulkSetStatus(true)}
              className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] text-xs font-bold hover:brightness-105 cursor-pointer transition-all"
            >
              Unlock All
            </button>
            <button
              onClick={() => handleBulkSetStatus(false)}
              className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-bold cursor-pointer transition-all"
            >
              Lock All
            </button>
          </div>
        </div>

        {/* Experiment Inline Roster Cards */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
            <span>Loading schedule matrix...</span>
          </div>
        ) : activeCourseExperiments.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)] italic">
            No experiments found for this course.
          </div>
        ) : (
          <div className="space-y-4">
            {activeCourseExperiments.map((exp, idx) => {
              const draft = scheduleDrafts[exp.id] || {
                is_unlocked: false,
                starts_at: '',
                ends_at: '',
                max_attempts: 0,
                allow_late_submission: false,
                notes: '',
              };
              const isUnlocked = draft.is_unlocked;
              const hasPrereq = idx > 0;
              const prevExp = hasPrereq ? activeCourseExperiments[idx - 1] : null;
              const isSavingThis = savingScheduleExpId === exp.id;
              const isTogglingThis = togglingExpId === exp.id;

              return (
                <div
                  key={exp.id}
                  className={`bg-[var(--bg-card)] border rounded-[var(--radius-md)] p-4 space-y-3.5 transition-all shadow-[var(--shadow-xs)] ${
                    isUnlocked
                      ? 'border-[var(--border-accent)] ring-1 ring-[var(--border-accent)]/50'
                      : 'border-[var(--border)]'
                  }`}
                >
                  {/* Row 1: Number, Title, Prereq Badge, Unlock Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                        Exp #{exp.experiment_no}
                      </span>
                      <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                        {exp.title}
                      </h3>
                      {hasPrereq && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-semibold">
                          <Lock className="w-3 h-3" />
                          Prerequisite: Exp #{prevExp?.experiment_no} Completion
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleUnlock(exp.id, !isUnlocked)}
                        disabled={isTogglingThis}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all cursor-pointer shadow-sm ${
                          isUnlocked
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                            : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {isTogglingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isUnlocked ? (
                          <Unlock className="w-3.5 h-3.5" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                        {isUnlocked ? 'Unlocked for Class' : 'Locked'}
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Inline Schedule Windows & Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    {/* Window Starts At */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                        Window Starts At
                      </label>
                      <input
                        type="datetime-local"
                        value={draft.starts_at}
                        onChange={(e) =>
                          setScheduleDrafts((prev) => ({
                            ...prev,
                            [exp.id]: { ...prev[exp.id], starts_at: e.target.value },
                          }))
                        }
                        className={inputCls}
                      />
                    </div>

                    {/* Window Ends At */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                        Window Ends At (Deadline)
                      </label>
                      <input
                        type="datetime-local"
                        value={draft.ends_at}
                        onChange={(e) =>
                          setScheduleDrafts((prev) => ({
                            ...prev,
                            [exp.id]: { ...prev[exp.id], ends_at: e.target.value },
                          }))
                        }
                        className={inputCls}
                      />
                    </div>

                    {/* Max Attempts */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                        Max Attempts (0 = Unlimited)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={draft.max_attempts}
                        onChange={(e) =>
                          setScheduleDrafts((prev) => ({
                            ...prev,
                            [exp.id]: { ...prev[exp.id], max_attempts: e.target.value },
                          }))
                        }
                        className={inputCls}
                      />
                    </div>

                    {/* Quick Presets & Save Action */}
                    <div className="space-y-1 flex flex-col justify-end">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                        Quick Preset & Save
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyQuickWindow(exp.id, 24)}
                          className="px-2 py-1.5 rounded text-[11px] font-semibold bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition cursor-pointer"
                          title="Open for 24 Hours from now"
                        >
                          +24h
                        </button>
                        <button
                          type="button"
                          onClick={() => applyQuickWindow(exp.id, 168)}
                          className="px-2 py-1.5 rounded text-[11px] font-semibold bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition cursor-pointer"
                          title="Open for 7 Days from now"
                        >
                          +7d
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveExpSchedule(exp.id)}
                          disabled={isSavingThis}
                          className="flex-1 py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isSavingThis ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CARD 3: Individual Student Overrides & Deadline Extensions (INLINE, NO MODAL) */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-5 shadow-[var(--shadow-xs)]">
        <div className="pb-3 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[var(--accent)]" />
              Individual Student Window Overrides & Prerequisite Waivers
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
              Select multiple students and multiple experiments simultaneously to grant deadline extensions, custom attempt quotas, or prerequisite bypasses.
            </p>
          </div>
          {(selectedOverrideStudentIds.length > 0 || selectedOverrideExpIds.length > 0) && (
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                {selectedOverrideStudentIds.length} Students
              </span>
              <span className="text-[var(--text-muted)]">×</span>
              <span className="px-2.5 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                {selectedOverrideExpIds.length} Experiments
              </span>
            </div>
          )}
        </div>

        {/* Inline Multi-Select Override Form */}
        <form
          onSubmit={handleSaveStudentOverride}
          className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] space-y-4"
        >
          {/* Step 1: Experiment Multi-Select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className={labelCls}>
                1. Select Target Experiments ({selectedOverrideExpIds.length} of {activeCourseExperiments.length} Selected) *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllExperiments}
                  className="text-[11px] font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                >
                  {selectedOverrideExpIds.length === activeCourseExperiments.length && activeCourseExperiments.length > 0
                    ? 'Deselect All'
                    : 'Select All Experiments'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {activeCourseExperiments.length === 0 ? (
                <div className="col-span-full py-3 text-center text-xs text-[var(--text-muted)] italic">
                  No experiments found for this course.
                </div>
              ) : (
                activeCourseExperiments.map((exp) => {
                  const isSelected = selectedOverrideExpIds.includes(exp.id);
                  return (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => toggleExpSelection(exp.id)}
                      className={`text-left p-2.5 rounded-[var(--radius-sm)] border text-xs font-semibold transition-all flex items-start gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--text-primary)] shadow-sm'
                          : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                            : 'border-[var(--border-strong)] bg-[var(--bg-card)]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-[var(--text-primary)] flex items-center justify-between gap-1">
                          <span>Exp #{exp.experiment_no}</span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">#{exp.id}</span>
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                          {exp.title}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Searchable Student Select & Selected List */}
          <div className="space-y-3 pt-2 border-t border-[var(--border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className={labelCls}>
                  2. Search & Select Target Students ({selectedOverrideStudentIds.length} Selected) *
                </label>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Search by student name, roll number, or email to add them to this override.
                </p>
              </div>

              {selectedOverrideStudentIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedOverrideStudentIds([])}
                  className="text-[11px] font-bold text-[var(--red)] hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All ({selectedOverrideStudentIds.length})
                </button>
              )}
            </div>

            {/* Searchable Select Combobox */}
            <div ref={studentSearchRef} className="relative">
              <div className="flex items-center gap-2">
                {/* Section filter */}
                <select
                  value={overrideStudentSection}
                  onChange={(e) => setOverrideStudentSection(e.target.value)}
                  className="px-3 py-2 text-xs rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold cursor-pointer shrink-0"
                >
                  <option value="ALL">All Sections ({unlockData.students.length})</option>
                  {unlockData.sections.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>

                {/* Search input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={overrideStudentQuery}
                    onFocus={() => setIsStudentDropdownOpen(true)}
                    onChange={(e) => {
                      setOverrideStudentQuery(e.target.value);
                      setIsStudentDropdownOpen(true);
                    }}
                    placeholder="Type student name, roll no, or email to search and add..."
                    className={`${inputCls} pl-9 pr-8`}
                  />
                  {overrideStudentQuery && (
                    <button
                      type="button"
                      onClick={() => setOverrideStudentQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Search Results Floating Dropdown */}
              {isStudentDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="p-2 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      {availableMatchingStudents.length} Available Students
                    </span>
                    {availableMatchingStudents.length > 0 && (
                      <button
                        type="button"
                        onClick={addAllMatchingStudents}
                        className="text-[11px] font-bold text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <UserPlus className="w-3 h-3" />
                        Add All Matching ({availableMatchingStudents.length})
                      </button>
                    )}
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-[var(--border)]/60">
                    {availableMatchingStudents.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[var(--text-muted)] italic">
                        {unlockData.students.length === 0
                          ? 'No students found in lab database.'
                          : 'No matching unselected students found.'}
                      </div>
                    ) : (
                      availableMatchingStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            addStudentToSelection(s.id);
                          }}
                          className="p-2.5 hover:bg-[var(--bg-raised)] cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-[var(--text-primary)]">
                              {s.name}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-2 mt-0.5">
                              <span>{s.roll_no || s.email}</span>
                              <span className="px-1.5 py-0.2 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] font-bold text-[10px]">
                                Sec: {s.section || 'Unassigned'}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--accent)]/10 text-[var(--accent)] text-[11px] font-bold hover:bg-[var(--accent)] hover:text-white transition flex items-center gap-1">
                            <UserPlus className="w-3 h-3" />
                            Add
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Students List (Only Shows Added Students) */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center justify-between">
                <span>Selected Students to Override ({selectedStudentsData.length})</span>
              </div>

              {selectedStudentsData.length === 0 ? (
                <div className="p-5 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--bg-input)]/40 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-1.5">
                  <UserPlus className="w-5 h-5 text-[var(--text-muted)]" />
                  <span className="font-semibold text-[var(--text-secondary)]">No students added yet</span>
                  <span>Search above and click &quot;Add&quot; to include students in this override window.</span>
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg-input)] p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {selectedStudentsData.map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border-accent)]/50 shadow-xs flex items-center justify-between gap-2.5 text-xs group hover:border-[var(--accent)] transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-[var(--text-primary)] truncate text-[11px]">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono truncate flex items-center gap-1.5 mt-0.5">
                          <span>{s.roll_no || s.email}</span>
                          <span className="px-1 py-0.2 rounded bg-[var(--bg-raised)] text-[var(--text-secondary)] font-bold">
                            {s.section || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStudentFromSelection(s.id)}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] transition cursor-pointer shrink-0"
                        title="Remove student"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Override Parameters */}
          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            <label className={labelCls}>3. Override Timings & Waiver Settings</label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Starts At */}
              <div className="space-y-1">
                <label className={labelCls}>Override Starts At</label>
                <input
                  type="datetime-local"
                  value={overrideForm.starts_at}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, starts_at: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* Ends At */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={labelCls}>Extended Deadline (Ends At)</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyOverrideQuickWindow(24)}
                      className="text-[10px] font-bold text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      +24h
                    </button>
                    <span className="text-[var(--text-muted)] text-[10px]">·</span>
                    <button
                      type="button"
                      onClick={() => applyOverrideQuickWindow(72)}
                      className="text-[10px] font-bold text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      +3d
                    </button>
                    <span className="text-[var(--text-muted)] text-[10px]">·</span>
                    <button
                      type="button"
                      onClick={() => applyOverrideQuickWindow(168)}
                      className="text-[10px] font-bold text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      +7d
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={overrideForm.ends_at}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, ends_at: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* Max Attempts */}
              <div className="space-y-1">
                <label className={labelCls}>Max Attempts (0 = Unlimited)</label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={overrideForm.max_attempts}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, max_attempts: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* Notes / Reason */}
              <div className="space-y-1">
                <label className={labelCls}>Faculty Reason / Notes</label>
                <input
                  type="text"
                  value={overrideForm.notes}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Medical leave extension, Lab make-up"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Checkboxes & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideForm.bypass_prerequisite}
                    onChange={(e) => setOverrideForm((p) => ({ ...p, bypass_prerequisite: e.target.checked }))}
                    className="rounded text-[var(--accent)] focus:ring-0 cursor-pointer"
                  />
                  <span>Bypass Sequential Prerequisite Requirement</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideForm.allow_late_submission}
                    onChange={(e) => setOverrideForm((p) => ({ ...p, allow_late_submission: e.target.checked }))}
                    className="rounded text-[var(--accent)] focus:ring-0 cursor-pointer"
                  />
                  <span>Allow Late Submission</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={
                  overrideSubmitting ||
                  selectedOverrideStudentIds.length === 0 ||
                  selectedOverrideExpIds.length === 0
                }
                className="px-5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {overrideSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  Grant Override
                  {selectedOverrideStudentIds.length > 0 && selectedOverrideExpIds.length > 0
                    ? ` (${selectedOverrideStudentIds.length} Student${
                        selectedOverrideStudentIds.length > 1 ? 's' : ''
                      } × ${selectedOverrideExpIds.length} Exp)`
                    : ''}
                </span>
              </button>
            </div>
          </div>
        </form>

        {/* Search & Active Student Overrides Table */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={overrideSearch}
                onChange={(e) => setOverrideSearch(e.target.value)}
                placeholder="Search active overrides by student name or roll number..."
                className={`${inputCls} pl-9`}
              />
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              {activeCourseOverrides.length} Active Overrides
            </span>
          </div>

          <div className="overflow-x-auto border border-[var(--border)] rounded-[var(--radius-md)]">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-raised)]">
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Student Details
                  </th>
                  <th className="py-2.5 pr-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Experiment
                  </th>
                  <th className="py-2.5 pr-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Override Window
                  </th>
                  <th className="py-2.5 pr-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Bypass Prereq
                  </th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {activeCourseOverrides.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-[var(--text-muted)] italic">
                      No individual student overrides configured for this course.
                    </td>
                  </tr>
                ) : (
                  activeCourseOverrides.map((ovr) => (
                    <tr key={ovr.id} className="hover:bg-[var(--bg-raised)] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[var(--text-primary)]">{ovr.student?.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono">
                          {ovr.student?.roll_no || 'No Roll No'} · Sec: {ovr.section}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 font-mono font-medium text-[var(--text-secondary)]">
                        Exp #{ovr.experiment?.experiment_no} — {ovr.experiment?.title}
                      </td>
                      <td className="py-2.5 pr-4 text-[11px]">
                        {ovr.starts_at || ovr.ends_at ? (
                          <div className="space-y-0.5 font-mono text-[var(--text-secondary)]">
                            <div>From: {ovr.starts_at ? new Date(ovr.starts_at).toLocaleString() : 'Immediate'}</div>
                            <div>Until: {ovr.ends_at ? new Date(ovr.ends_at).toLocaleString() : 'No Expiry'}</div>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] italic">Custom Unlocked</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        {ovr.bypass_prerequisite ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <Check className="w-3 h-3" />
                            Bypassed
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteOverride(ovr.id)}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] transition-colors cursor-pointer"
                          title="Remove student override"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
