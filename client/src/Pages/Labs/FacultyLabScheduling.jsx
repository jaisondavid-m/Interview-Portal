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
  Users,
  History,
  Timer,
  Eye,
  SlidersHorizontal,
  GraduationCap,
  ChevronDown,
  Edit3,
} from 'lucide-react';
import api from '../../api/axios';

const inputCls =
  'w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all';
const labelCls = 'text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider';

const formatDateForInput = (dateStringOrDate) => {
  if (!dateStringOrDate) return '';
  const d = new Date(dateStringOrDate);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function FacultyLabScheduling() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Tab Navigation: 'roster' | 'overrides' | 'sessions'
  const [activeTab, setActiveTab] = useState('roster');

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

  // Bulk Milestone / Progressive Release State
  const [bulkReleaseScope, setBulkReleaseScope] = useState('selected'); // 'selected' | 'all'
  const [bulkReleaseUpToExpNo, setBulkReleaseUpToExpNo] = useState(1);
  const [bulkReleaseStartsAt, setBulkReleaseStartsAt] = useState('');
  const [bulkReleaseEndsAt, setBulkReleaseEndsAt] = useState('');
  const [bulkReleaseApplying, setBulkReleaseApplying] = useState(false);

  // Searchable Select State for Target Batch / Scope
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const batchDropdownRef = useRef(null);

  // Searchable Select State for Release Up To Exp #
  const [expSearchQuery, setExpSearchQuery] = useState('');
  const [isExpDropdownOpen, setIsExpDropdownOpen] = useState(false);
  const expDropdownRef = useRef(null);

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
    allow_late_submission: false,
    notes: '',
  });
  const [overrideSearch, setOverrideSearch] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  // Multi-Select and Edit for Student Overrides Table
  const [selectedTableOverrideIds, setSelectedTableOverrideIds] = useState([]);
  const [bulkDeletingOverrides, setBulkDeletingOverrides] = useState(false);
  const [editingOverride, setEditingOverride] = useState(null);
  const [editingForm, setEditingForm] = useState({
    bypass_prerequisite: false,
    starts_at: '',
    ends_at: '',
    allow_late_submission: false,
    notes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Quick Action loader state for sessions
  const [sessionActionKey, setSessionActionKey] = useState(null);

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
  const activeCourseExperiments = (unlockData.experiments || [])
    .filter((e) => String(e.course_id) === String(selectedUnlockCourseId))
    .sort((a, b) => (a.experiment_no || 0) - (b.experiment_no || 0));

  // Determine highest unlocked experiment when course/section changes
  useEffect(() => {
    if (!selectedUnlockCourseId) return;

    if (activeCourseExperiments.length > 0) {
      if (selectedOverrideExpIds.length === 0) {
        setSelectedOverrideExpIds([activeCourseExperiments[0].id]);
      }
      const unlockedExps = activeCourseExperiments.filter((e) => {
        const u = unlockData.unlocks.find(
          (un) =>
            un.experiment_id === e.id &&
            (un.section === selectedUnlockSection || un.section === 'ALL')
        );
        return u?.is_unlocked;
      });
      if (unlockedExps.length > 0) {
        const maxUnlockedNo = Math.max(...unlockedExps.map((e) => e.experiment_no || 0));
        setBulkReleaseUpToExpNo(maxUnlockedNo);

        // Pre-fill window timings from first unlock if available
        const firstUnlock = unlockData.unlocks.find(
          (un) =>
            un.experiment_id === unlockedExps[0].id &&
            (un.section === selectedUnlockSection || un.section === 'ALL')
        );
        if (firstUnlock) {
          if (firstUnlock.starts_at) setBulkReleaseStartsAt(formatDateForInput(firstUnlock.starts_at));
          if (firstUnlock.ends_at) setBulkReleaseEndsAt(formatDateForInput(firstUnlock.ends_at));
        }
      } else {
        setBulkReleaseUpToExpNo(activeCourseExperiments[0].experiment_no || 1);
      }
    }
  }, [selectedUnlockCourseId, selectedUnlockSection, unlockData.unlocks, activeCourseExperiments.length]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (studentSearchRef.current && !studentSearchRef.current.contains(e.target)) {
        setIsStudentDropdownOpen(false);
      }
      if (expDropdownRef.current && !expDropdownRef.current.contains(e.target)) {
        setIsExpDropdownOpen(false);
      }
      if (batchDropdownRef.current && !batchDropdownRef.current.contains(e.target)) {
        setIsBatchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Batch / Scope Options for Searchable Select
  const batchOptions = [
    {
      id: 'selected',
      label: `Selected Section (${selectedUnlockSection})`,
      subtitle: 'Currently filtered section view',
      value: 'selected',
    },
    {
      id: 'all',
      label: 'All Assigned Sections',
      subtitle:
        unlockData.sections?.length > 0
          ? `${unlockData.sections.length} sections (${unlockData.sections.join(', ')})`
          : 'All enrolled batches',
      value: 'all',
    },
    ...(unlockData.sections || []).map((sec) => ({
      id: `sec-${sec}`,
      label: `Section ${sec}`,
      subtitle: `Apply specifically to Section ${sec}`,
      value: sec,
    })),
  ];

  const filteredBatchOptions = batchOptions.filter((b) => {
    if (!batchSearchQuery.trim()) return true;
    const q = batchSearchQuery.toLowerCase();
    return b.label.toLowerCase().includes(q) || (b.subtitle && b.subtitle.toLowerCase().includes(q));
  });

  const selectedBatchOption =
    batchOptions.find((b) => b.value === bulkReleaseScope) || batchOptions[0];

  const selectedReleaseExp = activeCourseExperiments.find(
    (e) => (e.experiment_no || 0) === Number(bulkReleaseUpToExpNo)
  );

  const filteredReleaseExps = activeCourseExperiments.filter((e) => {
    if (!expSearchQuery.trim()) return true;
    const q = expSearchQuery.toLowerCase();
    return (
      String(e.experiment_no).includes(q) ||
      `exp #${e.experiment_no}`.toLowerCase().includes(q) ||
      `exp ${e.experiment_no}`.toLowerCase().includes(q) ||
      e.title?.toLowerCase().includes(q)
    );
  });

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

  const handleBulkSetStatus = async (newStatus) => {
    if (!selectedUnlockCourseId || activeCourseExperiments.length === 0) return;
    try {
      setLoading(true);
      const expIds = activeCourseExperiments.map((e) => e.id);
      await api.post('/lab-incharge/unlocks/schedule', {
        course_id: Number(selectedUnlockCourseId),
        experiment_ids: expIds,
        section: selectedUnlockSection || 'ALL',
        is_unlocked: newStatus,
      });
      showToast(`All experiments ${newStatus ? 'unlocked' : 'locked'} for Section ${selectedUnlockSection}.`);
      fetchUnlockMatrix();
    } catch (err) {
      console.error(err);
      showToast(`Failed to ${newStatus ? 'unlock' : 'lock'} all experiments.`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const applyBulkQuickWindow = (hours) => {
    const now = new Date();
    const end = new Date(now.getTime() + hours * 60 * 60 * 1000);
    setBulkReleaseStartsAt(formatDateForInput(now));
    setBulkReleaseEndsAt(formatDateForInput(end));
  };

  const applyBulkStartNow = () => {
    setBulkReleaseStartsAt(formatDateForInput(new Date()));
  };

  const handleApplyBulkProgressiveRelease = async () => {
    if (!selectedUnlockCourseId || activeCourseExperiments.length === 0) return;

    const targetUpTo = Number(bulkReleaseUpToExpNo);
    const unlockExps = activeCourseExperiments.filter(
      (e) => (e.experiment_no || 0) <= targetUpTo
    );
    const lockExps = activeCourseExperiments.filter(
      (e) => (e.experiment_no || 0) > targetUpTo
    );

    const unlockExpIds = unlockExps.map((e) => e.id);
    const lockExpIds = lockExps.map((e) => e.id);

    const targetSections =
      bulkReleaseScope === 'all'
        ? unlockData.sections.length > 0
          ? unlockData.sections
          : ['ALL']
        : bulkReleaseScope === 'selected'
        ? [selectedUnlockSection || 'ALL']
        : [bulkReleaseScope];

    try {
      setBulkReleaseApplying(true);
      await api.post('/lab-incharge/unlocks/schedule', {
        course_id: Number(selectedUnlockCourseId),
        experiment_ids: unlockExpIds,
        lock_experiment_ids: lockExpIds,
        sections: targetSections,
        is_unlocked: true,
        starts_at: bulkReleaseStartsAt ? new Date(bulkReleaseStartsAt).toISOString() : null,
        ends_at: bulkReleaseEndsAt ? new Date(bulkReleaseEndsAt).toISOString() : null,
        allow_late_submission: false,
        notes: `Progressive milestone release up to Exp #${targetUpTo}`,
      });

      const scopeLabel =
        bulkReleaseScope === 'all'
          ? 'All Assigned Sections'
          : bulkReleaseScope === 'selected'
          ? `Section ${selectedUnlockSection}`
          : `Section ${bulkReleaseScope}`;

      showToast(
        `Configured schedule up to Exp #${targetUpTo} for ${scopeLabel}! (Students progress sequentially via prerequisites)`
      );
      fetchUnlockMatrix();
    } catch (err) {
      console.error(err);
      showToast('Failed to apply progressive release schedule.', 'error');
    } finally {
      setBulkReleaseApplying(false);
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

  const handleDeleteOverride = async (id) => {
    try {
      await api.delete(`/lab-incharge/unlocks/student-override/${id}`);
      showToast('Student override removed.');
      setSelectedTableOverrideIds((prev) => prev.filter((i) => i !== id));
      fetchUnlockMatrix();
    } catch {
      showToast('Failed to delete override.', 'error');
    }
  };

  const handleToggleSelectOverride = (id) => {
    setSelectedTableOverrideIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllOverrides = () => {
    const activeIds = activeCourseOverrides.map((o) => o.id);
    if (selectedTableOverrideIds.length === activeIds.length && activeIds.length > 0) {
      setSelectedTableOverrideIds([]);
    } else {
      setSelectedTableOverrideIds(activeIds);
    }
  };

  const handleBulkDeleteOverrides = async () => {
    if (selectedTableOverrideIds.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedTableOverrideIds.length} selected student override(s)?`
      )
    ) {
      return;
    }
    try {
      setBulkDeletingOverrides(true);
      await api.post('/lab-incharge/unlocks/student-overrides/bulk-delete', {
        ids: selectedTableOverrideIds,
      });
      showToast(`Successfully deleted ${selectedTableOverrideIds.length} student override(s).`);
      setSelectedTableOverrideIds([]);
      fetchUnlockMatrix();
    } catch {
      showToast('Failed to delete selected overrides.', 'error');
    } finally {
      setBulkDeletingOverrides(false);
    }
  };

  const handleStartEditOverride = (ovr) => {
    setEditingOverride(ovr);
    setEditingForm({
      bypass_prerequisite: !!ovr.bypass_prerequisite,
      starts_at: ovr.starts_at ? formatDateForInput(ovr.starts_at) : '',
      ends_at: ovr.ends_at ? formatDateForInput(ovr.ends_at) : '',
      allow_late_submission: !!ovr.allow_late_submission,
      notes: ovr.notes || '',
    });
  };

  const handleSaveEditedOverride = async (e) => {
    e.preventDefault();
    if (!editingOverride) return;
    try {
      setSavingEdit(true);
      await api.put(`/lab-incharge/unlocks/student-override/${editingOverride.id}`, {
        bypass_prerequisite: editingForm.bypass_prerequisite,
        starts_at: editingForm.starts_at ? new Date(editingForm.starts_at).toISOString() : null,
        ends_at: editingForm.ends_at ? new Date(editingForm.ends_at).toISOString() : null,
        allow_late_submission: editingForm.allow_late_submission,
        notes: editingForm.notes,
      });
      showToast('Student override updated successfully.');
      setEditingOverride(null);
      fetchUnlockMatrix();
    } catch {
      showToast('Failed to update student override.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Quick Extend or Lock a section session from the Sessions Tab
  const handleExtendSectionWindow = async (sec, hours) => {
    if (!selectedUnlockCourseId) return;
    const key = `extend-${sec}-${hours}`;
    setSessionActionKey(key);
    const now = new Date();
    const newEnd = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const unlockExps = activeCourseExperiments.filter((e) => {
      const u = unlockData.unlocks.find(
        (un) => un.experiment_id === e.id && (un.section === sec || (sec === 'ALL' && un.section === 'ALL'))
      );
      return u?.is_unlocked;
    });

    if (unlockExps.length === 0) {
      showToast(`No active releases in Section ${sec} to extend.`, 'error');
      setSessionActionKey(null);
      return;
    }

    try {
      await api.post('/lab-incharge/unlocks/schedule', {
        course_id: Number(selectedUnlockCourseId),
        experiment_ids: unlockExps.map((e) => e.id),
        section: sec,
        is_unlocked: true,
        ends_at: newEnd.toISOString(),
        allow_late_submission: false,
        notes: `Extended window by +${hours >= 24 ? hours / 24 + 'd' : hours + 'h'}`,
      });
      showToast(`Extended deadline by +${hours >= 24 ? hours / 24 + 'd' : hours + 'h'} for Section ${sec}!`);
      fetchUnlockMatrix();
    } catch {
      showToast('Failed to extend session deadline.', 'error');
    } finally {
      setSessionActionKey(null);
    }
  };

  const handleToggleSectionLock = async (sec, lock) => {
    if (!selectedUnlockCourseId) return;
    const key = `lock-${sec}`;
    setSessionActionKey(key);
    const allExpIds = activeCourseExperiments.map((e) => e.id);
    try {
      await api.post('/lab-incharge/unlocks/schedule', {
        course_id: Number(selectedUnlockCourseId),
        experiment_ids: lock ? [] : allExpIds,
        lock_experiment_ids: lock ? allExpIds : [],
        section: sec,
        is_unlocked: !lock,
      });
      showToast(`Section ${sec} ${lock ? 'locked' : 'unlocked'} successfully.`);
      fetchUnlockMatrix();
    } catch {
      showToast(`Failed to ${lock ? 'lock' : 'unlock'} Section ${sec}.`, 'error');
    } finally {
      setSessionActionKey(null);
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

  // Calculate distinct batch session data for Tab 3
  const sectionList = ['ALL', ...(unlockData.sections || [])];
  const sessionOverviewData = sectionList.map((sec) => {
    const secUnlocks = (unlockData.unlocks || []).filter(
      (u) =>
        (sec === 'ALL' ? u.section === 'ALL' : u.section === sec) &&
        activeCourseExperiments.some((e) => e.id === u.experiment_id)
    );

    const unlockedList = secUnlocks.filter((u) => u.is_unlocked);
    const unlockedExps = activeCourseExperiments.filter((e) =>
      unlockedList.some((u) => u.experiment_id === e.id)
    );

    const maxUnlockedNo =
      unlockedExps.length > 0
        ? Math.max(...unlockedExps.map((e) => e.experiment_no || 0))
        : 0;

    const sampleUnlock = unlockedList[0] || secUnlocks[0] || null;
    const startsAt = sampleUnlock?.starts_at ? new Date(sampleUnlock.starts_at) : null;
    const endsAt = sampleUnlock?.ends_at ? new Date(sampleUnlock.ends_at) : null;

    const now = new Date();
    let status = 'LOCKED';
    let statusLabel = 'Locked / Inactive';
    let statusColor = 'text-[var(--text-muted)] bg-[var(--bg-input)] border-[var(--border)]';

    if (unlockedList.length > 0) {
      if (!startsAt && !endsAt) {
        status = 'ALWAYS_OPEN';
        statusLabel = 'Always Open (No Expiry)';
        statusColor = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      } else if (startsAt && now < startsAt) {
        status = 'UPCOMING';
        statusLabel = 'Upcoming Window';
        statusColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      } else if (endsAt && now > endsAt) {
        status = 'EXPIRED';
        statusLabel = 'Window Expired';
        statusColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      } else {
        status = 'LIVE_OPEN';
        statusLabel = 'Live & Open';
        statusColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 font-bold';
      }
    }

    return {
      section: sec,
      unlockedCount: unlockedExps.length,
      totalCount: activeCourseExperiments.length,
      maxUnlockedNo,
      startsAt,
      endsAt,
      status,
      statusLabel,
      statusColor,
      isUnlocked: unlockedList.length > 0,
    };
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
            Configure progressive milestone releases, attendance deadlines, and individual student extensions.
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

      {/* Top 3 Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-[var(--bg-input)] rounded-[var(--radius-lg)] border border-[var(--border)] overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'roster'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Experiment Release Roster</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overrides')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overrides'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Window Overrides</span>
          {activeCourseOverrides.length > 0 && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'overrides'
                  ? 'bg-white/20 text-white'
                  : 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]'
              }`}
            >
              {activeCourseOverrides.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sessions'
              ? 'bg-[var(--accent)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Window Sessions & Release History</span>
        </button>
      </div>

      {/* TAB 1: EXPERIMENT RELEASE ROSTER */}
      {activeTab === 'roster' && (
        <div className="space-y-5 animate-in fade-in duration-200">
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

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkSetStatus(true)}
                className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] text-xs font-bold hover:brightness-105 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                Unlock All
              </button>
              <button
                onClick={() => handleBulkSetStatus(false)}
                className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                Lock All
              </button>
              <button
                onClick={fetchUnlockMatrix}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer transition-all shrink-0"
                title="Reload Matrix"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--accent)]' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Experiment Release & Schedule Panel */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-5 shadow-[var(--shadow-xs)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-[var(--accent)]" />
                  <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
                    Experiment Release & Schedule
                  </h2>
                </div>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Choose up to which experiment to unlock and set schedule window.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleApplyBulkProgressiveRelease}
                  disabled={bulkReleaseApplying || activeCourseExperiments.length === 0}
                  className="px-5 py-2.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110 shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {bulkReleaseApplying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Apply & Release Up to Exp #{bulkReleaseUpToExpNo}
                </button>
              </div>
            </div>

            {/* Configuration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
              {/* Target Batch / Scope (Searchable Select) */}
              <div className="space-y-1 relative" ref={batchDropdownRef}>
                <div className="flex items-center justify-between h-5">
                  <label className={labelCls}>Target Batch / Scope</label>
                </div>

                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsBatchDropdownOpen((prev) => !prev)}
                  className={`${inputCls} h-[38px] flex items-center justify-between text-left cursor-pointer hover:border-[var(--border-strong)]`}
                >
                  <div className="truncate flex-1 pr-2">
                    <span className="font-semibold text-[var(--text-primary)] text-[12px]">
                      {selectedBatchOption.label}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform ${
                      isBatchDropdownOpen ? 'rotate-180 text-[var(--accent)]' : ''
                    }`}
                  />
                </button>

                {/* Searchable Dropdown Popup */}
                {isBatchDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 min-w-[260px]">
                    {/* Search Input Box */}
                    <div className="p-2 border-b border-[var(--border)] bg-[var(--bg-raised)] relative">
                      <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={batchSearchQuery}
                        onChange={(e) => setBatchSearchQuery(e.target.value)}
                        placeholder="Search batch or section..."
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2.5 py-1.5 pl-8 pr-7 text-[11px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                      />
                      {batchSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setBatchSearchQuery('')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Filtered Batches List */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-[var(--border)]/50 p-1">
                      {filteredBatchOptions.length === 0 ? (
                        <div className="py-4 text-center text-xs text-[var(--text-muted)] italic">
                          No matching batches found
                        </div>
                      ) : (
                        filteredBatchOptions.map((opt) => {
                          const isSelected = bulkReleaseScope === opt.value;
                          return (
                            <div
                              key={opt.id}
                              onClick={() => {
                                setBulkReleaseScope(opt.value);
                                setIsBatchDropdownOpen(false);
                                setBatchSearchQuery('');
                              }}
                              className={`p-2 rounded-[var(--radius-sm)] cursor-pointer transition-colors flex items-center justify-between gap-2 text-xs ${
                                isSelected
                                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-bold'
                                  : 'hover:bg-[var(--bg-raised)] text-[var(--text-primary)]'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold truncate text-[12px]">{opt.label}</div>
                                {opt.subtitle && (
                                  <div className="text-[10px] text-[var(--text-muted)] truncate font-mono">
                                    {opt.subtitle}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 stroke-[3]" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Release Up To Exp No (Searchable Select) */}
              <div className="space-y-1 relative" ref={expDropdownRef}>
                <div className="flex items-center justify-between h-5">
                  <label className={labelCls}>Release Up To Exp #</label>
                </div>

                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsExpDropdownOpen((prev) => !prev)}
                  className={`${inputCls} h-[38px] flex items-center justify-between text-left cursor-pointer hover:border-[var(--border-strong)]`}
                >
                  <div className="truncate flex-1 pr-2">
                    {selectedReleaseExp ? (
                      <span className="font-semibold text-[var(--text-primary)] text-[12px]">
                        Exp #{selectedReleaseExp.experiment_no} — {selectedReleaseExp.title}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)] text-[12px]">Select target experiment...</span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform ${
                      isExpDropdownOpen ? 'rotate-180 text-[var(--accent)]' : ''
                    }`}
                  />
                </button>

                {/* Searchable Dropdown Popup */}
                {isExpDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 min-w-[280px]">
                    {/* Search Input Box */}
                    <div className="p-2 border-b border-[var(--border)] bg-[var(--bg-raised)] relative">
                      <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        value={expSearchQuery}
                        onChange={(e) => setExpSearchQuery(e.target.value)}
                        placeholder="Search exp # or title..."
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2.5 py-1.5 pl-8 pr-7 text-[11px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                      />
                      {expSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setExpSearchQuery('')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Filtered Experiments List */}
                    <div className="max-h-56 overflow-y-auto divide-y divide-[var(--border)]/50 p-1">
                      {filteredReleaseExps.length === 0 ? (
                        <div className="py-4 text-center text-xs text-[var(--text-muted)] italic">
                          No matching experiments found
                        </div>
                      ) : (
                        filteredReleaseExps.map((e) => {
                          const isSelected = Number(bulkReleaseUpToExpNo) === Number(e.experiment_no);
                          return (
                            <div
                              key={e.id}
                              onClick={() => {
                                setBulkReleaseUpToExpNo(Number(e.experiment_no));
                                setIsExpDropdownOpen(false);
                                setExpSearchQuery('');
                              }}
                              className={`p-2 rounded-[var(--radius-sm)] cursor-pointer transition-colors flex items-center justify-between gap-2 text-xs ${
                                isSelected
                                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-bold'
                                  : 'hover:bg-[var(--bg-raised)] text-[var(--text-primary)]'
                              }`}
                            >
                              <div className="min-w-0 flex-1 flex items-center gap-2">
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] shrink-0 font-bold">
                                  #{e.experiment_no}
                                </span>
                                <span className="truncate text-[11px]">{e.title}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 stroke-[3]" />}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Window Starts At */}
              <div className="space-y-1">
                <div className="flex items-center justify-between h-5">
                  <label className={labelCls}>Window Starts At</label>
                  <button
                    type="button"
                    onClick={applyBulkStartNow}
                    className="text-[10px] font-bold text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    Start Now
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={bulkReleaseStartsAt}
                  onChange={(e) => setBulkReleaseStartsAt(e.target.value)}
                  className={`${inputCls} h-[38px]`}
                />
              </div>

              {/* Window Ends At (Deadline) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between h-5">
                  <label className={labelCls}>Window Ends At (Deadline)</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyBulkQuickWindow(24)}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      title="24 Hours from now"
                    >
                      +24h
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBulkQuickWindow(168)}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      title="7 Days from now"
                    >
                      +7d
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={bulkReleaseEndsAt}
                  onChange={(e) => setBulkReleaseEndsAt(e.target.value)}
                  className={`${inputCls} h-[38px]`}
                />
              </div>
            </div>

            {/* Live Step Sequence Pathway Visualizer */}
            {activeCourseExperiments.length > 0 && (
              <div className="pt-3 border-t border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                    <ListOrdered className="w-4 h-4 text-[var(--accent)]" />
                    Student Progression Pathway (Up to Exp #{bulkReleaseUpToExpNo}):
                  </span>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] font-semibold">
                    {activeCourseExperiments.filter((e) => (e.experiment_no || 0) <= Number(bulkReleaseUpToExpNo)).length} / {activeCourseExperiments.length} Released
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 text-[12px] scrollbar-thin">
                  {activeCourseExperiments.map((exp, idx) => {
                    const isIncluded = (exp.experiment_no || 0) <= Number(bulkReleaseUpToExpNo);
                    const isFirst = idx === 0;
                    const prevExpNo = idx > 0 ? activeCourseExperiments[idx - 1].experiment_no : null;

                    return (
                      <React.Fragment key={exp.id}>
                        {idx > 0 && (
                          <ArrowRight
                            className={`w-4 h-4 shrink-0 ${
                              isIncluded ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]/40'
                            }`}
                          />
                        )}
                        <div
                          className={`px-3 py-2 rounded-[var(--radius-sm)] shrink-0 flex items-center gap-2 border transition-all ${
                            isIncluded
                              ? 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--text-primary)] font-semibold shadow-xs'
                              : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-muted)] opacity-60'
                          }`}
                        >
                          {isIncluded ? (
                            <Unlock className="w-3.5 h-3.5 text-[var(--accent)]" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          )}
                          <span>Exp #{exp.experiment_no}</span>
                          <span className="text-[11px] opacity-75 font-normal">
                            {isFirst
                              ? '(Open)'
                              : isIncluded
                              ? `(Prereq: #${prevExpNo})`
                              : '(Locked)'}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-input)]/70 border border-[var(--border)] flex items-start gap-2.5 text-[12px] text-[var(--text-secondary)]">
                  <Info className="w-4 h-4 shrink-0 text-[var(--accent)] mt-0.5" />
                  <span>
                    <strong>Sequential Progression Rule:</strong> When released, enrolled students begin with Exp #1. Once Exp #1 is completed, Exp #2 unlocks automatically for that student, continuing sequentially up to Exp #{bulkReleaseUpToExpNo}.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WINDOW OVERRIDES */}
      {activeTab === 'overrides' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-6 shadow-[var(--shadow-xs)] animate-in fade-in duration-200">
          <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[var(--accent)]" />
                Individual Student Window Overrides & Prerequisite Waivers
              </h2>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Grant deadline extensions, custom attempt quotas, or prerequisite bypasses to specific students and experiments.
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
            className="p-4 sm:p-5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] space-y-5"
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
                            onClick={() => addStudentToSelection(s.id)}
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

              {/* Selected Students List */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

          {/* Active Student Overrides Table */}
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
              <span className="text-xs text-[var(--text-muted)] font-mono font-semibold">
                {activeCourseOverrides.length} Active Overrides
              </span>
            </div>

            {/* Bulk Selection Bar */}
            {selectedTableOverrideIds.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-md)] animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-600">
                  <CheckSquare className="w-4 h-4 text-rose-500" />
                  <span>
                    {selectedTableOverrideIds.length} override
                    {selectedTableOverrideIds.length > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTableOverrideIds([])}
                    className="px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-raised)] rounded transition-colors cursor-pointer"
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDeleteOverrides}
                    disabled={bulkDeletingOverrides}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {bulkDeletingOverrides ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete Selected ({selectedTableOverrideIds.length})
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-[var(--border)] rounded-[var(--radius-md)]">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-raised)]">
                    <th className="py-2.5 pl-3 pr-2 w-9">
                      <input
                        type="checkbox"
                        checked={
                          activeCourseOverrides.length > 0 &&
                          selectedTableOverrideIds.length === activeCourseOverrides.length
                        }
                        onChange={handleToggleSelectAllOverrides}
                        className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                        title="Select all"
                      />
                    </th>
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
                      <td colSpan={6} className="py-8 text-center text-xs text-[var(--text-muted)] italic">
                        No individual student overrides configured for this course.
                      </td>
                    </tr>
                  ) : (
                    activeCourseOverrides.map((ovr) => {
                      const isSelected = selectedTableOverrideIds.includes(ovr.id);
                      return (
                        <tr
                          key={ovr.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-[var(--accent-dim)]/30' : 'hover:bg-[var(--bg-raised)]'
                          }`}
                        >
                          <td className="py-2.5 pl-3 pr-2 w-9">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOverride(ovr.id)}
                              className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                            />
                          </td>
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
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditOverride(ovr)}
                                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] transition-colors cursor-pointer"
                                title="Edit student override"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteOverride(ovr.id)}
                                className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] transition-colors cursor-pointer"
                                title="Remove student override"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Student Override Modal */}
          {editingOverride && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">Edit Student Override</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">
                      {editingOverride.student?.name} ({editingOverride.student?.roll_no || 'No Roll No'})
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingOverride(null)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditedOverride} className="space-y-4">
                  <div className="p-2.5 rounded-lg bg-[var(--bg-raised)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)]">
                    Exp #{editingOverride.experiment?.experiment_no} — {editingOverride.experiment?.title}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Window Starts At
                      </label>
                      <input
                        type="datetime-local"
                        value={editingForm.starts_at}
                        onChange={(e) => setEditingForm({ ...editingForm, starts_at: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Window Ends At (Deadline)
                      </label>
                      <input
                        type="datetime-local"
                        value={editingForm.ends_at}
                        onChange={(e) => setEditingForm({ ...editingForm, ends_at: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editingForm.bypass_prerequisite}
                        onChange={(e) =>
                          setEditingForm({ ...editingForm, bypass_prerequisite: e.target.checked })
                        }
                        className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        Bypass Sequential Experiment Prerequisite
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editingForm.allow_late_submission}
                        onChange={(e) =>
                          setEditingForm({ ...editingForm, allow_late_submission: e.target.checked })
                        }
                        className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        Allow late submission after window deadline
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                      Reason / Waiver Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Medical leave approved, re-exam requested"
                      value={editingForm.notes}
                      onChange={(e) => setEditingForm({ ...editingForm, notes: e.target.value })}
                      className={inputCls}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setEditingOverride(null)}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-input)] hover:bg-[var(--bg-raised)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] bg-[var(--accent)] hover:opacity-90 text-[var(--accent-text,#fff)] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {savingEdit ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WINDOW SESSIONS & RELEASE HISTORY */}
      {activeTab === 'sessions' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Executive Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-xs)] flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Active Course</p>
                <p className="text-[16px] font-bold text-[var(--text-primary)] mt-1 truncate max-w-[180px]">
                  {currentCourse?.course_code || 'N/A'}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] truncate max-w-[180px]">
                  {currentCourse?.title || 'No course selected'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-xs)] flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Experiments</p>
                <p className="text-[20px] font-bold text-[var(--text-primary)] mt-0.5">
                  {activeCourseExperiments.length}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">Lab curriculum syllabus</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-xs)] flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Assigned Batches</p>
                <p className="text-[20px] font-bold text-[var(--text-primary)] mt-0.5">
                  {unlockData.sections?.length || 0} Sections
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {unlockData.students?.length || 0} Enrolled Students
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-xs)] flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Active Overrides</p>
                <p className="text-[20px] font-bold text-[var(--text-primary)] mt-0.5">
                  {activeCourseOverrides.length}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">Custom deadline waivers</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Live Batch & Section Release Windows Table */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 sm:p-6 space-y-5 shadow-[var(--shadow-xs)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Timer className="w-4 h-4 text-[var(--accent)]" />
                  Active Batch Windows & Progressive Release State
                </h2>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                  Real-time status of released experiment milestones, start/end timing windows, and quick window extensions per section.
                </p>
              </div>

              <button
                onClick={fetchUnlockMatrix}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold hover:bg-[var(--bg-hover)] cursor-pointer transition-all shrink-0 self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--accent)]' : ''}`} />
                Refresh Status
              </button>
            </div>

            <div className="overflow-x-auto border border-[var(--border)] rounded-[var(--radius-md)]">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-raised)]">
                    <th className="py-3 px-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Target Batch / Section
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Released Scope
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Live Window Status
                    </th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Window Timings (Start → Deadline)
                    </th>
                    <th className="py-3 px-4 text-right text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Quick Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {sessionOverviewData.map((sess) => {
                    const isLockAction = sessionActionKey === `lock-${sess.section}`;
                    const isExtend24 = sessionActionKey === `extend-${sess.section}-24`;
                    const isExtend168 = sessionActionKey === `extend-${sess.section}-168`;

                    return (
                      <tr key={sess.section} className="hover:bg-[var(--bg-raised)]/70 transition-colors">
                        {/* Section */}
                        <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded bg-[var(--bg-input)] border border-[var(--border)] text-xs font-mono font-bold">
                              {sess.section === 'ALL' ? 'Classwide (ALL)' : `Section ${sess.section}`}
                            </span>
                          </div>
                        </td>

                        {/* Released Scope */}
                        <td className="py-3.5 px-4">
                          {sess.maxUnlockedNo > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)] text-xs">
                                <span className="text-[var(--accent)] font-bold">Exp #1 to #{sess.maxUnlockedNo}</span>
                                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                                  ({sess.unlockedCount}/{sess.totalCount})
                                </span>
                              </div>
                              <div className="w-28 bg-[var(--bg-input)] h-1.5 rounded-full overflow-hidden border border-[var(--border)]">
                                <div
                                  className="bg-[var(--accent)] h-full rounded-full transition-all"
                                  style={{
                                    width: `${(sess.unlockedCount / Math.max(sess.totalCount, 1)) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)] italic">No experiments unlocked</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${sess.statusColor}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                sess.status === 'LIVE_OPEN'
                                  ? 'bg-emerald-500 animate-pulse'
                                  : sess.status === 'UPCOMING'
                                  ? 'bg-amber-500'
                                  : sess.status === 'EXPIRED'
                                  ? 'bg-rose-500'
                                  : sess.status === 'ALWAYS_OPEN'
                                  ? 'bg-blue-500'
                                  : 'bg-zinc-500'
                              }`}
                            />
                            {sess.statusLabel}
                          </span>
                        </td>

                        {/* Timings */}
                        <td className="py-3.5 px-4 text-xs font-mono text-[var(--text-secondary)]">
                          {sess.startsAt || sess.endsAt ? (
                            <div className="space-y-0.5">
                              <div>
                                <span className="text-[var(--text-muted)]">Starts: </span>
                                {sess.startsAt ? sess.startsAt.toLocaleString() : 'Immediate'}
                              </div>
                              <div>
                                <span className="text-[var(--text-muted)]">Ends: </span>
                                {sess.endsAt ? sess.endsAt.toLocaleString() : 'No Deadline'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)] italic">—</span>
                          )}
                        </td>

                        {/* Quick Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Extend +24h */}
                            <button
                              type="button"
                              onClick={() => handleExtendSectionWindow(sess.section, 24)}
                              disabled={isExtend24 || !sess.isUnlocked}
                              className="px-2 py-1 text-[11px] font-semibold rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition cursor-pointer disabled:opacity-40"
                              title="Extend deadline by +24 Hours from now"
                            >
                              {isExtend24 ? <Loader2 className="w-3 h-3 animate-spin" /> : '+24h'}
                            </button>

                            {/* Extend +7d */}
                            <button
                              type="button"
                              onClick={() => handleExtendSectionWindow(sess.section, 168)}
                              disabled={isExtend168 || !sess.isUnlocked}
                              className="px-2 py-1 text-[11px] font-semibold rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition cursor-pointer disabled:opacity-40"
                              title="Extend deadline by +7 Days from now"
                            >
                              {isExtend168 ? <Loader2 className="w-3 h-3 animate-spin" /> : '+7d'}
                            </button>

                            {/* Toggle Lock / Unlock */}
                            <button
                              type="button"
                              onClick={() => handleToggleSectionLock(sess.section, sess.isUnlocked)}
                              disabled={isLockAction}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition cursor-pointer flex items-center gap-1 ${
                                sess.isUnlocked
                                  ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/20 hover:brightness-105'
                                  : 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)] hover:brightness-105'
                              }`}
                              title={sess.isUnlocked ? 'Lock this section' : 'Unlock this section'}
                            >
                              {isLockAction ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : sess.isUnlocked ? (
                                <Lock className="w-3 h-3" />
                              ) : (
                                <Unlock className="w-3 h-3" />
                              )}
                              <span>{sess.isUnlocked ? 'Lock' : 'Unlock'}</span>
                            </button>

                            {/* Configure in Roster tab */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUnlockSection(sess.section);
                                setActiveTab('roster');
                              }}
                              className="p-1.5 text-[11px] rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition cursor-pointer"
                              title="Configure schedule in Roster tab"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

