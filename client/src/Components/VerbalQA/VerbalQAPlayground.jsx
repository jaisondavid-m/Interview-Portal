import React, { useState, useEffect, useMemo } from 'react';
import {
  Mic,
  MessageSquare,
  Sparkles,
  Award,
  BookOpen,
  CheckCircle2,
  ListOrdered,
  HelpCircle,
  FileText,
  Eye,
  CheckSquare,
  Square,
  Info,
  Layers,
  Flame,
  Lightbulb,
  Maximize2,
  Minimize2,
  Copy,
  Check
} from 'lucide-react';

export default function VerbalQAPlayground({
  question = null,
  payload = {},
  code = '',
  onCodeChange = null,
  isEditable = true,
  candidateName = 'Candidate',
  currentUserRole = 'interviewee',
  sessionId = null,
  round = 1,
}) {
  const [notes, setNotes] = useState(code || '');
  const [interviewerTab, setInterviewerTab] = useState('benchmark'); // 'benchmark' | 'rubrics' | 'probing'
  const [checklist, setChecklist] = useState({});
  const [copiedBenchmark, setCopiedBenchmark] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync external notes updates (e.g. interviewer watching candidate notes live)
  useEffect(() => {
    if (code !== undefined && code !== null && code !== notes) {
      setNotes(code);
    }
  }, [code]);

  const handleNotesChange = (val) => {
    setNotes(val);
    if (onCodeChange && isEditable) {
      onCodeChange(val);
    }
  };

  const handleInsertSnippet = (snippet) => {
    if (!isEditable) return;
    const updated = notes ? `${notes}\n\n${snippet}` : snippet;
    handleNotesChange(updated);
  };

  const toggleChecklistItem = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Fullscreen keyboard handler (F / Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          setIsFullscreen((prev) => !prev);
        }
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Extract Question Details
  const title = question?.title || 'Verbal Q&A & Conceptual Discussion';
  const prompt = question?.prompt || 'Discuss the conceptual topic and explain your architectural approach verbally with your peer interviewer.';
  const difficulty = question?.difficulty || 'Medium';
  const scenario = payload?.scenario || question?.detail?.scenario || '';
  const constraints = payload?.constraints || question?.detail?.constraints || '';
  const idealAnswer = payload?.ideal_answer || question?.ideal_answer || question?.detail?.ideal_answer || '';
  const talkingPoints = payload?.talking_points || question?.talking_points || [];
  const tradeoffs = payload?.tradeoffs || question?.tradeoffs || [];
  const rubrics = payload?.rubrics || question?.rubrics || [];
  const interviewTips = payload?.interview_tips || question?.interview_tips || [];

  const handleCopyBenchmark = () => {
    if (!idealAnswer) return;
    navigator.clipboard.writeText(idealAnswer);
    setCopiedBenchmark(true);
    setTimeout(() => setCopiedBenchmark(false), 2000);
  };

  return (
    <div
      className={`flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden shadow-lg transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none w-screen h-screen'
          : 'min-h-[660px]'
      }`}
    >
      {/* ============================================================ */}
      {/* TOP HEADER: Mode Info, Live Voice Status & Fullscreen */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20 font-mono text-xs shadow-xs">
            <Mic className="w-3.5 h-3.5 animate-pulse text-purple-500" />
            <span>Verbal Q&A Discussion • Round {round}</span>
          </div>

          {!isEditable && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
              <Eye className="w-3.5 h-3.5" />
              <span>Assessor Live Observer • {candidateName}</span>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono text-[var(--text-muted)]">
            <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
            <span>Interactive Dialogue Mode</span>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MAIN WORKSPACE: Discussion Topic + Notes Pad / Assessor Guide */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
        {/* LEFT / MAIN COLUMN: Topic, Scenario & Discussion Prompt */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-5">
          {/* Topic & Prompt Card */}
          <div className="space-y-3 bg-[var(--bg-raised)]/40 p-5 rounded-xl border border-[var(--border)] shadow-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                Discussion Topic
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]">
                {difficulty} Difficulty
              </span>
            </div>

            <h2 className="text-lg md:text-xl font-bold text-[var(--text-primary)] leading-tight">
              {title}
            </h2>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
              {prompt}
            </p>
          </div>

          {/* Scenario Context (if present) */}
          {scenario && (
            <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] font-mono">
                <Layers className="w-4 h-4 text-purple-500" />
                <span>Domain Scenario Context:</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                {scenario}
              </p>
            </div>
          )}

          {/* Constraints & Scope (if present) */}
          {constraints && (
            <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] font-mono">
                <Info className="w-4 h-4 text-amber-500" />
                <span>Discussion Scope & Key Constraints:</span>
              </div>
              <div className="text-xs font-mono text-[var(--text-muted)] whitespace-pre-line leading-relaxed">
                {constraints}
              </div>
            </div>
          )}

          {/* Live Discussion Notes & Talking Points Pad */}
          <div className="flex-1 flex flex-col space-y-2 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-mono font-bold uppercase text-[var(--text-muted)] tracking-wider">
                  {isEditable ? 'Your Discussion Notes & Talking Points' : `${candidateName}'s Live Discussion Notes`}
                </span>
              </div>

              {isEditable && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('• Core Concept & Definition:\n')}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] cursor-pointer"
                  >
                    + Concept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('• Tradeoffs & Advantages:\n')}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] cursor-pointer"
                  >
                    + Tradeoffs
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('• Real-World Architecture Example:\n')}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] cursor-pointer"
                  >
                    + Example
                  </button>
                </div>
              )}
            </div>

            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              readOnly={!isEditable}
              placeholder={
                isEditable
                  ? 'Structure your verbal explanation here...\n\n1. High-level summary\n2. Key architectural components\n3. Trade-offs and edge-cases\n4. Real-world applications'
                  : `${candidateName} has not written any notes yet.`
              }
              rows={8}
              className={`w-full p-4 text-xs font-mono rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] leading-relaxed resize-y outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 ${
                !isEditable ? 'cursor-default bg-[var(--bg-raised)]/30' : ''
              }`}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (Assessor Guide / Interviewer Evaluation Hub) */}
        <div className="lg:w-[420px] xl:w-[460px] flex flex-col bg-[var(--bg-raised)]/30 overflow-hidden">
          {/* Interviewer Assessor Tabs */}
          <div className="flex items-center p-2 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-1 text-xs font-mono font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setInterviewerTab('benchmark')}
              className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                interviewerTab === 'benchmark'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Model Answer</span>
            </button>

            <button
              type="button"
              onClick={() => setInterviewerTab('rubrics')}
              className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                interviewerTab === 'rubrics'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Rubrics ({rubrics.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setInterviewerTab('probing')}
              className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                interviewerTab === 'probing'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Probing Qs</span>
            </button>
          </div>

          {/* TAB 1: MODEL / EXEMPLARY ANSWER (Interviewer Assessor Benchmark) */}
          {interviewerTab === 'benchmark' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold uppercase text-[11px] text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Exemplary Model Response</span>
                </span>

                {idealAnswer && (
                  <button
                    type="button"
                    onClick={handleCopyBenchmark}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 text-[11px] font-mono cursor-pointer"
                  >
                    {copiedBenchmark ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedBenchmark ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              {idealAnswer ? (
                <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed shadow-xs">
                  {idealAnswer}
                </div>
              ) : (
                <div className="p-6 text-center text-[var(--text-muted)] italic bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
                  Exemplary model answer not specified. Evaluate candidate based on core architectural principles.
                </div>
              )}

              {/* Tradeoffs Card */}
              {tradeoffs.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-mono text-xs">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Key Tradeoffs to Expect</span>
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-[var(--text-secondary)]">
                    {tradeoffs.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EVALUATION RUBRICS & CHECKLIST */}
          {interviewerTab === 'rubrics' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              <div className="font-mono font-bold uppercase text-[11px] text-purple-600 dark:text-purple-400">
                Evaluation Criteria & Talking Rubrics
              </div>

              {rubrics.length > 0 ? (
                rubrics.map((rubric, idx) => {
                  const isChecked = !!checklist[`r_${idx}`];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleChecklistItem(`r_${idx}`)}
                      className={`p-3 rounded-xl border transition flex items-start gap-2.5 cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-[var(--text-primary)]'
                          : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-purple-400'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                      )}
                      <span className="text-xs leading-relaxed">{rubric}</span>
                    </div>
                  );
                })
              ) : (
                <div className="space-y-2">
                  {[
                    'Technical Accuracy: Clear explanation of core definitions and mechanics',
                    'Architectural Soundness: Evaluated scaling, reliability, and edge-cases',
                    'Communication Clarity: Well-structured verbal articulation with minimal hesitation',
                    'Tradeoff Analysis: Identified pros/cons of chosen approach vs alternatives'
                  ].map((stdRubric, idx) => {
                    const isChecked = !!checklist[`std_${idx}`];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleChecklistItem(`std_${idx}`)}
                        className={`p-3 rounded-xl border transition flex items-start gap-2.5 cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-[var(--text-primary)]'
                            : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-purple-400'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                        )}
                        <span className="text-xs leading-relaxed">{stdRubric}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROBING QUESTIONS & INTERVIEW TIPS */}
          {interviewerTab === 'probing' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
              <div className="font-mono font-bold uppercase text-[11px] text-purple-600 dark:text-purple-400">
                Follow-up Probing Questions & Assessor Tips
              </div>

              {talkingPoints.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] block">
                    Suggested Follow-up Prompts:
                  </span>
                  {talkingPoints.map((tp, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] text-xs text-[var(--text-secondary)] leading-relaxed"
                    >
                      🗣️ "{tp}"
                    </div>
                  ))}
                </div>
              )}

              {interviewTips.length > 0 && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-1.5">
                  <span className="font-bold text-blue-700 dark:text-blue-300 font-mono text-xs block">
                    Assessor Best Practices:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-[var(--text-secondary)]">
                    {interviewTips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
