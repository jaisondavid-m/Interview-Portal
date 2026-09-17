import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

  const activeRoundRef = useRef(round);
  const activeRoleRef = useRef(currentUserRole);

  const [currentIndex, setCurrentIndex] = useState(parsedState.currentIndex || 0);
  const [answers, setAnswers] = useState(parsedState.answers || {});
  const [submitted, setSubmitted] = useState(parsedState.submitted || false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [followCandidate, setFollowCandidate] = useState(true);

  // Combined change emitter
  const emitChange = useCallback((newAnswers, newIndex, isSub = false) => {
    if (onCodeChange && isEditable) {
      const payload = JSON.stringify({
        answers: newAnswers,
        currentIndex: newIndex,
        submitted: isSub,
        round,
        updatedAt: new Date().toISOString(),
      });
      onCodeChange(payload);
    }
  }, [onCodeChange, isEditable, round]);

  // When round changes (e.g. from Round 1 to Round 2) or role switches, reset tracking to Question 1
  useEffect(() => {
    const isRoundChanged = activeRoundRef.current !== round;
    const isRoleChanged = activeRoleRef.current !== currentUserRole;

    if (isRoundChanged || isRoleChanged) {
      activeRoundRef.current = round;
      activeRoleRef.current = currentUserRole;

      // Always reset to Question 1 (index 0), empty answers, and unsubmitted state for new round
      setCurrentIndex(0);
      setAnswers({});
      setSubmitted(false);
      setShowSubmitModal(false);

      if (isEditable && onCodeChange) {
        const freshPayload = JSON.stringify({
          answers: {},
          currentIndex: 0,
          submitted: false,
          round,
          updatedAt: new Date().toISOString(),
        });
        onCodeChange(freshPayload);
      }
    }
  }, [round, currentUserRole, isEditable, onCodeChange]);

  // Sync external changes (e.g. interviewer receiving updates from candidate, or candidate receiving reset)
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
    } else if (isEditable && (!code || !code.trim() || Object.keys(parsedState.answers || {}).length === 0)) {
      // If code was cleared / reset on round switch, reset to Question 1
      if (typeof parsedState.currentIndex === 'number') {
        setCurrentIndex(parsedState.currentIndex);
      } else {
        setCurrentIndex(0);
      }
    }
  }, [parsedState, isEditable, followCandidate, safeQuestions.length, code]);

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
        <div className="w-12 h-12 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center border border-[var(--border-accent)]">
          <ListOrdered className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Loading Assessment Questions...
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Preparing multiple-choice questions for Round {round}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[var(--bg-card)] rounded-2xl border-2 border-[var(--border-strong)] overflow-hidden shadow-md max-w-5xl mx-auto animate-fadeIn">
      {/* ============================================================ */}
      {/* TOP HEADER: Progress, Question Navigator & Role Banner */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-3 flex-wrap select-none">
        {/* Left: Round Pill & Progress */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] font-bold border border-[var(--border-accent)] font-mono text-xs shadow-2xs">
            <ListOrdered className="w-4 h-4 text-[var(--accent)]" />
            <span>MCQ Assessment • Round {round}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
            <span>Progress:</span>
            <span className="font-bold text-[var(--text-primary)]">{answeredCount}/{totalQuestions}</span>
            <span>({progressPercent}%)</span>
          </div>
        </div>

        {/* Right: Interviewer Scorecard or Candidate Status */}
        <div className="flex items-center gap-2">
          {!isEditable ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30 text-xs font-mono font-bold shadow-2xs">
                <Award className="w-4 h-4 text-[var(--green)]" />
                <span>Score: {interviewerStats.correct}/{interviewerStats.answered} ({interviewerStats.scorePct}%)</span>
              </div>

              <button
                type="button"
                onClick={() => setFollowCandidate((prev) => !prev)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  followCandidate
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                }`}
                title="Automatically follow candidate's active question"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{followCandidate ? 'Following Live' : 'Free Browse'}</span>
              </button>
            </div>
          ) : (
            submitted && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--green-bg)] text-[var(--green)] font-mono font-bold text-xs border border-[var(--green)]/30 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-[var(--green)]" />
                <span>Submitted</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Thin Signature Purple Progress Line */}
      <div className="w-full bg-[var(--border)] h-1.5 overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ============================================================ */}
      {/* QUESTION NUMBERS PALETTE (1, 2, 3... 10) */}
      {/* ============================================================ */}
      <div className="px-5 py-2.5 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center gap-3 overflow-x-auto select-none">
        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider shrink-0 mr-1 hidden md:inline">
          Questions:
        </span>
        <div className="flex items-center gap-2 flex-1 overflow-x-auto py-0.5">
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
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md scale-105 z-10'
                    : isAnswered
                    ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)] hover:bg-[var(--bg-hover)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-strong)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                }`}
                title={`Question ${idx + 1}${isAnswered ? ` (Answered: ${chosenKey})` : ' (Unanswered)'}`}
              >
                <span>{idx + 1}</span>
                {isAnswered && !isCurrent && (
                  <span className="text-[10px] opacity-90 uppercase font-black">
                    {chosenKey}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MAIN MCQ WORKSPACE: Split Layout for Single Screen View */}
      {/* ============================================================ */}
      <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
        {!isEditable ? (
          /* ============================================================ */
          /* INTERVIEWER PERSPECTIVE: Split Question/Options & Scoring Guide */
          /* ============================================================ */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* LEFT COLUMN: Question & Multiple Choice Options */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              {/* Question Header Card */}
              <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-strong)] shadow-2xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                      Question {currentIndex + 1} of {totalQuestions}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30">
                      {currentQuestion.difficulty || 'Assessment'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                    Observing Candidate Live
                  </span>
                </div>

                {/* Question Title */}
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
                  {currentQuestion.title || `Assessment Question #${currentIndex + 1}`}
                </h2>

                {/* Question Prompt */}
                <div className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-normal">
                  {currentQuestion.prompt}
                </div>
              </div>

              {/* Options List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Multiple Choice Options:
                  </span>
                  <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                    Candidate: <strong className="text-[var(--text-primary)]">{currentSelectedKey ? `Option ${currentSelectedKey}` : 'None'}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {currentOptions.map((opt, optIdx) => {
                    const optKey = getOptionKey(opt, optIdx);
                    const optText = getOptionText(opt);
                    const isCandidateChoice = currentSelectedKey && currentSelectedKey.toUpperCase() === optKey;
                    const isCorrectOption = currentCorrectKey && currentCorrectKey === optKey;

                    let cardStyle = 'border border-[var(--border)] bg-[var(--bg-card)] opacity-90';
                    let badgeStyle = 'bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)] font-bold';
                    let textStyle = 'text-[var(--text-secondary)] font-normal';

                    if (isCorrectOption && isCandidateChoice) {
                      cardStyle = 'border-2 border-[var(--green)] bg-[var(--green-bg)] shadow-sm';
                      badgeStyle = 'bg-[var(--green)] text-white border-[var(--green)] font-bold';
                      textStyle = 'text-[var(--text-primary)] font-bold';
                    } else if (isCorrectOption) {
                      cardStyle = 'border-2 border-[var(--green)] bg-[var(--green-bg)]/60 shadow-sm';
                      badgeStyle = 'bg-[var(--green)] text-white border-[var(--green)] font-bold';
                      textStyle = 'text-[var(--text-primary)] font-bold';
                    } else if (isCandidateChoice && !isCorrectOption) {
                      cardStyle = 'border-2 border-[var(--red)] bg-[var(--red-bg)] shadow-sm';
                      badgeStyle = 'bg-[var(--red)] text-white border-[var(--red)] font-bold';
                      textStyle = 'text-[var(--text-primary)] font-bold';
                    }

                    return (
                      <div
                        key={optKey}
                        className={`group relative py-2.5 px-3.5 rounded-xl border transition-all flex items-center gap-3 select-none ${cardStyle}`}
                      >
                        {/* Option Letter Badge (A, B, C, D) */}
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono shrink-0 transition-transform ${badgeStyle}`}
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
                        <div className="shrink-0 flex items-center gap-1.5 font-mono text-[11px]">
                          {isCorrectOption && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--green)] text-white font-bold flex items-center gap-1 shadow-xs text-[10px]">
                              <Check className="w-3 h-3" />
                              <span>Benchmark</span>
                            </span>
                          )}
                          {isCandidateChoice && !isCorrectOption && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--red)] text-white font-bold flex items-center gap-1 shadow-xs text-[10px]">
                              <XCircle className="w-3 h-3" />
                              <span>Candidate Pick</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Interviewer Scoring Guide & Benchmark Rationale */}
            <div className="lg:col-span-5 flex flex-col space-y-3.5">
              <div className="p-4 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-strong)] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-[var(--border)]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] font-mono uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                    <span>Interviewer Scoring Guide</span>
                  </div>
                  <div className="px-2.5 py-0.5 rounded bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30 font-mono text-[11px] font-bold">
                    Score: {interviewerStats.correct}/{interviewerStats.answered}
                  </div>
                </div>

                {/* Candidate Selection Evaluation Banner */}
                <div className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                  currentSelectedKey
                    ? currentCorrectKey && currentSelectedKey === currentCorrectKey
                      ? 'bg-[var(--green-bg)] border-[var(--green)]/40 text-[var(--text-primary)]'
                      : 'bg-[var(--red-bg)] border-[var(--red)]/40 text-[var(--text-primary)]'
                    : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-secondary)]'
                }`}>
                  <UserCheck className={`w-4 h-4 shrink-0 mt-0.5 ${
                    currentSelectedKey
                      ? currentCorrectKey && currentSelectedKey === currentCorrectKey
                        ? 'text-[var(--green)]'
                        : 'text-[var(--red)]'
                      : 'text-[var(--text-secondary)]'
                  }`} />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold uppercase">Candidate Response</span>
                      {currentSelectedKey && (
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          currentCorrectKey && currentSelectedKey === currentCorrectKey
                            ? 'bg-[var(--green)] text-white'
                            : 'bg-[var(--red)] text-white'
                        }`}>
                          {currentCorrectKey && currentSelectedKey === currentCorrectKey ? '+1 Mark (Correct)' : '0 Marks (Incorrect)'}
                        </span>
                      )}
                    </div>
                    {currentSelectedKey ? (
                      <p className="text-xs font-semibold leading-relaxed">
                        <span className="font-mono font-bold text-[var(--accent)] mr-1">
                          Option {currentSelectedKey}:
                        </span>
                        <span>{selectedOptText || `Option ${currentSelectedKey}`}</span>
                      </p>
                    ) : (
                      <p className="text-xs italic text-[var(--text-secondary)]">
                        Candidate has not picked an answer for this question yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* Target Benchmark Answer Card */}
                <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-strong)] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[var(--accent)] flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Target Benchmark:</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--green)] text-white">
                      Verified Answer
                    </span>
                  </div>

                  {currentCorrectKey ? (
                    <div className="text-xs sm:text-sm text-[var(--text-primary)] font-bold leading-relaxed">
                      <span className="font-mono font-bold text-[var(--accent)] mr-1">
                        Option {currentCorrectKey}:
                      </span>
                      <span>{correctOptText || `Option ${currentCorrectKey}`}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-secondary)] italic">
                      Correct option specified in problem criteria.
                    </p>
                  )}
                </div>

                {/* Solution Rationale / Explanation */}
                {explanationText && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                      Solution Rationale:
                    </span>
                    <div className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-line bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border)] font-normal max-h-48 overflow-y-auto">
                      {explanationText}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* CANDIDATE PERSPECTIVE: Split Question & Option Chooser */
          /* ============================================================ */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* LEFT COLUMN: Question Details & Prompt */}
            <div className="lg:col-span-6 flex flex-col space-y-3">
              <div className="space-y-3 p-4 sm:p-5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-strong)] shadow-2xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                      Question {currentIndex + 1} of {totalQuestions}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30">
                      {currentQuestion.difficulty || 'Assessment'}
                    </span>
                  </div>
                  {!submitted && (
                    <span className="text-xs font-medium text-[var(--text-secondary)] hidden sm:flex items-center gap-1">
                      <span>Keys:</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-strong)] text-[10px] font-mono font-bold text-[var(--text-primary)]">A</kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-strong)] text-[10px] font-mono font-bold text-[var(--text-primary)]">B</kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-strong)] text-[10px] font-mono font-bold text-[var(--text-primary)]">C</kbd>
                      <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-strong)] text-[10px] font-mono font-bold text-[var(--text-primary)]">D</kbd>
                    </span>
                  )}
                </div>

                {/* Question Title */}
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
                  {currentQuestion.title || `Assessment Question #${currentIndex + 1}`}
                </h2>

                {/* Question Prompt */}
                <div className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-normal">
                  {currentQuestion.prompt}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Options Chooser */}
            <div className="lg:col-span-6 flex flex-col space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Select One Option:
                </span>
                {currentSelectedKey && !submitted && (
                  <button
                    type="button"
                    onClick={handleClearOption}
                    className="text-xs text-[var(--red)] hover:underline cursor-pointer font-bold"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {currentOptions.map((opt, optIdx) => {
                  const optKey = getOptionKey(opt, optIdx);
                  const optText = getOptionText(opt);
                  const isSelected = currentSelectedKey && currentSelectedKey.toUpperCase() === optKey;

                  let cardStyle = 'border-2 border-[var(--border-strong)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]';
                  let badgeStyle = 'bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-strong)] font-bold';
                  let textStyle = 'text-[var(--text-primary)] font-semibold';

                  if (isSelected) {
                    cardStyle = 'border-2 border-[var(--accent)] bg-[var(--accent-dim)] shadow-sm';
                    badgeStyle = 'bg-[var(--accent)] text-white border-[var(--accent)] font-bold';
                    textStyle = 'text-[var(--accent)] font-bold';
                  }

                  return (
                    <div
                      key={optKey}
                      onClick={() => handleSelectOption(optKey)}
                      className={`group relative py-3 px-4 rounded-xl border transition-all flex items-center gap-3.5 select-none ${
                        !submitted ? 'cursor-pointer' : 'cursor-default'
                      } ${cardStyle}`}
                    >
                      {/* Option Letter Badge (A, B, C, D) */}
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-mono shrink-0 transition-transform ${badgeStyle}`}
                      >
                        {optKey}
                      </div>

                      {/* Option Text */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs sm:text-sm leading-relaxed ${textStyle}`}>
                          {optText || <span className="italic text-[var(--text-muted)] font-normal">Option {optKey}</span>}
                        </p>
                      </div>

                      {/* Right Selected Pill */}
                      {isSelected && (
                        <div className="shrink-0 flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full bg-[var(--accent)] text-white shadow-xs">
                          <Check className="w-3.5 h-3.5" />
                          <span>Selected</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* BOTTOM ACTION BAR: Previous, Next, Submit */}
      {/* ============================================================ */}
      <div className="px-5 py-3 bg-[var(--bg-raised)] border-t border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
        {/* Prev Button */}
        <button
          type="button"
          onClick={handlePrevQuestion}
          disabled={currentIndex === 0}
          className="btn btn-secondary text-xs py-2 px-4 flex items-center gap-1.5 font-bold cursor-pointer disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {/* Center Progress Text */}
        <div className="text-xs font-bold text-[var(--text-secondary)] text-center hidden sm:block">
          Question <span className="text-[var(--text-primary)] font-extrabold">{currentIndex + 1}</span> of <span className="text-[var(--text-primary)] font-extrabold">{totalQuestions}</span>
        </div>

        {/* Next / Submit Button */}
        <div className="flex items-center gap-2">
          {currentIndex < totalQuestions - 1 ? (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="btn btn-primary text-xs py-2 px-5 flex items-center gap-1.5 font-bold cursor-pointer bg-[var(--accent)] hover:bg-[#5c46b5] text-white border-none shadow-sm"
            >
              <span>Next Question</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            isEditable && !submitted && (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="btn text-xs py-2 px-5 flex items-center gap-1.5 font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm"
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
              <Award className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Submit MCQ Assessment Round {round}?
              </h3>
            </div>

            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              <p>
                You have answered <strong className="text-[var(--text-primary)]">{answeredCount}</strong> out of <strong className="text-[var(--text-primary)]">{totalQuestions}</strong> questions ({progressPercent}% complete).
              </p>
              {answeredCount < totalQuestions && (
                <div className="p-3 bg-[var(--amber-bg)] border border-[var(--amber)]/30 rounded-lg text-[var(--amber)] font-medium">
                  ⚠️ You still have <strong>{totalQuestions - answeredCount} unanswered</strong> questions. Are you sure you want to finish now?
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Review Answers
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="btn btn-primary text-xs py-2 px-5 font-bold bg-[var(--accent)] hover:bg-[#5c46b5] text-white cursor-pointer border-none shadow-sm"
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
