import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Video,
  Users,
  Repeat,
  Clock,
  LogOut,
  Sparkles,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Shield,
  HelpCircle,
  Code2,
  Lightbulb,
  CheckSquare,
  FileText,
  Eye,
  Lock,
  ChevronRight,
  Check
} from 'lucide-react';
import api from '../api/axios';
import CodeEditor from '../Components/CodeEditor';
import TestCasesConsole from '../Components/TestCasesConsole';
import ConfirmModal from '../Components/ConfirmModal';
import PeerFeedbackModal from '../Components/PeerFeedbackModal';
import CredentialAuditModal from '../Components/CredentialAuditModal';
import MicPermissionModal from '../Components/MicPermissionModal';
import AudioCallBanner from '../Components/AudioCallBanner';

import useWebRTCAudio from '../utils/useWebRTCAudio';

export default function InterviewRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('interviewee'); // 'interviewer' | 'interviewee'
  const [peerUser, setPeerUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [switching, setSwitching] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRound, setFeedbackRound] = useState(1);
  const [hasFeedbackSubmitted, setHasFeedbackSubmitted] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [hasSecuritySubmitted, setHasSecuritySubmitted] = useState(false);
  const [micModalOpen, setMicModalOpen] = useState(true);
  const initialRoleRef = useRef(null); // Initial role in Round 1: 'interviewer' | 'interviewee'
  const r1FeedbackPromptedRef = useRef(false);
  const r2FeedbackPromptedRef = useRef(false);
  const feedbackCheckedRef = useRef(false);
  const securityCheckedRef = useRef(false);
  const recordingUploadedRef = useRef(false);

  const myUserId = currentUserRole === 'interviewer' ? sessionData?.interviewer_id : sessionData?.interviewee_id;
  const isCompleted = sessionData?.status === 'completed';

  // Live WebRTC Audio Call Hook
  const {
    connectionState,
    isMuted,
    peerMuted,
    isSpeaking,
    isPeerSpeaking,
    toggleMute,
    stopAndUploadRecording,
    uploadingRecording,
  } = useWebRTCAudio({
    sessionId,
    currentUserId: myUserId,
    enabled: !micModalOpen,
  });

  const [elapsedSecs, setElapsedSecs] = useState(() => {
    try {
      const cachedStart = sessionStorage.getItem(`interview_started_${sessionId}`);
      if (cachedStart) {
        const startTime = new Date(cachedStart).getTime();
        if (!isNaN(startTime) && startTime > 0) {
          return Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        }
      }
    } catch (e) {
      // ignore
    }
    return 0;
  });

  // Active interviewer tab
  const [interviewerTab, setInterviewerTab] = useState('problem'); // 'problem' | 'hints' | 'solution' | 'testcases'

  // Code editor local state
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Reusable confirmation modal state
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'primary',
    icon: null,
    onConfirm: null,
    showCancel: true,
  });

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const openModal = (config) => {
    setModalConfig({
      isOpen: true,
      title: config.title || 'Confirmation',
      message: config.message || 'Are you sure you want to proceed?',
      confirmText: config.confirmText || 'Confirm',
      cancelText: config.cancelText || 'Cancel',
      variant: config.variant || 'primary',
      icon: config.icon || null,
      onConfirm: config.onConfirm || closeModal,
      showCancel: config.showCancel !== false,
    });
  };

  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const lastSyncCodeRef = useRef('');
  const activeQIdRef = useRef(0);
  const activeRoundRef = useRef(1);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    try {
      const res = await api.get(`/interviews/sessions/${sessionId}`);
      const data = res?.data || res;
      if (data?.session) {
        setSessionData(data.session);
        if (data.session.started_at) {
          try {
            sessionStorage.setItem(`interview_started_${sessionId}`, data.session.started_at);
          } catch (e) {
            // ignore
          }
        }
        setCurrentUserRole(data.current_user_role || 'interviewee');
        setPeerUser(data.peer || null);
        setError('');

        // 1. Initialize starting role in Round 1
        if (initialRoleRef.current === null) {
          if (data.session.round === 1 && (data.session.switch_count || 0) === 0) {
            initialRoleRef.current = data.current_user_role;
          } else if (data.session.round === 2 || (data.session.switch_count || 0) >= 1) {
            initialRoleRef.current = data.current_user_role === 'interviewee' ? 'interviewer' : 'interviewee';
          }
        }

        // 2. TRIGGER 1: When Round 1 finishes (role swap to Round 2), show feedback modal for Round 1 Interviewer
        if (
          (data.session.round === 2 || (data.session.switch_count || 0) >= 1) &&
          data.session.status !== 'completed' &&
          initialRoleRef.current === 'interviewer' &&
          !r1FeedbackPromptedRef.current
        ) {
          r1FeedbackPromptedRef.current = true;
          setFeedbackRound(1);
          api.get(`/interviews/sessions/${sessionId}/feedback`)
            .then((fRes) => {
              const fData = fRes?.data || fRes;
              if (fData?.has_submitted) {
                setHasFeedbackSubmitted(true);
              } else {
                setHasFeedbackSubmitted(false);
                setShowFeedbackModal(true);
              }
            })
            .catch(() => {
              setShowFeedbackModal(true);
            });
        }

        const targetLang = data.session.candidate_lang || 'javascript';
        const isRoundOrQuestionChanged =
          (data.session.current_question_id && data.session.current_question_id !== activeQIdRef.current) ||
          (data.session.round && data.session.round !== activeRoundRef.current);

        if (isRoundOrQuestionChanged) {
          activeQIdRef.current = data.session.current_question_id;
          activeRoundRef.current = data.session.round;
          setRunResults(null);
          setSubmissionResult(null);

          const initialCode = data.session.candidate_code || '';

          setCode(initialCode);
          setLanguage(targetLang);

          if (data.current_user_role === 'interviewee') {
            api.post(`/interviews/sessions/${sessionId}/code`, {
              code: initialCode,
              lang: targetLang,
            }).catch(() => {});
          }
        } else {
          // If candidate code is received from server and user is Interviewer, update editor stream
          if (data.current_user_role === 'interviewer') {
            setCode(data.session.candidate_code || '');
            setLanguage(targetLang);

            // Synchronize candidate execution state for interviewer
            if (data.session.last_execution_json) {
              try {
                const execData = JSON.parse(data.session.last_execution_json);
                if (data.session.last_execution_type === 'run') {
                  setRunResults(execData);
                  setSubmissionResult(null);
                } else if (data.session.last_execution_type === 'submit') {
                  setSubmissionResult(execData);
                  setRunResults(null);
                }
              } catch (e) {
                // ignore parse error
              }
            }
          } else if (typeof code !== 'string') {
            const initialCode = data.session.candidate_code || '';
            setCode(initialCode);
            setLanguage(targetLang);
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load interview session.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, code]);

  useEffect(() => {
    fetchSession();

    // Poll session state every 2 seconds to synchronize candidate code, role switch, and status
    pollRef.current = setInterval(() => {
      fetchSession();
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchSession]);

  // Session elapsed timer (Synchronized with session.started_at from server for both students)
  useEffect(() => {
    const startedAt = sessionData?.started_at;
    if (!startedAt) return;

    const computeElapsed = () => {
      const startTime = new Date(startedAt).getTime();
      if (isNaN(startTime) || startTime <= 0) return 0;

      if (sessionData.status === 'completed' && sessionData.ended_at) {
        const endTime = new Date(sessionData.ended_at).getTime();
        return Math.max(0, Math.floor((endTime - startTime) / 1000));
      }

      return Math.max(0, Math.floor((Date.now() - startTime) / 1000));
    };

    // Set immediately on session load / reload
    setElapsedSecs(computeElapsed());

    if (sessionData.status === 'completed') {
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedSecs(computeElapsed());
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionData?.started_at, sessionData?.status, sessionData?.ended_at]);

  // TRIGGER 2: Auto-prompt peer feedback popup & upload recording when Round 2 concludes (session completion)
  useEffect(() => {
    if (sessionData?.status === 'completed') {
      if (!recordingUploadedRef.current) {
        recordingUploadedRef.current = true;
        stopAndUploadRecording();
      }

      if (!r2FeedbackPromptedRef.current) {
        r2FeedbackPromptedRef.current = true;

        // Determine target evaluation round: Round 2 interviewer evaluates Round 2 candidate, or Round 1 if single round
        const isR2Interviewer = initialRoleRef.current === 'interviewee' && (sessionData?.switch_count || 0) >= 1;
        const targetRound = isR2Interviewer ? 2 : 1;
        setFeedbackRound(targetRound);

        api.get(`/interviews/sessions/${sessionId}/feedback`)
          .then((res) => {
            const data = res?.data || res;
            if (data?.has_submitted) {
              setHasFeedbackSubmitted(true);
              // Check security audit status if feedback is already done
              if (!securityCheckedRef.current) {
                securityCheckedRef.current = true;
                api.get(`/interviews/sessions/${sessionId}/security-report`)
                  .then((sRes) => {
                    const sData = sRes?.data || sRes;
                    if (!sData?.has_submitted) {
                      setShowSecurityModal(true);
                    }
                  })
                  .catch(() => {});
              }
            } else {
              setHasFeedbackSubmitted(false);
              setShowFeedbackModal(true);
            }
          })
          .catch(() => {
            setShowFeedbackModal(true);
          });
      }
    }
  }, [sessionData?.status, sessionData?.switch_count, sessionId, stopAndUploadRecording]);

  // Sync candidate code to server (debounced)
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (currentUserRole !== 'interviewee') return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      if (newCode !== lastSyncCodeRef.current) {
        lastSyncCodeRef.current = newCode;
        try {
          await api.post(`/interviews/sessions/${sessionId}/code`, {
            code: newCode,
            lang: language,
          });
        } catch (e) {
          // ignore transient sync error
        }
      }
    }, 800);
  };

  const handleLanguageChange = async (newLang) => {
    setLanguage(newLang);
    if (currentUserRole === 'interviewee') {
      try {
        await api.post(`/interviews/sessions/${sessionId}/code`, {
          code: code || '',
          lang: newLang,
        });
      } catch (e) {
        // ignore
      }
    }
  };

  // Run Code
  const handleRunCode = async (options = { isCustom: false, customInput: '' }) => {
    setIsRunning(true);
    try {
      const res = await api.post(`/interviews/sessions/${sessionId}/run`, {
        code,
        lang: language,
        is_custom: options.isCustom,
        custom_input: options.customInput,
      });
      const data = res?.data || res;
      setRunResults(data);
      setSubmissionResult(null);
    } catch (err) {
      openModal({
        title: 'Execution Error',
        message: err.response?.data?.message || err.message || 'Failed to run test cases.',
        variant: 'warning',
        icon: AlertCircle,
        showCancel: false,
        confirmText: 'Dismiss',
        onConfirm: closeModal,
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Code
  const handleSubmitCode = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post(`/interviews/sessions/${sessionId}/submit`, {
        code,
        lang: language,
      });
      const data = res?.data || res;
      setSubmissionResult(data);
      setRunResults(null);
    } catch (err) {
      openModal({
        title: 'Submission Error',
        message: err.response?.data?.message || err.message || 'Failed to evaluate submission.',
        variant: 'warning',
        icon: AlertCircle,
        showCancel: false,
        confirmText: 'Dismiss',
        onConfirm: closeModal,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request Role Switch (Requires peer acceptance)
  const handleRequestSwitch = () => {
    openModal({
      title: 'Request Round Switch (Round 2)',
      message: 'Finish Round 1 and switch roles to Round 2? Your peer will receive a live confirmation prompt to accept or decline. A new random question will be assigned for Round 2.',
      confirmText: 'Send Switch Request',
      cancelText: 'Keep Practicing',
      variant: 'primary',
      icon: Repeat,
      onConfirm: async () => {
        closeModal();
        try {
          setSwitching(true);
          const res = await api.post(`/interviews/sessions/${sessionId}/request-switch`);
          const data = res?.data || res;
          if (data?.switched && data?.current_user_role) {
            setCurrentUserRole(data.current_user_role);
            setRunResults(null);
            setSubmissionResult(null);
          }
          await fetchSession();
        } catch (err) {
          openModal({
            title: 'Role Switch Notice',
            message: err.response?.data?.message || err.message || 'Failed to request role switch.',
            variant: 'warning',
            icon: AlertCircle,
            showCancel: false,
            confirmText: 'OK',
            onConfirm: closeModal,
          });
        } finally {
          setSwitching(false);
        }
      },
    });
  };

  // Accept Role Switch from Peer
  const handleAcceptSwitch = async () => {
    try {
      setSwitching(true);
      const res = await api.post(`/interviews/sessions/${sessionId}/accept-switch`);
      const data = res?.data || res;
      if (data?.current_user_role) {
        setCurrentUserRole(data.current_user_role);
      }
      setRunResults(null);
      setSubmissionResult(null);
      await fetchSession();
    } catch (err) {
      openModal({
        title: 'Role Switch Notice',
        message: err.response?.data?.message || err.message || 'Failed to accept role switch.',
        variant: 'warning',
        icon: AlertCircle,
        showCancel: false,
        confirmText: 'OK',
        onConfirm: closeModal,
      });
    } finally {
      setSwitching(false);
    }
  };

  // Decline or Cancel Role Switch
  const handleDeclineSwitch = async () => {
    try {
      setSwitching(true);
      await api.post(`/interviews/sessions/${sessionId}/decline-switch`);
      await fetchSession();
    } catch (err) {
      openModal({
        title: 'Role Switch Notice',
        message: err.response?.data?.message || err.message || 'Failed to decline switch request.',
        variant: 'warning',
        icon: AlertCircle,
        showCancel: false,
        confirmText: 'OK',
        onConfirm: closeModal,
      });
    } finally {
      setSwitching(false);
    }
  };

  // End Interview Immediately and Exit Room
  const handleDirectEnd = () => {
    openModal({
      title: 'End & Exit Interview',
      message: 'Are you sure you want to conclude and exit this interview session? The room will be closed and marked completed, allowing you to start fresh interviews.',
      confirmText: 'End & Exit Now',
      cancelText: 'Stay in Room',
      variant: 'danger',
      icon: LogOut,
      onConfirm: async () => {
        closeModal();
        try {
          setEnding(true);
          await stopAndUploadRecording();
          await api.post(`/interviews/sessions/${sessionId}/end`);
          navigate('/interviews');
        } catch (err) {
          navigate('/interviews');
        } finally {
          setEnding(false);
        }
      },
    });
  };

  // Request End Interview (Requires peer acceptance or allows instant exit)
  const handleRequestEnd = () => {
    openModal({
      title: 'Conclude Interview Session',
      message: 'Choose how you want to conclude this interview session. You can ask your peer to confirm, or end & exit immediately.',
      confirmText: 'Send Request to Peer',
      cancelText: 'End & Exit Now',
      variant: 'primary',
      icon: LogOut,
      onConfirm: async () => {
        closeModal();
        try {
          setEnding(true);
          const res = await api.post(`/interviews/sessions/${sessionId}/request-end`);
          const data = res?.data || res;
          if (data?.ended) {
            await stopAndUploadRecording();
            navigate('/interviews');
            return;
          }
          await fetchSession();
        } catch (err) {
          openModal({
            title: 'End Session Notice',
            message: err.response?.data?.message || err.message || 'Failed to request session end.',
            variant: 'warning',
            icon: AlertCircle,
            showCancel: false,
            confirmText: 'OK',
            onConfirm: closeModal,
          });
        } finally {
          setEnding(false);
        }
      },
    });
  };

  // Accept End Interview from Peer
  const handleAcceptEnd = async () => {
    try {
      setEnding(true);
      await stopAndUploadRecording();
      const res = await api.post(`/interviews/sessions/${sessionId}/accept-end`);
      const data = res?.data || res;
      await fetchSession();
      openModal({
        title: 'Interview Concluded',
        message: 'Both participants have agreed to conclude the interview session. You can now return to the interview dashboard.',
        confirmText: 'Go to Dashboard',
        showCancel: false,
        variant: 'primary',
        icon: Award,
        onConfirm: () => {
          closeModal();
          navigate('/interviews');
        },
      });
    } catch (err) {
      openModal({
        title: 'End Session Notice',
        message: err.response?.data?.message || err.message || 'Failed to accept session end.',
        variant: 'warning',
        icon: AlertCircle,
        showCancel: false,
        confirmText: 'OK',
        onConfirm: closeModal,
      });
    } finally {
      setEnding(false);
    }
  };

  // Decline or Cancel End Interview
  const handleDeclineEnd = async () => {
    try {
      setEnding(true);
      await api.post(`/interviews/sessions/${sessionId}/decline-end`);
      await fetchSession();
    } catch (err) {
      openModal({
        title: 'End Session Notice',
        message: err.response?.data?.message || err.message || 'Failed to decline end request.',
        variant: 'warning',
        icon: AlertCircle,
        showCancel: false,
        confirmText: 'OK',
        onConfirm: closeModal,
      });
    } finally {
      setEnding(false);
    }
  };

  // Format seconds -> MM:SS or HH:MM:SS
  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || secs < 0) return '00:00';
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const rem = secs % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="panel-card p-16 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
        <p className="text-[14px] text-[var(--text-muted)] font-medium">Entering live interview room...</p>
      </div>
    );
  }

  if (error && !sessionData) {
    return (
      <div className="panel-card p-10 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-[var(--red)] mx-auto" />
        <h2 className="text-[18px] font-bold text-[var(--text-primary)]">Session Error</h2>
        <p className="text-[13px] text-[var(--text-secondary)]">{error}</p>
        <button
          onClick={() => navigate('/interviews')}
          className="btn btn-primary text-xs py-2 px-4"
        >
          Return to Interviews
        </button>
      </div>
    );
  }

  const track = sessionData?.track;
  const level = sessionData?.level;
  const question = sessionData?.current_question;
  const payload = question?.payload || {};
  const currentRound = sessionData?.round || 1;
  const switchCount = sessionData?.switch_count || 0;

  // Mutual role switch state calculations
  const switchRequestedBy = sessionData?.switch_requested_by || 0;
  const isSwitchRequestedByMe = switchRequestedBy > 0 && switchRequestedBy === myUserId;
  const isSwitchRequestedByPeer = switchRequestedBy > 0 && switchRequestedBy !== myUserId;

  // Mutual end interview state calculations
  const endRequestedBy = sessionData?.end_requested_by || 0;
  const isEndRequestedByMe = endRequestedBy > 0 && endRequestedBy === myUserId;
  const isEndRequestedByPeer = endRequestedBy > 0 && endRequestedBy !== myUserId;

  // Extract open test cases (strictly from question payload, no fallback test cases)
  const openCases = (Array.isArray(payload?.open_test_cases) ? payload.open_test_cases : (Array.isArray(payload?.test_cases) ? payload.test_cases : []));

  const handleOpenFeedback = () => {
    if (isCompleted) {
      const isR2Interviewer = initialRoleRef.current === 'interviewee' && (sessionData?.switch_count || 0) >= 1;
      setFeedbackRound(isR2Interviewer ? 2 : 1);
    } else if (sessionData?.round === 2 || (sessionData?.switch_count || 0) >= 1) {
      setFeedbackRound(1);
    } else {
      setFeedbackRound(1);
    }
    setShowFeedbackModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1 flex-wrap">
            <span className={`w-2.5 h-2.5 rounded-full ${isCompleted ? 'bg-[var(--text-muted)]' : 'bg-[var(--green)] animate-pulse'}`} />
            <span className={`font-bold ${isCompleted ? 'text-[var(--text-muted)]' : 'text-[var(--green)]'}`}>
              {isCompleted ? 'Concluded Session' : 'Live Peer Session'}
            </span>
            <span>•</span>
            <span>Room #{sessionId}</span>
            <span>•</span>
            <span className={`px-2 py-0.5 rounded font-bold ${
              isCompleted
                ? 'bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]'
                : currentRound === 1
                ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]'
                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
            }`}>
              Round {currentRound} of 2 {switchCount >= 1 ? '(Final Round)' : ''}
            </span>
          </div>
          <h1 className="text-[20px] font-bold text-[var(--text-primary)] tracking-tight">
            {track?.title || 'Mock Interview Domain'}
          </h1>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
            Level {level?.level_number || 1}: {level?.name || 'Assessment'} • Mode: <strong className="uppercase">{level?.mode || 'coding'}</strong>
          </p>
        </div>

        {/* Live Timer, Switch Role Button & Mutual End Button */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <div className="bg-[var(--bg-card)] px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] flex items-center gap-2 font-mono text-[12px] text-[var(--text-primary)] shadow-[var(--shadow-sm)]">
            <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Session: <strong>{formatTime(elapsedSecs)}</strong></span>
          </div>

          {/* Round 1 Feedback Shortcut for Round 1 Interviewer during Round 2 */}
          {currentRound === 2 && !isCompleted && initialRoleRef.current === 'interviewer' && (
            <button
              onClick={handleOpenFeedback}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-dim)] cursor-pointer shadow-sm animate-pulse"
              title="Give or review feedback for Round 1 Candidate"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{hasFeedbackSubmitted ? 'Round 1 Feedback Submitted' : 'Give Round 1 Feedback'}</span>
            </button>
          )}

          {/* MUTUAL CONSENT ROLE SWAP BUTTON */}
          {switchCount === 0 && !isCompleted ? (
            isSwitchRequestedByMe ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-[var(--accent)] px-2.5 py-1.5 rounded bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center gap-1.5 font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                  <span>Waiting for Peer Acceptance...</span>
                </span>
                <button
                  onClick={handleDeclineSwitch}
                  disabled={switching}
                  className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--red)] underline px-1 cursor-pointer"
                  title="Cancel role switch request"
                >
                  Cancel
                </button>
              </div>
            ) : isSwitchRequestedByPeer ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleAcceptSwitch}
                  disabled={switching}
                  className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold shadow-sm animate-pulse"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept Role Switch</span>
                </button>
                <button
                  onClick={handleDeclineSwitch}
                  disabled={switching}
                  className="btn btn-secondary text-xs py-1.5 px-2.5"
                >
                  <span>Decline</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleRequestSwitch}
                disabled={switching || isEndRequestedByMe || isEndRequestedByPeer}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold shadow-[var(--shadow-sm)] border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-dim)] cursor-pointer disabled:opacity-50"
                title="Request to finish Round 1 and swap roles to Round 2 (Requires peer confirmation)"
              >
                {switching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                ) : (
                  <Repeat className="w-3.5 h-3.5 text-[var(--accent)]" />
                )}
                <span>Request Role Swap (Round 2)</span>
              </button>
            )
          ) : (
            <span className="text-[11px] font-mono text-[var(--text-muted)] px-2.5 py-1 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
              {isCompleted ? 'Session Ended' : 'Final Round (Swap Locked)'}
            </span>
          )}

          {/* MUTUAL CONSENT END INTERVIEW BUTTON */}
          {isCompleted ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenFeedback}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-dim)] cursor-pointer shadow-sm"
                title="Give or review feedback for your peer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{hasFeedbackSubmitted ? 'Peer Feedback Submitted' : 'Give Peer Feedback'}</span>
              </button>
              <button
                onClick={() => navigate('/interviews')}
                className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Room</span>
              </button>
            </div>
          ) : isEndRequestedByMe ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-[var(--red)] px-2.5 py-1.5 rounded bg-red-500/10 border border-red-500/30 flex items-center gap-1.5 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--red)]" />
                <span>Waiting for Peer...</span>
              </span>
              <button
                onClick={handleDirectEnd}
                disabled={ending}
                className="btn btn-danger text-[11px] py-1 px-2.5 cursor-pointer font-bold shadow-sm"
                title="End interview immediately without waiting"
              >
                End & Exit Now
              </button>
              <button
                onClick={handleDeclineEnd}
                disabled={ending}
                className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--red)] underline px-1 cursor-pointer"
                title="Cancel end request"
              >
                Cancel
              </button>
            </div>
          ) : isEndRequestedByPeer ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAcceptEnd}
                disabled={ending}
                className="btn btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold shadow-sm animate-pulse cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm End Interview</span>
              </button>
              <button
                onClick={handleDeclineEnd}
                disabled={ending}
                className="btn btn-secondary text-xs py-1.5 px-2.5 cursor-pointer"
              >
                <span>Decline</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleRequestEnd}
              disabled={ending || isSwitchRequestedByMe}
              className="btn btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Request mutual consent to conclude and end the interview"
            >
              {ending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>End Interview</span>
            </button>
          )}
        </div>
      </div>

      {/* Live WebRTC Audio Call Control Banner */}
      {!isCompleted && !micModalOpen && (
        <AudioCallBanner
          connectionState={connectionState}
          isMuted={isMuted}
          peerMuted={peerMuted}
          isSpeaking={isSpeaking}
          isPeerSpeaking={isPeerSpeaking}
          onToggleMute={toggleMute}
          peerName={peerUser?.name || 'Peer Student'}
          uploadingRecording={uploadingRecording}
        />
      )}

      {/* MUTUAL CONSENT MODAL / PROMPT BANNER FOR PEER (ROLE SWITCH) */}
      {isSwitchRequestedByPeer && switchCount === 0 && !isCompleted && (
        <div className="p-4 rounded-[var(--radius-md)] border-2 border-[var(--accent)] bg-[var(--accent-dim)] shadow-[var(--shadow-md)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-[var(--accent)] text-white shrink-0 mt-0.5 sm:mt-0">
              <Repeat className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Peer Requested Round Switch (Round 2)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--accent)] text-white uppercase font-bold">
                  Action Required
                </span>
              </h4>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Your peer has completed their part of Round 1 and requested to switch roles. When you confirm, roles will swap and a new random question will be assigned for Round 2.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={handleAcceptSwitch}
              disabled={switching}
              className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
            >
              {switching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Accept & Switch to Round 2</span>
            </button>
            <button
              onClick={handleDeclineSwitch}
              disabled={switching}
              className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>Not Ready</span>
            </button>
          </div>
        </div>
      )}

      {/* MUTUAL CONSENT MODAL / PROMPT BANNER FOR PEER (END INTERVIEW) */}
      {isEndRequestedByPeer && !isCompleted && (
        <div className="p-4 rounded-[var(--radius-md)] border-2 border-[var(--red)] bg-red-500/10 dark:bg-red-950/20 shadow-[var(--shadow-md)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-[var(--red)] text-white shrink-0 mt-0.5 sm:mt-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Peer Requested to Conclude & End Interview</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--red)] text-white uppercase font-bold">
                  Action Required
                </span>
              </h4>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Your peer has requested to end the live interview session. Both participants must confirm to conclude the session and finalize results.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={handleAcceptEnd}
              disabled={ending}
              className="btn btn-danger text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
            >
              {ending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Accept & Conclude Interview</span>
            </button>
            <button
              onClick={handleDeclineEnd}
              disabled={ending}
              className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>Keep Practicing</span>
            </button>
          </div>
        </div>
      )}

      {/* COMPLETED BANNER */}
      {isCompleted && (
        <div className="p-4 rounded-[var(--radius-md)] border-2 border-[var(--border-accent)] bg-[var(--accent-dim)] shadow-[var(--shadow-md)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-[var(--accent)] text-white shrink-0 mt-0.5 sm:mt-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Interview Session Concluded</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--accent)] text-white uppercase font-bold">
                  Completed
                </span>
              </h4>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Both participants have concluded this peer interview session. You can review your history or return to the dashboard.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => navigate('/interviews')}
              className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      )}

      {/* Role Banner */}
      <div className={`p-3 rounded-[var(--radius-sm)] border flex flex-col sm:flex-row sm:items-center justify-between text-xs transition-all gap-2 ${
        currentUserRole === 'interviewer'
          ? 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--text-primary)]'
          : 'bg-[var(--green-bg)] border-[var(--green)]/30 text-[var(--text-primary)]'
      }`}>
        <div className="flex items-center gap-2.5">
          {currentUserRole === 'interviewer' ? (
            <Shield className="w-4 h-4 text-[var(--accent)] shrink-0" />
          ) : (
            <Award className="w-4 h-4 text-[var(--green)] shrink-0" />
          )}
          <span>
            You are currently the <strong>{currentUserRole === 'interviewer' ? 'Interviewer (Assessor)' : 'Candidate (Interviewee)'}</strong> in Round {currentRound}.
            {currentUserRole === 'interviewer'
              ? ' You have full visibility into the solutions, rubrics, hints, and test cases.'
              : ' Write and execute your code in the shared workspace. Your interviewer is observing live.'}
          </span>
        </div>

        {/* Live Execution Telemetry Status Pill for Interviewer */}
        {currentUserRole === 'interviewer' && sessionData?.last_execution_verdict && (
          <div className={`px-2.5 py-1 rounded font-mono text-[11px] font-bold flex items-center gap-1.5 self-start sm:self-auto border shrink-0 ${
            sessionData.last_execution_verdict === 'Accepted' || sessionData.last_execution_verdict === 'All Sample Cases Passed'
              ? 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/40'
              : 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/40'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>
              Candidate {sessionData.last_execution_type === 'submit' ? 'Submitted' : 'Ran'}: {sessionData.last_execution_verdict} ({sessionData.last_execution_passed}/{sessionData.last_execution_total} Passed)
            </span>
          </div>
        )}
      </div>

      {/* Main Dual-Panel Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ============================================================ */}
        {/* LEFT PANEL: Problem & Assessor Guide */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* INTERVIEWER PERSPECTIVE */}
          {currentUserRole === 'interviewer' ? (
            <div className="panel-card overflow-hidden border border-[var(--border)]">
              {/* Interviewer Navigation Tabs */}
              <div className="flex items-center gap-1 p-2 bg-[var(--bg-raised)] border-b border-[var(--border)] text-[11px] font-mono font-bold uppercase tracking-wider overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setInterviewerTab('problem')}
                  className={`px-2.5 py-1.5 rounded transition ${
                    interviewerTab === 'problem'
                      ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewerTab('hints')}
                  className={`px-2.5 py-1.5 rounded transition ${
                    interviewerTab === 'hints'
                      ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Hints & Tips
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewerTab('solution')}
                  className={`px-2.5 py-1.5 rounded transition ${
                    interviewerTab === 'solution'
                      ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Approach & Rubrics
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewerTab('testcases')}
                  className={`px-2.5 py-1.5 rounded transition ${
                    interviewerTab === 'testcases'
                      ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  All Cases ({openCases.length + (payload.hidden_test_cases?.length || 2)})
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 space-y-4 max-h-[560px] overflow-y-auto text-[13px]">
                {/* 1. Problem Overview */}
                {interviewerTab === 'problem' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                        {question?.title || 'Coding Problem Assessment'}
                      </h3>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-bold">
                        {question?.difficulty || 'Medium'}
                      </span>
                    </div>

                    <div className="text-[13px] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                      {question?.prompt || 'No prompt provided.'}
                    </div>

                    {payload?.constraints && (
                      <div className="bg-[var(--bg-raised)] p-3 rounded border border-[var(--border)] font-mono text-[11px] space-y-1">
                        <span className="font-bold text-[var(--text-primary)] block">Constraints & Limits:</span>
                        <div className="text-[var(--text-muted)] whitespace-pre-line">
                          {payload.constraints}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Hints & Guiding Questions */}
                {interviewerTab === 'hints' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--accent)]">
                      <Lightbulb className="w-4 h-4" />
                      <span>Assessor Hints (Share as needed if candidate struggles)</span>
                    </div>

                    {payload?.hints && payload.hints.length > 0 ? (
                      <div className="space-y-2">
                        {payload.hints.map((hint, i) => (
                          <div key={i} className="p-3 bg-[var(--bg-raised)] rounded border border-[var(--border)] text-[12px] text-[var(--text-secondary)] leading-relaxed">
                            <span className="font-bold text-[var(--accent)] block mb-1">Hint {i + 1}:</span>
                            {hint}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[var(--text-muted)] italic">
                        No specific hints defined. Probe on brute force vs optimal lookup tradeoffs.
                      </p>
                    )}

                    {payload?.interview_tips && (
                      <div className="p-3 bg-[var(--accent-dim)] rounded border border-[var(--border-accent)] text-[12px] space-y-1">
                        <span className="font-bold text-[var(--accent)] block">Interview Tips:</span>
                        <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
                          {payload.interview_tips.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Expected Approach & Rubrics */}
                {interviewerTab === 'solution' && (
                  <div className="space-y-3">
                    {payload?.expected_approach && (
                      <div className="p-3 bg-[var(--bg-raised)] rounded border border-[var(--border)] space-y-1">
                        <span className="font-bold text-[var(--green)] text-[12px] block">Expected Optimal Approach:</span>
                        <div className="text-[12px] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                          {payload.expected_approach}
                        </div>
                      </div>
                    )}

                    {payload?.expected_complexity && (
                      <div className="p-3 bg-[var(--bg-raised)] rounded border border-[var(--border)] font-mono text-[11px] space-y-1">
                        <span className="font-bold text-[var(--text-primary)] block">Expected Complexity:</span>
                        <div className="text-[var(--text-muted)] whitespace-pre-line">
                          {payload.expected_complexity}
                        </div>
                      </div>
                    )}

                    {payload?.rubrics && (
                      <div className="p-3 bg-[var(--bg-raised)] rounded border border-[var(--border)] space-y-1">
                        <span className="font-bold text-[var(--accent)] text-[12px] block">Evaluation Rubrics:</span>
                        <ul className="list-disc pl-4 space-y-1 text-[12px] text-[var(--text-secondary)]">
                          {payload.rubrics.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Sample Test Cases (Never show hidden cases to interviewer) */}
                {interviewerTab === 'testcases' && (
                  <div className="space-y-3 font-mono text-[12px]">
                    {openCases.length > 0 ? (
                      <div>
                        <span className="font-bold text-[var(--text-muted)] text-[11px] uppercase block mb-1">
                          Sample Test Cases:
                        </span>
                        {openCases.map((tc, idx) => (
                          <div key={idx} className="p-2.5 bg-[var(--bg-raised)] rounded border border-[var(--border)] mb-2 space-y-1">
                            <div className="text-[var(--text-secondary)]">Input: {tc.input}</div>
                            <div className="text-[var(--green)] font-bold">Expected: {tc.output}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-muted)] text-center text-xs">
                        No automated test cases configured for this question.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* CANDIDATE PERSPECTIVE (Stripped problem description only) */
            /* ============================================================ */
            <div className="panel-card p-5 border border-[var(--border)] space-y-4 max-h-[560px] overflow-y-auto">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30">
                  Question #{question?.id || 1} • {question?.difficulty || 'Medium'}
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">
                  Mode: {question?.type || 'coding'}
                </span>
              </div>

              <h2 className="text-[18px] font-bold text-[var(--text-primary)]">
                {question?.title || 'Problem Description'}
              </h2>

              <div className="text-[13px] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                {question?.prompt || 'No prompt provided.'}
              </div>

              {payload?.constraints && (
                <div className="bg-[var(--bg-raised)] p-3 rounded-[var(--radius-sm)] border border-[var(--border)] font-mono text-[11px] space-y-1">
                  <span className="font-bold text-[var(--text-primary)] block">Constraints & Limits:</span>
                  <div className="text-[var(--text-muted)] whitespace-pre-line">
                    {payload.constraints}
                  </div>
                </div>
              )}

              {/* Open Sample Cases (Only shown if test cases exist) */}
              {openCases.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase font-bold text-[var(--text-muted)] block">
                    Sample Test Cases:
                  </span>
                  {openCases.map((tc, idx) => (
                    <div key={idx} className="bg-[var(--bg-raised)] p-3 rounded border border-[var(--border)] font-mono text-[11px] space-y-1">
                      <span className="font-bold text-[var(--accent)] block">Example {idx + 1}:</span>
                      <div><span className="text-[var(--text-muted)]">Input (stdin):</span> <span className="whitespace-pre-wrap">{tc.input}</span></div>
                      <div><span className="text-[var(--text-muted)]">Expected (stdout):</span> <strong className="text-[var(--green)] whitespace-pre-wrap">{tc.output}</strong></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* RIGHT PANEL: Shared CodeMirror 6 Editor & Test Console */}
        {/* ============================================================ */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          {/* CodeMirror 6 Editor */}
          <div className="h-[360px]">
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
              language={language}
              onLanguageChange={handleLanguageChange}
              isEditable={currentUserRole === 'interviewee'}
            />
          </div>

          {/* Test Cases Runner Console */}
          <TestCasesConsole
            openTestCases={openCases}
            onRunCode={handleRunCode}
            onSubmitCode={handleSubmitCode}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            isCandidate={currentUserRole === 'interviewee'}
            runResults={runResults}
            submissionResult={submissionResult}
            lastExecutionInfo={
              sessionData?.last_execution_verdict
                ? `${sessionData.last_execution_verdict} - ${sessionData.last_execution_passed}/${sessionData.last_execution_total} Passed`
                : null
            }
          />
        </div>
      </div>

      {/* Confirmation & Alert Modal */}
      <ConfirmModal {...modalConfig} onClose={closeModal} />

      {/* Dynamic Peer Feedback Modal */}
      <PeerFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => {
          setShowFeedbackModal(false);
          if (isCompleted && !hasSecuritySubmitted) {
            setShowSecurityModal(true);
          }
        }}
        sessionId={sessionId}
        peerUser={peerUser}
        roundNumber={feedbackRound}
        isCompleted={isCompleted}
        onSubmitted={() => {
          setHasFeedbackSubmitted(true);
          fetchSession();
          if (isCompleted) {
            setShowFeedbackModal(false);
            setShowSecurityModal(true);
          }
        }}
      />

      {/* Post-Feedback Credential Security Audit Modal */}
      <CredentialAuditModal
        isOpen={showSecurityModal}
        onClose={() => {
          setShowSecurityModal(false);
          navigate('/interviews');
        }}
        sessionId={sessionId}
        peerUser={peerUser}
        onCompleted={() => {
          setHasSecuritySubmitted(true);
          fetchSession();
        }}
      />

      {/* Pre-Flight Microphone Permission & Diagnostics Modal */}
      <MicPermissionModal
        isOpen={micModalOpen && !isCompleted}
        onPermissionGranted={() => setMicModalOpen(false)}
      />
    </div>
  );
}
