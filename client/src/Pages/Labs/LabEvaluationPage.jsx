import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Code2,
  ListPlus,
  MessageSquareCheck,
  RotateCcw,
  BookOpen,
  UserCheck,
  FileText,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Send,
  SlidersHorizontal,
  Terminal,
  Layers,
  Percent,
  GraduationCap
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../Components/ConfirmModal';

export const DEFAULT_LAB_RUBRIC = [
  {
    key: 'algorithm',
    label: 'Aim & Algorithm',
    description: 'Structure, sequential clarity, and logical correctness of procedure steps.',
    max_marks: 25,
  },
  {
    key: 'program',
    label: 'Program & Output',
    description: 'Code syntax correctness, test case execution, and benchmark output validation.',
    max_marks: 45,
  },
  {
    key: 'result',
    label: 'Result & Discussion',
    description: 'Analysis of algorithmic complexity, data interpretation, and final output.',
    max_marks: 10,
  },
  {
    key: 'viva',
    label: 'Oral Viva Voce',
    description: 'Verbal assessment of concept fundamentals, complexity, and problem solving.',
    max_marks: 20,
  },
];

export default function LabEvaluationPage() {
  const { subId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [subDetail, setSubDetail] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Active view tab: 'problem' | 'code' | 'algo' | 'viva'
  const [activeTab, setActiveTab] = useState('problem');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedRefCode, setCopiedRefCode] = useState(false);

  // Rubric Marks State
  const [marksState, setMarksState] = useState({});
  const [facultyNotes, setFacultyNotes] = useState('Verified by Lab Incharge');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (subId) {
      fetchSubmissionDetails();
    }
  }, [subId]);

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/lab-incharge/submission/${subId}`);
      setSubDetail(res);

      const sub = res?.submission || {};
      const course = res?.course || {};

      // Parse existing marks breakdown
      let existingBreakdown = {};
      if (sub.marks_breakdown) {
        try {
          existingBreakdown = typeof sub.marks_breakdown === 'object' 
            ? sub.marks_breakdown 
            : JSON.parse(sub.marks_breakdown);
        } catch {
          existingBreakdown = {};
        }
      }

      // Resolve rubric list
      let resolvedRubric = DEFAULT_LAB_RUBRIC;
      if (course?.evaluation_rubric) {
        try {
          const parsed = JSON.parse(course.evaluation_rubric);
          if (Array.isArray(parsed) && parsed.length > 0) {
            resolvedRubric = parsed;
          }
        } catch {
          // default
        }
      }

      const initial = {};
      let hasPreFill = false;
      resolvedRubric.forEach((crit) => {
        if (existingBreakdown[crit.key] !== undefined && existingBreakdown[crit.key] !== null) {
          initial[crit.key] = Number(existingBreakdown[crit.key]);
          hasPreFill = true;
        } else {
          initial[crit.key] = '';
        }
      });

      // If no pre-filled breakdown but marks exist
      if (!hasPreFill && sub.marks > 0) {
        // Proportionally distribute or fill default
        const ratio = sub.marks / 100;
        resolvedRubric.forEach((crit) => {
          initial[crit.key] = Math.round((Number(crit.max_marks) || 10) * ratio);
        });
      }

      setMarksState(initial);
      setFacultyNotes(sub.faculty_notes || 'Verified by Lab Incharge');
    } catch (err) {
      console.error(err);
      setError('Failed to load student experiment submission for evaluation.');
    } finally {
      setLoading(false);
    }
  };

  const sub = subDetail?.submission || {};
  const student = subDetail?.student || sub.student || {};
  const course = subDetail?.course || {};
  const exp = subDetail?.experiment || sub.experiment || {};
  const question = subDetail?.question || sub.question || {};
  const referenceSolution = subDetail?.reference_solution || question?.solution_code || '';
  const vivaQuestions = subDetail?.viva_questions || [];

  // Parse rubric
  const rubricList = useMemo(() => {
    if (course?.evaluation_rubric) {
      try {
        const parsed = JSON.parse(course.evaluation_rubric);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return DEFAULT_LAB_RUBRIC;
  }, [course]);

  // Calculate live grand total
  const { totalMarks, maxPossibleMarks, percentage } = useMemo(() => {
    let sum = 0;
    let max = 0;
    rubricList.forEach((crit) => {
      const val = Number(marksState[crit.key]) || 0;
      sum += val;
      max += Number(crit.max_marks) || 0;
    });
    const pct = max > 0 ? Math.round((sum / max) * 100) : 0;
    return { totalMarks: sum, maxPossibleMarks: max, percentage: pct };
  }, [marksState, rubricList]);

  const handleMarkChange = (key, maxMarks, rawValue) => {
    if (rawValue === '') {
      setMarksState((prev) => ({ ...prev, [key]: '' }));
      return;
    }
    const num = Number(rawValue);
    if (isNaN(num)) return;
    const clamped = Math.max(0, Math.min(num, maxMarks));
    setMarksState((prev) => ({ ...prev, [key]: clamped }));
  };

  const handlePresetFill = (type) => {
    const updated = {};
    rubricList.forEach((crit) => {
      const maxM = Number(crit.max_marks) || 0;
      if (type === 'full') {
        updated[crit.key] = maxM;
      } else if (type === 'pass') {
        updated[crit.key] = Math.round(maxM * 0.5);
      } else {
        updated[crit.key] = '';
      }
    });
    setMarksState(updated);
  };

  const handleSaveEvaluation = async (targetStatus) => {
    try {
      setSubmitting(true);
      const breakdown = {};
      rubricList.forEach((crit) => {
        breakdown[crit.key] = Number(marksState[crit.key]) || 0;
      });
      breakdown['total'] = totalMarks;

      const codeMarks = Number(marksState['program']) || 0;
      const vivaMarks = Number(marksState['viva']) || 0;

      await api.post('/lab-incharge/verify-single', {
        submission_id: Number(subId),
        status: targetStatus,
        marks: totalMarks,
        marks_breakdown: breakdown,
        code_marks: codeMarks,
        viva_marks: vivaMarks,
        faculty_notes: facultyNotes,
      });

      showToast(
        targetStatus === 'APPROVED'
          ? 'Experiment verified, graded, and signed successfully!'
          : 'Revision requested from student.',
        'success'
      );

      // Refresh details
      await fetchSubmissionDetails();
    } catch (err) {
      console.error(err);
      showToast('Failed to save experiment evaluation.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetAllocation = () => {
    setShowResetConfirm(true);
  };

  const executeResetAllocation = async () => {
    setShowResetConfirm(false);
    if (!student?.id || !exp?.id) return;

    try {
      await api.post('/lab-incharge/student-allocation/reset', {
        student_id: student.id,
        course_id: course.id || exp.course_id || 1,
        experiment_id: exp.id,
      });
      showToast('Question variant reset. Student will receive a new random question variant on next launch.', 'success');
      fetchSubmissionDetails();
    } catch (err) {
      console.error(err);
      showToast('Failed to reset question allocation.', 'error');
    }
  };

  const copyToClipboard = (text, isRef = false) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isRef) {
      setCopiedRefCode(true);
      setTimeout(() => setCopiedRefCode(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Parse student procedure steps
  const studentProcedureSteps = useMemo(() => {
    const raw = sub?.student_procedure;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return raw.split('\n').filter((l) => l.trim().length > 0);
    }
  }, [sub?.student_procedure]);

  // Parse reference algorithm steps
  const referenceAlgoSteps = useMemo(() => {
    const raw = subDetail?.reference_algo || question?.reference_algorithm;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return raw.split('\n').filter((l) => l.trim().length > 0);
    }
  }, [subDetail?.reference_algo, question?.reference_algorithm]);

  // Grade badge helper
  const getGradeInfo = (pct) => {
    if (pct >= 90) return { label: 'Outstanding (O)', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' };
    if (pct >= 80) return { label: 'Excellent (A+)', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' };
    if (pct >= 70) return { label: 'Very Good (A)', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' };
    if (pct >= 60) return { label: 'Good (B+)', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' };
    if (pct >= 50) return { label: 'Satisfactory (B)', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' };
    return { label: 'Needs Revision (F)', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30' };
  };

  const isApproved = sub?.status === 'APPROVED';
  const isRevision = sub?.status === 'REVISION_REQUIRED';
  const isPendingViva = sub?.status === 'SUBMITTED_FOR_VERIFICATION';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
        <p className="text-sm font-semibold text-[var(--text-secondary)]">Loading student evaluation workspace...</p>
      </div>
    );
  }

  if (error || !subDetail) {
    return (
      <div className="panel-card p-12 text-center max-w-xl mx-auto space-y-4 my-8">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-[var(--text-primary)]">Evaluation Not Found</h2>
        <p className="text-xs text-[var(--text-secondary)]">{error || 'Could not load submission data.'}</p>
        <button
          type="button"
          onClick={() => navigate('/faculty/labs/evaluation')}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Evaluation Queue
        </button>
      </div>
    );
  }

  const gradeInfo = getGradeInfo(percentage);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-2xl border text-xs font-semibold transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-800'
              : 'bg-emerald-950 text-emerald-200 border-emerald-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Breadcrumb & Return Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/faculty/labs/evaluation')}
            className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-sm group"
            title="Return to Evaluation Queue"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Link to="/faculty/labs" className="hover:text-[var(--accent)] transition-colors">
                Lab Dashboard
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link to="/faculty/labs/evaluation" className="hover:text-[var(--accent)] transition-colors">
                Evaluation Queue
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[var(--text-primary)] font-semibold">{student?.name || 'Student'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2 mt-0.5">
              Experiment Evaluation & Viva Voce
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleResetAllocation}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-600 bg-[var(--bg-card)] border border-[var(--border)] hover:border-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Re-draw a different random question variant for this student"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Re-assign Variant
          </button>
        </div>
      </div>

      {/* Student & Experiment Comprehensive Info Banner */}
      <div className="panel-card p-5 sm:p-6 bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-raised)] border border-[var(--border)] rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Student Profile Info */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] border-2 border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] font-bold text-xl shrink-0 shadow-inner">
              {student?.name?.charAt(0) || 'S'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  {student?.name || 'Student Name'}
                </h2>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-[var(--bg-input)] text-[var(--accent)] border border-[var(--border)]">
                  {student?.roll_no || '—'}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]">
                  Sec {student?.section || 'A'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2 flex-wrap">
                <span>{student?.department || 'Department of Computer Science'}</span>
                {student?.email && <span>• {student.email}</span>}
                {course?.course_code && (
                  <span className="font-medium text-[var(--text-primary)]">
                    • {course.course_code} ({course.title})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Submission Status & KPI Badges */}
          <div className="flex items-center gap-3 flex-wrap lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-[var(--border)]">
            <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">
                Assigned Experiment
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-[var(--accent)]">
                  Exp {exp?.experiment_no || 1}
                </span>
                {question?.question_code && (
                  <span className="font-mono text-xs px-1.5 py-0.2 rounded bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]">
                    {question.question_code}
                  </span>
                )}
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">
                Test Cases
              </span>
              <span className={`font-mono text-xs font-bold flex items-center gap-1 ${
                sub.pass_count === sub.total_test_cases && sub.total_test_cases > 0
                  ? 'text-emerald-500'
                  : 'text-amber-500'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {sub?.pass_count || 0} / {sub?.total_test_cases || 0} Passed
              </span>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">
                Verification State
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold ${
                  isApproved
                    ? 'text-emerald-500'
                    : isPendingViva
                    ? 'text-indigo-500'
                    : isRevision
                    ? 'text-rose-500'
                    : 'text-amber-500'
                }`}
              >
                {isApproved ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Approved ({sub.marks || totalMarks}/100)
                  </>
                ) : isPendingViva ? (
                  <>
                    <MessageSquareCheck className="w-3.5 h-3.5" />
                    Viva Voce Pending
                  </>
                ) : isRevision ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    Revision Requested
                  </>
                ) : (
                  sub.status || 'SUBMITTED'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Experiment Title and Aim Callout */}
        <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Experiment Title
            </span>
            <strong className="text-sm font-bold text-[var(--text-primary)]">
              {question?.title || exp?.title || 'Practical Lab Experiment'}
            </strong>
          </div>
          {(question?.aim || exp?.aim) && (
            <p className="text-xs text-[var(--text-secondary)] italic max-w-2xl line-clamp-2 md:text-right">
              Aim: {question?.aim || exp?.aim}
            </p>
          )}
        </div>
      </div>

      {/* Main 2-Column Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Multi-tab Content Explorer (Viva, Code, Algo, Problem Statement) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Tab Navigation Pill Bar */}
          <div className="panel-card p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('problem')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'problem'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Problem Description & I/O
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'code'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Code2 className="w-4 h-4" />
              Code & Solution Comparison
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('algo')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'algo'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <ListPlus className="w-4 h-4" />
              Algorithm & Procedure Steps
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('viva')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'viva'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <MessageSquareCheck className="w-4 h-4" />
              Oral Viva Voce ({vivaQuestions.length})
            </button>
          </div>

          {/* TAB 1: PROBLEM DESCRIPTION & I/O */}
          {activeTab === 'problem' && (
            <div className="panel-card p-6 space-y-5 rounded-2xl animate-in fade-in duration-200">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {question?.title || exp?.title}
                </h3>
                {question?.aim && (
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic bg-[var(--bg-raised)] p-3 rounded-xl border border-[var(--border)]">
                    <strong className="text-[var(--text-primary)] not-italic">Aim: </strong>
                    {question.aim}
                  </p>
                )}
              </div>

              {question?.description && (
                <div className="space-y-1.5 text-xs">
                  <h4 className="font-bold text-[var(--text-primary)]">Problem Statement & Description</h4>
                  <div className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                    {question.description}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {question?.input_format && (
                  <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Input Format
                    </span>
                    <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{question.input_format}</p>
                  </div>
                )}

                {question?.output_format && (
                  <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Output Format
                    </span>
                    <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{question.output_format}</p>
                  </div>
                )}
              </div>

              {(question?.sample_input || question?.sample_output) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] space-y-1.5 font-mono text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Sample Input
                    </span>
                    <pre className="text-[var(--text-primary)] whitespace-pre-wrap overflow-x-auto">
                      {question.sample_input || 'N/A'}
                    </pre>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] space-y-1.5 font-mono text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Sample Output
                    </span>
                    <pre className="text-[var(--text-primary)] whitespace-pre-wrap overflow-x-auto">
                      {question.sample_output || 'N/A'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CODE & SOLUTION COMPARISON */}
          {activeTab === 'code' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Student Submitted Code */}
                <div className="panel-card flex flex-col rounded-2xl overflow-hidden border border-[var(--border)]">
                  <div className="px-4 py-3 bg-[var(--bg-raised)] border-b border-[var(--border)] text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-[var(--accent)]" />
                      <span>Student Submitted Code</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)]">
                        {sub?.language || 'python'}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(sub?.submitted_code, false)}
                        className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
                        title="Copy student code"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 bg-[var(--bg-input)] p-4 overflow-x-auto max-h-[500px]">
                    <pre className="text-xs font-mono text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                      {sub?.submitted_code || '# No code submitted by student.'}
                    </pre>
                  </div>
                </div>

                {/* Faculty Master Reference Solution */}
                <div className="panel-card flex flex-col rounded-2xl overflow-hidden border border-[var(--border)]">
                  <div className="px-4 py-3 bg-[var(--bg-raised)] border-b border-[var(--border)] text-xs font-bold text-emerald-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Master Reference Solution (Faculty)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                        Verified Reference
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(referenceSolution, true)}
                        className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
                        title="Copy reference code"
                      >
                        {copiedRefCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 bg-[var(--bg-input)] p-4 overflow-x-auto max-h-[500px]">
                    <pre className="text-xs font-mono text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                      {referenceSolution || '# No reference solution configured for this question.'}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Automated Test Execution Summary Card */}
              <div className="panel-card p-5 space-y-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[var(--accent)]" />
                    Automated Test Execution Summary
                  </h3>
                  <span className="font-mono text-xs font-bold text-[var(--text-secondary)]">
                    Pass Rate: {sub?.total_test_cases > 0 ? Math.round(((sub.pass_count || 0) / sub.total_test_cases) * 100) : 0}%
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] flex items-center justify-between gap-4 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--text-secondary)]">
                      Passed: <strong className="text-emerald-500">{sub?.pass_count || 0}</strong> / {sub?.total_test_cases || 0} Tests
                    </span>
                    {sub?.execution_time_ms !== undefined && (
                      <span className="text-[var(--text-muted)]">• Exec Time: {sub.execution_time_ms}ms</span>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    sub.pass_count === sub.total_test_cases && sub.total_test_cases > 0
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  }`}>
                    {sub.pass_count === sub.total_test_cases && sub.total_test_cases > 0
                      ? 'All Test Cases Passed'
                      : 'Partial / Failing Tests'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ALGORITHM & PROCEDURE STEPS */}
          {activeTab === 'algo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
              {/* Student Steps */}
              <div className="panel-card p-5 space-y-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <ListPlus className="w-4 h-4 text-[var(--accent)]" />
                    Student Submitted Procedure Steps
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {studentProcedureSteps.length} Steps
                  </span>
                </div>

                <div className="space-y-2.5">
                  {studentProcedureSteps.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--text-muted)] italic border border-dashed border-[var(--border)] rounded-xl">
                      No procedure steps submitted by student.
                    </div>
                  ) : (
                    studentProcedureSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-1"
                      >
                        <span className="text-[10px] font-bold font-mono text-[var(--accent)] block">
                          Step {idx + 1}
                        </span>
                        <p className="leading-relaxed font-sans">{step}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Reference Algorithm */}
              <div className="panel-card p-5 space-y-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-emerald-600 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Faculty Reference Algorithm Steps
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {referenceAlgoSteps.length} Steps
                  </span>
                </div>

                <div className="space-y-2.5">
                  {referenceAlgoSteps.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--text-muted)] italic border border-dashed border-[var(--border)] rounded-xl">
                      No reference algorithm steps configured.
                    </div>
                  ) : (
                    referenceAlgoSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-1"
                      >
                        <span className="text-[10px] font-bold font-mono text-emerald-600 block">
                          Standard Step {idx + 1}
                        </span>
                        <p className="leading-relaxed font-sans">{step}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ORAL VIVA VOCE QUESTIONS */}
          {activeTab === 'viva' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1.5 shadow-sm">
                <div className="font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400 text-sm">
                  <MessageSquareCheck className="w-4 h-4" />
                  Oral Viva Voce Instructions for Faculty
                </div>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  Ask the student the questions below verbally to verify conceptual understanding, logic formulation, algorithmic complexity, and problem-solving depth against the verified model answers. Award oral viva marks in the grading cockpit on the right.
                </p>
              </div>

              {vivaQuestions.length === 0 ? (
                <div className="panel-card p-12 text-center text-xs text-[var(--text-muted)] italic space-y-2">
                  <MessageSquareCheck className="w-8 h-8 mx-auto opacity-40" />
                  <p>No viva questions configured for this question variant.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vivaQuestions.map((vq, idx) => (
                    <div
                      key={idx}
                      className="panel-card p-5 space-y-3 hover:border-[var(--accent)]/50 transition-all rounded-2xl"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold text-[var(--accent)] px-2.5 py-0.5 rounded-md bg-[var(--accent-dim)] border border-[var(--border-accent)]">
                          Viva Question #{idx + 1}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          Conceptual Viva
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                        {vq.question}
                      </h3>

                      <div className="p-4 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1 text-xs">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                          Model Reference Answer:
                        </span>
                        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed font-sans">
                          {vq.answer}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Rubric Scoring & Sign-Off Cockpit */}
        <div className="lg:col-span-4 space-y-5">
          {/* Main Scoring Card */}
          <div className="panel-card p-5 space-y-5 rounded-2xl shadow-sm border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Evaluation Rubric Scoring
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-[var(--accent)]">
                Max 100 Marks
              </span>
            </div>

            {/* Quick Fill Presets */}
            <div className="flex items-center justify-between gap-1.5 text-[11px]">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Presets:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePresetFill('full')}
                  className="px-2 py-0.5 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-emerald-500 border border-[var(--border)] transition cursor-pointer"
                >
                  Full (100)
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetFill('pass')}
                  className="px-2 py-0.5 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-blue-500 border border-[var(--border)] transition cursor-pointer"
                >
                  Pass (50)
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetFill('clear')}
                  className="px-2 py-0.5 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-rose-500 border border-[var(--border)] transition cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Rubric Criteria List Inputs */}
            <div className="space-y-3.5">
              {rubricList.map((crit) => {
                const maxM = Number(crit.max_marks) || 0;
                const currentVal = marksState[crit.key] !== undefined ? marksState[crit.key] : '';

                return (
                  <div
                    key={crit.key}
                    className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] hover:border-[var(--accent)]/40 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-[var(--text-primary)] block">
                          {crit.label}
                        </label>
                        <span className="text-[10px] text-[var(--text-muted)] leading-tight block">
                          {crit.description}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min="0"
                          max={maxM}
                          value={currentVal}
                          onChange={(e) => handleMarkChange(crit.key, maxM, e.target.value)}
                          placeholder="0"
                          className="w-14 text-center font-mono font-bold text-xs py-1.5 px-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-all"
                        />
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                          / {maxM}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grand Total Score Live Summary Callout */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-raised)] border-2 border-[var(--border-accent)] space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                    Total Evaluated Score
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-[var(--accent)] font-mono">
                      {totalMarks}
                    </span>
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      / {maxPossibleMarks || 100} Marks
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${gradeInfo.color}`}>
                    {gradeInfo.label}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] block mt-1">
                    {percentage}% Aggregate
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[var(--bg-input)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className={`h-full transition-all duration-300 ${
                    percentage >= 80
                      ? 'bg-emerald-500'
                      : percentage >= 50
                      ? 'bg-[var(--accent)]'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
              </div>
            </div>

            {/* Faculty Notes & Feedback */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>Faculty Remarks & Verification Notes</span>
                <span className="text-[10px] text-[var(--text-muted)] font-normal">Official Record</span>
              </label>
              <textarea
                value={facultyNotes}
                onChange={(e) => setFacultyNotes(e.target.value)}
                placeholder="Enter feedback or viva notes for the student..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all resize-none font-sans"
              />
            </div>

            {/* Sign-Off & Verification Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveEvaluation('APPROVED')}
                className="w-full py-3 px-4 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Award className="w-4 h-4" />
                {submitting ? 'Saving & Signing...' : 'Approve, Grade & Sign Record'}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveEvaluation('REVISION_REQUIRED')}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <AlertCircle className="w-4 h-4" />
                Request Student Revision
              </button>
            </div>

            {/* Verification Timestamp Seal if approved */}
            {isApproved && sub?.verified_at && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-700 dark:text-emerald-400 space-y-1 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Digitally Certified & Signed</strong>
                  <span>
                    Verified on {new Date(sub.verified_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Question Variant Reset Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={executeResetAllocation}
        title="Re-assign Question Variant"
        message={`Are you sure you want to re-assign a new random question variant for student ${student?.name || 'this student'}?`}
        confirmText="Reset & Re-assign"
        variant="warning"
      />
    </div>
  );
}
