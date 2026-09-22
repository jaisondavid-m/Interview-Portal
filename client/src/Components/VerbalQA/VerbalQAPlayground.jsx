import React, { useState, useEffect, useRef } from 'react';
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
  Check,
  Save,
  Loader2,
  Star
} from 'lucide-react';
import api from '../../api/axios';

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
  initialRubrics = '',
}) {
  const [notes, setNotes] = useState(code || '');
  const [interviewerTab, setInterviewerTab] = useState('benchmark'); // 'benchmark' | 'rubrics' | 'probing'
  const [copiedBenchmark, setCopiedBenchmark] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Interviewer Evaluation Rubrics State
  const [rubricScores, setRubricScores] = useState({}); // { [rubricId]: { checked: bool, rating: 'exceeded'|'met'|'needs_work', note: string } }
  const [overallRemarks, setOverallRemarks] = useState('');
  const [isSavingRubrics, setIsSavingRubrics] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const saveTimeoutRef = useRef(null);

  // Sync external notes updates (e.g. interviewer watching candidate notes live)
  useEffect(() => {
    if (code !== undefined && code !== null && code !== notes) {
      setNotes(code);
    }
  }, [code]);

  // Parse initial rubrics if provided from session
  useEffect(() => {
    if (initialRubrics) {
      try {
        const parsed = typeof initialRubrics === 'string' ? JSON.parse(initialRubrics) : initialRubrics;
        if (parsed?.scores) setRubricScores(parsed.scores);
        if (parsed?.overallRemarks) setOverallRemarks(parsed.overallRemarks);
        if (parsed?.updatedAt) setLastSavedTime(new Date(parsed.updatedAt));
      } catch (e) {
        // ignore parse error if plain text
      }
    }
  }, [initialRubrics]);

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

  // Debounced auto-save for interviewer rubrics
  const triggerAutoSaveRubrics = (newScores, newRemarks) => {
    if (currentUserRole !== 'interviewer' || !sessionId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSavingRubrics(true);
      try {
        const payloadData = {
          scores: newScores,
          overallRemarks: newRemarks,
          evaluatedByRole: currentUserRole,
          round,
          updatedAt: new Date().toISOString(),
        };
        await api.post(`/interviews/sessions/${sessionId}/rubrics`, {
          rubrics: JSON.stringify(payloadData),
        });
        setLastSavedTime(new Date());
      } catch (e) {
        console.error('Failed to auto-save rubrics evaluation:', e);
      } finally {
        setIsSavingRubrics(false);
      }
    }, 600);
  };

  const toggleRubricCheck = (key) => {
    const current = rubricScores[key] || { checked: false, rating: 'met', note: '' };
    const updated = {
      ...rubricScores,
      [key]: {
        ...current,
        checked: !current.checked,
      },
    };
    setRubricScores(updated);
    triggerAutoSaveRubrics(updated, overallRemarks);
  };

  const setRubricRating = (key, rating) => {
    const current = rubricScores[key] || { checked: true, rating: 'met', note: '' };
    const updated = {
      ...rubricScores,
      [key]: {
        ...current,
        checked: true,
        rating,
      },
    };
    setRubricScores(updated);
    triggerAutoSaveRubrics(updated, overallRemarks);
  };

  const setRubricNote = (key, note) => {
    const current = rubricScores[key] || { checked: true, rating: 'met', note: '' };
    const updated = {
      ...rubricScores,
      [key]: {
        ...current,
        note,
      },
    };
    setRubricScores(updated);
    triggerAutoSaveRubrics(updated, overallRemarks);
  };

  const handleOverallRemarksChange = (val) => {
    setOverallRemarks(val);
    triggerAutoSaveRubrics(rubricScores, val);
  };

  const handleManualSave = async () => {
    if (currentUserRole !== 'interviewer' || !sessionId) return;
    setIsSavingRubrics(true);
    try {
      const payloadData = {
        scores: rubricScores,
        overallRemarks,
        evaluatedByRole: currentUserRole,
        round,
        updatedAt: new Date().toISOString(),
      };
      await api.post(`/interviews/sessions/${sessionId}/rubrics`, {
        rubrics: JSON.stringify(payloadData),
      });
      setLastSavedTime(new Date());
    } catch (e) {
      console.error('Failed to save rubrics evaluation:', e);
    } finally {
      setIsSavingRubrics(false);
    }
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
  const rawRubrics = payload?.rubrics || question?.rubrics || [];
  const standardRubrics = [
    'Technical Accuracy: Clear explanation of core definitions and mechanics',
    'Architectural Soundness: Evaluated scaling, reliability, and edge-cases',
    'Communication Clarity: Well-structured verbal articulation with minimal hesitation',
    'Tradeoff Analysis: Identified pros/cons of chosen approach vs alternatives',
  ];
  const rubricsList = rawRubrics.length > 0 ? rawRubrics : standardRubrics;
  const interviewTips = payload?.interview_tips || question?.interview_tips || [];

  const handleCopyBenchmark = () => {
    if (!idealAnswer) return;
    navigator.clipboard.writeText(idealAnswer);
    setCopiedBenchmark(true);
    setTimeout(() => setCopiedBenchmark(false), 2000);
  };

  const isInterviewer = currentUserRole === 'interviewer';

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
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-bold border border-[var(--border-accent)] font-mono text-xs shadow-xs">
            <Mic className="w-3.5 h-3.5 animate-pulse text-[var(--accent)]" />
            <span>Verbal Q&A Discussion • Round {round}</span>
          </div>

          {isInterviewer ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] text-xs font-mono font-bold border border-[var(--border-accent)]">
              <Eye className="w-3.5 h-3.5" />
              <span>Assessor Perspective • Observing {candidateName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] text-xs font-mono font-bold border border-[var(--border-accent)]">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Candidate Discussion Workspace</span>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {isInterviewer && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] mr-2">
              {isSavingRubrics ? (
                <span className="flex items-center gap-1 text-[var(--accent)]">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving rubrics...</span>
                </span>
              ) : lastSavedTime ? (
                <span className="flex items-center gap-1 text-[var(--accent)] font-medium">
                  <Check className="w-3 h-3" />
                  <span>Rubrics Saved</span>
                </span>
              ) : null}
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono text-[var(--text-muted)]">
            <MessageSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
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
                <Info className="w-4 h-4 text-[var(--accent)]" />
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
                <FileText className="w-4 h-4 text-[var(--accent)]" />
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
              className={`w-full p-4 text-xs font-mono rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] leading-relaxed resize-y outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-dim)] ${
                !isEditable ? 'cursor-default bg-[var(--bg-raised)]/30' : ''
              }`}
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Assessor Evaluation Hub (ONLY for Interviewer) */}
        {/* Candidate does NOT see rubrics, probing questions, or model answer */}
        {/* ============================================================ */}
        {isInterviewer && (
          <div className="lg:w-[440px] xl:w-[480px] flex flex-col bg-[var(--bg-raised)]/30 overflow-hidden">
            {/* Interviewer Assessor Tabs */}
            <div className="flex items-center p-2 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-1 text-xs font-mono font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setInterviewerTab('benchmark')}
                className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  interviewerTab === 'benchmark'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
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
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Rubrics & Evaluation ({rubricsList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setInterviewerTab('probing')}
                className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  interviewerTab === 'probing'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Probing Qs</span>
              </button>
            </div>

            {/* TAB 1: MODEL / EXEMPLARY ANSWER */}
            {interviewerTab === 'benchmark' && (
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold uppercase text-[11px] text-[var(--accent)] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Exemplary Model Response</span>
                  </span>

                  {idealAnswer && (
                    <button
                      type="button"
                      onClick={handleCopyBenchmark}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 text-[11px] font-mono cursor-pointer"
                    >
                      {copiedBenchmark ? <Check className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Copy className="w-3.5 h-3.5" />}
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
                  <div className="p-4 bg-[var(--accent-dim)] border border-[var(--border-accent)] rounded-xl space-y-2">
                    <span className="font-bold text-[var(--accent)] flex items-center gap-1.5 font-mono text-xs">
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

            {/* TAB 2: EVALUATION RUBRICS & PERSISTENT CHECKLIST */}
            {interviewerTab === 'rubrics' && (
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--border)]">
                  <div>
                    <span className="font-mono font-bold uppercase text-[11px] text-[var(--accent)] block">
                      Assessor Rubrics Evaluation
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Mark criteria performance. Saves automatically for student and admin review.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleManualSave}
                    disabled={isSavingRubrics}
                    className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 cursor-pointer font-mono"
                  >
                    {isSavingRubrics ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    <span>Save Evaluation</span>
                  </button>
                </div>

                {/* Rubrics Criteria List */}
                <div className="space-y-3">
                  {rubricsList.map((rubricText, idx) => {
                    const key = `rubric_${idx}`;
                    const scoreObj = rubricScores[key] || { checked: false, rating: 'met', note: '' };
                    const isChecked = !!scoreObj.checked;
                    const rating = scoreObj.rating || 'met';

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                          isChecked
                            ? 'bg-[var(--accent-dim)]/50 border-[var(--border-accent)] shadow-xs'
                            : 'bg-[var(--bg-card)] border-[var(--border)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            onClick={() => toggleRubricCheck(key)}
                            className="flex items-start gap-2.5 cursor-pointer flex-1 select-none"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                            ) : (
                              <Square className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                            )}
                            <span className={`text-xs leading-relaxed ${isChecked ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                              {rubricText}
                            </span>
                          </div>
                        </div>

                        {/* Rating Pill Buttons & Assessor Note */}
                        {isChecked && (
                          <div className="pl-6 space-y-2 pt-1 border-t border-[var(--border)]/60">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase font-bold mr-1">
                                Rating:
                              </span>
                              {[
                                { id: 'needs_work', label: 'Needs Improvement', color: 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red-border)]' },
                                { id: 'met', label: 'Competent / Met', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]' },
                                { id: 'exceeded', label: 'Strong / Exceeded', color: 'bg-[var(--accent)] text-white border-[var(--accent)]' },
                              ].map((pill) => (
                                <button
                                  key={pill.id}
                                  type="button"
                                  onClick={() => setRubricRating(key, pill.id)}
                                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition cursor-pointer font-bold ${
                                    rating === pill.id
                                      ? pill.color + ' ring-1 ring-[var(--accent)]'
                                      : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'
                                  }`}
                                >
                                  {pill.label}
                                </button>
                              ))}
                            </div>

                            <input
                              type="text"
                              value={scoreObj.note || ''}
                              onChange={(e) => setRubricNote(key, e.target.value)}
                              placeholder="Add observation note for this rubric criterion..."
                              className="w-full text-[11px] p-2 rounded-lg bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-purple-500"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Overall Assessor Remarks for Candidate & Admin */}
                <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] space-y-2">
                  <span className="font-bold text-xs font-mono text-[var(--text-primary)] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-500" />
                    <span>Overall Verbal Evaluation Summary & Notes:</span>
                  </span>
                  <textarea
                    value={overallRemarks}
                    onChange={(e) => handleOverallRemarksChange(e.target.value)}
                    placeholder="Write summary evaluation notes on candidate's technical clarity, architecture depth, communication, and key strengths..."
                    rows={3}
                    className="w-full text-xs font-mono p-3 rounded-lg bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-purple-500 resize-y"
                  />
                </div>
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
        )}
      </div>
    </div>
  );
}
