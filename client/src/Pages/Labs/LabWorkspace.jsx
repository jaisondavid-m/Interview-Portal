import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import api from '../../api/axios';
import CodeEditor from '../../Components/CodeEditor';

export default function LabWorkspace() {
  const { courseId = 1, expId = 1 } = useParams();
  const navigate = useNavigate();

  const [experiment, setExperiment] = useState(null);
  const [courseExperiments, setCourseExperiments] = useState([]);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [submission, setSubmission] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');
  const [activeConsoleTab, setActiveConsoleTab] = useState('run'); // 'run' | 'submit'

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
      const sub = res?.submission;
      setExperiment(data);
      setIsUnlocked(res?.is_unlocked !== false);

      if (sub && sub.submitted_code) {
        setSubmission(sub);
        setCode(sub.submitted_code);
        setLanguage(sub.language || data?.language || 'python');
      } else {
        setCode(data?.starter_code || '');
        setLanguage(data?.language || 'python');
      }
    } catch (err) {
      setError('Could not load experiment details.');
    } finally {
      setLoading(false);
    }
  };

  // Run against sample test cases (No submission created)
  const handleRun = async () => {
    try {
      setRunning(true);
      setError('');
      setActiveConsoleTab('run');
      const res = await api.post(`/labs/experiment/${expId}/run`, { code, language });
      setRunResult(res);
    } catch (err) {
      setError(err.response?.data?.error || 'Execution failed. Please verify syntax.');
    } finally {
      setRunning(false);
    }
  };

  // Submit against hidden test cases for grading
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      setActiveConsoleTab('submit');
      const res = await api.post(`/labs/experiment/${expId}/submit`, { code, language });
      setTestResult({
        passCount: res.pass_count,
        totalCases: res.total_test_cases,
        status: res.status,
        marks: res.marks,
        message: res.message,
        results: res.results,
      });
      if (res.submission) setSubmission(res.submission);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Parse sample test cases for left pane
  let sampleTestCases = [];
  try {
    if (experiment?.sample_test_cases) {
      sampleTestCases = JSON.parse(experiment.sample_test_cases);
    }
  } catch {}

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-[var(--text-muted)] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
        <span className="text-sm">Loading lab workspace...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[var(--bg)]">
      {/* Studio Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-card)] border-b border-[var(--border)] shadow-[var(--shadow-sm)] shrink-0 gap-3">
        {/* Left: Back + Experiment label */}
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
            <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
              {experiment?.title}
            </span>
          </div>
        </div>

        {/* Centre: Dynamic Quick Nav for Experiments */}
        <div className="hidden lg:flex items-center gap-1 bg-[var(--bg-input)] p-1 rounded-[var(--radius-sm)] border border-[var(--border)]">
          {courseExperiments.length > 0
            ? courseExperiments.map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => navigate(`/labs/${courseId}/experiment/${exp.id}`)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                    parseInt(expId) === exp.id || parseInt(expId) === exp.experiment_no
                      ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                  title={exp.title}
                >
                  {!exp.is_unlocked && <Lock className="w-2.5 h-2.5 opacity-70" />}
                  <span>{exp.experiment_no}</span>
                </button>
              ))
            : [1, 2, 3, 4, 5, 6, 7].map((num) => (
                <button
                  key={num}
                  onClick={() => navigate(`/labs/${courseId}/experiment/${num}`)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                    parseInt(expId) === num
                      ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {num}
                </button>
              ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {submission && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                submission.status === 'APPROVED'
                  ? 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/30'
                  : 'bg-[var(--amber-bg)] text-[var(--amber)] border-[var(--amber)]/30'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {submission.status === 'APPROVED' ? 'Verified' : 'Pending Review'}
            </span>
          )}

          {/* RUN BUTTON */}
          <button
            onClick={handleRun}
            disabled={running || submitting || !isUnlocked}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-[var(--shadow-sm)]"
            title="Run code against sample test cases (does not submit for grading)"
          >
            {running ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
            ) : (
              <Play className="w-3.5 h-3.5 text-[var(--accent)] fill-[var(--accent)]" />
            )}
            Run Code
          </button>

          {/* SUBMIT BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={running || submitting || !isUnlocked}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 shadow-[var(--shadow-sm)]"
            title="Submit code against hidden test cases for faculty assessment"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Submit Solution
          </button>
        </div>
      </div>

      {/* Lock Notice Banner if experiment is locked */}
      {!isUnlocked && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-3 text-amber-800 text-xs shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Experiment Locked:</strong> Your assigned faculty incharge has not yet released this experiment for your section.
            </span>
          </div>
          <span className="text-[11px] font-mono opacity-80">Read-Only Mode</span>
        </div>
      )}

      {/* Main Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Problem Statement & Procedure */}
        <div className="w-[42%] shrink-0 border-r border-[var(--border)] bg-[var(--bg-raised)] p-5 overflow-y-auto space-y-5">
          {/* AIM */}
          <div className="space-y-2">
            <h2 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--accent)]" />
              Aim of Experiment
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-card)] p-3.5 rounded-[var(--radius-md)] border border-[var(--border)] shadow-[var(--shadow-sm)]">
              {experiment?.aim}
            </p>
          </div>

          {/* PROCEDURE */}
          <div className="space-y-2">
            <h3 className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              Step-by-Step Algorithm
            </h3>
            <pre className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-card)] p-4 rounded-[var(--radius-md)] border border-[var(--border)] font-mono leading-relaxed whitespace-pre-wrap overflow-auto shadow-[var(--shadow-sm)]">
              {experiment?.procedure || 'No algorithmic steps provided.'}
            </pre>
          </div>

          {/* SAMPLE TEST CASES */}
          <div className="space-y-2">
            <h3 className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
              Sample Test Cases ({sampleTestCases.length})
            </h3>
            {sampleTestCases.length === 0 ? (
              <div className="bg-[var(--bg-card)] p-3 rounded-[var(--radius-md)] border border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                Sample inputs will be verified by the code evaluator.
              </div>
            ) : (
              <div className="space-y-2">
                {sampleTestCases.map((tc, idx) => (
                  <div
                    key={idx}
                    className="bg-[var(--bg-card)] p-3 rounded-[var(--radius-md)] border border-[var(--border)] text-[11px] font-mono space-y-1.5 shadow-[var(--shadow-sm)]"
                  >
                    <div className="text-[10px] font-bold text-[var(--accent)] uppercase">
                      Sample Case {idx + 1}
                    </div>
                    {tc.input && (
                      <div className="text-[var(--text-secondary)]">
                        <span className="text-[var(--text-muted)]">Input: </span>
                        <span className="bg-[var(--bg-raised)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                          {tc.input}
                        </span>
                      </div>
                    )}
                    <div className="text-[var(--text-secondary)]">
                      <span className="text-[var(--text-muted)]">Expected Output: </span>
                      <span className="bg-[var(--bg-raised)] px-1.5 py-0.5 rounded border border-[var(--border)] font-bold text-[var(--green)]">
                        {tc.expected_output || tc.expected || 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Editor + Dynamic Execution Console Drawer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Code Editor */}
          <div className="flex-1 p-2 overflow-hidden">
            <CodeEditor
              code={code}
              onChange={setCode}
              language={language}
              onLanguageChange={setLanguage}
              isEditable={isUnlocked}
            />
          </div>

          {/* Interactive Console Drawer */}
          <div className="h-56 bg-[var(--bg-card)] border-t border-[var(--border)] flex flex-col overflow-hidden">
            {/* Drawer Header Tabs */}
            <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveConsoleTab('run')}
                  className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeConsoleTab === 'run'
                      ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Play className="w-3 h-3 text-[var(--accent)]" />
                  Sample Test Run
                  {runResult && (
                    <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {runResult.pass_count}/{runResult.total_test_cases} passed
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveConsoleTab('submit')}
                  className={`px-3 py-1 rounded-[var(--radius-sm)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeConsoleTab === 'submit'
                      ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Send className="w-3 h-3 text-[var(--accent)]" />
                  Submission Verdict
                  {testResult && (
                    <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {testResult.passCount}/{testResult.totalCases} passed ({testResult.marks}/10 marks)
                    </span>
                  )}
                </button>
              </div>

              <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>Standard I/O Console</span>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="p-3 overflow-y-auto flex-1 font-mono text-[11px] space-y-2">
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-[var(--radius-sm)] bg-[var(--red-bg)] border border-[var(--red)]/20 text-[var(--red)]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* TAB 1: RUN RESULTS (Sample Test Cases) */}
              {activeConsoleTab === 'run' && !error && (
                <>
                  {!runResult ? (
                    <div className="text-[var(--text-muted)] italic p-2 flex items-center gap-2">
                      <Play className="w-3.5 h-3.5 text-[var(--accent)] opacity-60" />
                      Click "Run Code" above to evaluate against sample test cases without submitting for assessment.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {runResult.results?.map((res, i) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-[var(--radius-md)] border ${
                            res.passed
                              ? 'bg-[var(--green-bg)] border-[var(--green)]/20'
                              : 'bg-[var(--red-bg)] border-[var(--red)]/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-bold flex items-center gap-1.5 ${
                                res.passed ? 'text-[var(--green)]' : 'text-[var(--red)]'
                              }`}
                            >
                              {res.passed ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5" />
                              )}
                              {res.name || `Sample Case ${i + 1}`} - {res.passed ? 'PASSED' : 'FAILED'}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {res.execution_ms || 0} ms
                            </span>
                          </div>
                          {res.input && (
                            <div className="text-[var(--text-secondary)] mt-1">
                              Input: <span className="text-[var(--text-primary)]">{res.input}</span>
                            </div>
                          )}
                          <div className="text-[var(--text-secondary)]">
                            Expected: <span className="text-[var(--text-primary)]">{res.expected}</span> ·
                            Got: <span className="font-bold text-[var(--text-primary)]">{res.actual}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: SUBMIT VERDICT */}
              {activeConsoleTab === 'submit' && !error && (
                <>
                  {!testResult && !submission ? (
                    <div className="text-[var(--text-muted)] italic p-2 flex items-center gap-2">
                      <Send className="w-3.5 h-3.5 text-[var(--accent)] opacity-60" />
                      Click "Submit Solution" to run against hidden grading test cases and submit for faculty verification.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 rounded-[var(--radius-md)] bg-[var(--green-bg)] border border-[var(--green)]/20 space-y-1">
                        <div className="text-[var(--green)] font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          {testResult?.message || 'Submission Loaded'}
                        </div>
                        <div className="text-[var(--text-secondary)]">
                          Status:{' '}
                          <strong className="text-[var(--text-primary)]">
                            {testResult?.status || submission?.status}
                          </strong>{' '}
                          · Marks:{' '}
                          <strong className="text-[var(--text-primary)]">
                            {testResult?.marks ?? submission?.marks}/10
                          </strong>
                        </div>
                        {submission?.faculty_notes && (
                          <div className="text-[var(--amber)]">
                            Faculty Note: {submission.faculty_notes}
                          </div>
                        )}
                      </div>

                      {testResult?.results && (
                        <div className="space-y-1.5 pt-1">
                          {testResult.results.map((res, i) => (
                            <div
                              key={i}
                              className={`p-2 rounded text-[10px] border flex items-center justify-between ${
                                res.passed
                                  ? 'bg-[var(--green-bg)]/50 border-[var(--green)]/20 text-[var(--green)]'
                                  : 'bg-[var(--red-bg)]/50 border-[var(--red)]/20 text-[var(--red)]'
                              }`}
                            >
                              <span>
                                {res.passed ? '✓' : '✗'} {res.name || `Hidden Case ${i + 1}`}
                              </span>
                              <span>{res.execution_ms || 0} ms</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

