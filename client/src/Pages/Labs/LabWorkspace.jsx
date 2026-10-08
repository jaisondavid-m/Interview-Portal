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
  ChevronDown,
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
  Maximize2,
  Minimize2,
  ShieldAlert,
  AlertTriangle,
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

  // Assessment Proctoring & Tab Switch Tracking
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const lastSwitchTimeRef = useRef(0);

  // Execution Console State: 'testcases' | 'custom'
  const [consoleTab, setConsoleTab] = useState('testcases');
  const [customInput, setCustomInput] = useState('');
  const [customResult, setCustomResult] = useState(null);
  const [runningCustom, setRunningCustom] = useState(false);
  const [expandedCases, setExpandedCases] = useState({});

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
        setTabSwitchCount(sub.tab_switch_count || 0);
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
        setTabSwitchCount(0);
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

  // ── Assessment Mode & Tab Switch Monitoring ─────────────────────────────────
  const enterAssessmentMode = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
      setShowFullscreenModal(false);
      showToast('Assessment Mode active in Fullscreen. Tab switches are monitored.', 'success');
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
      showToast('Please grant fullscreen permission to enter assessment mode.', 'error');
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  const recordTabSwitch = async (reason = 'Tab switch or window blur') => {
    if (isSubmittedOrApproved || !isUnlocked) return;
    const now = Date.now();
    if (now - lastSwitchTimeRef.current < 2500) return; // 2.5s debounce
    lastSwitchTimeRef.current = now;

    setTabSwitchCount((prev) => {
      const nextCount = prev + 1;
      showToast(`⚠️ Warning: Tab switch / focus loss detected! (Total: ${nextCount}). Recorded for faculty evaluation.`, 'error');
      return nextCount;
    });

    try {
      const res = await api.post(`/labs/experiment/${expId}/tab-switch`);
      if (res?.tab_switch_count !== undefined) {
        setTabSwitchCount(res.tab_switch_count);
      }
    } catch (err) {
      console.warn('Failed to record tab switch:', err);
    }
  };

  // Fullscreen and Tab Switch Event Listeners
  useEffect(() => {
    if (isSubmittedOrApproved || !isUnlocked || loading) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordTabSwitch('Tab switched / window hidden');
      }
    };

    const handleBlur = () => {
      recordTabSwitch('Focus lost / window blurred');
    };

    const handleFullscreenChange = () => {
      const inFs = Boolean(document.fullscreenElement);
      setIsFullscreen(inFs);
      if (!inFs && !isSubmittedOrApproved) {
        recordTabSwitch('Exited fullscreen mode');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Auto-prompt fullscreen when entering active unsubmitted workspace
    if (!document.fullscreenElement && !isSubmittedOrApproved) {
      setShowFullscreenModal(true);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isSubmittedOrApproved, isUnlocked, loading, expId]);

  // ── Auto-save code & progress and Submit when assessment window time ends ──────
  const triggerAutoSubmitAndExit = async () => {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    setIsAutoSubmitting(true);
    setAutoSubmitStep('Scheduled assessment time ended. Saving your algorithm steps...');

    try {
      // 1. Auto-save procedure steps to DB
      try {
        await api.post(`/labs/experiment/${expId}/procedure`, {
          procedure: JSON.stringify(procedureStepsRef.current || [], null, 2),
        });
      } catch (err) {
        console.warn('Auto-save procedure step failed:', err);
      }

      // 2. Auto-evaluate and save Code to DB
      setAutoSubmitStep('Evaluating and saving code progress to database...');
      try {
        await api.post(`/labs/experiment/${expId}/submit`, {
          code: codeRef.current || '# Saved upon window expiry',
          language: languageRef.current || 'python',
        });
      } catch (err) {
        console.warn('Auto-submit code execution failed:', err);
      }

      // 3. Auto-submit for faculty verification (Registers attempt)
      setAutoSubmitStep('Submitting assessment for faculty verification (Attempt recorded)...');
      try {
        await api.post(`/labs/experiment/${expId}/finish`, {});
      } catch (err) {
        console.warn('Auto-finish verification failed:', err);
      }

      setAutoSubmitStep('Assessment submitted successfully! Redirecting to Practical Labs...');
      setTimeout(() => {
        navigate('/labs', { replace: true });
      }, 1400);
    } catch (e) {
      setAutoSubmitStep('Timing expired. Redirecting to Practical Labs...');
      setTimeout(() => {
        navigate('/labs', { replace: true });
      }, 1000);
    }
  };

  // ── Real-time Countdown Timer Effect ────────────────────────────────────────
  useEffect(() => {
    // Only run live countdown if experiment is unlocked, has an ends_at in the future, and not submitted
    if (!isUnlocked || !accessStatus?.ends_at || isSubmittedOrApproved || isAutoSubmitting) {
      setTimeLeft(null);
      return;
    }

    const endsAtMs = new Date(accessStatus.ends_at).getTime();
    if (isNaN(endsAtMs)) return;

    // If already expired at mount time, do not trigger auto-submit loop
    const initialDiff = Math.floor((endsAtMs - Date.now()) / 1000);
    if (initialDiff <= 0) {
      setTimeLeft(0);
      return;
    }

    setTimeLeft(initialDiff);

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

    const interval = setInterval(() => {
      const remaining = checkTimeRemaining();
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [accessStatus?.ends_at, isUnlocked, isSubmittedOrApproved, isAutoSubmitting]);

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
      setConsoleTab('testcases');
      const res = await api.post(`/labs/experiment/${expId}/run`, { code, language });
      setRunResult(res);
      setTestResult(null);
      // Auto-expand all cases so student sees inputs, expected output, and actual output
      const newExpanded = {};
      (res?.results || []).forEach((_, idx) => {
        newExpanded[idx] = true;
      });
      setExpandedCases(newExpanded);
      showToast(`Sample test executed: ${res.pass_count}/${res.total_test_cases} passed.`, 'success');
    } catch (err) {
      setError(err.response?.data?.error || 'Execution failed. Please check syntax.');
    } finally {
      setRunning(false);
    }
  };

  // 2. Run with Custom Standard Input (stdin)
  const handleRunCustom = async () => {
    try {
      setRunningCustom(true);
      setError('');
      setConsoleTab('custom');
      const res = await api.post(`/labs/experiment/${expId}/run`, {
        code,
        language,
        use_custom: true,
        custom_input: customInput,
      });
      setCustomResult(
        res?.custom_result ||
          res?.results?.[0] || {
            actual: res?.custom_output || '(No output produced)',
            execution_ms: 0,
          }
      );
      showToast('Custom input executed!', 'success');
    } catch (err) {
      setError(err.response?.data?.error || 'Custom execution failed. Please check syntax.');
    } finally {
      setRunningCustom(false);
    }
  };

  // 3. Submit against hidden test cases (grading evaluation)
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      setConsoleTab('testcases');
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
      setRunResult(null);
      if (res.submission) setSubmission(res.submission);
      const newExpanded = {};
      (res?.results || []).forEach((_, idx) => {
        newExpanded[idx] = true;
      });
      setExpandedCases(newExpanded);
      showToast(`Hidden test cases evaluated: ${res.pass_count}/${res.total_test_cases} passed!`, 'success');
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Finish and send for Faculty Verification & Oral Viva
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
  const activeResults = testResult?.results || runResult?.results || [];
  const allExecutedCases = activeResults.map((res, i) => {
    const isHidden = Boolean(res.is_hidden || res.isHidden);
    return {
      index: i,
      name: res.name || (isHidden ? `Hidden Case ${i + 1}` : `Sample Case ${i + 1}`),
      passed: Boolean(res.passed),
      execution_ms: res.execution_ms,
      input: res.input,
      expected: res.expected,
      actual: res.actual,
      isSample: !isHidden,
      isHidden: isHidden,
    };
  });
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
    <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--bg)]">
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
        {/* Left: Back (only when submitted/approved) + Experiment & Locked Question Variant */}
        <div className="flex items-center gap-3 min-w-0">
          {isSubmittedOrApproved && (
            <button
              onClick={() => navigate('/labs', { replace: true })}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
              Back
            </button>
          )}
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
              title="Window Time Remaining (Saves progress and exits upon completion)"
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

          {/* Proctoring & Tab Switch Badge */}
          {!isSubmittedOrApproved && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold border transition-all ${
                tabSwitchCount > 0
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
              }`}
              title={
                tabSwitchCount > 0
                  ? `${tabSwitchCount} tab switch(es) / focus loss events detected and recorded for faculty review.`
                  : 'Assessment Mode Active — 0 tab switches detected.'
              }
            >
              {tabSwitchCount > 0 ? (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{tabSwitchCount > 0 ? `${tabSwitchCount} Tab ${tabSwitchCount === 1 ? 'Switch' : 'Switches'}` : 'Proctored'}</span>
            </div>
          )}

          {/* Assessment Fullscreen Toggle Button */}
          {!isSubmittedOrApproved && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold border transition-all cursor-pointer ${
                isFullscreen
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'
              }`}
              title={isFullscreen ? 'Exit Full Screen Mode' : 'Enter Full Screen Assessment Mode'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Launch Fullscreen</span>
                </>
              )}
            </button>
          )}

          {/* Submission Status Pill (Only for finalized/pending verification states) */}
          {submission?.status && ['APPROVED', 'SUBMITTED_FOR_VERIFICATION', 'REVISION_REQUESTED'].includes(submission.status) && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                submission.status === 'APPROVED'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                  : submission.status === 'SUBMITTED_FOR_VERIFICATION'
                  ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
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
                  Verification Pending
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                  Revision Requested
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
            title="Finish experiment and submit for faculty verification"
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
              <strong>Experiment Submitted for Verification:</strong> Your solution has been submitted and is awaiting faculty verification.
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
            <span className="text-[11px] font-mono text-[var(--accent)] font-bold">Verification Pending</span>
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

      {/* Revision Requested Notice Banner */}
      {submission?.status === 'REVISION_REQUESTED' && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-amber-800 dark:text-amber-200 text-xs shrink-0 flex-wrap">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Faculty Requested Revision:</strong>{' '}
              {submission.faculty_notes || 'Please correct your code/procedure and send for re-verification.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-500/30 text-amber-900 dark:text-amber-100 font-bold">
              Revision Round (Attempts Protected: #{submission.attempt_count || 1})
            </span>
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
                    <li>Click <strong>"Finish & Send for Verification"</strong> to lock your submission and send for faculty verification.</li>
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
          <div className="h-64 sm:h-72 bg-[var(--bg-card)] border-t border-[var(--border)] flex flex-col overflow-hidden shadow-lg">
            {/* Drawer Header & Tabs */}
            <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between shrink-0 gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setConsoleTab('testcases')}
                  className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    consoleTab === 'testcases'
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Test Cases</span>
                  {totalCasesCount > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                        totalPassedCount === totalCasesCount
                          ? 'bg-emerald-500/20 text-emerald-600'
                          : 'bg-rose-500/20 text-rose-600'
                      }`}
                    >
                      {totalPassedCount}/{totalCasesCount} passed
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setConsoleTab('custom')}
                  className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    consoleTab === 'custom'
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Custom Input</span>
                  {customResult && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>
              </div>

              <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-2">
                {consoleTab === 'testcases' && allExecutedCases.some((c) => !c.isHidden) && (
                  <button
                    type="button"
                    onClick={() => {
                      const sampleIndices = allExecutedCases
                        .map((c, idx) => (!c.isHidden ? idx : null))
                        .filter((idx) => idx !== null);
                      const allOpen = sampleIndices.every((idx) => expandedCases[idx] !== false);
                      const updated = { ...expandedCases };
                      sampleIndices.forEach((idx) => {
                        updated[idx] = !allOpen;
                      });
                      setExpandedCases(updated);
                    }}
                    className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    {allExecutedCases
                      .map((c, idx) => (!c.isHidden ? idx : null))
                      .filter((idx) => idx !== null)
                      .every((idx) => expandedCases[idx] !== false)
                      ? 'Collapse All'
                      : 'Expand All'}
                  </button>
                )}
                <span>Execution Output</span>
              </div>
            </div>

            {/* Console Drawer Body */}
            <div className="p-3 overflow-y-auto flex-1 font-mono text-[11px] space-y-2.5 custom-scrollbar">
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-[var(--radius-sm)] bg-[var(--red-bg)] border border-[var(--red)]/20 text-[var(--red)]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {consoleTab === 'testcases' ? (
                allExecutedCases.length === 0 && !error ? (
                  <div className="text-[var(--text-muted)] italic p-3 flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-[var(--accent)] opacity-60" />
                    Click &quot;Run Code&quot; or &quot;Submit Code&quot; to view detailed inputs, expected outputs, and your actual program outputs.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allExecutedCases.map((res, i) => {
                      const isExpanded = !res.isHidden && expandedCases[i] !== false; // expanded by default for sample cases
                      const hasOutput = res.actual !== undefined && res.actual !== null;

                      return (
                        <div
                          key={i}
                          className={`rounded-[var(--radius-md)] border overflow-hidden transition-all shadow-sm ${
                            res.passed
                              ? 'bg-emerald-500/5 border-emerald-500/30'
                              : 'bg-rose-500/5 border-rose-500/30'
                          }`}
                        >
                          {/* Test Case Header Bar */}
                          <div
                            onClick={() => {
                              if (!res.isHidden) {
                                setExpandedCases((prev) => ({
                                  ...prev,
                                  [i]: !isExpanded,
                                }));
                              }
                            }}
                            className={`px-3 py-2 flex items-center justify-between transition select-none ${
                              res.isHidden
                                ? 'cursor-default'
                                : 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {res.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              )}
                              <span
                                className={`font-bold text-xs ${
                                  res.passed ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {res.name} — {res.passed ? 'PASSED' : 'FAILED'}
                              </span>
                              {res.isSample && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)]">
                                  Sample
                                </span>
                              )}
                              {res.isHidden && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)]">
                                  Hidden
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3" />
                                {res.execution_ms || 0} ms
                              </span>
                              {!res.isHidden && (
                                isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                )
                              )}
                            </div>
                          </div>

                          {/* Expanded Input / Expected Output / Actual Output Details (Sample cases only) */}
                          {!res.isHidden && isExpanded && (
                            <div className="p-3 pt-1 border-t border-[var(--border)]/40 space-y-2 bg-[var(--bg-card)]/60">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] font-mono">
                                {/* Input Box */}
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                                    Input (stdin):
                                  </span>
                                  <pre className="p-2 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] whitespace-pre-wrap max-h-28 overflow-y-auto leading-relaxed custom-scrollbar">
                                    {res.input ? res.input : <span className="italic text-[var(--text-muted)]">(No input required)</span>}
                                  </pre>
                                </div>

                                {/* Expected Output Box */}
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                                    Expected Output:
                                  </span>
                                  <pre className="p-2 rounded bg-[var(--bg-input)] border border-emerald-500/30 text-emerald-600 font-bold whitespace-pre-wrap max-h-28 overflow-y-auto leading-relaxed custom-scrollbar">
                                    {res.expected ? res.expected : <span className="italic text-[var(--text-muted)]">(None specified)</span>}
                                  </pre>
                                </div>

                                {/* Your Program Output Box */}
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                                    Your Program Output (stdout):
                                  </span>
                                  <pre
                                    className={`p-2 rounded bg-[var(--bg-input)] border whitespace-pre-wrap max-h-28 overflow-y-auto leading-relaxed custom-scrollbar ${
                                      res.passed
                                        ? 'border-emerald-500/30 text-emerald-600 font-semibold'
                                        : 'border-rose-500/30 text-rose-500 font-semibold'
                                    }`}
                                  >
                                    {hasOutput && res.actual !== '' ? (
                                      res.actual
                                    ) : (
                                      <span className="italic text-rose-400">(No output produced / empty stdout)</span>
                                    )}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* TAB 2: Custom Input & Output Runner */
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Enter any custom input values below and click &quot;Run with Custom Input&quot; to test your code execution and see the exact program output.
                    </p>
                    <button
                      type="button"
                      onClick={handleRunCustom}
                      disabled={runningCustom || !isUnlocked || isSubmittedOrApproved}
                      className="px-3.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110 shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto shrink-0"
                    >
                      {runningCustom ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-white text-white" />
                      )}
                      Run with Custom Input
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Custom Stdin Box */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                        Custom Input (stdin)
                      </label>
                      <textarea
                        rows={4}
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Enter custom input values (e.g. 25.0 3 \n 20.5 26.3 25.0)..."
                        className="w-full font-mono text-[11px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] p-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] resize-none"
                      />
                    </div>

                    {/* Custom Output Box */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                          Program Output (stdout / stderr)
                        </label>
                        {customResult?.execution_ms !== undefined && (
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            {customResult.execution_ms} ms
                          </span>
                        )}
                      </div>
                      <div className="w-full h-[88px] font-mono text-[11px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] p-2.5 text-[var(--text-primary)] overflow-y-auto whitespace-pre-wrap custom-scrollbar">
                        {customResult ? (
                          customResult.actual || <span className="text-[var(--text-muted)] italic">(No output produced)</span>
                        ) : (
                          <span className="text-[var(--text-muted)] italic">
                            Enter custom input and click &quot;Run with Custom Input&quot; to view program stdout output here.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
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

      {/* Assessment Mode Fullscreen Launch Modal */}
      {showFullscreenModal && !isFullscreen && !isSubmittedOrApproved && !loading && isUnlocked && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500 mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Assessment Proctoring Mode
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                This practical lab assessment requires <strong>Full Screen Mode</strong>. Browser tab switching, window minimization, or exiting full screen will be recorded as a tab switch infraction for faculty verification.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-left text-xs space-y-1.5 font-mono text-[var(--text-muted)]">
              <div className="flex items-center gap-2 text-emerald-500 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Active window focus monitoring</span>
              </div>
              <div className="flex items-center gap-2 text-amber-500 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Tab switches reported live to examiner</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={enterAssessmentMode}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Launch Full Screen Assessment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Save Progress & Exit Overlay when Window Timing Expires */}
      {isAutoSubmitting && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 animate-pulse text-rose-600" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Timing Expired — Progress Saved
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                The scheduled experiment window has closed. All your written code and algorithm steps have been saved safely to your draft. When your faculty incharge unlocks or extends the window, you can resume right where you left off.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] flex items-center justify-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {autoSubmitStep}
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/labs', { replace: true })}
              className="w-full py-2.5 px-4 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110 active:scale-[0.98] transition shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Go to Practical Labs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
