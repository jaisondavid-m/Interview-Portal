import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  CheckCircle2,
  CheckCheck,
  FileText,
  Search,
  Loader2,
  AlertCircle,
  Code2,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  ShieldCheck,
  Layers,
  Sparkles,
  MessageSquareCheck,
  Award,
  Clock,
  X,
  RotateCcw,
  BookOpen,
  ListPlus,
  Terminal,
  Calendar,
  Sliders,
  Download,
  Users,
  Filter,
  Eye,
  BarChart3,
  TrendingUp,
  Percent
} from 'lucide-react';
import api from '../../api/axios';
import LabMarkEntryModal from '../../Components/AdminLabs/LabMarkEntryModal';
import LabScheduleModal from '../../Components/AdminLabs/LabScheduleModal';
import LabStudentAnalyticsDrawer from '../../Components/AdminLabs/LabStudentAnalyticsDrawer';

export default function LabInchargeDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'single' | 'semester' | 'unlocks'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'SUBMITTED_FOR_VERIFICATION' | 'APPROVED'
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Evaluation & Viva Voce Modal State
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [evalDetail, setEvalDetail] = useState(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalCodeMarks, setEvalCodeMarks] = useState(6);
  const [evalVivaMarks, setEvalVivaMarks] = useState(4);
  const [evalTotalMarks, setEvalTotalMarks] = useState(10);
  const [evalNotes, setEvalNotes] = useState('Verified by Lab Incharge');
  const [evalSubmitting, setEvalSubmitting] = useState(false);

  // Active view tab inside eval modal: 'code' | 'algo' | 'viva'
  const [evalTab, setEvalTab] = useState('viva');

  // Unlock Matrix & Schedule State (Tab 4)
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
  const [loadingUnlocks, setLoadingUnlocks] = useState(false);
  const [togglingExpId, setTogglingExpId] = useState(null);

  // Window Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTargetStudentId, setScheduleTargetStudentId] = useState('');
  const [scheduleTargetExpId, setScheduleTargetExpId] = useState('');

  // Student Analytics & Progress Matrix State (Tab 1)
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsCourseId, setAnalyticsCourseId] = useState('');
  const [analyticsSection, setAnalyticsSection] = useState('ALL');
  const [analyticsSearch, setAnalyticsSearch] = useState('');
  const [selectedStudentDrawer, setSelectedStudentDrawer] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchQueue();
    fetchUnlockMatrix();
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lab-incharge/queue');
      setSubmissions(res?.submissions || []);
      setMappings(res?.mappings || []);
    } catch {
      setError('Could not load student lab submissions.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnlockMatrix = async () => {
    try {
      setLoadingUnlocks(true);
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
      if (res?.courses?.length > 0) {
        if (!selectedUnlockCourseId) {
          setSelectedUnlockCourseId(String(res.courses[0].id));
        }
        if (!analyticsCourseId) {
          setAnalyticsCourseId(String(res.courses[0].id));
          fetchAnalytics(String(res.courses[0].id), 'ALL');
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingUnlocks(false);
    }
  };

  const fetchAnalytics = async (courseId, section = 'ALL') => {
    if (!courseId) return;
    try {
      setLoadingAnalytics(true);
      const secParam = section && section !== 'ALL' ? `?section=${encodeURIComponent(section)}` : '';
      const res = await api.get(`/lab-incharge/analytics/${courseId}${secParam}`);
      setAnalyticsData(res);
    } catch {
      showToast('Failed to load course student analytics.', 'error');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);

  const openEvaluationModal = async (subId) => {
    setSelectedSubId(subId);
    setEvalLoading(true);
    setEvalDetail(null);
    setEvalTab('viva');
    try {
      const res = await api.get(`/lab-incharge/submission/${subId}`);
      setEvalDetail(res);
      const sub = res?.submission;
      const cMarks = sub?.code_marks || 6;
      const vMarks = sub?.viva_marks || 4;
      const totMarks = sub?.marks || (cMarks + vMarks);
      setEvalCodeMarks(cMarks);
      setEvalVivaMarks(vMarks);
      setEvalTotalMarks(totMarks);
      setEvalNotes(sub?.faculty_notes || 'Verified by Lab Incharge');
    } catch {
      showToast('Failed to load submission evaluation details.', 'error');
    } finally {
      setEvalLoading(false);
    }
  };

  const handleSaveEvaluation = async (evalPayload) => {
    if (!selectedSubId) return;
    try {
      setEvalSubmitting(true);
      await api.post('/lab-incharge/verify-single', {
        submission_id: selectedSubId,
        status: evalPayload.status || 'APPROVED',
        marks: evalPayload.marks !== undefined ? evalPayload.marks : evalTotalMarks,
        marks_breakdown: evalPayload.marks_breakdown || null,
        code_marks: Number(evalCodeMarks) || 0,
        viva_marks: Number(evalVivaMarks) || 0,
        faculty_notes: evalPayload.faculty_notes || evalNotes,
      });
      showToast(
        evalPayload.status === 'APPROVED'
          ? 'Experiment verified, graded, and signed successfully!'
          : 'Revision requested from student.',
        'success'
      );
      setIsMarkModalOpen(false);
      setSelectedSubId(null);
      setEvalDetail(null);
      fetchQueue();
      if (analyticsCourseId) fetchAnalytics(analyticsCourseId, analyticsSection);
    } catch {
      showToast('Failed to save experiment evaluation.', 'error');
    } finally {
      setEvalSubmitting(false);
    }
  };

  const handleResetAllocation = async () => {
    if (!evalDetail?.submission) return;
    if (!window.confirm('Re-assign a new random question variant for this student?')) return;
    try {
      const sub = evalDetail.submission;
      await api.post('/lab-incharge/student-allocation/reset', {
        student_id: sub.student_id,
        course_id: evalDetail.question?.course_id || 1,
        experiment_id: sub.experiment_id,
      });
      showToast('Question variant reset. Student will receive new variant.', 'success');
      openEvaluationModal(selectedSubId);
      fetchQueue();
    } catch {
      showToast('Failed to reset question allocation.', 'error');
    }
  };

  const handleToggleUnlock = async (courseId, expId, section, newStatus) => {
    try {
      setTogglingExpId(expId);
      await api.post('/lab-incharge/unlocks/toggle', {
        course_id: Number(courseId),
        experiment_id: Number(expId),
        section: section || 'ALL',
        is_unlocked: newStatus,
      });
      showToast(
        newStatus
          ? `Experiment released for section ${section}!`
          : `Experiment locked for section ${section}!`,
        'success'
      );
      fetchUnlockMatrix();
    } catch {
      showToast('Failed to update unlock status.', 'error');
    } finally {
      setTogglingExpId(null);
    }
  };

  const handleVerifySemester = async (studentId, courseId = 1) => {
    try {
      await api.post('/lab-incharge/verify-semester', {
        student_id: studentId,
        course_id: courseId,
      });
      showToast('Entire semester record approved!', 'success');
      fetchQueue();
      if (analyticsCourseId) fetchAnalytics(analyticsCourseId, analyticsSection);
    } catch {
      showToast('Failed to approve semester record.', 'error');
    }
  };

  // Export Student Progress Matrix to CSV
  const handleExportAnalyticsCSV = () => {
    if (!analyticsData?.student_matrix || analyticsData.student_matrix.length === 0) {
      showToast('No student data to export.', 'error');
      return;
    }

    const exps = analyticsData.experiments || [];
    const expHeaders = exps.map((e) => `Ex ${e.experiment_no} (${e.title})`);
    const headers = ['Roll No', 'Name', 'Section', 'Email', 'Completed Labs', 'Total Marks', 'Score %', ...expHeaders];

    const rows = analyticsData.student_matrix.map((st) => {
      const expStatuses = st.experiments.map((e) => `${e.status} (Marks: ${e.marks}, Attempts: ${e.attempt_count})`);
      return [
        `"${st.roll_no || ''}"`,
        `"${st.name || ''}"`,
        `"${st.section || ''}"`,
        `"${st.email || ''}"`,
        `"${st.completed_count}/${st.total_experiments}"`,
        st.total_marks,
        `${st.overall_pct}%`,
        ...expStatuses.map((s) => `"${s}"`),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${analyticsData.course?.course_code || 'Lab'}_Student_Progress_Matrix.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const term = search.toLowerCase();
    const matchesSearch =
      sub.student?.name?.toLowerCase().includes(term) ||
      sub.student?.roll_no?.toLowerCase().includes(term) ||
      sub.experiment?.title?.toLowerCase().includes(term) ||
      sub.question?.title?.toLowerCase().includes(term);

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && sub.status === statusFilter;
  });

  const TABS = [
    { key: 'analytics', label: 'Student Progress & Analytics', icon: BarChart3 },
    { key: 'single', label: 'Evaluation Queue & Viva Voce', icon: MessageSquareCheck },
    { key: 'semester', label: 'Semester Batch Sign-Off', icon: CheckCheck },
    { key: 'unlocks', label: 'Window Scheduling & Section Locks', icon: Clock },
  ];

  // Parse student procedure steps for eval modal
  const getStudentProcedureSteps = () => {
    const raw = evalDetail?.submission?.student_procedure;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return raw.split('\n').filter((l) => l.trim().length > 0);
    }
  };

  // Parse reference algorithm steps for eval modal
  const getReferenceAlgoSteps = () => {
    const raw = evalDetail?.reference_algo || evalDetail?.question?.reference_algorithm;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return raw.split('\n').filter((l) => l.trim().length > 0);
    }
  };

  const getStatusPill = (status, attemptCount, marks) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> {marks > 0 ? `${marks}m` : 'Pass'}
          </span>
        );
      case 'SUBMITTED_FOR_VERIFICATION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30 animate-pulse">
            <Clock className="w-3 h-3" /> Review
          </span>
        );
      case 'TEST_PASSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/30">
            Passed ({attemptCount} att)
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/30">
            In Progress
          </span>
        );
      case 'REVISION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/30">
            Revision
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] text-[var(--text-muted)] bg-[var(--bg-input)] border border-[var(--border)]">
            Not Started
          </span>
        );
    }
  };

  // Filtered Student Matrix
  const filteredStudentMatrix = (analyticsData?.student_matrix || []).filter((st) => {
    const q = analyticsSearch.toLowerCase();
    const matchesSearch = st.name?.toLowerCase().includes(q) || st.roll_no?.toLowerCase().includes(q) || st.section?.toLowerCase().includes(q);
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold transition-all ${
            toast.type === 'error'
              ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/30'
              : 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/30'
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
        <div>
          <h1 className="text-[20px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-[var(--accent)]" />
            Lab Incharge Evaluation & Assessment Cockpit
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Configure experiment open windows, track student completion rates & attempts, conduct viva voce, and sign records.
          </p>
        </div>
      </div>

      {/* Mode Tab Selector */}
      <div className="border-b border-[var(--border)] flex items-center gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === tab.key
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: STUDENT PROGRESS & ANALYTICS MATRIX                    */}
      {/* ============================================================ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Controls Bar: Course Selector, Section Filter, Search, Export */}
          <div className="panel-card p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap flex-1">
              <div className="space-y-1 min-w-[200px]">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Course
                </label>
                <select
                  value={analyticsCourseId}
                  onChange={(e) => {
                    setAnalyticsCourseId(e.target.value);
                    fetchAnalytics(e.target.value, analyticsSection);
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)]"
                >
                  {unlockData.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 min-w-[140px]">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Section Filter
                </label>
                <select
                  value={analyticsSection}
                  onChange={(e) => {
                    setAnalyticsSection(e.target.value);
                    fetchAnalytics(analyticsCourseId, e.target.value);
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="ALL">ALL Sections</option>
                  {unlockData.sections.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 flex-1 min-w-[220px]">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Search Roster
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={analyticsSearch}
                    onChange={(e) => setAnalyticsSearch(e.target.value)}
                    placeholder="Search by Roll No, Name, or Section..."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end lg:self-center">
              <button
                type="button"
                onClick={handleExportAnalyticsCSV}
                className="px-3.5 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => fetchAnalytics(analyticsCourseId, analyticsSection)}
                className="p-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-all cursor-pointer"
                title="Refresh Analytics"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loadingAnalytics ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loadingAnalytics ? (
            <div className="flex items-center justify-center py-20 text-[var(--text-muted)] gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
              <span className="text-xs">Computing student completion analytics & matrix...</span>
            </div>
          ) : !analyticsData ? (
            <div className="panel-card p-12 text-center text-xs text-[var(--text-muted)]">
              Select a course above to inspect student progress.
            </div>
          ) : (
            <>
              {/* Overview Summary KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="panel-card p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Enrolled Students
                    </span>
                    <Users className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                    {analyticsData.total_students}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">Active in lab roster</span>
                </div>

                <div className="panel-card p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Overall Completion
                    </span>
                    <Percent className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-500">
                    {analyticsData.overall_completion_rate}%
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">Required curriculum done</span>
                </div>

                <div className="panel-card p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Class Average Score
                    </span>
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-indigo-400">
                    {analyticsData.average_score} <span className="text-xs text-[var(--text-muted)]">marks</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">Cumulative average</span>
                </div>

                <div className="panel-card p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Curriculum Labs
                    </span>
                    <BookOpen className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                    {analyticsData.experiments?.length || 0}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">Scheduled experiments</span>
                </div>
              </div>

              {/* Experiment-by-Experiment Completion Rate Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Experiment Completion Rates & Average Attempts
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {(analyticsData.experiment_stats || []).map((exp) => {
                    const compPct = exp.total_enrolled > 0 ? Math.round((exp.completed_count / exp.total_enrolled) * 100) : 0;
                    return (
                      <div
                        key={exp.experiment_id}
                        className="panel-card p-3.5 space-y-2.5 hover:border-[var(--accent)]/40 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                              Ex {exp.experiment_no}
                            </span>
                            <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1 mt-1">
                              {exp.title}
                            </h4>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-500">
                            {compPct}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-[var(--bg-input)] overflow-hidden flex">
                          <div
                            style={{ width: `${compPct}%` }}
                            className="h-full bg-emerald-500 transition-all"
                          />
                          <div
                            style={{ width: `${(exp.submitted_count / (exp.total_enrolled || 1)) * 100}%` }}
                            className="h-full bg-amber-500 transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-[10px] text-[var(--text-muted)] font-mono">
                          <div>
                            Done: <strong className="text-emerald-600">{exp.completed_count}</strong>
                          </div>
                          <div>
                            Review: <strong className="text-amber-600">{exp.submitted_count}</strong>
                          </div>
                          <div>
                            Avg Att: <strong className="text-[var(--text-primary)]">{exp.avg_attempts.toFixed(1)}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Student Progress Matrix Interactive Table */}
              <div className="panel-card overflow-hidden space-y-3 p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Student Experiment Progress Matrix
                      <span className="text-[10px] font-normal text-[var(--text-muted)] font-mono">
                        ({filteredStudentMatrix.length} students)
                      </span>
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Click any student row to view attempt logs, viva answers, and grant window extensions.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-raised)] border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        <th className="py-3 px-4 sticky left-0 bg-[var(--bg-raised)] z-10">Student</th>
                        <th className="py-3 px-3">Sec</th>
                        <th className="py-3 px-3">Completed</th>
                        <th className="py-3 px-3">Total Marks</th>
                        {(analyticsData.experiments || []).map((exp) => (
                          <th key={exp.id} className="py-3 px-3 text-center min-w-[90px]">
                            Ex {exp.experiment_no}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {filteredStudentMatrix.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4 + (analyticsData.experiments?.length || 0)}
                            className="py-8 text-center text-xs text-[var(--text-muted)]"
                          >
                            No students match your search filter.
                          </td>
                        </tr>
                      ) : (
                        filteredStudentMatrix.map((st) => (
                          <tr
                            key={st.student_id}
                            onClick={() => setSelectedStudentDrawer(st)}
                            className="hover:bg-[var(--bg-raised)] cursor-pointer transition-colors group"
                          >
                            <td className="py-2.5 px-4 sticky left-0 bg-[var(--bg-card)] group-hover:bg-[var(--bg-raised)] z-10">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                                  {st.roll_no || `ID#${st.student_id}`}
                                </span>
                                <span className="text-xs text-[var(--text-secondary)] truncate max-w-[140px]">
                                  {st.name}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                              {st.section || '—'}
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[var(--accent)]">
                                  {st.completed_count}/{st.total_experiments}
                                </span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 font-mono text-xs font-bold text-emerald-500">
                              {st.total_marks}
                            </td>

                            {st.experiments.map((expDet) => (
                              <td key={expDet.experiment_id} className="py-2.5 px-3 text-center">
                                {getStatusPill(expDet.status, expDet.attempt_count, expDet.marks)}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: EVALUATION QUEUE & VIVA VOCE                           */}
      {/* ============================================================ */}
      {activeTab === 'single' && (
        <div className="space-y-4">
          {/* Search & Status Filters */}
          <div className="panel-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, roll number, or experiment title..."
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'SUBMITTED_FOR_VERIFICATION', 'APPROVED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    statusFilter === status
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {status === 'ALL'
                    ? 'All Submissions'
                    : status === 'SUBMITTED_FOR_VERIFICATION'
                    ? 'Oral Viva Pending'
                    : 'Approved'}
                </button>
              ))}
            </div>
          </div>

          {/* Queue List */}
          {filteredSubmissions.length === 0 ? (
            <div className="panel-card p-12 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {search ? 'No submissions match your search.' : 'All caught up! No submissions waiting for oral viva.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubmissions.map((sub) => {
                const isPendingViva = sub.status === 'SUBMITTED_FOR_VERIFICATION';
                return (
                  <div
                    key={sub.id}
                    className={`panel-card p-4 flex flex-col justify-between group cursor-pointer transition-all hover:border-[var(--accent)] ${
                      isPendingViva ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : ''
                    }`}
                    onClick={() => openEvaluationModal(sub.id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] font-bold font-mono text-xs">
                            {sub.student?.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-tight">
                              {sub.student?.name || 'Student'}
                            </h3>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                              {sub.student?.roll_no || '—'} · Sec {sub.student?.section || 'A'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            sub.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              : isPendingViva
                              ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30 animate-pulse'
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          }`}
                        >
                          {sub.status === 'APPROVED' ? (
                            <>
                              <Award className="w-3 h-3" />
                              {sub.marks}/100
                            </>
                          ) : isPendingViva ? (
                            <>
                              <MessageSquareCheck className="w-3 h-3" />
                              Viva Pending
                            </>
                          ) : (
                            sub.status
                          )}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                            Exp {sub.experiment?.experiment_no || 1}
                          </span>
                          {sub.question?.question_code && (
                            <span className="font-mono text-[10px] text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                              {sub.question.question_code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1">
                          {sub.question?.title || sub.experiment?.title}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                      <span className="text-[var(--text-secondary)] font-semibold">
                        {sub.pass_count}/{sub.total_test_cases} tests passed
                      </span>
                      <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Evaluate &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: SEMESTER BATCH SIGN-OFF                                */}
      {/* ============================================================ */}
      {activeTab === 'semester' && (
        <div className="panel-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <CheckCheck className="w-4 h-4 text-[var(--accent)]" />
              Semester Final Lab Record Approvals
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            When all experiments for a student are completed, perform a final digital batch sign-off and issue their certified lab record.
          </p>

          <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--bg-raised)] border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-3">Section</th>
                  <th className="py-3 px-3">Completed Experiments</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {analyticsData?.student_matrix?.map((st) => {
                  const isAllDone = st.completed_count >= st.total_experiments;
                  return (
                    <tr key={st.student_id} className="hover:bg-[var(--bg-raised)] transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[var(--text-primary)] block">{st.roll_no}</span>
                        <span className="text-[11px] text-[var(--text-secondary)]">{st.name}</span>
                      </td>
                      <td className="py-3 px-3 font-mono">{st.section || '—'}</td>
                      <td className="py-3 px-3 font-mono">
                        <strong className={isAllDone ? 'text-emerald-600' : 'text-amber-600'}>
                          {st.completed_count} / {st.total_experiments}
                        </strong>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isAllDone
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          }`}
                        >
                          {isAllDone ? 'Ready for Sign-Off' : 'Pending Labs'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleVerifySemester(st.student_id, Number(analyticsCourseId || 1))}
                          className="px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          Sign & Certify Record
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: WINDOW SCHEDULING & SECTION LOCKS                      */}
      {/* ============================================================ */}
      {activeTab === 'unlocks' && (
        <div className="space-y-6">
          <div className="panel-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="space-y-1 min-w-[200px]">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Target Lab Course
                </label>
                <select
                  value={selectedUnlockCourseId}
                  onChange={(e) => setSelectedUnlockCourseId(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)]"
                >
                  {unlockData.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 min-w-[140px]">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Target Section
                </label>
                <select
                  value={selectedUnlockSection}
                  onChange={(e) => setSelectedUnlockSection(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-semibold focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="ALL">ALL Sections</option>
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
                type="button"
                onClick={() => {
                  setScheduleTargetStudentId('');
                  setScheduleTargetExpId('');
                  setIsScheduleModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Clock className="w-3.5 h-3.5" />
                Configure Attendance Windows & Overrides
              </button>
            </div>
          </div>

          {/* Section Experiment Release Schedule Grid */}
          <div className="panel-card p-6 space-y-4">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <Unlock className="w-3.5 h-3.5 text-[var(--accent)]" />
              Experiment Availability Matrix (Section: {selectedUnlockSection})
            </h3>

            <div className="space-y-3">
              {unlockData.experiments
                .filter((e) => String(e.course_id) === String(selectedUnlockCourseId))
                .map((exp) => {
                  const unlockRecord = unlockData.unlocks.find(
                    (u) =>
                      u.experiment_id === exp.id &&
                      (u.section === selectedUnlockSection || u.section === 'ALL')
                  );
                  const isUnlocked = unlockRecord?.is_unlocked || false;
                  const starts = unlockRecord?.starts_at ? new Date(unlockRecord.starts_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
                  const ends = unlockRecord?.ends_at ? new Date(unlockRecord.ends_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

                  return (
                    <div
                      key={exp.id}
                      className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-between gap-4 hover:border-[var(--accent)]/40 transition-all"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                            Ex {exp.experiment_no}
                          </span>
                          <h4 className="text-xs font-bold text-[var(--text-primary)]">{exp.title}</h4>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">{exp.aim}</p>

                        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] pt-1 flex-wrap font-mono">
                          {starts && ends ? (
                            <span className="text-indigo-600 font-semibold flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Window: {starts} → {ends}
                            </span>
                          ) : (
                            <span>Window: Standard Class Session</span>
                          )}
                          {unlockRecord?.max_attempts > 0 && (
                            <span>Max Attempts: {unlockRecord.max_attempts}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleTargetStudentId('');
                            setScheduleTargetExpId(String(exp.id));
                            setIsScheduleModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" /> Schedule
                        </button>

                        <button
                          type="button"
                          disabled={togglingExpId === exp.id}
                          onClick={() => handleToggleUnlock(selectedUnlockCourseId, exp.id, selectedUnlockSection, !isUnlocked)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isUnlocked
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-[var(--bg-input)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {isUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          {isUnlocked ? 'Open' : 'Locked'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Evaluation & Viva Voce Cockpit Modal */}
      {selectedSubId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Top Bar */}
            <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)]">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">
                      {evalDetail?.student?.name || 'Student Evaluation'}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)]">
                      {evalDetail?.student?.roll_no}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                      {evalDetail?.question?.question_code}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Ex {evalDetail?.experiment?.experiment_no}: {evalDetail?.question?.title || evalDetail?.experiment?.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetAllocation}
                  className="px-2.5 py-1.5 rounded text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--red)] border border-[var(--border)] hover:border-[var(--red)]/30 transition-all cursor-pointer flex items-center gap-1"
                  title="Re-draw random variant for student"
                >
                  <RotateCcw className="w-3 h-3" /> Re-assign Variant
                </button>
                <button
                  onClick={() => setSelectedSubId(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {evalLoading ? (
              <div className="flex items-center justify-center py-24 text-[var(--text-muted)] gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
                <span className="text-xs">Loading evaluation workspace...</span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-5 pt-3 border-b border-[var(--border)] flex items-center gap-2 shrink-0 bg-[var(--bg-card)]">
                  <button
                    onClick={() => setEvalTab('viva')}
                    className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                      evalTab === 'viva'
                        ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <MessageSquareCheck className="w-4 h-4" />
                    Oral Viva Questions ({evalDetail?.viva_questions?.length || 0})
                  </button>
                  <button
                    onClick={() => setEvalTab('code')}
                    className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                      evalTab === 'code'
                        ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Code2 className="w-4 h-4" />
                    Side-by-Side Code Comparison
                  </button>
                  <button
                    onClick={() => setEvalTab('algo')}
                    className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                      evalTab === 'algo'
                        ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <ListPlus className="w-4 h-4" />
                    Side-by-Side Algorithm Comparison
                  </button>
                </div>

                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                  {evalTab === 'viva' && (
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-indigo-700">
                          <MessageSquareCheck className="w-4 h-4" />
                          Oral Viva Voce Instructions
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          Ask the student the questions below verbally. Verify conceptual understanding and problem-solving depth against the model answers.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {(!evalDetail?.viva_questions || evalDetail.viva_questions.length === 0) ? (
                          <div className="p-6 text-center text-xs text-[var(--text-muted)] italic border border-dashed border-[var(--border)] rounded-xl">
                            No viva questions found for this question variant.
                          </div>
                        ) : (
                          evalDetail.viva_questions.map((vq, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-2 shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold text-[var(--accent)] px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)]">
                                  Viva Question #{idx + 1}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-[var(--text-primary)]">
                                {vq.question}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border)] leading-relaxed">
                                <span className="text-[10px] font-bold text-emerald-600 block uppercase mb-0.5">
                                  Model Reference Answer:
                                </span>
                                {vq.answer}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {evalTab === 'code' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-96">
                      <div className="flex flex-col border border-[var(--border)] rounded-xl overflow-hidden">
                        <div className="px-3 py-2 bg-[var(--bg-raised)] border-b border-[var(--border)] text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                          <span>Student Submitted Code</span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            {evalDetail?.submission?.language || 'python'}
                          </span>
                        </div>
                        <pre className="flex-1 p-3 text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-input)] overflow-auto whitespace-pre-wrap">
                          {evalDetail?.submission?.submitted_code || '# No code submitted'}
                        </pre>
                      </div>

                      <div className="flex flex-col border border-[var(--border)] rounded-xl overflow-hidden">
                        <div className="px-3 py-2 bg-[var(--bg-raised)] border-b border-[var(--border)] text-xs font-bold text-emerald-600 flex items-center justify-between">
                          <span>Master Reference Solution (Faculty)</span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">Verified</span>
                        </div>
                        <pre className="flex-1 p-3 text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-input)] overflow-auto whitespace-pre-wrap">
                          {evalDetail?.reference_solution || '# No reference solution configured'}
                        </pre>
                      </div>
                    </div>
                  )}

                  {evalTab === 'algo' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="border border-[var(--border)] rounded-xl p-4 space-y-2 bg-[var(--bg-raised)]">
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">
                          Student Written Procedure Steps
                        </h4>
                        <div className="space-y-2">
                          {getStudentProcedureSteps().length === 0 ? (
                            <div className="text-xs text-[var(--text-muted)] italic">No steps submitted.</div>
                          ) : (
                            getStudentProcedureSteps().map((st, i) => (
                              <div key={i} className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                                {st}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="border border-[var(--border)] rounded-xl p-4 space-y-2 bg-[var(--bg-raised)]">
                        <h4 className="text-xs font-bold text-emerald-600">
                          Faculty Reference Algorithm Steps
                        </h4>
                        <div className="space-y-2">
                          {getReferenceAlgoSteps().length === 0 ? (
                            <div className="text-xs text-[var(--text-muted)] italic">No reference steps provided.</div>
                          ) : (
                            getReferenceAlgoSteps().map((st, i) => (
                              <div key={i} className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                                {st}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between gap-3 shrink-0 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-[var(--text-secondary)] px-2.5 py-1 rounded bg-[var(--bg-input)] border border-[var(--border)]">
                      Tests: {evalDetail?.submission?.pass_count || 0} / {evalDetail?.submission?.total_test_cases || 0} Passed
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      Status: <strong className="text-[var(--text-primary)]">{evalDetail?.submission?.status || 'SUBMITTED'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveEvaluation({
                          status: 'REVISION_REQUIRED',
                          marks: 0,
                          faculty_notes: 'Revision requested by Lab Incharge',
                        })
                      }
                      disabled={evalSubmitting}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      Request Revision
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMarkModalOpen(true)}
                      className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-2"
                    >
                      <Award className="w-4 h-4" />
                      Award Rubric Marks & Sign Record &rarr;
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Course-Configured Rubric Mark Entry Modal */}
      {isMarkModalOpen && (
        <LabMarkEntryModal
          isOpen={isMarkModalOpen}
          onClose={() => setIsMarkModalOpen(false)}
          submissionDetail={evalDetail}
          onSave={handleSaveEvaluation}
          submitting={evalSubmitting}
        />
      )}

      {/* Window Scheduling & Overrides Modal */}
      {isScheduleModalOpen && (
        <LabScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          courses={unlockData.courses}
          sections={unlockData.sections}
          experiments={unlockData.experiments}
          students={unlockData.students}
          studentOverrides={unlockData.student_overrides}
          initialCourseId={selectedUnlockCourseId || analyticsCourseId}
          initialStudentId={scheduleTargetStudentId}
          initialExpId={scheduleTargetExpId}
          onSuccess={(msg) => {
            showToast(msg);
            fetchUnlockMatrix();
            if (analyticsCourseId) fetchAnalytics(analyticsCourseId, analyticsSection);
          }}
        />
      )}

      {/* Student Deep-Dive Analytics Drawer */}
      {selectedStudentDrawer && (
        <LabStudentAnalyticsDrawer
          isOpen={!!selectedStudentDrawer}
          onClose={() => setSelectedStudentDrawer(null)}
          studentData={selectedStudentDrawer}
          onOpenScheduleOverride={(studentId, expId) => {
            setScheduleTargetStudentId(String(studentId));
            setScheduleTargetExpId(String(expId));
            setIsScheduleModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
