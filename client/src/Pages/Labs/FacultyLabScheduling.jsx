import React, { useState, useEffect } from 'react';
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
  ListOrdered
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
  const [savingProgression, setSavingProgression] = useState(false);

  // Inline Experiment Schedule Drafts: { [expId]: { is_unlocked, starts_at, ends_at, max_attempts, allow_late_submission, notes } }
  const [scheduleDrafts, setScheduleDrafts] = useState({});

  // Student Override Inline Form State
  const [overrideForm, setOverrideForm] = useState({
    student_id: '',
    experiment_id: '',
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

    if (activeCourseExperiments.length > 0 && !overrideForm.experiment_id) {
      setOverrideForm((prev) => ({ ...prev, experiment_id: String(activeCourseExperiments[0].id) }));
    }
  }, [selectedUnlockCourseId, selectedUnlockSection, unlockData.unlocks, activeCourseExperiments.length]);

  const formatDateForInput = (dt) => {
    if (!dt) return '';
    try {
      const d = new Date(dt);
      if (isNaN(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  };

  // 1. Toggle Progression Mode (Sequential vs Open Access)
  const handleToggleProgressionMode = async (newMode) => {
    if (!selectedUnlockCourseId) return;
    try {
      setSavingProgression(true);
      await api.post(`/lab-incharge/courses/${selectedUnlockCourseId}/progression-mode`, {
        progression_mode: newMode,
      });
      showToast(
        newMode === 'SEQUENTIAL'
          ? 'Sequential Milestone Progression enabled! Students must complete Exp N-1 to unlock Exp N.'
          : 'Open Access mode enabled! Students can access any unlocked experiment.'
      );
      // Update local course state
      setUnlockData((prev) => ({
        ...prev,
        courses: prev.courses.map((c) =>
          String(c.id) === String(selectedUnlockCourseId)
            ? { ...c, progression_mode: newMode }
            : c
        ),
      }));
    } catch {
      showToast('Failed to update progression policy.', 'error');
    } finally {
      setSavingProgression(false);
    }
  };

  // 2. Toggle Unlock Status Instantly
  const handleToggleUnlock = async (expId, newStatus) => {
    try {
      setTogglingExpId(expId);
      await api.post('/lab-incharge/unlocks/toggle', {
        course_id: Number(selectedUnlockCourseId),
        experiment_id: Number(expId),
        section: selectedUnlockSection || 'ALL',
        is_unlocked: newStatus,
      });

      setScheduleDrafts((prev) => ({
        ...prev,
        [expId]: {
          ...prev[expId],
          is_unlocked: newStatus,
        },
      }));

      showToast(
        newStatus
          ? `Experiment released for section ${selectedUnlockSection}!`
          : `Experiment locked for section ${selectedUnlockSection}!`,
        'success'
      );
      fetchUnlockMatrix();
    } catch {
      showToast('Failed to update unlock status.', 'error');
    } finally {
      setTogglingExpId(null);
    }
  };

  // 3. Save Single Experiment Schedule Inline
  const handleSaveExpSchedule = async (expId) => {
    const draft = scheduleDrafts[expId];
    if (!draft) return;
    try {
      setSavingScheduleExpId(expId);
      await api.post('/lab-incharge/unlocks/schedule', {
        course_id: Number(selectedUnlockCourseId),
        experiment_ids: [Number(expId)],
        section: selectedUnlockSection || 'ALL',
        is_unlocked: draft.is_unlocked,
        starts_at: draft.starts_at ? new Date(draft.starts_at).toISOString() : null,
        ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
        max_attempts: Number(draft.max_attempts) || 0,
        allow_late_submission: draft.allow_late_submission,
        notes: draft.notes || '',
      });
      showToast(`Schedule window saved for Experiment!`);
      fetchUnlockMatrix();
    } catch {
      showToast('Failed to save experiment schedule.', 'error');
    } finally {
      setSavingScheduleExpId(null);
    }
  };

  // 4. Quick Preset Window (e.g. 24 hours, 7 days)
  const applyQuickWindow = (expId, hours) => {
    const now = new Date();
    const end = new Date(now.getTime() + hours * 60 * 60 * 1000);
    setScheduleDrafts((prev) => ({
      ...prev,
      [expId]: {
        ...prev[expId],
        is_unlocked: true,
        starts_at: formatDateForInput(now),
        ends_at: formatDateForInput(end),
      },
    }));
  };

  // 5. Bulk Unlock / Lock All
  const handleBulkSetStatus = async (isUnlockAll) => {
    if (activeCourseExperiments.length === 0) return;
    try {
      setLoading(true);
      const expIds = activeCourseExperiments.map((e) => e.id);
      await api.post('/lab-incharge/unlocks/schedule', {
        course_id: Number(selectedUnlockCourseId),
        experiment_ids: expIds,
        section: selectedUnlockSection || 'ALL',
        is_unlocked: isUnlockAll,
      });
      showToast(
        isUnlockAll
          ? `All ${expIds.length} experiments unlocked for section ${selectedUnlockSection}!`
          : `All ${expIds.length} experiments locked for section ${selectedUnlockSection}!`
      );
      fetchUnlockMatrix();
    } catch {
      showToast('Failed to apply bulk unlock status.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 6. Save Individual Student Override Inline
  const handleSaveStudentOverride = async (e) => {
    e.preventDefault();
    if (!overrideForm.student_id || !overrideForm.experiment_id) {
      showToast('Please select both a student and an experiment.', 'error');
      return;
    }
    try {
      setOverrideSubmitting(true);
      await api.post('/lab-incharge/unlocks/student-override', {
        course_id: Number(selectedUnlockCourseId),
        experiment_id: Number(overrideForm.experiment_id),
        student_id: Number(overrideForm.student_id),
        is_unlocked: overrideForm.is_unlocked,
        bypass_prerequisite: overrideForm.bypass_prerequisite,
        starts_at: overrideForm.starts_at ? new Date(overrideForm.starts_at).toISOString() : null,
        ends_at: overrideForm.ends_at ? new Date(overrideForm.ends_at).toISOString() : null,
        max_attempts: Number(overrideForm.max_attempts) || 0,
        allow_late_submission: overrideForm.allow_late_submission,
        notes: overrideForm.notes || '',
      });
      showToast('Individual student window override saved successfully!');
      setOverrideForm({
        student_id: '',
        experiment_id: activeCourseExperiments[0] ? String(activeCourseExperiments[0].id) : '',
        is_unlocked: true,
        bypass_prerequisite: false,
        starts_at: '',
        ends_at: '',
        max_attempts: 0,
        allow_late_submission: false,
        notes: '',
      });
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

  const isSequentialMode = currentCourse?.progression_mode === 'SEQUENTIAL';

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

      {/* CARD 1: Sequential Milestone Progression Policy Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4 shadow-[var(--shadow-xs)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] mb-1">
              <ShieldCheck className="w-3 h-3" />
              Faculty Progression Authority
            </div>
            <h2 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-[var(--accent)]" />
              Experiment Milestone Progression Policy
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
              Choose whether students must complete experiments one-by-one in sequential order or have open access.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleToggleProgressionMode(isSequentialMode ? 'OPEN' : 'SEQUENTIAL')}
              disabled={savingProgression}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] text-xs font-bold transition-all cursor-pointer shadow-sm ${
                isSequentialMode
                  ? 'bg-[var(--accent)] text-white hover:brightness-110'
                  : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
              }`}
            >
              {savingProgression ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSequentialMode ? (
                <Check className="w-4 h-4" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              {isSequentialMode
                ? 'Sequential Progression: ACTIVE'
                : 'Open Access: ACTIVE'}
            </button>
          </div>
        </div>

        {/* Policy Explainer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => handleToggleProgressionMode('SEQUENTIAL')}
            className={`p-4 rounded-[var(--radius-md)] border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
              isSequentialMode
                ? 'bg-[var(--accent-dim)]/40 border-[var(--accent)] ring-1 ring-[var(--accent)]'
                : 'bg-[var(--bg-input)]/50 border-[var(--border)] hover:border-[var(--border-strong)] opacity-80'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-[13px] text-[var(--text-primary)]">
                <GitBranch className="w-4 h-4 text-[var(--accent)]" />
                Sequential Milestone Progression (Linear)
              </div>
              {isSequentialMode && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--accent)] text-white">
                  Enabled
                </span>
              )}
            </div>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              <strong>Experiment 1 completed & verified &rarr; Experiment 2 unlocks.</strong> Experiment 2 completed &rarr; Experiment 3 unlocks. Students cannot jump ahead without finishing earlier experiments.
            </p>
            <div className="flex items-center gap-1.5 pt-1 text-[11px] font-mono text-[var(--accent)] font-semibold">
              <span>Exp 1 [Done]</span> &rarr; <span>Exp 2 [Done]</span> &rarr; <span>Exp 3 [Open]</span>
            </div>
          </div>

          <div
            onClick={() => handleToggleProgressionMode('OPEN')}
            className={`p-4 rounded-[var(--radius-md)] border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
              !isSequentialMode
                ? 'bg-[var(--accent-dim)]/40 border-[var(--accent)] ring-1 ring-[var(--accent)]'
                : 'bg-[var(--bg-input)]/50 border-[var(--border)] hover:border-[var(--border-strong)] opacity-80'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-[13px] text-[var(--text-primary)]">
                <Unlock className="w-4 h-4 text-[var(--accent)]" />
                Open Access / Independent Releases
              </div>
              {!isSequentialMode && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--accent)] text-white">
                  Enabled
                </span>
              )}
            </div>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              Any experiment released in an active attendance window is immediately accessible, regardless of whether earlier experiments were finished.
            </p>
            <div className="flex items-center gap-1.5 pt-1 text-[11px] font-mono text-[var(--text-muted)]">
              <span>Free student exploration within scheduled windows</span>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: Inline Experiment Release Roster & Window Timings (NO MODALS) */}
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
              const hasPrereq = isSequentialMode && idx > 0;
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
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4 shadow-[var(--shadow-xs)]">
        <div className="pb-3 border-b border-[var(--border)]">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[var(--accent)]" />
            Individual Student Window Overrides & Prerequisite Waivers
          </h2>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
            Grant single students special deadline extensions, custom attempt limits, or bypass the sequential prerequisite rule.
          </p>
        </div>

        {/* Inline Override Form */}
        <form
          onSubmit={handleSaveStudentOverride}
          className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] space-y-3.5"
        >
          <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-[var(--accent)]" />
            Create / Update Student Override
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Student Selector */}
            <div className="space-y-1">
              <label className={labelCls}>Select Student *</label>
              <select
                value={overrideForm.student_id}
                onChange={(e) => setOverrideForm((p) => ({ ...p, student_id: e.target.value }))}
                className={inputCls}
                required
              >
                <option value="">-- Choose Student --</option>
                {unlockData.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.roll_no || s.email}) — Sec: {s.section || 'Unassigned'}
                  </option>
                ))}
              </select>
            </div>

            {/* Experiment Selector */}
            <div className="space-y-1">
              <label className={labelCls}>Target Experiment *</label>
              <select
                value={overrideForm.experiment_id}
                onChange={(e) => setOverrideForm((p) => ({ ...p, experiment_id: e.target.value }))}
                className={inputCls}
                required
              >
                {activeCourseExperiments.map((e) => (
                  <option key={e.id} value={e.id}>
                    Exp #{e.experiment_no} — {e.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Override Starts At */}
            <div className="space-y-1">
              <label className={labelCls}>Override Starts At</label>
              <input
                type="datetime-local"
                value={overrideForm.starts_at}
                onChange={(e) => setOverrideForm((p) => ({ ...p, starts_at: e.target.value }))}
                className={inputCls}
              />
            </div>

            {/* Override Ends At */}
            <div className="space-y-1">
              <label className={labelCls}>Extended Deadline (Ends At)</label>
              <input
                type="datetime-local"
                value={overrideForm.ends_at}
                onChange={(e) => setOverrideForm((p) => ({ ...p, ends_at: e.target.value }))}
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
              disabled={overrideSubmitting || !overrideForm.student_id}
              className="px-5 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {overrideSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Grant Student Override
            </button>
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
