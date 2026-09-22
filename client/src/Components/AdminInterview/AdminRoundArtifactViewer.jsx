import React, { useState, useMemo } from 'react';
import {
  User,
  Award,
  Code2,
  Layers,
  Database,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Radio,
  FileText,
  Clock,
  Sparkles,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Copy,
  Check,
  CheckSquare,
  Square,
  AlertCircle,
  Eye,
  BookOpen,
  Layout,
  Play,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import WhiteboardCanvas from '../Whiteboard/WhiteboardCanvas';
import ERDiagramCanvas from '../Database/ERDiagramCanvas';
import SQLEditorConsole from '../Database/SQLEditorConsole';
import MCQPlayground from '../MCQ/MCQPlayground';
import CodeEditor from '../CodeEditor';
import FrontendLivePreview from '../Frontend/FrontendLivePreview';

export default function AdminRoundArtifactViewer({
  roundNumber = 1,
  candidate = null,
  interviewer = null,
  question = null,
  code = '',
  lang = 'javascript',
  whiteboardData = '',
  rubrics = null,
  executionVerdict = '',
  executionPassed = 0,
  executionTotal = 0,
  executionJson = '',
  isLive = false,
  levelMode = 'coding',
  sessionId = null,
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [dbTab, setDbTab] = useState('sql'); // 'sql' | 'er'
  const [frontendTab, setFrontendTab] = useState('preview'); // 'preview' | 'code'
  const [showPromptDetails, setShowPromptDetails] = useState(true);

  // Determine mode
  const rawMode = (question?.type || levelMode || 'coding').toLowerCase();
  const mode = rawMode === 'discussion' ? 'whiteboard' : rawMode;

  const isWhiteboard = mode === 'whiteboard';
  const isDatabase = mode === 'database';
  const isMCQ = mode === 'mcq';
  const isVerbalQA = mode === 'verbal_qa';
  const isFrontend = mode === 'frontend';
  const isBackend = mode === 'backend';
  const isCoding = mode === 'coding' || (!isWhiteboard && !isDatabase && !isMCQ && !isVerbalQA && !isFrontend && !isBackend);

  // Parse Rubrics
  const parsedRubrics = useMemo(() => {
    if (!rubrics) return null;
    if (typeof rubrics === 'object') return rubrics;
    try {
      return JSON.parse(rubrics);
    } catch (e) {
      return null;
    }
  }, [rubrics]);

  // Parse Execution JSON
  const parsedExecution = useMemo(() => {
    if (!executionJson) return null;
    if (typeof executionJson === 'object') return executionJson;
    try {
      return JSON.parse(executionJson);
    } catch (e) {
      return null;
    }
  }, [executionJson]);

  // Parse Database Code payload { diagram, sql, database }
  const parsedDbState = useMemo(() => {
    if (!code || typeof code !== 'string') return { diagram: null, sql: '', database: '' };
    try {
      if (code.startsWith('{') && (code.includes('"diagram"') || code.includes('"sql"'))) {
        const parsed = JSON.parse(code);
        return {
          diagram: parsed.diagram || null,
          sql: parsed.sql || '',
          database: parsed.database || '',
        };
      }
    } catch (e) {
      // ignore
    }
    return { diagram: null, sql: code, database: '' };
  }, [code]);

  // Parse MCQ answers if code holds JSON
  const parsedMCQState = useMemo(() => {
    if (!code || typeof code !== 'string') return { answers: {}, submitted: false };
    try {
      if (code.startsWith('{') && code.includes('"answers"')) {
        return JSON.parse(code);
      }
    } catch (e) {
      // ignore
    }
    return { answers: {}, submitted: false };
  }, [code]);

  const handleCopyCode = (textToCopy) => {
    const text = textToCopy || code;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const modeBadgeInfo = {
    whiteboard: { label: 'System Design (Whiteboard)', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
    database: { label: 'Database & SQL Sandbox', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
    mcq: { label: 'Multiple Choice (MCQ)', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
    frontend: { label: 'Frontend UI (React)', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
    backend: { label: 'Backend API Service', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
    verbal_qa: { label: 'Verbal Technical Q&A', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
    coding: { label: 'Algorithmic Coding (DSA)', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
  }[mode] || { label: mode.toUpperCase(), color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' };

  // Combine execution test cases with question test cases so all cases (including hidden) are fully revealed for Admin
  const adminTestCases = useMemo(() => {
    const rawQuestionCases = question?.test_cases || [];
    const executionResults = parsedExecution?.all_cases || parsedExecution?.results || [];

    if (executionResults.length > 0) {
      return executionResults.map((r, idx) => {
        const matchingQCase = rawQuestionCases[idx] || rawQuestionCases.find((tc) => tc.id === r.test_case_id);
        return {
          index: r.index || idx + 1,
          name: r.name || (r.is_hidden ? `Hidden Verification Case #${idx + 1}` : `Sample Case #${idx + 1}`),
          input: r.input || matchingQCase?.input || '—',
          expected: r.expected || r.expected_output || matchingQCase?.expected_output || '—',
          actual: r.actual || r.actual_output || '—',
          passed: Boolean(r.passed),
          status: r.status || (r.passed ? 'Passed' : 'Failed'),
          is_hidden: Boolean(r.is_hidden || matchingQCase?.is_hidden),
          execution_ms: r.execution_ms || 0,
          explanation: matchingQCase?.explanation || r.explanation || '',
        };
      });
    }

    // If no execution run exists yet, display question test cases
    return rawQuestionCases.map((tc, idx) => ({
      index: idx + 1,
      name: tc.is_hidden ? `Hidden Verification Case #${idx + 1}` : `Sample Case #${idx + 1}`,
      input: tc.input || '—',
      expected: tc.expected_output || '—',
      actual: 'Not executed yet',
      passed: null,
      status: 'Pending Submission',
      is_hidden: Boolean(tc.is_hidden),
      execution_ms: 0,
      explanation: tc.explanation || '',
    }));
  }, [question, parsedExecution]);

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* 1. ROUND PARTICIPANT ATTRIBUTION BANNER */}
      {/* ============================================================ */}
      <div className="panel-card p-4 sm:p-5 border border-[var(--border)] bg-[var(--bg-card)] shadow-xs rounded-[var(--radius-lg)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Candidate Attribution */}
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-full bg-[#6e56cf] text-white font-mono font-bold text-lg flex items-center justify-center shrink-0 shadow-xs">
              {candidate?.name ? candidate.name.charAt(0).toUpperCase() : `R${roundNumber}`}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-strong)]">
                  Round {roundNumber} Candidate (Examinee)
                </span>
                {isLive && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-strong)] animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    <span>LIVE SUBMITTING</span>
                  </span>
                )}
              </div>
              <h3 className="text-[16px] font-bold text-[var(--text-primary)] truncate mt-0.5">
                {candidate?.name || 'Unassigned Candidate'}
              </h3>
              <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                {candidate?.roll_no ? `${candidate.roll_no} • ` : ''}
                {candidate?.department || candidate?.email || '—'}
                {candidate?.year ? ` • Year ${candidate.year}` : ''}
              </p>
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-[var(--border)]" />

          {/* Evaluator Attribution */}
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-strong)] font-mono font-bold text-base flex items-center justify-center shrink-0">
              {interviewer?.name ? interviewer.name.charAt(0).toUpperCase() : 'E'}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]">
                Round {roundNumber} Assessor (Interviewer)
              </span>
              <h4 className="text-[14px] font-bold text-[var(--text-primary)] truncate mt-0.5">
                {interviewer?.name || 'Unassigned Assessor'}
              </h4>
              <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                {interviewer?.roll_no ? `${interviewer.roll_no} • ` : ''}
                {interviewer?.department || interviewer?.email || '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. QUESTION PROBLEM & SCENARIO CARD */}
      {/* ============================================================ */}
      {question ? (
        <div className="panel-card border border-[var(--border)] bg-[var(--bg-card)] rounded-[var(--radius-lg)] overflow-hidden shadow-xs">
          <div
            className="p-4 bg-[var(--bg-raised)]/60 border-b border-[var(--border)] flex items-center justify-between cursor-pointer select-none"
            onClick={() => setShowPromptDetails(!showPromptDetails)}
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${modeBadgeInfo.color}`}>
                {modeBadgeInfo.label}
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                {question.difficulty || 'Medium'}
              </span>
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
                {question.title || `Round ${roundNumber} Assessment Question`}
              </h3>
            </div>

            <button
              type="button"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition p-1 cursor-pointer"
            >
              {showPromptDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showPromptDetails && (
            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] tracking-wider block">
                  Problem Description & Instructions:
                </span>
                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-sans">
                  {question.prompt}
                </p>
              </div>

              {/* Detail constraints & approach */}
              {question.detail && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[var(--border)]">
                  {question.detail.constraints && (
                    <div className="p-3 rounded bg-[var(--bg-raised)] border border-[var(--border)] space-y-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-amber-600 dark:text-amber-400 block">
                        Constraints & Limits:
                      </span>
                      <p className="text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-line">
                        {question.detail.constraints}
                      </p>
                    </div>
                  )}

                  {question.detail.expected_approach && (
                    <div className="p-3 rounded bg-[var(--bg-raised)] border border-[var(--border)] space-y-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                        Expected Solution Approach:
                      </span>
                      <p className="text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-line">
                        {question.detail.expected_approach}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="panel-card p-4 border border-[var(--border)] text-xs text-[var(--text-muted)] font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 opacity-60" />
          <span>No specific question prompt assigned for Round {roundNumber}.</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MODE-SPECIFIC CANDIDATE ARTIFACT WORKSPACE */}
      {/* ============================================================ */}

      {/* 3A. FRONTEND REACT UI (LIVE PREVIEW & CODE SANDBOX) */}
      {isFrontend && (
        <div className="panel-card border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-xs space-y-0">
          <div className="p-3.5 bg-[var(--bg-raised)]/70 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4 text-cyan-500" />
              <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                Frontend Component & Live Interactive Preview
              </h3>
            </div>

            {/* Separate Tabs Switcher: Preview | Code */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setFrontendTab('preview')}
                className={`text-[11px] font-mono font-bold px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                  frontendTab === 'preview'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Interactive UI Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setFrontendTab('code')}
                className={`text-[11px] font-mono font-bold px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                  frontendTab === 'code'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Source Code (App.jsx)</span>
              </button>
            </div>
          </div>

          <div className="p-0">
            {frontendTab === 'preview' ? (
              <div className="h-[600px] bg-[var(--bg-canvas)] relative overflow-hidden">
                <FrontendLivePreview
                  code={code || ''}
                  title="Live Rendered UI Preview"
                  candidateName={candidate?.name || 'Candidate'}
                />
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="p-2.5 bg-[var(--bg-raised)]/40 border-b border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                  <span className="font-bold text-[var(--text-primary)]">App.jsx (Candidate React Code)</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(code)}
                    className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 font-mono cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
                <div className="h-[560px]">
                  <CodeEditor
                    code={code || '// No frontend code submitted'}
                    language="javascript"
                    readOnly={true}
                    height="100%"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3B. DATABASE MODE (CLEAN LIGHT UI PRESENTATION) */}
      {isDatabase && (
        <div className="panel-card border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-xs space-y-0">
          <div className="p-3.5 bg-[var(--bg-raised)]/70 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" />
              <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                Database Sandbox & Candidate SQL Queries
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {/* If in-progress or requested, allow ER toggle */}
              {isLive && (
                <div className="flex items-center gap-1 bg-[var(--bg-card)] p-0.5 rounded border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setDbTab('sql')}
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded transition cursor-pointer ${
                      dbTab === 'sql' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    SQL Queries
                  </button>
                  <button
                    type="button"
                    onClick={() => setDbTab('er')}
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded transition cursor-pointer ${
                      dbTab === 'er' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Live ER Diagram
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleCopyCode(parsedDbState.sql || code)}
                className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 font-mono cursor-pointer"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>
          </div>

          {/* Render in Light UI */}
          {dbTab === 'sql' || !isLive ? (
            <div className="p-5 space-y-4 bg-[var(--bg-card)]">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase">
                    Candidate Executed SQL Statements:
                  </span>
                  {parsedDbState.database && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">
                      Database: {parsedDbState.database}
                    </span>
                  )}
                </div>

                {/* Light UI SQL Box */}
                <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)]/90 text-[var(--text-primary)] font-mono text-xs overflow-x-auto custom-scrollbar border border-[var(--border)] min-h-[160px] leading-relaxed shadow-inner">
                  <pre className="whitespace-pre font-mono font-medium">
                    {parsedDbState.sql || '-- No SQL queries submitted by candidate yet'}
                  </pre>
                </div>
              </div>

              {/* Schema Tables if present */}
              {parsedDbState.diagram?.tables && parsedDbState.diagram.tables.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-[var(--border)]">
                  <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase block">
                    Created Database Tables ({parsedDbState.diagram.tables.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {parsedDbState.diagram.tables.map((t, idx) => (
                      <div key={idx} className="p-3 rounded bg-[var(--bg-raised)] border border-[var(--border)] space-y-1">
                        <span className="font-mono font-bold text-xs text-[var(--accent)] block">
                          📁 {t.name}
                        </span>
                        <p className="text-[10px] font-mono text-[var(--text-muted)]">
                          {(t.columns || []).length} columns • {t.primary_key ? `PK: ${t.primary_key}` : 'No PK'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-[480px] w-full bg-[var(--bg-canvas)] relative">
              <ERDiagramCanvas
                schema={parsedDbState.diagram || { tables: [], relationships: [] }}
                isLiveUpdating={isLive}
              />
            </div>
          )}
        </div>
      )}

      {/* 3C. SYSTEM DESIGN WHITEBOARD */}
      {isWhiteboard && (
        <div className="panel-card border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-xs space-y-0">
          <div className="p-4 bg-[var(--bg-raised)]/70 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                Candidate Interactive Whiteboard Canvas
              </h3>
              <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded border border-blue-500/20 font-bold">
                View Only
              </span>
            </div>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              {whiteboardData ? 'Architecture diagram synchronized' : 'Canvas empty / starter'}
            </span>
          </div>

          <div className="h-[600px] w-full bg-[var(--bg-canvas)] relative">
            <WhiteboardCanvas
              whiteboardData={whiteboardData}
              isEditable={false}
              candidateName={candidate?.name || 'Candidate'}
              question={question}
              payload={question?.detail}
              currentUserRole="interviewer"
            />
          </div>
        </div>
      )}

      {/* 3D. MULTIPLE CHOICE QUESTIONS (MCQ) */}
      {isMCQ && (
        <div className="panel-card border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-xs space-y-0">
          <div className="p-4 bg-[var(--bg-raised)]/70 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-500" />
              <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                MCQ Answers & Choice Breakdown
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              Candidate Selection Analysis
            </span>
          </div>

          <div className="p-5 space-y-4">
            {question?.mcq_options && question.mcq_options.length > 0 ? (
              <div className="space-y-3">
                <span className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block">
                  Options & Candidate Selection:
                </span>

                <div className="grid grid-cols-1 gap-2.5">
                  {question.mcq_options.map((opt) => {
                    const candidateAnswers = parsedMCQState.answers || {};
                    const selectedKey = candidateAnswers[question.id] || candidateAnswers[String(question.id)];
                    const isCandidateChoice = selectedKey === opt.option_key;
                    const isCorrect = opt.is_correct;

                    let rowStyle = 'bg-[var(--bg-raised)]/40 border-[var(--border)]';
                    if (isCandidateChoice && isCorrect) {
                      rowStyle = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200';
                    } else if (isCandidateChoice && !isCorrect) {
                      rowStyle = 'bg-rose-500/10 border-rose-500/40 text-rose-950 dark:text-rose-200';
                    } else if (isCorrect) {
                      rowStyle = 'bg-emerald-500/5 border-emerald-500/20';
                    }

                    return (
                      <div
                        key={opt.id || opt.option_key}
                        className={`p-3.5 rounded-[var(--radius-md)] border flex items-start justify-between gap-3 ${rowStyle}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isCandidateChoice
                              ? isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                              : isCorrect ? 'bg-emerald-500/20 text-emerald-600' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]'
                          }`}>
                            {opt.option_key}
                          </span>
                          <div>
                            <p className="text-xs font-medium text-[var(--text-primary)]">
                              {opt.option_text}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isCandidateChoice && (
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                              isCorrect
                                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                            }`}>
                              Candidate Answer
                            </span>
                          )}

                          {isCorrect && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 uppercase flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Correct Key</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {question.detail?.explanation && (
                  <div className="p-3.5 rounded-[var(--radius-md)] bg-blue-500/5 border border-blue-500/20 space-y-1 mt-3">
                    <span className="text-[10px] font-mono font-bold uppercase text-blue-600 dark:text-blue-400 block">
                      Solution Explanation & Analysis:
                    </span>
                    <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                      {question.detail.explanation}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs font-mono text-[var(--text-muted)]">
                No multiple choice options defined for this question.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3E. ALGORITHMIC CODING / DSA / BACKEND (COMPLETE TEST CASES VERIFICATION) */}
      {(isCoding || isBackend) && (
        <div className="panel-card border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-xs space-y-0">
          <div className="p-3.5 bg-[var(--bg-raised)]/70 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-500" />
              <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                Candidate Code & Complete Test Case Verification
              </h3>
              <span className="text-[10px] font-mono uppercase bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded border border-purple-500/20 font-bold">
                {lang}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {executionVerdict && (
                <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border uppercase ${
                  executionVerdict === 'Accepted' || executionVerdict.includes('Passed')
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]'
                    : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                }`}>
                  Verdict: {executionVerdict} ({executionPassed}/{executionTotal} Passed)
                </span>
              )}

              <button
                type="button"
                onClick={() => handleCopyCode(code)}
                className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 font-mono cursor-pointer"
              >
                {copiedCode ? <Check className="w-3 h-3 text-[var(--accent)]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="p-0 border-b border-[var(--border)]">
            <CodeEditor
              code={code || '// No candidate code submitted yet'}
              language={lang}
              readOnly={true}
              height="380px"
            />
          </div>

          {/* Comprehensive Test Case Verification Console (Sample & Hidden Test Cases) */}
          <div className="p-4 bg-[var(--bg-card)] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Test Cases Verification Breakdown ({adminTestCases.length} Cases):</span>
              </span>
              {parsedExecution?.runtime_ms !== undefined && (
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  Execution Runtime: {parsedExecution.runtime_ms}ms • Memory: {parsedExecution.memory_mb || '12.4 MB'}
                </span>
              )}
            </div>

            {adminTestCases.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-raised)] rounded">
                No automated test cases configured for this question.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 text-xs font-mono">
                {adminTestCases.map((tc, idx) => {
                  const isPassed = tc.passed === true;
                  const isFailed = tc.passed === false;
                  const isPending = tc.passed === null;

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-[var(--radius-md)] border space-y-2 ${
                        isPassed
                          ? 'bg-[var(--accent-dim)] border-[var(--border-strong)]'
                          : isFailed
                          ? 'bg-rose-500/5 border-rose-500/25'
                          : 'bg-[var(--bg-raised)]/60 border-[var(--border)]'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {isPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
                          ) : isFailed ? (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                          )}
                          <span className="font-bold text-[var(--text-primary)]">
                            {tc.name}
                          </span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded border font-bold bg-[var(--bg-raised)] text-[var(--text-secondary)] border-[var(--border)]">
                            {tc.is_hidden ? 'Hidden Verification Case' : 'Sample Case'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono">
                          <span className={`text-[10px] uppercase px-2 py-0.5 rounded border font-bold ${
                            isPassed
                              ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]'
                              : isFailed
                              ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                              : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)]'
                          }`}>
                            {isPassed ? 'VERIFIED / PASSED' : isFailed ? 'FAILED / WRONG ANSWER' : 'PENDING'}
                          </span>
                          {tc.execution_ms > 0 && (
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {tc.execution_ms}ms
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Inputs & Outputs (Revealed for Admin inspection) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] bg-[var(--bg-card)] p-2.5 rounded border border-[var(--border)]">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Input:</span>
                          <p className="font-mono text-[var(--text-primary)] whitespace-pre-wrap">{tc.input}</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Expected Output:</span>
                          <p className="font-mono text-[var(--accent)] font-semibold whitespace-pre-wrap">{tc.expected}</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Candidate Output:</span>
                          <p className={`font-mono whitespace-pre-wrap ${isPassed ? 'text-[var(--accent)] font-semibold' : 'text-rose-600 dark:text-rose-400 font-bold'}`}>
                            {tc.actual}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3F. VERBAL Q&A MODE */}
      {isVerbalQA && (
        <div className="panel-card p-5 border border-[var(--border)] rounded-[var(--radius-lg)] space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
            <Radio className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
              Verbal Technical Discussion & Talking Points
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {question?.detail?.ideal_answer && (
              <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-[var(--accent)] block">
                  Ideal Candidate Answer & Key Technical Concepts:
                </span>
                <p className="text-[12px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-sans">
                  {question.detail.ideal_answer}
                </p>
              </div>
            )}

            {question?.hints && question.hints.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] block">
                  Assessor Talking Points & Technical Tradeoffs:
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {question.hints.map((h) => (
                    <div key={h.id} className="p-3 rounded bg-[var(--bg-raised)] border border-[var(--border)] flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                      <p className="text-xs text-[var(--text-secondary)]">{h.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. ROUND ASSESSOR RUBRICS & OBSERVATION SCORECARD */}
      {/* ============================================================ */}
      {(() => {
        const scores = parsedRubrics?.scores || {};
        const overallRemarks = parsedRubrics?.overallRemarks || '';
        const hasRubrics = Object.keys(scores).length > 0 || !!overallRemarks;

        return (
          <div className="panel-card p-5 border border-[var(--border)] rounded-[var(--radius-lg)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-[14px] font-bold text-[var(--text-primary)]">
                  Round {roundNumber} Assessor Evaluation Scorecard & Rubrics
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Evaluator: <strong>{interviewer?.name || 'Assessor'}</strong>
              </span>
            </div>

            {!hasRubrics ? (
              <div className="p-6 rounded-[var(--radius-md)] bg-[var(--bg-raised)]/60 border border-[var(--border)] text-center text-xs text-[var(--text-muted)] space-y-1">
                <FileText className="w-5 h-5 mx-auto opacity-40 text-[var(--text-muted)]" />
                <p className="font-semibold text-[13px] text-[var(--text-primary)]">No rubric assessment submitted for Round {roundNumber}</p>
                <p>Ratings and notes will appear here when the assessor evaluates criteria in real time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(scores).map(([k, val], idx) => {
                    const isChecked = val?.checked;
                    const rating = val?.rating || 'met';
                    const note = val?.note;

                    const ratingConfig = {
                      exceeded: { label: 'Strong / Exceeded', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
                      met: { label: 'Competent / Met', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
                      needs_work: { label: 'Needs Improvement', color: 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)]' },
                    }[rating] || { label: rating, color: 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)]' };

                    return (
                      <div
                        key={k}
                        className={`p-3.5 rounded-[var(--radius-md)] border space-y-2 ${
                          isChecked ? 'bg-[var(--bg-raised)]/70 border-purple-500/30' : 'bg-[var(--bg-card)] border-[var(--border)] opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                            )}
                            <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                              Criterion #{idx + 1}
                            </span>
                          </div>

                          {isChecked && (
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${ratingConfig.color}`}>
                              {ratingConfig.label}
                            </span>
                          )}
                        </div>

                        {note && (
                          <p className="text-[11px] font-mono text-[var(--text-secondary)] italic pl-6">
                            "{note}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {overallRemarks && (
                  <div className="p-3.5 rounded-[var(--radius-md)] bg-purple-500/5 border border-purple-500/20 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase block">
                      Overall Assessor Remarks:
                    </span>
                    <p className="text-xs font-mono text-[var(--text-primary)] whitespace-pre-line leading-relaxed">
                      "{overallRemarks}"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
