import React, { useState } from 'react';
import {
  ArrowLeft, Edit2, Trash2, AlertCircle, Sparkles, Clock, Lightbulb,
  Target, Check, Copy, Eye, Lock
} from 'lucide-react';
import { getModeMeta } from './constants';

export default function QuestionDetailView({
  currentQuestion,
  currentLevel,
  trackId,
  levelId,
  onBack,
  onEdit,
  onDelete,
}) {
  const [copiedCode, setCopiedCode] = useState(false);

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

  const detail = currentQuestion.detail || {};
  const templates = currentQuestion.templates || [];
  const jsTmpl = templates.find((t) => t.language === 'javascript');
  const hints = (currentQuestion.hints || []).filter((h) => h.type === 'hint').map((h) => h.content);
  const interviewTips = (currentQuestion.hints || []).filter((h) => h.type === 'interview_tip').map((h) => h.content);
  const rubrics = (currentQuestion.hints || []).filter((h) => h.type === 'rubric').map((h) => h.content);
  const talkingPoints = (currentQuestion.hints || []).filter((h) => h.type === 'talking_point').map((h) => h.content);
  const tradeoffs = (currentQuestion.hints || []).filter((h) => h.type === 'tradeoff').map((h) => h.content);

  const modeMeta = getModeMeta(currentLevel?.mode);
  const ModeIcon = modeMeta.icon;
  const openCases = (currentQuestion.test_cases || [])
    .filter((tc) => !tc.is_hidden)
    .map((tc) => ({ input: tc.input, output: tc.expected_output }));
  const hiddenCases = (currentQuestion.test_cases || [])
    .filter((tc) => tc.is_hidden)
    .map((tc) => ({ input: tc.input, output: tc.expected_output }));

  const parsed = {
    starter_code: jsTmpl ? jsTmpl.starter_code : '',
    constraints: detail.constraints,
    expected_approach: detail.expected_approach,
    expected_complexity: detail.expected_complexity,
    ideal_answer: detail.ideal_answer,
    scenario: detail.scenario,
    correct_option: detail.correct_option,
    explanation: detail.explanation,
    hints,
    interview_tips: interviewTips,
    rubrics,
    talking_points: talkingPoints,
    tradeoffs,
    options: (currentQuestion.mcq_options || []).map((o) => ({ id: o.option_key, text: o.option_text, is_correct: o.is_correct })),
  };

  return (
    <div className="space-y-6">
      {/* Question Overview Header Card */}
      <div className="panel-card p-6 bg-[var(--bg-raised)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1 rounded-full border ${modeMeta.bg} ${modeMeta.color} ${modeMeta.border}`}>
              <ModeIcon className="w-3.5 h-3.5" />
              <span>{modeMeta.label} Assessment</span>
            </span>
            <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded ${
              currentQuestion.difficulty === 'Easy' ? 'bg-[var(--green-bg)] text-[var(--green)]' :
              currentQuestion.difficulty === 'Hard' ? 'bg-[var(--red-bg)] text-[var(--red)]' :
              'bg-[var(--amber-bg)] text-[var(--amber)]'
            }`}>
              {currentQuestion.difficulty} Difficulty
            </span>
            <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-card)] px-2.5 py-1 rounded border border-[var(--border)]">
              Level {currentLevel?.level_number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Questions</span>
            </button>
            <button
              onClick={onEdit}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Question</span>
            </button>
            <button
              onClick={onDelete}
              className="btn btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-[20px] font-bold text-[var(--text-primary)]">
            {currentQuestion.title}
          </h2>
        </div>
      </div>

      {/* Problem Statement Card */}
      <div className="panel-card p-6 space-y-3">
        <h3 className="text-[13px] font-bold font-mono uppercase tracking-wider text-[var(--text-muted)]">
          Problem Statement
        </h3>
        <div className="text-[14px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-ui">
          {currentQuestion.prompt}
        </div>
      </div>

      {/* 1. CODING & BACKEND SPECIFICATIONS */}
      {(currentLevel?.mode === 'coding' || currentLevel?.mode === 'backend') && (
        <div className="space-y-6">
          {/* Constraints */}
          {parsed.constraints && (
            <div className="panel-card p-5 space-y-2 border-l-4 border-l-[var(--accent)]">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Constraints & Limits
              </span>
              <div className="font-mono text-[12px] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                {parsed.constraints}
              </div>
            </div>
          )}

          {/* Expected Solution Approach */}
          {parsed.expected_approach && (
            <div className="panel-card p-5 space-y-2 border-l-4 border-l-[var(--accent)] bg-[var(--bg-raised)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--accent)]">
                  Solution Expected Approach
                </span>
              </div>
              <div className="text-[13px] text-[var(--text-primary)] whitespace-pre-line leading-relaxed font-ui">
                {parsed.expected_approach}
              </div>
            </div>
          )}

          {/* Expected Complexity */}
          {parsed.expected_complexity && (
            <div className="panel-card p-4 space-y-1.5 bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Expected Complexity Target
                </span>
              </div>
              <div className="font-mono text-[12px] text-[var(--text-primary)] whitespace-pre-line font-semibold">
                {parsed.expected_complexity}
              </div>
            </div>
          )}

          {/* Progressive Hints */}
          {parsed.hints?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
                <Lightbulb className="w-4 h-4 text-[var(--amber)]" />
                <span>Progressive Hints</span>
                <span className="text-[10px] font-mono bg-[var(--amber-bg)] text-[var(--amber)] px-2 py-0.5 rounded font-semibold">
                  {parsed.hints.length} {parsed.hints.length === 1 ? 'Hint' : 'Hints'} Available
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
                        Hint {hIdx + 1}
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

          {/* Interview Tips for Coding Mode */}
          {parsed.interview_tips?.length > 0 && (
            <div className="panel-card p-5 space-y-3 bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Interview Tips & Evaluator Probing Questions
                </span>
              </div>
              <ul className="space-y-2">
                {parsed.interview_tips.map((tip, tipIdx) => (
                  <li key={tipIdx} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Starter Code */}
          {parsed.starter_code && (
            <div className="panel-card overflow-hidden border border-[var(--border)]">
              <div className="p-3 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent)]">
                  Starter Template (Candidate Editor Default)
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(parsed.starter_code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-[var(--green)]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <div className="p-4 bg-[var(--bg-input)] font-mono text-[12px] text-[var(--text-primary)] overflow-x-auto">
                <pre className="leading-relaxed">{parsed.starter_code}</pre>
              </div>
            </div>
          )}

          {/* Open / Sample Test Cases */}
          {openCases.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
                  <Eye className="w-4 h-4 text-[var(--accent)]" />
                  <span>Sample / Open Test Cases</span>
                  <span className="text-[10px] font-mono bg-[var(--accent-dim)] text-[var(--accent)] px-2 py-0.5 rounded font-semibold">
                    Visible to Candidate
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {openCases.length} {openCases.length === 1 ? 'Case' : 'Cases'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {openCases.map((tc, tcIdx) => (
                  <div key={tcIdx} className="panel-card p-4 bg-[var(--bg-card)] border border-[var(--border)] space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
                      <span className="text-[11px] font-mono font-bold text-[var(--text-muted)]">
                        Test Case #{tcIdx + 1}
                      </span>
                    </div>
                    <div className="space-y-1.5 font-mono text-[12px]">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Input:</span>
                        <div className="p-2 bg-[var(--bg-input)] rounded border border-[var(--border)] text-[var(--text-primary)] overflow-x-auto">
                          {tc.input || '(empty)'}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[var(--accent)] block">Expected Output:</span>
                        <div className="p-2 bg-[var(--bg-input)] rounded border border-[var(--border)] text-[var(--text-primary)] font-bold overflow-x-auto">
                          {tc.output || '(empty)'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden Test Cases */}
          {hiddenCases.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
                  <Lock className="w-4 h-4 text-[var(--amber)]" />
                  <span>Hidden Test Cases</span>
                  <span className="text-[10px] font-mono bg-[var(--amber-bg)] text-[var(--amber)] px-2 py-0.5 rounded font-semibold">
                    Grading & Auto-Evaluation Only
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {hiddenCases.length} {hiddenCases.length === 1 ? 'Hidden Case' : 'Hidden Cases'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hiddenCases.map((tc, tcIdx) => (
                  <div key={tcIdx} className="panel-card p-4 bg-[var(--amber-bg)]/20 border border-[var(--amber)]/30 space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[var(--amber)]/20">
                      <span className="text-[11px] font-mono font-bold text-[var(--amber)]">
                        Hidden Case #{tcIdx + 1}
                      </span>
                    </div>
                    <div className="space-y-1.5 font-mono text-[12px]">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Input:</span>
                        <div className="p-2 bg-[var(--bg-input)] rounded border border-[var(--border)] text-[var(--text-secondary)] overflow-x-auto">
                          {tc.input || '(empty)'}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[var(--amber)] block">Expected Output:</span>
                        <div className="p-2 bg-[var(--bg-input)] rounded border border-[var(--border)] text-[var(--text-primary)] font-bold overflow-x-auto">
                          {tc.output || '(empty)'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. VERBAL Q&A SPECIFICATIONS */}
      {currentLevel?.mode === 'verbal_qa' && (
        <div className="space-y-6">
          {parsed.ideal_answer && (
            <div className="panel-card p-5 bg-[var(--amber-bg)]/30 border border-[var(--amber)]/30 space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--amber)] block">
                Key Evaluator Note / Model Answer:
              </span>
              <p className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
                {parsed.ideal_answer}
              </p>
            </div>
          )}

          {parsed.rubrics?.length > 0 && (
            <div className="panel-card p-5 space-y-3">
              <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Scoring Rubrics & Evaluation Criteria:
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

          {parsed.interview_tips?.length > 0 && (
            <div className="panel-card p-5 space-y-3 bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Interview Tips & Probing Questions
                </span>
              </div>
              <ul className="space-y-2">
                {parsed.interview_tips.map((tip, tipIdx) => (
                  <li key={tipIdx} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 3. MCQ SPECIFICATIONS */}
      {currentLevel?.mode === 'mcq' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Answer Choices:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {parsed.options?.map((opt) => {
                const isCorrect = opt.id === parsed.correct_option;
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
            <div className="panel-card p-5 space-y-2 bg-[var(--bg-raised)]">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Answer Explanation & Reference:
              </span>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                {parsed.explanation}
              </p>
            </div>
          )}

          {parsed.interview_tips?.length > 0 && (
            <div className="panel-card p-5 space-y-3 bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Key Concepts & Diagnostic Tips
                </span>
              </div>
              <ul className="space-y-2">
                {parsed.interview_tips.map((tip, tipIdx) => (
                  <li key={tipIdx} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 4. WHITEBOARD & ARCHITECTURE SPECIFICATIONS */}
      {(currentLevel?.mode === 'whiteboard' || currentLevel?.mode === 'discussion') && (
        <div className="space-y-6">
          {parsed.scenario && (
            <div className="panel-card p-5 space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Architecture / Scenario Context:
              </span>
              <p className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
                {parsed.scenario}
              </p>
            </div>
          )}

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

          {parsed.interview_tips?.length > 0 && (
            <div className="panel-card p-5 space-y-3 bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Interviewer Facilitation & Probing Guide
                </span>
              </div>
              <ul className="space-y-2">
                {parsed.interview_tips.map((tip, tipIdx) => (
                  <li key={tipIdx} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 5. FRONTEND (REACT) SPECIFICATIONS */}
      {currentLevel?.mode === 'frontend' && (
        <div className="space-y-6">
          {parsed.scenario && (
            <div className="panel-card p-5 space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-500 block">
                Frontend Design & Layout Criteria:
              </span>
              <p className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
                {parsed.scenario}
              </p>
            </div>
          )}

          {parsed.constraints && (
            <div className="panel-card p-5 space-y-2 bg-[var(--bg-raised)]">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Responsive Breakpoints & Limits:
              </span>
              <p className="text-[13px] font-mono text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                {parsed.constraints}
              </p>
            </div>
          )}

          {parsed.starter_code && (
            <div className="panel-card p-5 space-y-2 bg-[#282c34] border border-[#3e4451] text-gray-200">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                Starter React JSX Component:
              </span>
              <pre className="text-[12px] font-mono p-3 bg-[#21252b] rounded-lg overflow-x-auto text-cyan-300">
                {parsed.starter_code}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
