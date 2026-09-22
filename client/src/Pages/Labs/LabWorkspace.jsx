import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  HelpCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight
} from 'lucide-react';
import api from '../../api/axios';
import CodeEditor from '../../Components/CodeEditor';

export default function LabWorkspace() {
  const { courseId = 1, expId = 1 } = useParams();
  const navigate = useNavigate();

  const [experiment, setExperiment] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExperiment();
  }, [expId]);

  const fetchExperiment = async () => {
    try {
      setLoading(true);
      setError('');
      setTestResult(null);
      const res = await api.get(`/labs/experiment/${expId}`);
      const data = res.data?.experiment;
      const sub = res.data?.submission;
      setExperiment(data);
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

  const handleSubmit = async () => {
    try {
      setExecuting(true);
      setError('');
      const res = await api.post(`/labs/experiment/${expId}/submit`, { code, language });
      setTestResult({
        passCount: res.data.pass_count,
        totalCases: res.data.total_test_cases,
        status: res.data.status,
        message: res.data.message
      });
      if (res.data.submission) setSubmission(res.data.submission);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setExecuting(false);
    }
  };

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
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-card)] border-b border-[var(--border)] shadow-[var(--shadow-sm)]">
        {/* Left: Back + Experiment label */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/labs')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--bg-input)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
              Ex {experiment?.experiment_no || expId}
            </span>
            <span className="text-[13px] font-semibold text-[var(--text-primary)] hidden sm:inline truncate max-w-xs">
              {experiment?.title}
            </span>
          </div>
        </div>

        {/* Centre: Experiment Quick Nav */}
        <div className="hidden md:flex items-center gap-0.5 bg-[var(--bg-input)] p-1 rounded-[var(--radius-sm)] border border-[var(--border)]">
          {[1, 2, 3, 4, 5, 6, 7].map((num) => (
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

        {/* Right: Status + Submit */}
        <div className="flex items-center gap-3">
          {submission && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              submission.status === 'APPROVED'
                ? 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/30'
                : 'bg-[var(--amber-bg)] text-[var(--amber)] border-[var(--amber)]/30'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {submission.status === 'APPROVED' ? 'Verified' : 'Pending Review'}
            </span>
          )}
          <button
            onClick={handleSubmit}
            disabled={executing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 shadow-[var(--shadow-sm)]"
          >
            {executing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
            Submit for Assessment
          </button>
        </div>
      </div>

      {/* Main Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Problem Statement */}
        <div className="w-[45%] shrink-0 border-r border-[var(--border)] bg-[var(--bg-raised)] p-5 overflow-y-auto space-y-5">
          {/* AIM */}
          <div className="space-y-2">
            <h2 className="text-[13px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--accent)]" />
              Aim of Experiment
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-card)] p-3 rounded-[var(--radius-md)] border border-[var(--border)]">
              {experiment?.aim}
            </p>
          </div>

          {/* PROCEDURE */}
          <div className="space-y-2">
            <h3 className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              Step-by-Step Algorithm
            </h3>
            <pre className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-card)] p-4 rounded-[var(--radius-md)] border border-[var(--border)] font-mono leading-relaxed whitespace-pre-wrap overflow-auto">
              {experiment?.procedure}
            </pre>
          </div>

          {/* Sample Test Cases */}
          <div className="space-y-2">
            <h3 className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
              Sample Test Cases
            </h3>
            <div className="bg-[var(--bg-card)] p-3 rounded-[var(--radius-md)] border border-[var(--border)] space-y-2 text-[11px]">
              <div className="flex justify-between text-[var(--text-muted)] font-mono border-b border-[var(--border)] pb-2">
                <span>Input</span>
                <span>Expected Output</span>
              </div>
              <div className="flex justify-between font-mono text-[var(--text-secondary)]">
                <span>Sample Inputs Provided</span>
                <span className="text-[var(--green)] font-semibold">Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Editor + Output Log */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-2 overflow-hidden">
            <CodeEditor
              code={code}
              onChange={setCode}
              language={language}
              onLanguageChange={setLanguage}
              isEditable={true}
            />
          </div>

          {/* Execution Log Drawer */}
          <div className="h-40 bg-[var(--bg-card)] border-t border-[var(--border)] p-3 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
              <span>Execution & Test Case Output</span>
              {testResult && (
                <span className="text-[var(--green)] font-semibold">
                  {testResult.passCount} / {testResult.totalCases} Hidden Cases Passed
                </span>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2 rounded-[var(--radius-sm)] bg-[var(--red-bg)] border border-[var(--red)]/20 text-[var(--red)] text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            {testResult && !error && (
              <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--green-bg)] border border-[var(--green)]/20 font-mono text-[11px] space-y-1">
                <div className="text-[var(--green)] font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {testResult.message}
                </div>
                <div className="text-[var(--text-secondary)]">Status: {testResult.status}</div>
              </div>
            )}

            {!testResult && !error && submission && (
              <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] font-mono text-[11px] space-y-1">
                <div className="text-[var(--accent)] font-semibold">Previous submission loaded.</div>
                <div className="text-[var(--text-secondary)]">
                  Pass Rate: {submission.pass_count}/{submission.total_test_cases} · Status: {submission.status}
                  {submission.marks > 0 ? ` · Marks: ${submission.marks}/10` : ''}
                </div>
                {submission.faculty_notes && (
                  <div className="text-[var(--amber)]">Faculty Note: {submission.faculty_notes}</div>
                )}
              </div>
            )}

            {!testResult && !error && !submission && (
              <div className="text-[11px] text-[var(--text-muted)] italic p-2">
                Click "Submit for Assessment" to run your code against hidden test cases.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
