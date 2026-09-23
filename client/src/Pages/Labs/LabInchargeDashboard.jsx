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
} from 'lucide-react';
import api from '../../api/axios';

export default function LabInchargeDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('single');
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

  // Unlock Matrix State (Tab 3)
  const [unlockData, setUnlockData] = useState({
    courses: [],
    mappings: [],
    unlocks: [],
    experiments: [],
    sections: [],
  });
  const [selectedUnlockCourseId, setSelectedUnlockCourseId] = useState('');
  const [selectedUnlockSection, setSelectedUnlockSection] = useState('ALL');
  const [loadingUnlocks, setLoadingUnlocks] = useState(false);
  const [togglingExpId, setTogglingExpId] = useState(null);

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
      setUnlockData(res || { courses: [], mappings: [], unlocks: [], experiments: [], sections: [] });
      if (res?.courses?.length > 0 && !selectedUnlockCourseId) {
        setSelectedUnlockCourseId(String(res.courses[0].id));
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingUnlocks(false);
    }
  };

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

  const handleSaveEvaluation = async (status) => {
    if (!selectedSubId) return;
    try {
      setEvalSubmitting(true);
      await api.post('/lab-incharge/verify-single', {
        submission_id: selectedSubId,
        status,
        code_marks: Number(evalCodeMarks) || 0,
        viva_marks: Number(evalVivaMarks) || 0,
        marks: Number(evalTotalMarks) || (Number(evalCodeMarks) + Number(evalVivaMarks)),
        faculty_notes: evalNotes,
      });
      showToast(
        status === 'APPROVED'
          ? 'Experiment verified and signed successfully!'
          : 'Revision requested from student.',
        'success'
      );
      setSelectedSubId(null);
      setEvalDetail(null);
      fetchQueue();
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

  const handleBulkToggle = async (unlockAll) => {
    const activeCourseId = Number(selectedUnlockCourseId);
    const activeSection = selectedUnlockSection;
    const expList = unlockData.experiments.filter((e) => e.course_id === activeCourseId);

    if (expList.length === 0) {
      showToast('No experiments to update.', 'error');
      return;
    }

    try {
      setLoadingUnlocks(true);
      for (const exp of expList) {
        await api.post('/lab-incharge/unlocks/toggle', {
          course_id: activeCourseId,
          experiment_id: exp.id,
          section: activeSection,
          is_unlocked: unlockAll,
        });
      }
      showToast(
        unlockAll
          ? `All ${expList.length} experiments released for ${activeSection}!`
          : `All experiments locked for ${activeSection}!`,
        'success'
      );
      fetchUnlockMatrix();
    } catch {
      showToast('Failed to bulk update experiment unlock status.', 'error');
    } finally {
      setLoadingUnlocks(false);
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
    } catch {
      showToast('Failed to approve semester record.', 'error');
    }
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
    { key: 'single', label: 'Evaluation Queue & Viva Voce' },
    { key: 'semester', label: 'Semester Batch Sign-Off' },
    { key: 'unlocks', label: 'Experiment Release & Section Locks' },
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
            Lab Incharge Evaluation & Viva Voce Cockpit
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            Review student code submissions, compare algorithms side-by-side, conduct in-person oral viva assessments, and award marks.
          </p>
        </div>
      </div>

      {/* Mode Tab Selector */}
      <div className="border-b border-[var(--border)] flex items-center gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === tab.key
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.key === 'single' ? (
              <MessageSquareCheck className="w-3.5 h-3.5" />
            ) : tab.key === 'semester' ? (
              <CheckCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Status Filters */}
      {activeTab !== 'unlocks' && (
        <div className="panel-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, roll number, or experiment title..."
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-9 pr-4 py-2 text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition-all"
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

          <div className="flex items-center gap-1.5 flex-wrap self-start md:self-auto">
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
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-[var(--text-muted)] gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
          <span className="text-sm">Loading verification queue...</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/20 text-[var(--red)] text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: Evaluation Queue & Viva Voce */}
      {!loading && !error && activeTab === 'single' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <MessageSquareCheck className="w-4 h-4 text-[var(--accent)]" />
              Student Submissions Queue
              <span className="text-[11px] font-mono text-[var(--text-muted)] font-normal ml-1">
                ({filteredSubmissions.length} record{filteredSubmissions.length !== 1 ? 's' : ''})
              </span>
            </h2>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="panel-card p-12 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                {search ? 'No submissions match your search.' : 'All caught up! No submissions waiting for oral viva.'}
              </p>
              <p className="text-[12px] text-[var(--text-muted)] max-w-md mx-auto">
                {search
                  ? 'Try modifying your search criteria.'
                  : 'When students submit experiments for faculty verification, they will appear here in your evaluation queue.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSubmissions.map((sub) => {
                const isPendingViva = sub.status === 'SUBMITTED_FOR_VERIFICATION';
                return (
                  <div
                    key={sub.id}
                    className={`data-card data-card-interactive p-5 flex flex-col justify-between group cursor-pointer transition-all ${
                      isPendingViva ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : ''
                    }`}
                    onClick={() => openEvaluationModal(sub.id)}
                  >
                    <div className="space-y-3">
                      {/* Card Header: Student Avatar/Badge & Status Pill */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] shrink-0 font-bold font-mono text-xs">
                            {sub.student?.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <h3 className="text-[14px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-tight">
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
                              {sub.marks}/10
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

                      {/* Experiment & Variant Info */}
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
                        <p className="text-[12px] font-semibold text-[var(--text-primary)] line-clamp-1">
                          {sub.question?.title || sub.experiment?.title}
                        </p>
                      </div>
                    </div>

                    {/* Footer: Test Pass Stats & Action Link */}
                    <div className="pt-3.5 mt-3.5 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
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

      {/* Evaluation & Viva Voce Full Cockpit Modal */}
      {selectedSubId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
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
                {/* Modal View Selector Tabs */}
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

                {/* Modal Main Body */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
                  {/* TAB 1: Oral Viva Voce Assessment */}
                  {evalTab === 'viva' && (
                    <div className="space-y-4">
                      <div className="p-3.5 rounded-[var(--radius-md)] bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-indigo-700">
                          <MessageSquareCheck className="w-4 h-4" />
                          Oral Viva Voce Instructions for Faculty Incharge
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          Ask the student the questions below verbally. Verify their conceptual understanding, algorithm reasoning, and complexity insights against the model answers.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {(!evalDetail?.viva_questions || evalDetail.viva_questions.length === 0) ? (
                          <div className="p-6 text-center text-xs text-[var(--text-muted)] italic border border-dashed border-[var(--border)] rounded-[var(--radius-md)]">
                            No viva questions found for this question variant.
                          </div>
                        ) : (
                          evalDetail.viva_questions.map((vq, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] space-y-2 shadow-[var(--shadow-sm)]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold text-[var(--accent)] px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)]">
                                  Viva Question #{idx + 1}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-[var(--text-primary)]">
                                {vq.question}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] p-3 rounded border border-[var(--border)] leading-relaxed">
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

                  {/* TAB 2: Side-by-Side Code Diff */}
                  {evalTab === 'code' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-96">
                      <div className="flex flex-col border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden">
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

                      <div className="flex flex-col border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden">
                        <div className="px-3 py-2 bg-[var(--bg-raised)] border-b border-[var(--border)] text-xs font-bold text-emerald-600 flex items-center justify-between">
                          <span>Master Reference Solution (Faculty)</span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">Verified Solution</span>
                        </div>
                        <pre className="flex-1 p-3 text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-input)] overflow-auto whitespace-pre-wrap">
                          {evalDetail?.reference_solution || '# No reference solution configured'}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Side-by-Side Algorithm Diff */}
                  {evalTab === 'algo' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="border border-[var(--border)] rounded-[var(--radius-md)] p-4 space-y-2 bg-[var(--bg-raised)]">
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

                      <div className="border border-[var(--border)] rounded-[var(--radius-md)] p-4 space-y-2 bg-[var(--bg-raised)]">
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

                {/* Marking & Verification Cockpit Footer */}
                <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-raised)] space-y-3 shrink-0">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">
                        Code & Tests Marks (Max 6)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="6"
                        value={evalCodeMarks}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEvalCodeMarks(val);
                          setEvalTotalMarks(val + Number(evalVivaMarks));
                        }}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-1.5 text-xs font-mono text-[var(--text-primary)] font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">
                        Oral Viva Marks (Max 4)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="4"
                        value={evalVivaMarks}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEvalVivaMarks(val);
                          setEvalTotalMarks(Number(evalCodeMarks) + val);
                        }}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-1.5 text-xs font-mono text-[var(--text-primary)] font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">
                        Total Marks (out of 10)
                      </label>
                      <input
                        type="number"
                        value={evalTotalMarks}
                        onChange={(e) => setEvalTotalMarks(Number(e.target.value))}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-accent)] rounded px-3 py-1.5 text-xs font-mono text-[var(--accent)] font-bold"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">
                        Faculty Remarks / Notes
                      </label>
                      <input
                        type="text"
                        value={evalNotes}
                        onChange={(e) => setEvalNotes(e.target.value)}
                        placeholder="e.g. Good verbal explanation"
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-1.5 text-xs text-[var(--text-primary)]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSaveEvaluation('REVISION_REQUIRED')}
                      disabled={evalSubmitting}
                      className="px-4 py-2 rounded-[var(--radius-sm)] bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      Request Revision
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEvaluation('APPROVED')}
                      disabled={evalSubmitting}
                      className="px-5 py-2 rounded-[var(--radius-sm)] bg-[var(--green)] hover:bg-[var(--green)]/90 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {evalSubmitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Approve & Digitally Sign ({evalTotalMarks}/10)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
