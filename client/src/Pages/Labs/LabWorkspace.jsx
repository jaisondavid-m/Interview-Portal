import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  HelpCircle,
  Send,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Lock,
  Unlock,
  Terminal,
  Clock,
  Sparkles,
  ShieldCheck,
  ListPlus,
  Trash2,
  CheckCheck,
  Award,
  MessageSquareCheck,
  Save,
  SlidersHorizontal,
} from 'lucide-react';
import api from '../../api/axios';
import CodeEditor from '../../Components/CodeEditor';
import ConfirmModal from '../../Components/ConfirmModal';
import LabMarkVerticalsModal from '../../Components/LabMarkVerticalsModal';

export default function LabWorkspace() {
  const { courseId = 1, expId = 1 } = useParams();
  const navigate = useNavigate();

  const [experiment, setExperiment] = useState(null);
  const [assignedQuestion, setAssignedQuestion] = useState(null);
  const [courseExperiments, setCourseExperiments] = useState([]);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [procedureSteps, setProcedureSteps] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [accessStatus, setAccessStatus] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [autoSubmitStep, setAutoSubmitStep] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingProcedure, setSavingProcedure] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Synchronized refs for background timer callbacks
  const codeRef = useRef(code);
  const languageRef = useRef(language);
  const procedureStepsRef = useRef(procedureSteps);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    procedureStepsRef.current = procedureSteps;
  }, [procedureSteps]);

  // Left Pane Tabs: 'aim' | 'procedure' | 'testcases'
  const [leftTab, setLeftTab] = useState('aim');

  // Finish Confirmation Modal
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showVerticalsModal, setShowVerticalsModal] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchExperiment();
    fetchCourseExpList();
  }, [courseId, expId]);

  const fetchCourseExpList = async () => {
    try {
      const res = await api.get(`/labs/courses/${courseId}/experiments`);
      setCourseExperiments(res?.experiments || []);
    } catch {
      // Non-blocking
    }
  };

  const fetchExperiment = async () => {
    try {
      setLoading(true);
      setError('');
      setRunResult(null);
      setTestResult(null);
      const res = await api.get(`/labs/experiment/${expId}`);
      const data = res?.experiment;
      const assignedQ = res?.assigned_question;
      const sub = res?.submission;

      setExperiment(data);
      setAssignedQuestion(assignedQ);
      setIsUnlocked(res?.is_unlocked !== false);
      setAccessStatus(res?.access_status || null);

      if (sub) {
        setSubmission(sub);
        if (sub.submitted_code) {
          setCode(sub.submitted_code);
        } else {
          setCode('');
        }
        setLanguage(sub.language || assignedQ?.language || 'python');

        if (sub.student_procedure) {
          try {
            const parsed = JSON.parse(sub.student_procedure);
            if (Array.isArray(parsed)) setProcedureSteps(parsed);
          } catch {
            setProcedureSteps(
              sub.student_procedure.split('\n').filter((l) => l.trim().length > 0)
            );
          }
        } else {
          setProcedureSteps([]);
        }
      } else {
        setCode('');
        setProcedureSteps([]);
        setLanguage(assignedQ?.language || data?.language || 'python');
      }
    } catch (err) {
      setError('Could not load experiment details.');
    } finally {
      setLoading(false);
    }
  };

  const isSubmittedOrApproved =
    submission?.status === 'SUBMITTED_FOR_VERIFICATION' || submission?.status === 'APPROVED';

  // ── Auto-submit and Exit when window time ends ──────────────────────────────
  const triggerAutoSubmitAndExit = async () => {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    setIsAutoSubmitting(true);
    setAutoSubmitStep('Scheduled timing closed. Saving your algorithm steps...');

    try {
      // 1. Auto-save procedure steps
      try {
        await api.post(`/labs/experiment/${expId}/procedure`, {
          procedure: JSON.stringify(procedureStepsRef.current || [], null, 2),
        });
      } catch (err) {
        console.warn('Auto-save procedure step failed:', err);
      }

      // 2. Auto-submit Code for hidden benchmark evaluation
      setAutoSubmitStep('Evaluating code against hidden benchmark test cases...');
      try {
        await api.post(`/labs/experiment/${expId}/submit`, {
          code: codeRef.current || '# Auto-submitted upon window expiry',
          language: languageRef.current || 'python',
        });
      } catch (err) {
        console.warn('Auto-submit code execution failed:', err);
      }

      // 3. Finalize and submit into Faculty Viva Queue
      setAutoSubmitStep('Finalizing experiment & queuing for faculty viva...');
      try {
        await api.post(`/labs/experiment/${expId}/finish`, {});
      } catch (err) {
        console.warn('Auto-finish failed:', err);
      }

      setAutoSubmitStep('Auto-submission completed successfully! Redirecting to Dashboard...');
      setTimeout(() => {
        navigate(`/labs/${courseId}`);
      }, 1800);
    } catch (e) {
      setAutoSubmitStep('Timing expired. Redirecting to Dashboard...');
      setTimeout(() => {
        navigate(`/labs/${courseId}`);
      }, 1500);
    }
  };

  // ── Real-time Countdown Timer Effect ────────────────────────────────────────
  useEffect(() => {
    if (!accessStatus?.ends_at || isSubmittedOrApproved || isAutoSubmitting) {
      setTimeLeft(null);
      return;
    }

    const endsAtMs = new Date(accessStatus.ends_at).getTime();
    if (isNaN(endsAtMs)) return;

    const checkTimeRemaining = () => {
      const now = Date.now();
      const diffSec = Math.floor((endsAtMs - now) / 1000);
      if (diffSec <= 0) {
        setTimeLeft(0);
        triggerAutoSubmitAndExit();
        return 0;
      }
      setTimeLeft(diffSec);
      return diffSec;
    };

    const initialDiff = checkTimeRemaining();
    if (initialDiff <= 0) return;

    const interval = setInterval(() => {
      const remaining = checkTimeRemaining();
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [accessStatus?.ends_at, isSubmittedOrApproved, isAutoSubmitting]);

  const formatTimeRemaining = (seconds) => {
    if (seconds === null || seconds === undefined) return null;
    if (seconds <= 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${hrs}h ${pad(mins)}m ${pad(secs)}s`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // ── Step-by-Step Procedure Helpers ──────────────────────────────────────────
  const handleAddProcedureStep = () => {
    setProcedureSteps((prev) => [
      ...prev,
      '',
    ]);
  };

  const handleEditProcedureStep = (index, value) => {
    const updated = [...procedureSteps];
    updated[index] = value;
    setProcedureSteps(updated);
  };

  const handleDeleteProcedureStep = (index) => {
    const updated = procedureSteps.filter((_, i) => i !== index);
    setProcedureSteps(updated);
  };

  const handleSaveProcedure = async () => {
    try {
      setSavingProcedure(true);
      const res = await api.post(`/labs/experiment/${expId}/procedure`, {
        procedure: JSON.stringify(procedureSteps, null, 2),
      });
      if (res?.submission) setSubmission(res.submission);
      showToast('Step-by-step algorithm saved successfully!', 'success');
    } catch {
      showToast('Failed to save procedure steps.', 'error');
    } finally {
      setSavingProcedure(false);
    }
  };

  // ── Execution Handlers ──────────────────────────────────────────────────────
  // 1. Run against sample test cases (instant feedback only)
  const handleRun = async () => {
    try {
      setRunning(true);
      setError('');
      const res = await api.post(`/labs/experiment/${expId}/run`, { code, language });
      setRunResult(res);
      showToast(`Sample test executed: ${res.pass_count}/${res.total_test_cases} passed.`, 'success');
    } catch (err) {
      setError(err.response?.data?.error || 'Execution failed. Please check syntax.');
    } finally {
      setRunning(false);
    }
  };

  // 2. Submit against hidden test cases (grading evaluation)
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      // Autosave procedure before submit
      await api.post(`/labs/experiment/${expId}/procedure`, {
        procedure: JSON.stringify(procedureSteps, null, 2),
      });

      const res = await api.post(`/labs/experiment/${expId}/submit`, { code, language });
      setTestResult({
        passCount: res.pass_count,
        totalCases: res.total_test_cases,
        status: res.status,
        codeMarks: res.code_marks,
        message: res.message,
        results: res.results,
      });
      if (res.submission) setSubmission(res.submission);
      showToast(`Hidden test cases evaluated: ${res.pass_count}/${res.total_test_cases} passed!`, 'success');
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Finish and send for Faculty Verification & Oral Viva
  const handleFinishAndSend = async () => {
    try {
      setFinishing(true);
      // Autosave procedure
      await api.post(`/labs/experiment/${expId}/procedure`, {
        procedure: JSON.stringify(procedureSteps, null, 2),
      });

      const res = await api.post(`/labs/experiment/${expId}/finish`, {});
      if (res?.submission) setSubmission(res.submission);
      setShowFinishModal(false);
      showToast('Submitted for faculty verification & viva!', 'success');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to submit experiment.', 'error');
    } finally {
      setFinishing(false);
    }
  };

  // Parse sample test cases for left pane
  let sampleTestCases = [];
  try {
    const rawCases = assignedQuestion?.sample_test_cases || experiment?.sample_test_cases;
    if (rawCases) {
      sampleTestCases = JSON.parse(rawCases);
    }
  } catch {}

  // Unified list of executed test cases in order (Sample cases followed by Hidden cases)
  const allExecutedCases = [
    ...(runResult?.results?.map((res, i) => ({
      name: res.name || `Sample Case ${i + 1}`,
      passed: Boolean(res.passed),
      execution_ms: res.execution_ms,
      isSample: true,
    })) || []),
    ...(testResult?.results?.map((res, i) => ({
      name: res.name || `Hidden Case ${i + 1}`,
      passed: Boolean(res.passed),
      execution_ms: res.execution_ms,
      isSample: false,
    })) || []),
  ];
  const totalCasesCount = allExecutedCases.length;
  const totalPassedCount = allExecutedCases.filter((c) => c.passed).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-[var(--text-muted)] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
        <span className="text-sm">Loading lab workspace & question allocation...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[var(--bg)]">
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

      {/* Top Studio Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-card)] border-b border-[var(--border)] shadow-[var(--shadow-sm)] shrink-0 gap-3">
        {/* Left: Back + Experiment & Locked Question Variant */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/labs')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
            Back
          </button>
          <div className="flex items-center gap-2 truncate">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] shrink-0">
              Ex {experiment?.experiment_no || expId}
            </span>
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                {assignedQuestion?.title || experiment?.title}
              </span>
              {assignedQuestion?.question_code && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--accent)] border border-[var(--border)] flex items-center gap-1 shrink-0">
                  <Lock className="w-2.5 h-2.5 text-[var(--accent)]" />
                  {assignedQuestion.question_code} Locked
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Status, Live Countdown Timer, and Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Live Countdown Timer Badge */}
          {timeLeft !== null && !isSubmittedOrApproved && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold border transition-all ${
                timeLeft <= 60
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse'
                  : timeLeft <= 300
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-[var(--bg-input)] text-[var(--text-primary)] border-[var(--border)]'
              }`}
              title="Window Time Remaining (Auto-submits and exits upon completion)"
            >
              <Clock
                className={`w-3.5 h-3.5 ${
                  timeLeft <= 60 ? 'text-rose-600 animate-spin' : timeLeft <= 300 ? 'text-amber-600' : 'text-[var(--accent)]'
                }`}
              />
              <span>{formatTimeRemaining(timeLeft)}</span>
              {timeLeft <= 60 && (
                <span className="text-[10px] uppercase font-bold text-rose-600 ml-0.5">• Ending</span>
              )}
            </div>
          )}

          {/* Submission Status Pill */}
          {submission?.status && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                submission.status === 'APPROVED'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                  : submission.status === 'SUBMITTED_FOR_VERIFICATION'
                  ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30'
                  : submission.status === 'TEST_PASSED'
                  ? 'bg-teal-500/10 text-teal-600 border-teal-500/30'
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
              }`}
            >
              {submission.status === 'APPROVED' ? (
                <>
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  Verified ({submission.marks}/{assignedQuestion?.max_marks || 10} Marks)
                </>
              ) : submission.status === 'SUBMITTED_FOR_VERIFICATION' ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                  In Faculty Viva Queue
                </>
              ) : submission.status === 'TEST_PASSED' ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-teal-600" />
                  Tests Passed (Ready to Finish)
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  In Progress
                </>
              )}
            </span>
          )}

          {/* RUN CODE BUTTON */}
          <button
            onClick={handleRun}
            disabled={running || submitting || !isUnlocked || isSubmittedOrApproved}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-[var(--shadow-sm)]"
            title="Run code against sample test cases for immediate feedback"
          >
            {running ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
            ) : (
              <Play className="w-3.5 h-3.5 text-[var(--accent)] fill-[var(--accent)]" />
            )}
            Run Code
          </button>

          {/* SUBMIT CODE BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={running || submitting || !isUnlocked || isSubmittedOrApproved}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-accent)] text-[var(--accent)] text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-[var(--shadow-sm)]"
            title="Evaluate code against hidden benchmark test cases"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Submit Code
          </button>

          {/* FINISH & SEND FOR VERIFICATION */}
          <button
            onClick={() => setShowFinishModal(true)}
            disabled={running || submitting || !isUnlocked || isSubmittedOrApproved}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 shadow-[var(--shadow-sm)]"
            title="Finish experiment and submit for faculty oral viva evaluation"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Finish & Send for Verification
          </button>
        </div>
      </div>

      {/* In-Queue / Verified Notice Banner */}
      {submission?.status === 'SUBMITTED_FOR_VERIFICATION' && (
        <div className="bg-[var(--accent-dim)] border-b border-[var(--border-accent)] px-4 py-2.5 flex items-center justify-between gap-3 text-[var(--text-primary)] text-xs shrink-0 flex-wrap">
          <div className="flex items-center gap-2 font-medium">
            <MessageSquareCheck className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>
              <strong>Experiment Locked & Sent for Verification:</strong> Please approach your faculty incharge for in-person oral viva evaluation.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowVerticalsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-sm shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              View Mark Verticals
            </button>
            <span className="text-[11px] font-mono text-[var(--accent)] font-bold">Oral Viva Pending</span>
          </div>
        </div>
      )}

      {submission?.status === 'APPROVED' && (
        <div className="bg-[var(--accent-dim)] border-b border-[var(--border-accent)] px-4 py-2.5 flex items-center justify-between gap-3 text-[var(--text-primary)] text-xs shrink-0 flex-wrap">
          <div className="flex items-center gap-2 font-medium">
            <Award className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>
              <strong>Experiment Verified by Lab Incharge!</strong> Total Marks: <strong>{submission.marks}/{assignedQuestion?.max_marks || 100}</strong> (Code: {submission.code_marks || 0}, Viva: {submission.viva_marks || 0}).
              {submission.faculty_notes && <span className="ml-2 italic text-[var(--text-secondary)]">"{submission.faculty_notes}"</span>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowVerticalsModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-sm shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              View Mark Verticals
            </button>
            <span className="text-[11px] font-mono text-[var(--accent)] font-bold">Officially Signed</span>
          </div>
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Problem Statement / Step-by-Step Procedure / Test Cases */}
        <div className="w-[45%] shrink-0 border-r border-[var(--border)] bg-[var(--bg-raised)] flex flex-col overflow-hidden">
          {/* Left Pane Tab Buttons */}
          <div className="flex items-center border-b border-[var(--border)] bg-[var(--bg-card)] px-3 pt-2 gap-2 shrink-0">
            <button
              onClick={() => setLeftTab('aim')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                leftTab === 'aim'
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Aim & Problem
            </button>
            <button
              onClick={() => setLeftTab('procedure')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                leftTab === 'procedure'
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              My Algorithm Steps ({procedureSteps.length})
            </button>
            <button
              onClick={() => setLeftTab('testcases')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                leftTab === 'testcases'
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Sample Test Cases ({sampleTestCases.length})
            </button>
          </div>

          {/* Left Pane Content Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
            {/* TAB 1: Aim & Problem Statement */}
            {leftTab === 'aim' && (
              <div className="space-y-4">
                <div className="bg-[var(--bg-card)] p-4 rounded-[var(--radius-md)] border border-[var(--border)] shadow-[var(--shadow-sm)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[var(--accent)] uppercase tracking-wider">
                      Allocated Problem
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      Max Marks: {assignedQuestion?.max_marks || 10}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {assignedQuestion?.title || experiment?.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                    {assignedQuestion?.aim || experiment?.aim}
                  </p>
                </div>

                <div className="bg-indigo-500/5 p-3.5 rounded-[var(--radius-md)] border border-indigo-500/20 text-xs text-indigo-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-indigo-700">
                    <Sparkles className="w-4 h-4" />
                    Examination Instructions
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    <li>Write your step-by-step algorithmic steps under the <strong>"My Algorithm Steps"</strong> tab.</li>
                    <li>Develop and verify your solution code in the editor.</li>
                    <li>Click <strong>"Run Code"</strong> to test sample cases and <strong>"Submit Code"</strong> for hidden case grading.</li>
                    <li>Click <strong>"Finish & Send for Verification"</strong> to lock your submission and enter the faculty oral viva queue.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 2: Student Step-by-Step Procedure / Algorithm Builder */}
            {leftTab === 'procedure' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">
                      Step-by-Step Algorithmic Procedure
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Write your procedure steps here. Faculty will review these during viva voce.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddProcedureStep}
                      disabled={isSubmittedOrApproved}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] text-xs font-bold hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer disabled:opacity-50"
                    >
                      <ListPlus className="w-3 h-3" /> Add Step
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProcedure}
                      disabled={savingProcedure || isSubmittedOrApproved}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {savingProcedure ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save
                    </button>
                  </div>
                </div>

                {procedureSteps.length === 0 ? (
                  <div className="p-8 text-center bg-[var(--bg-card)] rounded-[var(--radius-md)] border border-dashed border-[var(--border)] space-y-3">
                    <p className="text-xs text-[var(--text-muted)]">
                      No algorithm steps added yet. Click &quot;Add Step&quot; to write your procedure.
                    </p>
                    {!isSubmittedOrApproved && (
                      <button
                        type="button"
                        onClick={handleAddProcedureStep}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110 cursor-pointer shadow-sm"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                        Add First Step
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {procedureSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-sm)]"
                      >
                        <span className="font-mono text-[11px] font-bold text-[var(--accent)] px-2 py-1 rounded bg-[var(--bg-input)] border border-[var(--border)] shrink-0">
                          Step {idx + 1}
                        </span>
                        <textarea
                          rows={2}
                          value={step}
                          onChange={(e) => handleEditProcedureStep(idx, e.target.value)}
                          onPaste={(e) => {
                            e.preventDefault();
                            showToast('Pasting is disabled in exam mode.', 'error');
                          }}
                          onCopy={(e) => {
                            e.preventDefault();
                            showToast('Copying is disabled in exam mode.', 'error');
                          }}
                          onCut={(e) => {
                            e.preventDefault();
                          }}
                          onContextMenu={(e) => e.preventDefault()}
                          disabled={isSubmittedOrApproved}
                          placeholder={`Describe operation in step ${idx + 1}...`}
                          className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2.5 py-1 text-xs text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-[var(--border-accent)] disabled:bg-transparent disabled:border-transparent"
                        />
                        {!isSubmittedOrApproved && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProcedureStep(idx)}
                            className="text-[var(--text-muted)] hover:text-[var(--red)] p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Sample Test Cases */}
            {leftTab === 'testcases' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[var(--text-primary)]">
                  Public Sample Test Cases
                </h3>
                {sampleTestCases.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--text-muted)] italic bg-[var(--bg-card)] rounded-[var(--radius-md)] border border-[var(--border)]">
                    No sample test cases specified. Standard assertions will be evaluated.
                  </div>
                ) : (
                  sampleTestCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="bg-[var(--bg-card)] p-3.5 rounded-[var(--radius-md)] border border-[var(--border)] text-xs font-mono space-y-2 shadow-[var(--shadow-sm)]"
                    >
                      <div className="text-[10px] font-bold text-[var(--accent)] uppercase">
                        Sample Test Case #{idx + 1}
                      </div>
                      {tc.input && (
                        <div className="text-[var(--text-secondary)]">
                          <span className="text-[var(--text-muted)] block text-[10px] uppercase mb-0.5">Input:</span>
                          <pre className="bg-[var(--bg-raised)] p-2 rounded border border-[var(--border)] whitespace-pre-wrap">
                            {tc.input}
                          </pre>
                        </div>
                      )}
                      <div className="text-[var(--text-secondary)]">
                        <span className="text-[var(--text-muted)] block text-[10px] uppercase mb-0.5">Expected Output:</span>
                        <pre className="bg-[var(--bg-raised)] p-2 rounded border border-[var(--border)] font-bold text-emerald-600 whitespace-pre-wrap">
                          {tc.expected_output || tc.expected || 'N/A'}
                        </pre>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Code Editor + Dynamic Interactive Execution Console */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Monaco / CodeEditor */}
          <div className="flex-1 p-2 overflow-hidden">
            <CodeEditor
              code={code}
              onChange={setCode}
              language={language}
              onLanguageChange={setLanguage}
              isEditable={isUnlocked && !isSubmittedOrApproved}
              isLanguageLocked={Boolean(assignedQuestion?.language || experiment?.language)}
              allowCopyPaste={false}
              onCopyPasteBlocked={() => showToast('Copy-paste is disabled in the examination environment.', 'error')}
            />
          </div>

          {/* Interactive Execution Console Drawer */}
          <div className="h-56 bg-[var(--bg-card)] border-t border-[var(--border)] flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                  <Terminal className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-[var(--text-primary)]">Test Cases</span>
                {totalCasesCount > 0 && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                      totalPassedCount === totalCasesCount
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                    }`}
                  >
                    {totalPassedCount}/{totalCasesCount} passed
                  </span>
                )}
              </div>

              <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1.5">
                <span>Execution Output</span>
              </div>
            </div>

            {/* Console Drawer Body */}
            <div className="p-3 overflow-y-auto flex-1 font-mono text-[11px] space-y-2 custom-scrollbar">
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-[var(--radius-sm)] bg-[var(--red-bg)] border border-[var(--red)]/20 text-[var(--red)]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {allExecutedCases.length === 0 && !error ? (
                <div className="text-[var(--text-muted)] italic p-2 flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-[var(--accent)] opacity-60" />
                  Run or submit your code to view test case execution results.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {allExecutedCases.map((res, i) => (
                    <div
                      key={i}
                      className={`px-3 py-2 rounded-[var(--radius-md)] border flex items-center justify-between transition-colors ${
                        res.passed
                          ? 'bg-emerald-500/10 border-emerald-500/20'
                          : 'bg-rose-500/10 border-rose-500/20'
                      }`}
                    >
                      <span
                        className={`font-semibold flex items-center gap-2 ${
                          res.passed ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {res.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>
                          {res.name} - {res.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </span>

                      <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 shrink-0 font-medium">
                        <Clock className="w-3 h-3" />
                        {res.execution_ms || 0} ms
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Finish & Send for Faculty Verification Modal */}
      <ConfirmModal
        isOpen={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        onConfirm={handleFinishAndSend}
        title="Finish Experiment & Send for Faculty Viva?"
        message="Once submitted for verification, your code and algorithm steps will be locked for grading. Your faculty incharge will evaluate your solution and conduct the oral viva voce in person."
        confirmText="Yes, Finish & Send"
        loading={finishing}
      />

      {/* Mark Verticals Modal */}
      <LabMarkVerticalsModal
        isOpen={showVerticalsModal}
        onClose={() => setShowVerticalsModal(false)}
        experiment={experiment}
        course={{ id: courseId }}
        submission={submission}
      />

      {/* Auto-Submitting Fullscreen Overlay when Window Timing Expires */}
      {isAutoSubmitting && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 animate-pulse text-rose-600" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Timing Expired — Auto-Submitting
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                The scheduled experiment window has closed. Your current code and algorithm steps are being automatically evaluated, locked, and submitted.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] flex items-center justify-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {autoSubmitStep}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
