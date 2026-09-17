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
  Flame,
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

  // Submit assessment round
  const handleConfirmSubmit = () => {
    setSubmitted(true);
    setShowSubmitModal(false);
    emitChange(answers, currentIndex, true);
  };

  // Helper to extract clean text from any option format
  const getOptionText = (opt) => {
    if (typeof opt === 'string') return opt;
    if (opt && typeof opt === 'object') {
      return opt.text || opt.option_text || opt.option || opt.label || opt.value || opt.title || opt.content || '';
    }
    return '';
  };

  const getOptionKey = (opt, optIdx) => {
    if (opt && typeof opt === 'object') {
      return (opt.id || opt.option_key || opt.key || String.fromCharCode(65 + optIdx)).toUpperCase();
    }
    return String.fromCharCode(65 + optIdx);
  };

  // Keyboard Navigation: A, B, C, D to select; Arrow keys to navigate
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextQuestion();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevQuestion();
      } else if (isEditable && !submitted) {
        const keyUpper = e.key.toUpperCase();
        if (['A', 'B', 'C', 'D', 'E', 'F'].includes(keyUpper)) {
          const currentQ = safeQuestions[currentIndex];
          const opts = currentQ?.options || currentQ?.mcq_options || currentQ?.payload?.options || [];
          const matched = opts.find((o, idx) => getOptionKey(o, idx) === keyUpper);
          if (matched) {
            e.preventDefault();
            handleSelectOption(getOptionKey(matched, 0));
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, safeQuestions, isEditable, submitted, answers]);

  const totalQuestions = safeQuestions.length;
  const currentQuestion = safeQuestions[currentIndex] || safeQuestions[0];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // Extract options for the current question
  const currentOptions = useMemo(() => {
    if (!currentQuestion) return [];
    if (Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0) {
      return currentQuestion.options;
    }
    if (Array.isArray(currentQuestion.mcq_options) && currentQuestion.mcq_options.length > 0) {
      return currentQuestion.mcq_options;
    }
    if (Array.isArray(currentQuestion.payload?.options) && currentQuestion.payload.options.length > 0) {
      return currentQuestion.payload.options;
    }
    if (Array.isArray(currentQuestion.payload?.mcq_options) && currentQuestion.payload.mcq_options.length > 0) {
      return currentQuestion.payload.mcq_options;
    }
    if (Array.isArray(currentQuestion.detail?.options) && currentQuestion.detail.options.length > 0) {
      return currentQuestion.detail.options;
    }
    return [];
  }, [currentQuestion]);

  // Compute Interviewer Metrics (Correct vs Incorrect)
  const interviewerStats = useMemo(() => {
    let correct = 0;
    let answered = 0;

    safeQuestions.forEach((q, idx) => {
      const qId = String(q.id || idx);
      const chosen = answers[qId];
      if (chosen) {
        answered++;
        const opts = q.options || q.mcq_options || q.payload?.options || [];
        const correctOpt = q.correct_option || q.detail?.correct_option || q.payload?.correct_option || '';
        const correctFromList = opts.find((o) => o.is_correct)?.id || opts.find((o) => o.is_correct)?.option_key || '';
        const targetCorrect = correctOpt || correctFromList;
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

  // Find full selected option object & text
  const selectedOptObj = useMemo(() => {
    if (!currentSelectedKey || !currentOptions.length) return null;
    return currentOptions.find((o, idx) => getOptionKey(o, idx) === currentSelectedKey.toUpperCase());
  }, [currentSelectedKey, currentOptions]);

  const selectedOptText = selectedOptObj ? getOptionText(selectedOptObj) : '';

  // Find full correct option object & text
  const correctOptObj = useMemo(() => {
    if (!currentCorrectKey || !currentOptions.length) return null;
    return currentOptions.find((o, idx) => getOptionKey(o, idx) === currentCorrectKey.toUpperCase());
  }, [currentCorrectKey, currentOptions]);

  const correctOptText = correctOptObj ? getOptionText(correctOptObj) : '';

  const explanationText = currentQuestion?.explanation || currentQuestion?.detail?.explanation || currentQuestion?.payload?.explanation || '';

  if (safeQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-card)] rounded-[var(--radius-md)] border border-[var(--border)] text-center space-y-4 shadow-sm min-h-[460px]">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
          <ListOrdered className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
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
    <div className="flex flex-col h-full bg-[var(--bg-card)] rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden shadow-lg min-h-[620px]">
      {/* ============================================================ */}
      {/* TOP HEADER: Progress, Question Navigator & Role Banner */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-3 flex-wrap">
        {/* Left: Round & Progress Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 font-mono text-xs shadow-xs">
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Multiple Choice Assessment • Round {round}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
            <span>Progress:</span>
            <span className="font-bold text-[var(--text-primary)]">{answeredCount}/{totalQuestions} Answered</span>
            <span>({progressPercent}%)</span>
          </div>
        </div>

        {/* Right: Interviewer Scorecard or Candidate Timer/Actions */}
        <div className="flex items-center gap-2">
          {!isEditable ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
                <Award className="w-3.5 h-3.5" />
                <span>Live Score: {interviewerStats.correct}/{interviewerStats.answered} ({interviewerStats.scorePct}%)</span>
              </div>

              <button
                type="button"
                onClick={() => setFollowCandidate((prev) => !prev)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  followCandidate
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]'
                }`}
                title="Automatically follow candidate's active question"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{followCandidate ? 'Following Live' : 'Free Browse'}</span>
              </button>
            </div>
          ) : (
            submitted && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-green-500/10 text-green-600 dark:text-green-400 font-mono font-bold text-xs border border-green-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Assessment Submitted</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Progress Bar Line */}
      <div className="w-full bg-[var(--border)] h-1.5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ============================================================ */}
      {/* QUESTION NUMBERS PALETTE (1, 2, 3... 10) */}
      {/* ============================================================ */}
      <div className="px-4 py-2.5 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center gap-2 overflow-x-auto select-none">
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
                className={`relative min-w-[36px] h-9 px-2 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30 scale-105 z-10'
                    : isAnswered
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                    : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]'
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
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Question Header Card */}
        <div className="space-y-3 bg-[var(--bg-raised)]/50 p-4 md:p-5 rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]">
                {currentQuestion.difficulty || 'Medium'}
              </span>
            </div>

            {/* Quick Helper Shortcut indicator */}
            {isEditable && !submitted && (
              <span className="text-[11px] font-mono text-[var(--text-muted)] hidden sm:inline">
                💡 Tip: Press <kbd className="px-1 py-0.5 rounded bg-[var(--bg-card)] border text-[10px] font-bold">A</kbd> <kbd className="px-1 py-0.5 rounded bg-[var(--bg-card)] border text-[10px] font-bold">B</kbd> <kbd className="px-1 py-0.5 rounded bg-[var(--bg-card)] border text-[10px] font-bold">C</kbd> <kbd className="px-1 py-0.5 rounded bg-[var(--bg-card)] border text-[10px] font-bold">D</kbd> or use Arrow keys
              </span>
            )}
          </div>

          {/* Question Title */}
          <h2 className="text-base md:text-lg font-bold text-[var(--text-primary)] leading-snug">
            {currentQuestion.title || `Assessment Question #${currentIndex + 1}`}
          </h2>

          {/* Question Prompt */}
          <div className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-normal">
            {currentQuestion.prompt}
          </div>
        </div>

        {/* ============================================================ */}
        {/* OPTIONS LIST */}
        {/* ============================================================ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-[var(--text-muted)] tracking-wider">
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

          <div className="grid grid-cols-1 gap-3">
            {currentOptions.map((opt, optIdx) => {
              const optKey = getOptionKey(opt, optIdx);
              const optText = getOptionText(opt);
              const isSelected = currentSelectedKey && currentSelectedKey.toUpperCase() === optKey;

              // Interviewer Analysis
              const isCorrectOption = currentCorrectKey && currentCorrectKey === optKey;
              const isCandidateChoice = isSelected;

              // High-contrast, theme-safe styling computation
              let cardStyle = 'border-[var(--border)] bg-[var(--bg-card)] hover:border-blue-400 hover:bg-[var(--bg-raised)]/70 text-[var(--text-primary)]';
              let badgeStyle = 'bg-[var(--bg-raised)] text-[var(--text-secondary)] border-[var(--border)] font-bold';
              let textStyle = 'text-[var(--text-primary)] font-medium';

              if (isEditable) {
                if (isSelected) {
                  cardStyle = 'border-blue-600 bg-blue-500/15 ring-2 ring-blue-500/40 shadow-md';
                  badgeStyle = 'bg-blue-600 text-white border-blue-600 font-black';
                  textStyle = 'text-[var(--text-primary)] font-bold';
                }
              } else {
                // Interviewer Mode Styles
                if (isCorrectOption && isCandidateChoice) {
                  cardStyle = 'border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-500/50 shadow-md';
                  badgeStyle = 'bg-emerald-600 text-white border-emerald-600 font-black';
                  textStyle = 'text-[var(--text-primary)] font-bold';
                } else if (isCorrectOption) {
                  cardStyle = 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40 shadow-sm';
                  badgeStyle = 'bg-emerald-600 text-white border-emerald-600 font-black';
                  textStyle = 'text-[var(--text-primary)] font-bold';
                } else if (isCandidateChoice && !isCorrectOption) {
                  cardStyle = 'border-rose-500 bg-rose-500/15 ring-2 ring-rose-500/40 shadow-sm';
                  badgeStyle = 'bg-rose-600 text-white border-rose-600 font-black';
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
                  className={`group relative p-4 rounded-xl border-2 transition-all flex items-start gap-3.5 select-none ${
                    isEditable && !submitted ? 'cursor-pointer hover:scale-[1.006]' : 'cursor-default'
                  } ${cardStyle}`}
                >
                  {/* Option Key Badge (A, B, C, D) */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono border shrink-0 transition-transform shadow-xs ${badgeStyle}`}
                  >
                    {optKey}
                  </div>

                  {/* Option Text (Guaranteed Visible and High Contrast) */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className={`text-sm leading-relaxed ${textStyle}`}>
                      {optText || <span className="italic text-[var(--text-muted)] font-normal">Option {optKey}</span>}
                    </p>
                  </div>

                  {/* Right Status Indicators */}
                  <div className="shrink-0 flex items-center gap-2 pt-0.5">
                    {/* Candidate View Selected Badge */}
                    {isEditable && isSelected && (
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-blue-600 text-white shadow-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Selected</span>
                      </div>
                    )}

                    {/* Interviewer Assessor Tags */}
                    {!isEditable && (
                      <div className="flex flex-col items-end gap-1 font-mono text-xs">
                        {isCorrectOption && isCandidateChoice && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold flex items-center gap-1.5 shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Correct Benchmark & Candidate Selected</span>
                          </span>
                        )}
                        {isCorrectOption && !isCandidateChoice && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold flex items-center gap-1.5 shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                            <span>Correct Benchmark</span>
                          </span>
                        )}
                        {isCandidateChoice && !isCorrectOption && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-bold flex items-center gap-1.5 shadow-xs">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Candidate Selected (Incorrect)</span>
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
          <div className="mt-6 p-4 md:p-5 rounded-xl bg-blue-500/10 border border-blue-500/25 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-blue-500/20">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 font-mono uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Interviewer Solution & Scoring Guide</span>
              </div>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Live sync active with candidate responses
              </span>
            </div>

            {/* Side-by-side Candidate Choice vs Correct Benchmark */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Candidate Selected Option Card */}
              <div className="p-3.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>Candidate Selected:</span>
                  </span>
                  {currentSelectedKey ? (
                    currentCorrectKey && currentSelectedKey === currentCorrectKey ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        ✓ Correct (+1 Mark)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        ✕ Incorrect (0 Marks)
                      </span>
                    )
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-input)]">
                      Not answered yet
                    </span>
                  )}
                </div>

                {currentSelectedKey ? (
                  <div className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mr-1.5">
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
              <div className="p-3.5 rounded-lg bg-[var(--bg-card)] border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    <span>Correct Benchmark:</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-600 text-white shadow-xs">
                    Target Answer
                  </span>
                </div>

                {currentCorrectKey ? (
                  <div className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mr-1.5">
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
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-bold uppercase text-[var(--text-secondary)] block">
                  Solution Rationale & Concept Explanation:
                </span>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-line bg-[var(--bg-card)] p-3.5 rounded-lg border border-[var(--border)] font-normal">
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
      <div className="px-4 py-3 bg-[var(--bg-raised)] border-t border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
        {/* Prev Button */}
        <button
          type="button"
          onClick={handlePrevQuestion}
          disabled={currentIndex === 0}
          className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold cursor-pointer disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {/* Center Progress Pill */}
        <div className="text-xs font-mono text-[var(--text-muted)] text-center hidden sm:block">
          Question <strong>{currentIndex + 1}</strong> of <strong>{totalQuestions}</strong>
        </div>

        {/* Next / Submit Button */}
        <div className="flex items-center gap-2">
          {currentIndex < totalQuestions - 1 ? (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              <span>Next Question</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            isEditable && !submitted && (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-md animate-pulse"
              >
                <Send className="w-3.5 h-3.5" />
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
            className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 space-y-4 animate-scaleUp"
          >
            <div className="flex items-center gap-2.5 border-b border-[var(--border)] pb-3">
              <Award className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Submit MCQ Assessment Round {round}?
              </h3>
            </div>

            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              <p>
                You have answered <strong>{answeredCount}</strong> out of <strong>{totalQuestions}</strong> questions ({progressPercent}% complete).
              </p>
              {answeredCount < totalQuestions && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-300">
                  ⚠️ You still have <strong>{totalQuestions - answeredCount} unanswered</strong> questions. Are you sure you want to finish now?
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="btn btn-secondary text-xs py-2 px-3 cursor-pointer"
              >
                Review Answers
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="btn btn-primary text-xs py-2 px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
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
