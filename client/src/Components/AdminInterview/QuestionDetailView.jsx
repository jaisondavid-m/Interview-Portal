import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  AlertCircle,
  Sparkles,
  Clock,
  Lightbulb,
  Target,
  Check,
  Copy,
  Eye,
  Lock,
  Database,
  Code,
  Layers,
  CheckCircle2,
  HelpCircle,
  FileCode,
  Terminal,
} from 'lucide-react';
import { getModeMeta, formatLevelName } from './constants';
import { parseTestCaseToHttp, HTTP_METHODS } from './HttpTestCaseEditor';

export default function QuestionDetailView({
  currentQuestion,
  currentLevel,
  trackId,
  levelId,
  onBack,
  onEdit,
  onDelete,
}) {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!currentQuestion) {
    return (
      <div className="panel-card p-10 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
        <p className="text-[14px] text-[var(--text-secondary)]">Question not found or still loading...</p>
        <button
          onClick={onBack}
          className="btn btn-secondary text-xs py-2 px-4 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Questions</span>
        </button>
      </div>
    );
  }

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const rawMode = currentQuestion.type || currentLevel?.mode || 'coding';
  const mode = rawMode === 'discussion' ? 'whiteboard' : rawMode;
  const modeMeta = getModeMeta(mode);
  const ModeIcon = modeMeta.icon;

  const detail = currentQuestion.detail || {};
  const payload = currentQuestion.payload || {};
  const templates = currentQuestion.templates || [];

  // Starter code & templates
  const foundTmpl = Array.isArray(templates) && templates.length > 0
    ? (templates.find((t) => t.starter_code) || templates[0])
    : null;
  const starterCode = foundTmpl?.starter_code || payload.starter_code || payload.schema_ddl || '';
  const starterLanguage = foundTmpl?.language || (mode === 'database' ? 'SQL' : mode === 'frontend' ? 'React JSX' : 'JavaScript');

  // Relational vs payload hints & guidance
  const hintsList = Array.isArray(currentQuestion.hints) ? currentQuestion.hints : [];
  const relHints = hintsList.filter((h) => h.type === 'hint').map((h) => h.content);
  const relTips = hintsList.filter((h) => h.type === 'interview_tip').map((h) => h.content);
  const relRubrics = hintsList.filter((h) => h.type === 'rubric').map((h) => h.content);
  const relTalking = hintsList.filter((h) => h.type === 'talking_point').map((h) => h.content);
  const relTradeoffs = hintsList.filter((h) => h.type === 'tradeoff').map((h) => h.content);

  const hints = (relHints.length > 0 ? relHints : (Array.isArray(payload.hints) ? payload.hints : [])).filter((h) => h && h.trim());
  const interviewTips = (relTips.length > 0 ? relTips : (Array.isArray(payload.interview_tips) ? payload.interview_tips : [])).filter((t) => t && t.trim());
  const rubrics = (relRubrics.length > 0 ? relRubrics : (Array.isArray(payload.rubrics) ? payload.rubrics : [])).filter((r) => r && r.trim());
  const talkingPoints = (relTalking.length > 0 ? relTalking : (Array.isArray(payload.talking_points) ? payload.talking_points : [])).filter((tp) => tp && tp.trim());
  const tradeoffs = (relTradeoffs.length > 0 ? relTradeoffs : (Array.isArray(payload.tradeoffs) ? payload.tradeoffs : [])).filter((tr) => tr && tr.trim());

  // Test cases
  let openCases = [];
  let hiddenCases = [];
  if (Array.isArray(currentQuestion.test_cases) && currentQuestion.test_cases.length > 0) {
    openCases = currentQuestion.test_cases
      .filter((tc) => !tc.is_hidden)
      .map((tc) => ({ input: tc.input || '', output: tc.expected_output || tc.output || '', explanation: tc.explanation || '' }));
    hiddenCases = currentQuestion.test_cases
      .filter((tc) => tc.is_hidden)
      .map((tc) => ({ input: tc.input || '', output: tc.expected_output || tc.output || '', explanation: tc.explanation || '' }));
  } else {
    if (Array.isArray(payload.open_test_cases)) {
      openCases = payload.open_test_cases.map((tc) => ({ input: tc.input || '', output: tc.output || tc.expected_output || '', explanation: tc.explanation || '' }));
    } else if (Array.isArray(payload.test_cases)) {
      openCases = payload.test_cases.map((tc) => ({ input: tc.input || '', output: tc.output || tc.expected_output || '', explanation: tc.explanation || '' }));
    }
    if (Array.isArray(payload.hidden_test_cases)) {
      hiddenCases = payload.hidden_test_cases.map((tc) => ({ input: tc.input || '', output: tc.output || tc.expected_output || '', explanation: tc.explanation || '' }));
    }
  }

  // MCQ Options
  let mcqOptions = [];
  if (Array.isArray(currentQuestion.mcq_options) && currentQuestion.mcq_options.length > 0) {
    mcqOptions = currentQuestion.mcq_options.map((o) => ({
      id: o.option_key,
      text: o.option_text,
      is_correct: o.is_correct,
    }));
  } else if (Array.isArray(payload.options)) {
    mcqOptions = payload.options.map((o) => ({
      id: o.id || o.option_key,
      text: o.text || o.option_text,
      is_correct: o.is_correct || (o.id === (detail.correct_option || payload.correct_option)),
    }));
  }

  const parsed = {
    starter_code: starterCode,
    starter_language: starterLanguage,
    seed_data: payload.seed_data || detail.seed_data || '',
    constraints: detail.constraints || payload.constraints || '',
    expected_approach: detail.expected_approach || payload.expected_approach || '',
    expected_complexity: detail.expected_complexity || payload.expected_complexity || '',
    ideal_answer: detail.ideal_answer || payload.ideal_answer || '',
    scenario: detail.scenario || payload.scenario || '',
    correct_option: detail.correct_option || payload.correct_option || (mcqOptions.find((o) => o.is_correct)?.id || 'A'),
    explanation: detail.explanation || payload.explanation || '',
    hints,
    interview_tips: interviewTips,
    rubrics,
    talking_points: talkingPoints,
    tradeoffs,
    options: mcqOptions,
    open_cases: openCases,
    hidden_cases: hiddenCases,
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. Question Overview Header Card */}
      <div className="panel-card p-4 sm:p-6 bg-[var(--bg-raised)] space-y-4 border border-[var(--border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold px-2.5 sm:px-3 py-1 rounded-full border ${modeMeta.bg} ${modeMeta.color} ${modeMeta.border}`}>
              <ModeIcon className="w-3.5 h-3.5" />
              <span>{modeMeta.label} Assessment</span>
            </span>
            <span className={`text-[10px] sm:text-[11px] font-mono font-bold px-2.5 py-1 rounded ${
              currentQuestion.difficulty === 'Easy' ? 'bg-[var(--green-bg)] text-[var(--green)]' :
              currentQuestion.difficulty === 'Hard' ? 'bg-[var(--red-bg)] text-[var(--red)]' :
              'bg-[var(--amber-bg)] text-[var(--amber)]'
            }`}>
              {currentQuestion.difficulty} Difficulty
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-card)] px-2.5 py-1 rounded border border-[var(--border)]">
              Level {currentLevel?.level_number}: {formatLevelName(currentLevel)}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              onClick={onBack}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Questions</span>
            </button>
            <button
              onClick={onEdit}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Question</span>
            </button>
            <button
              onClick={onDelete}
              className="btn btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1">
            Question Title
          </span>
          <h2 className="text-[18px] sm:text-[22px] font-bold text-[var(--text-primary)] leading-snug">
            {currentQuestion.title}
          </h2>
        </div>
      </div>

      {/* 2. Problem Statement & Scenario Card */}
      <div className="panel-card p-6 space-y-4">
        <h3 className="text-[13px] font-bold font-mono uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--accent)]" />
          <span>Problem Statement & Prompt</span>
        </h3>
        <div className="text-[14px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-ui bg-[var(--bg-card)] p-4 rounded-[var(--radius-sm)] border border-[var(--border)]">
          {currentQuestion.prompt}
        </div>

        {/* Scenario Breakdown (System Design / Database ER / Frontend / General) */}
        {parsed.scenario && (
          <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)] space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent)] block">
              {mode === 'database' ? 'Schema Modeling & ER Scenario' :
               mode === 'frontend' ? 'Frontend Design & Layout Requirements' :
               mode === 'whiteboard' ? 'System Architecture & Scale Target Scenario' :
               'Scenario Context & Target Specifications'}
            </span>
            <div className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-ui">
              {parsed.scenario}
            </div>
          </div>
        )}

        {/* Constraints & Limits */}
        {parsed.constraints && (
          <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border-l-4 border-l-[var(--accent)] border border-[var(--border)] space-y-1.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              {mode === 'frontend' ? 'Responsive Breakpoints & Layout Constraints' : 'Input / Output Constraints & Limits'}
            </span>
            <div className="font-mono text-[12px] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
              {parsed.constraints}
            </div>
          </div>
        )}
      </div>

      {/* 3. MODE-SPECIFIC TECHNICAL SPECIFICATIONS */}

      {/* 3A. CODING & BACKEND SPECIFICATIONS */}
      {(mode === 'coding' || mode === 'backend') && (
        <div className="space-y-6">
          {/* Starter Code Template */}
          {parsed.starter_code && (
            <div className="panel-card overflow-hidden border border-[var(--border)]">
              <div className="p-3 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" />
                  <span>Starter Code Template ({parsed.starter_language})</span>
                </span>
                <button
                  onClick={() => handleCopy(parsed.starter_code, 'starter_code')}
                  className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                >
                  {copiedKey === 'starter_code' ? <Check className="w-3.5 h-3.5 text-[var(--green)]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'starter_code' ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <div className="p-4 bg-[var(--bg-input)] font-mono text-[12px] text-[var(--text-primary)] overflow-x-auto">
                <pre className="leading-relaxed">{parsed.starter_code}</pre>
              </div>
            </div>
          )}

          {/* Open / Sample Test Cases */}
          {parsed.open_cases?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
                  <Eye className="w-4 h-4 text-[var(--accent)]" />
                  <span>{mode === 'backend' ? 'Sample / Open Endpoints' : 'Sample / Open Test Cases'}</span>
                  <span className="text-[10px] font-mono bg-[var(--accent-dim)] text-[var(--accent)] px-2 py-0.5 rounded font-semibold">
                    Visible to Candidate
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {parsed.open_cases.length} {parsed.open_cases.length === 1 ? 'Case' : 'Cases'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {parsed.open_cases.map((tc, tcIdx) => {
                  const isHttp = mode === 'backend' || /^(GET|POST|PUT|PATCH|DELETE)\b/i.test(tc.input || '');
                  const httpTC = isHttp ? parseTestCaseToHttp(tc) : null;
                  const methodMeta = httpTC ? (HTTP_METHODS.find((m) => m.value === httpTC.http_method) || HTTP_METHODS[0]) : null;

                  return (
                    <div key={tcIdx} className="panel-card p-4 bg-[var(--bg-card)] border border-[var(--border)] space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
                        <span className="text-[11px] font-mono font-bold text-[var(--text-muted)]">
                          Case #{tcIdx + 1}
                        </span>
                        {isHttp && (
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            <span className={`px-2 py-0.5 rounded font-bold border ${methodMeta.color}`}>
                              {httpTC.http_method}
                            </span>
                            <span className="px-1.5 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              {httpTC.expected_status}
                            </span>
                          </div>
                        )}
                      </div>

                      {isHttp ? (
                        <div className="space-y-2 font-mono text-[12px]">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Endpoint:</span>
                            <div className="p-1.5 bg-[var(--bg-input)] rounded border border-[var(--border)] text-[var(--text-primary)] font-bold">
                              {httpTC.path}
                            </div>
                          </div>
                          {httpTC.input_body && (
                            <div>
                              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Request Body:</span>
                              <pre className="p-2 bg-[#21252b] rounded border border-[#303642] text-cyan-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                                {httpTC.input_body}
                              </pre>
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[var(--accent)] block">Expected Response ({httpTC.expected_status}):</span>
                            <pre className="p-2 bg-[#21252b] rounded border border-[#303642] text-emerald-300 text-[11px] overflow-x-auto whitespace-pre-wrap font-bold">
                              {httpTC.expected_body || '(empty body)'}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 font-mono text-[12px]">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Input (stdin):</span>
                            <div className="p-2 bg-[var(--bg-input)] rounded border border-[var(--border)] text-[var(--text-primary)] overflow-x-auto">
                              {tc.input || '(empty)'}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[var(--accent)] block">Expected Output (stdout):</span>
                            <div className="p-2 bg-[var(--bg-input)] rounded border border-[var(--border)] text-[var(--text-primary)] font-bold overflow-x-auto">
                              {tc.output || '(empty)'}
                            </div>
                          </div>
                          {tc.explanation && (
                            <div>
                              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Explanation:</span>
                              <div className="p-1.5 bg-[var(--bg-raised)] rounded text-[11px] text-[var(--text-secondary)]">
                                {tc.explanation}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hidden Grading Test Cases */}
          {parsed.hidden_cases?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
                  <Lock className="w-4 h-4 text-[var(--amber)]" />
                  <span>{mode === 'backend' ? 'Hidden Grading Endpoints' : 'Hidden Grading Test Cases'}</span>
                  <span className="text-[10px] font-mono bg-[var(--amber-bg)] text-[var(--amber)] px-2 py-0.5 rounded font-semibold">
                    Private / Evaluation Only
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {parsed.hidden_cases.length} {parsed.hidden_cases.length === 1 ? 'Hidden Case' : 'Hidden Cases'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {parsed.hidden_cases.map((tc, tcIdx) => {
                  const isHttp = mode === 'backend' || /^(GET|POST|PUT|PATCH|DELETE)\b/i.test(tc.input || '');
                  const httpTC = isHttp ? parseTestCaseToHttp(tc) : null;
                  const methodMeta = httpTC ? (HTTP_METHODS.find((m) => m.value === httpTC.http_method) || HTTP_METHODS[0]) : null;

                  return (
                    <div key={tcIdx} className="panel-card p-4 bg-[var(--amber-bg)]/15 border border-[var(--amber)]/30 space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--amber)]/20">
                        <span className="text-[11px] font-mono font-bold text-[var(--amber)]">
                          Hidden Case #{tcIdx + 1}
                        </span>
                        {isHttp && (
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            <span className={`px-2 py-0.5 rounded font-bold border ${methodMeta.color}`}>
                              {httpTC.http_method}
                            </span>
                            <span className="px-1.5 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              {httpTC.expected_status}
                            </span>
                          </div>
                        )}
                      </div>

                      {isHttp ? (
                        <div className="space-y-2 font-mono text-[12px]">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Endpoint:</span>
                            <div className="p-1.5 bg-[var(--bg-input)] rounded border border-[var(--border)] text-[var(--text-primary)] font-bold">
                              {httpTC.path}
                            </div>
                          </div>
                          {httpTC.input_body && (
                            <div>
                              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Request Body:</span>
                              <pre className="p-2 bg-[#21252b] rounded border border-[#303642] text-cyan-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                                {httpTC.input_body}
                              </pre>
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[var(--amber)] block">Expected Response ({httpTC.expected_status}):</span>
                            <pre className="p-2 bg-[#21252b] rounded border border-[#303642] text-emerald-300 text-[11px] overflow-x-auto whitespace-pre-wrap font-bold">
                              {httpTC.expected_body || '(empty body)'}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 font-mono text-[12px]">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Hidden Input (stdin):</span>
                            <div className="p-2 bg-[var(--bg-input)] rounded border border-[var(--border)] text-[var(--text-secondary)] overflow-x-auto">
                              {tc.input || '(empty)'}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[var(--amber)] block">Expected Output (stdout):</span>
                            <div className="p-2 bg-[var(--bg-input)] rounded border border-[var(--border)] text-[var(--text-primary)] font-bold overflow-x-auto">
                              {tc.output || '(empty)'}
                            </div>
                          </div>
                          {tc.explanation && (
                            <div>
                              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Explanation:</span>
                              <div className="p-1.5 bg-[var(--bg-raised)] rounded text-[11px] text-[var(--text-secondary)]">
                                {tc.explanation}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3B. DATABASE SCHEMA & SQL SPECIFICATIONS */}
      {mode === 'database' && (
        <div className="space-y-6">
          {/* Pre-Seeded Schema DDL */}
          {parsed.starter_code && (
            <div className="panel-card overflow-hidden border border-blue-500/30">
              <div className="p-3 bg-blue-500/10 border-b border-blue-500/20 flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  <span>Pre-Seeded Schema DDL (CREATE TABLE statements)</span>
                </span>
                <button
                  onClick={() => handleCopy(parsed.starter_code, 'schema_ddl')}
                  className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] hover:text-blue-500 transition"
                >
                  {copiedKey === 'schema_ddl' ? <Check className="w-3.5 h-3.5 text-[var(--green)]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'schema_ddl' ? 'Copied' : 'Copy DDL'}</span>
                </button>
              </div>
              <div className="p-4 bg-[#21252b] font-mono text-[12px] text-cyan-300 overflow-x-auto border-t border-[#303642]">
                <pre className="leading-relaxed">{parsed.starter_code}</pre>
              </div>
            </div>
          )}

          {/* Initial Seed Records */}
          {parsed.seed_data && (
            <div className="panel-card overflow-hidden border border-emerald-500/30">
              <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Initial Seed Records (INSERT INTO statements)</span>
                </span>
                <button
                  onClick={() => handleCopy(parsed.seed_data, 'seed_data')}
                  className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] hover:text-emerald-500 transition"
                >
                  {copiedKey === 'seed_data' ? <Check className="w-3.5 h-3.5 text-[var(--green)]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'seed_data' ? 'Copied' : 'Copy SQL'}</span>
                </button>
              </div>
              <div className="p-4 bg-[#21252b] font-mono text-[12px] text-emerald-300 overflow-x-auto border-t border-[#303642]">
                <pre className="leading-relaxed">{parsed.seed_data}</pre>
              </div>
            </div>
          )}

          {/* Optimal Solution SQL Query */}
          {parsed.expected_approach && (
            <div className="panel-card overflow-hidden border border-amber-500/40 bg-[var(--amber-bg)]/10">
              <div className="p-3 bg-[var(--amber-bg)]/30 border-b border-[var(--amber)]/30 flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--amber)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Optimal Solution SQL Query (Benchmark for Assessor)</span>
                </span>
                <button
                  onClick={() => handleCopy(parsed.expected_approach, 'sql_approach')}
                  className="flex items-center gap-1 text-[11px] font-mono text-[var(--amber)] hover:underline transition"
                >
                  {copiedKey === 'sql_approach' ? <Check className="w-3.5 h-3.5 text-[var(--green)]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'sql_approach' ? 'Copied' : 'Copy Query'}</span>
                </button>
              </div>
              <div className="p-4 bg-[#21252b] font-mono text-[12px] text-amber-300 overflow-x-auto border-t border-[#303642]">
                <pre className="leading-relaxed">{parsed.expected_approach}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3C. VERBAL Q&A SPECIFICATIONS */}
      {mode === 'verbal_qa' && (
        <div className="space-y-6">
          {parsed.ideal_answer && (
            <div className="panel-card p-5 bg-[var(--amber-bg)]/20 border border-[var(--amber)]/30 space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--amber)] block">
                Exemplary / Model Answer (Assessor Benchmark):
              </span>
              <p className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-ui">
                {parsed.ideal_answer}
              </p>
            </div>
          )}

          {parsed.rubrics?.length > 0 && (
            <div className="panel-card p-5 space-y-3">
              <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Evaluation Rubrics & Scoring Criteria:
              </span>
              <ul className="space-y-2">
                {parsed.rubrics.map((r, rIdx) => (
                  <li key={rIdx} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                    <Check className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 3D. MCQ MULTIPLE-CHOICE SPECIFICATIONS */}
      {mode === 'mcq' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Answer Choices & Verification:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {parsed.options?.map((opt) => {
                const isCorrect = opt.id === parsed.correct_option || opt.is_correct;
                return (
                  <div
                    key={opt.id}
                    className={`p-4 rounded-[var(--radius-md)] border flex items-center justify-between gap-3 ${
                      isCorrect
                        ? 'bg-[var(--green-bg)] border-[var(--green)]/50 text-[var(--green)] font-semibold shadow-[var(--shadow-sm)]'
                        : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-[12px] ${
                        isCorrect
                          ? 'bg-[var(--green)] text-white'
                          : 'bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)]'
                      }`}>
                        {opt.id}
                      </span>
                      <span className="text-[13px]">{opt.text}</span>
                    </div>
                    {isCorrect && (
                      <span className="text-[10px] font-mono uppercase font-bold bg-[var(--green)] text-white px-2 py-0.5 rounded shrink-0">
                        Correct Option
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {parsed.explanation && (
            <div className="panel-card p-5 space-y-2 bg-[var(--bg-raised)] border border-[var(--border)]">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Answer Explanation & Solution Rationale:
              </span>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                {parsed.explanation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3E. WHITEBOARD & SYSTEM DESIGN SPECIFICATIONS */}
      {mode === 'whiteboard' && (
        <div className="space-y-6">
          {parsed.talking_points?.length > 0 && (
            <div className="panel-card p-5 space-y-3">
              <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Key Discussion Talking Points:
              </span>
              <div className="flex flex-wrap gap-2">
                {parsed.talking_points.map((tp, tpIdx) => (
                  <span key={tpIdx} className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] text-[12px]">
                    • {tp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {parsed.tradeoffs?.length > 0 && (
            <div className="panel-card p-5 space-y-3 bg-[var(--amber-bg)]/20 border border-[var(--amber)]/30">
              <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--amber)] block">
                Tradeoffs & Edge Cases to Challenge:
              </span>
              <div className="flex flex-wrap gap-2">
                {parsed.tradeoffs.map((to, toIdx) => (
                  <span key={toIdx} className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--amber)]/40 text-[12px]">
                    ⚠️ {to}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3F. FRONTEND (REACT) SPECIFICATIONS */}
      {mode === 'frontend' && (
        <div className="space-y-6">
          {parsed.starter_code && (
            <div className="panel-card overflow-hidden border border-cyan-500/30">
              <div className="p-3 bg-cyan-500/10 border-b border-cyan-500/20 flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-500 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" />
                  <span>Starter React JSX Component</span>
                </span>
                <button
                  onClick={() => handleCopy(parsed.starter_code, 'react_jsx')}
                  className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] hover:text-cyan-500 transition"
                >
                  {copiedKey === 'react_jsx' ? <Check className="w-3.5 h-3.5 text-[var(--green)]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'react_jsx' ? 'Copied' : 'Copy JSX'}</span>
                </button>
              </div>
              <div className="p-4 bg-[#21252b] font-mono text-[12px] text-cyan-300 overflow-x-auto border-t border-[#303642]">
                <pre className="leading-relaxed">{parsed.starter_code}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ASSESSOR SOLUTION BENCHMARK & COMPLEXITY (COMMON TO TECHNICAL FORMATS) */}
      {(parsed.expected_approach || parsed.expected_complexity || (parsed.ideal_answer && mode !== 'verbal_qa')) && (
        <div className="panel-card p-5 border border-[var(--border)] space-y-4">
          <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>Assessor Solution Benchmark & Target Complexity</span>
          </h3>

          {/* Expected Approach (if not database mode where it's already shown as SQL query) */}
          {parsed.expected_approach && mode !== 'database' && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent)] block">
                Optimal Approach & Algorithm Breakdown
              </span>
              <div className="text-[13px] text-[var(--text-primary)] whitespace-pre-line leading-relaxed font-ui p-3 bg-[var(--bg-raised)] rounded border border-[var(--border)]">
                {parsed.expected_approach}
              </div>
            </div>
          )}

          {/* Expected Complexity */}
          {parsed.expected_complexity && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Target Time & Space Complexity
                </span>
              </div>
              <div className="font-mono text-[12px] text-[var(--text-primary)] whitespace-pre-line font-semibold p-3 bg-[var(--bg-card)] rounded border border-[var(--border)]">
                {parsed.expected_complexity}
              </div>
            </div>
          )}

          {/* Ideal Answer for non-verbal modes if present */}
          {parsed.ideal_answer && mode !== 'verbal_qa' && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--amber)] block">
                Evaluator Benchmark / Key Concept Reference
              </span>
              <div className="text-[13px] text-[var(--text-primary)] whitespace-pre-line leading-relaxed font-ui p-3 bg-[var(--amber-bg)]/20 rounded border border-[var(--amber)]/30">
                {parsed.ideal_answer}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. ASSESSOR GUIDANCE: PROGRESSIVE HINTS & INTERVIEW PROBING TIPS */}
      {(parsed.hints?.length > 0 || parsed.interview_tips?.length > 0) && (
        <div className="panel-card p-5 border border-[var(--border)] space-y-5">
          <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span>Assessor Guidance & Tiered Hints</span>
          </h3>

          {/* Progressive Hints */}
          {parsed.hints?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[12px] font-bold text-[var(--text-primary)]">
                <span className="font-mono uppercase tracking-wider text-[var(--text-muted)] text-[11px]">
                  Progressive Hints (Unlocked as Needed)
                </span>
                <span className="text-[10px] font-mono bg-[var(--amber-bg)] text-[var(--amber)] px-2 py-0.5 rounded font-semibold">
                  {parsed.hints.length} {parsed.hints.length === 1 ? 'Hint' : 'Hints'}
                </span>
              </div>
              <div className="space-y-2">
                {parsed.hints.map((h, hIdx) => (
                  <div key={hIdx} className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] flex items-start gap-3 shadow-[var(--shadow-sm)]">
                    <span className="w-6 h-6 rounded-full bg-[var(--amber-bg)] text-[var(--amber)] font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {hIdx + 1}
                    </span>
                    <div className="space-y-0.5 flex-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">
                        Hint Tier {hIdx + 1}
                      </span>
                      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                        {h}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interview Tips & Probing Guide */}
          {parsed.interview_tips?.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Interviewer Probing Tips & Evaluator Questions
                </span>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-semibold">
                  {parsed.interview_tips.length} {parsed.interview_tips.length === 1 ? 'Tip' : 'Tips'}
                </span>
              </div>
              <ul className="space-y-2">
                {parsed.interview_tips.map((tip, tipIdx) => (
                  <li key={tipIdx} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)] p-2.5 rounded bg-[var(--bg-card)] border border-[var(--border)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                    <span className="flex-1">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
