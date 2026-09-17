import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Send,
  Eye,
  Sparkles,
  Award,
  AlertCircle,
  RotateCcw,
  ListOrdered,
  Clock,
  CheckSquare,
  Square,
  Info,
  UserCheck,
  Target
} from 'lucide-react';

export default function MCQPlayground({
  questions = [],
  code = '',
  onCodeChange = null,
  isEditable = true,
  candidateName = 'Candidate',
  currentUserRole = 'interviewee',
  sessionId = null,
  round = 1,
}) {
  // Normalize questions list
  const safeQuestions = useMemo(() => {
    if (Array.isArray(questions) && questions.length > 0) {
      return questions;
    }
    return [];
  }, [questions]);

  // Parse candidate state from synchronized string: { answers: { [qId]: 'A' }, currentIndex: 0, submitted: false }
  const parsedState = useMemo(() => {
    if (!code || typeof code !== 'string') {
      return { answers: {}, currentIndex: 0, submitted: false };
    }
    try {
      if (code.startsWith('{') && code.includes('"answers"')) {
        const parsed = JSON.parse(code);
        return {
          answers: parsed.answers || {},
          currentIndex: typeof parsed.currentIndex === 'number' ? parsed.currentIndex : 0,
          submitted: !!parsed.submitted,
        };
      }
    } catch (e) {
      // Fallback
    }
    return { answers: {}, currentIndex: 0, submitted: false };
  }, [code]);

  const [currentIndex, setCurrentIndex] = useState(parsedState.currentIndex || 0);
  const [answers, setAnswers] = useState(parsedState.answers || {});
  const [submitted, setSubmitted] = useState(parsedState.submitted || false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [followCandidate, setFollowCandidate] = useState(true);

  // Sync external changes (e.g. interviewer receiving updates from candidate)
  useEffect(() => {
    if (parsedState.answers) {
      setAnswers(parsedState.answers);
    }
    if (parsedState.submitted !== undefined) {
      setSubmitted(parsedState.submitted);
    }
    // If interviewer has "followCandidate" enabled, sync active question index
    if (!isEditable && followCandidate && typeof parsedState.currentIndex === 'number') {
      if (parsedState.currentIndex >= 0 && parsedState.currentIndex < (safeQuestions.length || 1)) {
        setCurrentIndex(parsedState.currentIndex);
      }
    }
  }, [parsedState, isEditable, followCandidate, safeQuestions.length]);

  // Combined change emitter
  const emitChange = useCallback((newAnswers, newIndex, isSub = false) => {
    if (onCodeChange && isEditable) {
      const payload = JSON.stringify({
        answers: newAnswers,
        currentIndex: newIndex,
        submitted: isSub,
        updatedAt: new Date().toISOString(),
      });
      onCodeChange(payload);
    }
  }, [onCodeChange, isEditable]);

  // Select Option for Current Question
  const handleSelectOption = (optionKey) => {
    if (!isEditable || submitted) return;
    const currentQ = safeQuestions[currentIndex];
    if (!currentQ) return;

    const qId = String(currentQ.id || currentIndex);
    const newAnswers = {
      ...answers,
      [qId]: optionKey,
    };
    setAnswers(newAnswers);
    emitChange(newAnswers, currentIndex, submitted);
  };

  // Clear Option for Current Question
  const handleClearOption = () => {
    if (!isEditable || submitted) return;
    const currentQ = safeQuestions[currentIndex];
    if (!currentQ) return;

    const qId = String(currentQ.id || currentIndex);
    const newAnswers = { ...answers };
    delete newAnswers[qId];
    setAnswers(newAnswers);
    emitChange(newAnswers, currentIndex, submitted);
  };

  // Jump to specific Question Index
  const handleJumpToQuestion = (idx) => {
    if (idx < 0 || idx >= safeQuestions.length) return;
    setCurrentIndex(idx);
    if (isEditable) {
      emitChange(answers, idx, submitted);
    }
  };

  // Next / Previous Navigation
  const handleNextQuestion = () => {
    if (currentIndex < safeQuestions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      if (isEditable) {
        emitChange(answers, nextIdx, submitted);
      }
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      if (isEditable) {
        emitChange(answers, prevIdx, submitted);
      }
    }
  };

  // Confirm Final Submission
  const handleConfirmSubmit = () => {
    setSubmitted(true);
    setShowSubmitModal(false);
    if (isEditable) {
      emitChange(answers, currentIndex, true);
    }
  };

  // Keyboard Shortcuts (A, B, C, D to pick option, Arrow Left/Right to navigate)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D', 'E', 'F'].includes(key)) {
        if (isEditable && !submitted) {
          handleSelectOption(key);
        }
      } else if (e.key === 'ArrowRight') {
        handleNextQuestion();
      } else if (e.key === 'ArrowLeft') {
        handlePrevQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Current Question Object
  const currentQuestion = safeQuestions[currentIndex] || null;

  // Normalized options for current question
  const currentOptions = useMemo(() => {
    if (!currentQuestion) return [];

    let rawOptions =
      currentQuestion.options ||
      currentQuestion.detail?.options ||
      currentQuestion.payload?.options ||
      [];

    // If options is a stringified JSON
    if (typeof rawOptions === 'string') {
      try {
        rawOptions = JSON.parse(rawOptions);
      } catch (e) {
        rawOptions = [];
      }
    }

    if (Array.isArray(rawOptions) && rawOptions.length > 0) {
      return rawOptions;
    }

    // Check payload fields
    const p = currentQuestion.payload || currentQuestion.detail || {};
    if (p.option_a || p.option_b || p.option_c || p.option_d) {
      return [
        { key: 'A', text: p.option_a },
        { key: 'B', text: p.option_b },
        { key: 'C', text: p.option_c },
        { key: 'D', text: p.option_d },
      ].filter((o) => o.text);
    }

    return [
      { key: 'A', text: 'Option A' },
      { key: 'B', text: 'Option B' },
      { key: 'C', text: 'Option C' },
      { key: 'D', text: 'Option D' },
    ];
  }, [currentQuestion]);

  // Helper to extract option identifier (A, B, C, D)
  const getOptionKey = (opt, idx) => {
    if (typeof opt === 'string') {
      return String.fromCharCode(65 + idx);
    }
    return String(opt.key || opt.option_key || opt.id || String.fromCharCode(65 + idx)).toUpperCase();
  };

  // Helper to extract option label text
  const getOptionText = (opt) => {
    if (typeof opt === 'string') return opt;
    return opt.text || opt.option_text || opt.label || opt.value || '';
  };

  // Progress calculations
  const totalQuestions = safeQuestions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // Interviewer live scoring summary
  const interviewerStats = useMemo(() => {
    let answered = 0;
    let correct = 0;

    safeQuestions.forEach((q, idx) => {
      const qId = String(q.id || idx);
      const chosen = answers[qId];
      if (chosen) {
        answered++;
        const targetCorrect =
          q.correct_option ||
          q.detail?.correct_option ||
          q.payload?.correct_option ||
          (Array.isArray(q.options) && q.options.find((o) => o.is_correct)?.key);

        if (targetCorrect && (chosen.toUpperCase() === String(targetCorrect).toUpperCase())) {
          correct++;
        }
      }
    });

    const scorePct = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    return { answered, correct, total: safeQuestions.length, scorePct };
  }, [safeQuestions, answers]);

  // Get selected option for current question
  const currentSelectedKey = currentQuestion ? answers[String(currentQuestion.id || currentIndex)] : null;

  // Find correct option key for current question (Interviewer view only)
  const currentCorrectKey = useMemo(() => {
    if (!currentQuestion) return null;
    const explicit = currentQuestion.correct_option || currentQuestion.detail?.correct_option || currentQuestion.payload?.correct_option;
    if (explicit) return String(explicit).toUpperCase();

    const fromOpts = currentOptions.find((o) => o.is_correct);
    if (fromOpts) {
      return String(fromOpts.id || fromOpts.option_key || fromOpts.key).toUpperCase();
    }
    return null;
  }, [currentQuestion, currentOptions]);

  // Full selected option text
  const selectedOptObj = useMemo(() => {
    if (!currentSelectedKey || !currentOptions.length) return null;
    return currentOptions.find((o, idx) => getOptionKey(o, idx) === currentSelectedKey.toUpperCase());
  }, [currentSelectedKey, currentOptions]);

  const selectedOptText = selectedOptObj ? getOptionText(selectedOptObj) : '';

  // Full correct option text
  const correctOptObj = useMemo(() => {
    if (!currentCorrectKey || !currentOptions.length) return null;
    return currentOptions.find((o, idx) => getOptionKey(o, idx) === currentCorrectKey.toUpperCase());
  }, [currentCorrectKey, currentOptions]);

  const correctOptText = correctOptObj ? getOptionText(correctOptObj) : '';
  const explanationText = currentQuestion?.explanation || currentQuestion?.detail?.explanation || currentQuestion?.payload?.explanation || '';

  if (safeQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] text-center space-y-3 shadow-xs min-h-[380px]">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800/40">
          <ListOrdered className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Loading Assessment Questions...
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Preparing multiple-choice questions for Round {round}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden shadow-xs max-w-5xl mx-auto">
      {/* ============================================================ */}
      {/* TOP HEADER: Progress, Question Navigator & Role Banner */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-3 flex-wrap select-none">
        {/* Left: Round Pill & Progress */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800/40 font-mono text-xs">
            <ListOrdered className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>MCQ Assessment • Round {round}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)]">
            <span>Progress:</span>
            <span className="font-bold text-[var(--text-primary)]">{answeredCount}/{totalQuestions}</span>
            <span>({progressPercent}%)</span>
          </div>
        </div>

        {/* Right: Interviewer Scorecard or Candidate Status */}
        <div className="flex items-center gap-2">
          {!isEditable ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 text-xs font-mono font-bold">
                <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Score: {interviewerStats.correct}/{interviewerStats.answered} ({interviewerStats.scorePct}%)</span>
              </div>

              <button
                type="button"
                onClick={() => setFollowCandidate((prev) => !prev)}
                className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border transition flex items-center gap-1 cursor-pointer ${
                  followCandidate
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'
                }`}
                title="Automatically follow candidate's active question"
              >
                <Eye className="w-3 h-3" />
                <span>{followCandidate ? 'Following Live' : 'Free Browse'}</span>
              </button>
            </div>
          ) : (
            submitted && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 font-mono font-bold text-xs border border-emerald-200 dark:border-emerald-800/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Submitted</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Thin Purple Progress Line */}
      <div className="w-full bg-[var(--border)] h-1 overflow-hidden">
        <div
          className="h-full bg-purple-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ============================================================ */}
      {/* QUESTION NUMBERS PALETTE (1, 2, 3... 10) */}
      {/* ============================================================ */}
      <div className="px-4 py-2 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center gap-2 overflow-x-auto select-none">
        <span className="text-[11px] font-mono font-bold text-[var(--text-muted)] uppercase shrink-0 mr-1 hidden md:inline">
          Questions:
        </span>
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto py-0.5">
          {safeQuestions.map((q, idx) => {
            const qId = String(q.id || idx);
            const isAnswered = !!answers[qId];
            const isCurrent = idx === currentIndex;
            const chosenKey = answers[qId];

            return (
              <button
                key={q.id || idx}
                type="button"
                onClick={() => handleJumpToQuestion(idx)}
                className={`relative min-w-[32px] h-8 px-2 rounded-md font-mono text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                  isCurrent
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs scale-105 z-10'
                    : isAnswered
                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/50 hover:bg-purple-100'
                    : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border-[var(--border)] hover:border-purple-300 hover:text-[var(--text-primary)]'
                }`}
                title={`Question ${idx + 1}${isAnswered ? ` (Answered: ${chosenKey})` : ' (Unanswered)'}`}
              >
                <span>{idx + 1}</span>
                {isAnswered && !isCurrent && (
                  <span className="text-[10px] opacity-80 uppercase font-black">
                    {chosenKey}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MAIN QUESTION DISPLAY & OPTIONS */}
      {/* ============================================================ */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Question Header Card */}
        <div className="space-y-2 p-3.5 sm:p-4 rounded-lg bg-[var(--bg-raised)]/60 border border-[var(--border)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]">
                {currentQuestion.difficulty || 'Easy'}
              </span>
            </div>

            {isEditable && !submitted && (
              <span className="text-[11px] font-mono text-[var(--text-muted)] hidden sm:inline">
                Press <kbd className="px-1 py-0.2 rounded bg-[var(--bg-card)] border text-[10px] font-bold">A</kbd> <kbd className="px-1 py-0.2 rounded bg-[var(--bg-card)] border text-[10px] font-bold">B</kbd> <kbd className="px-1 py-0.2 rounded bg-[var(--bg-card)] border text-[10px] font-bold">C</kbd> <kbd className="px-1 py-0.2 rounded bg-[var(--bg-card)] border text-[10px] font-bold">D</kbd>
              </span>
            )}
          </div>

          {/* Question Title */}
          <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-snug">
            {currentQuestion.title || `Assessment Question #${currentIndex + 1}`}
          </h2>

          {/* Question Prompt */}
          <div className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line font-normal">
            {currentQuestion.prompt}
          </div>
        </div>

        {/* ============================================================ */}
        {/* OPTIONS LIST */}
        {/* ============================================================ */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] tracking-wider">
              {isEditable ? 'Select One Option:' : 'Assessment Options & Candidate Response:'}
            </span>
            {isEditable && currentSelectedKey && !submitted && (
              <button
                type="button"
                onClick={handleClearOption}
                className="text-xs text-rose-500 hover:underline cursor-pointer font-semibold"
              >
                Clear Selection
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2">
            {currentOptions.map((opt, optIdx) => {
              const optKey = getOptionKey(opt, optIdx);
              const optText = getOptionText(opt);
              const isSelected = currentSelectedKey && currentSelectedKey.toUpperCase() === optKey;

              // Interviewer Analysis
              const isCorrectOption = currentCorrectKey && currentCorrectKey === optKey;
              const isCandidateChoice = isSelected;

              // Clean white & purple styling computation
              let cardStyle = 'border-[var(--border)] bg-[var(--bg-card)] hover:border-purple-300 hover:bg-purple-50/30 dark:hover:bg-purple-950/10 text-[var(--text-primary)]';
              let badgeStyle = 'bg-[var(--bg-raised)] text-[var(--text-secondary)] border-[var(--border)] font-bold';
              let textStyle = 'text-[var(--text-primary)] font-medium';

              if (isEditable) {
                if (isSelected) {
                  cardStyle = 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/30 ring-1 ring-purple-500/40 shadow-xs';
                  badgeStyle = 'bg-purple-600 text-white border-purple-600 font-bold';
                  textStyle = 'text-[var(--text-primary)] font-bold';
                }
              } else {
                // Interviewer Mode Styles
                if (isCorrectOption && isCandidateChoice) {
                  cardStyle = 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 ring-1 ring-purple-500/50 shadow-xs';
                  badgeStyle = 'bg-purple-600 text-white border-purple-600 font-bold';
                  textStyle = 'text-[var(--text-primary)] font-bold';
                } else if (isCorrectOption) {
                  cardStyle = 'border-purple-400 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-400/40 shadow-xs';
                  badgeStyle = 'bg-purple-600 text-white border-purple-600 font-bold';
                  textStyle = 'text-[var(--text-primary)] font-bold';
                } else if (isCandidateChoice && !isCorrectOption) {
                  cardStyle = 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 ring-1 ring-rose-400/40 shadow-xs';
                  badgeStyle = 'bg-rose-600 text-white border-rose-600 font-bold';
                  textStyle = 'text-[var(--text-primary)] font-bold';
                } else {
                  cardStyle = 'border-[var(--border)] bg-[var(--bg-card)] opacity-90';
                  badgeStyle = 'bg-[var(--bg-raised)] text-[var(--text-secondary)] border-[var(--border)] font-bold';
                  textStyle = 'text-[var(--text-secondary)] font-normal';
                }
              }

              return (
                <div
                  key={optKey}
                  onClick={() => handleSelectOption(optKey)}
                  className={`group relative py-2.5 px-3.5 sm:py-3 sm:px-4 rounded-lg border transition-all flex items-center gap-3 select-none ${
                    isEditable && !submitted ? 'cursor-pointer' : 'cursor-default'
                  } ${cardStyle}`}
                >
                  {/* Option Letter Badge (A, B, C, D) */}
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-xs font-mono border shrink-0 transition-transform ${badgeStyle}`}
                  >
                    {optKey}
                  </div>

                  {/* Option Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs sm:text-sm leading-relaxed ${textStyle}`}>
                      {optText || <span className="italic text-[var(--text-muted)] font-normal">Option {optKey}</span>}
                    </p>
                  </div>

                  {/* Right Status Indicators */}
                  <div className="shrink-0 flex items-center gap-2">
                    {/* Candidate View Selected Badge */}
                    {isEditable && isSelected && (
                      <div className="flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white shadow-xs">
                        <Check className="w-3 h-3" />
                        <span>Selected</span>
                      </div>
                    )}

                    {/* Interviewer Assessor Tags */}
                    {!isEditable && (
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        {isCorrectOption && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold flex items-center gap-1 shadow-xs">
                            <Check className="w-3 h-3" />
                            <span>Correct Benchmark</span>
                          </span>
                        )}
                        {isCandidateChoice && !isCorrectOption && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold flex items-center gap-1 shadow-xs">
                            <XCircle className="w-3 h-3" />
                            <span>Candidate Choice (Incorrect)</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* INTERVIEWER ONLY: Selected Answer & Correct Benchmark Summary */}
        {/* ============================================================ */}
        {!isEditable && (
          <div className="mt-4 p-3.5 rounded-lg bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-purple-200/60 dark:border-purple-800/30">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 font-mono uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Interviewer Scoring Guide</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                Live candidate synchronization active
              </span>
            </div>

            {/* Side-by-side Candidate Choice vs Correct Benchmark */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {/* Candidate Selected Option Card */}
              <div className="p-2.5 rounded-md bg-[var(--bg-card)] border border-[var(--border)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-purple-600" />
                    <span>Candidate Selected:</span>
                  </span>
                  {currentSelectedKey ? (
                    currentCorrectKey && currentSelectedKey === currentCorrectKey ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                        ✓ Correct (+1 Mark)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                        ✕ Incorrect (0 Marks)
                      </span>
                    )
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-raised)]">
                      Not answered yet
                    </span>
                  )}
                </div>

                {currentSelectedKey ? (
                  <div className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400 mr-1">
                      Option {currentSelectedKey}:
                    </span>
                    <span>{selectedOptText || `Option ${currentSelectedKey}`}</span>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic">
                    Waiting for {candidateName} to select an option...
                  </p>
                )}
              </div>

              {/* Correct Benchmark Option Card */}
              <div className="p-2.5 rounded-md bg-[var(--bg-card)] border border-purple-200 dark:border-purple-800/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <Target className="w-3 h-3 text-purple-600" />
                    <span>Target Answer:</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-600 text-white">
                    Correct Option
                  </span>
                </div>

                {currentCorrectKey ? (
                  <div className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400 mr-1">
                      Option {currentCorrectKey}:
                    </span>
                    <span className="font-semibold">{correctOptText || `Option ${currentCorrectKey}`}</span>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] italic">
                    Correct option specified in problem criteria.
                  </p>
                )}
              </div>
            </div>

            {/* Explanation text */}
            {explanationText && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-secondary)] block">
                  Solution Rationale:
                </span>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-line bg-[var(--bg-card)] p-2.5 rounded-md border border-[var(--border)] font-normal">
                  {explanationText}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* BOTTOM ACTION BAR: Previous, Next, Submit */}
      {/* ============================================================ */}
      <div className="px-4 py-2.5 bg-[var(--bg-raised)] border-t border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
        {/* Prev Button */}
        <button
          type="button"
          onClick={handlePrevQuestion}
          disabled={currentIndex === 0}
          className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 font-bold cursor-pointer disabled:opacity-40"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        {/* Center Progress Text */}
        <div className="text-xs font-mono text-[var(--text-muted)] text-center hidden sm:block">
          Question <strong>{currentIndex + 1}</strong> of <strong>{totalQuestions}</strong>
        </div>

        {/* Next / Submit Button */}
        <div className="flex items-center gap-2">
          {currentIndex < totalQuestions - 1 ? (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="btn btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1 font-bold cursor-pointer bg-purple-600 hover:bg-purple-700 text-white border-none shadow-xs"
            >
              <span>Next Question</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            isEditable && !submitted && (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="btn btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 font-bold cursor-pointer bg-purple-600 hover:bg-purple-700 text-white border-none shadow-xs"
              >
                <Send className="w-3 h-3" />
                <span>Finish MCQ Round</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* CONFIRMATION MODAL ON SUBMIT */}
      {/* ============================================================ */}
      {showSubmitModal && (
        <div 
          onClick={() => setShowSubmitModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl p-5 space-y-4 animate-scaleUp"
          >
            <div className="flex items-center gap-2.5 border-b border-[var(--border)] pb-3">
              <Award className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Submit MCQ Assessment Round {round}?
              </h3>
            </div>

            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              <p>
                You have answered <strong>{answeredCount}</strong> out of <strong>{totalQuestions}</strong> questions ({progressPercent}% complete).
              </p>
              {answeredCount < totalQuestions && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-300">
                  ⚠️ You still have <strong>{totalQuestions - answeredCount} unanswered</strong> questions. Are you sure you want to finish now?
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="btn btn-secondary text-xs py-1.5 px-3 cursor-pointer"
              >
                Review Answers
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="btn btn-primary text-xs py-1.5 px-3.5 font-bold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer border-none"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
