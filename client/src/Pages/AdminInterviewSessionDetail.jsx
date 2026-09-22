import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  ArrowLeft,
  Users,
  ShieldAlert,
  Award,
  Clock,
  Repeat,
  AlertCircle,
  Loader2,
  Calendar,
  Radio,
  FileAudio,
  Mail,
  RefreshCw,
  FileText,
  Activity,
  Layers,
  Code2,
  Database,
  Terminal,
  Play,
  Pause,
  ChevronRight,
  Info,
  CheckCircle2,
  ShieldCheck,
  Zap,
  HelpCircle,
  Layout,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Grid
} from 'lucide-react';
import api from '../api/axios';
import AudioPlayer from '../Components/AudioPlayer';
import AdminRoundArtifactViewer from '../Components/AdminInterview/AdminRoundArtifactViewer';

export default function AdminInterviewSessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation State: 'r1' | 'r2' | 'audio' | 'feedback' (default 'r1')
  const [selectedModule, setSelectedModule] = useState('r1');
  const [livePolling, setLivePolling] = useState(true);
  const [pollIntervalMs, setPollIntervalMs] = useState(2500);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());

  const pollTimerRef = useRef(null);

  const fetchSessionDetails = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError('');
      const res = await api.get(`/admin/interviews/sessions/${sessionId}`);
      const sessionObj = res?.data || res?.session || res;

      const combined = {
        ...sessionObj,
        feedbacks: res?.feedbacks || sessionObj?.feedbacks || [],
        recording: res?.recording || sessionObj?.recording || null,
        security_reports: res?.security_reports || sessionObj?.security_reports || [],
      };

      // Fallback: If recording is not directly populated, try recording endpoint
      if (!combined.recording) {
        try {
          const recRes = await api.get(`/interviews/sessions/${sessionId}/recording`);
          combined.recording = recRes?.recording || recRes?.data || null;
        } catch (e) {
          // ignore error if recording is not available
        }
      }

      setSession(combined);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to load session details:', err);
      if (!isSilent) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch session details.');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails(false);
    }
  }, [sessionId]);

  // Live Auto-Polling for active sessions
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    if (session?.status === 'in_progress' && livePolling) {
      pollTimerRef.current = setInterval(() => {
        fetchSessionDetails(true);
      }, pollIntervalMs);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [session?.status, livePolling, pollIntervalMs, fetchSessionDetails]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (startStr, endStr) => {
    if (!startStr) return '—';
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : new Date();
    const diffSecs = Math.max(0, Math.floor((end - start) / 1000));
    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading && !session) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-[var(--text-muted)] space-y-3">
        <Loader2 className="w-9 h-9 text-[var(--accent)] animate-spin" />
        <span className="text-xs font-mono font-bold">Loading Session #{sessionId} Live Record...</span>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fadeIn font-sans">
        <button
          type="button"
          onClick={() => navigate('/admin/history')}
          className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Interview History</span>
        </button>

        <div className="panel-card p-10 sm:p-14 text-center space-y-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-xs">
          <div className="w-44 h-44 sm:w-52 sm:h-52 mx-auto flex items-center justify-center">
            <DotLottieReact
              src="/lotties/document-empty.lottie"
              loop
              autoplay
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-[18px] font-bold text-[var(--text-primary)]">Session Record Not Found</h3>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              {error || `Unable to locate interview session record #${sessionId}.`}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => fetchSessionDetails(false)}
              className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLive = session?.status === 'in_progress';
  const hasSolicitation = session?.security_reports?.some((r) => r.asked_credentials);
  const hasRound2 = Boolean(session?.round2_question_id || session?.round2_candidate_code || session?.round2_candidate_whiteboard || session?.roles_switched || session?.round === 2);

  // Student A & Student B resolution
  // Round 1: Student A is Interviewer, Student B is Candidate
  let studentA = session.roles_switched ? session.interviewee : session.interviewer;
  let studentB = session.roles_switched ? session.interviewer : session.interviewee;

  // Mode badge
  const modeKey = (session.level?.mode || session.level_mode || 'coding').toLowerCase();
  const displayMode = modeKey === 'discussion' ? 'whiteboard' : modeKey;

  const modeBadgeInfo = {
    whiteboard: { label: 'System Design (Whiteboard)', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
    database: { label: 'Database & SQL Sandbox', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
    mcq: { label: 'Multiple Choice (MCQ)', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
    frontend: { label: 'Frontend UI (React)', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
    backend: { label: 'Backend API Service', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
    verbal_qa: { label: 'Verbal Technical Q&A', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
    coding: { label: 'Algorithmic Coding (DSA)', color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' },
  }[displayMode] || { label: displayMode.toUpperCase(), color: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]' };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ============================================================ */}
      {/* TOP HEADER: BREADCRUMBS, STATUS BADGES & CONTROLS */}
      {/* ============================================================ */}
      <div className="pb-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
            <button
              type="button"
              onClick={() => navigate('/admin/history')}
              className="hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Interview History</span>
            </button>
            <span>/</span>
            <span className="text-[var(--accent)] font-bold">Session #{session.id}</span>
            <span>/</span>
            <span className="uppercase text-[11px] font-semibold">{displayMode} Mode</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-0.5">
            <h1 className="text-[22px] sm:text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
              {session.track_title || session.track?.title || 'Peer Mock Interview'}
            </h1>

            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-strong)] animate-pulse shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
                <span>LIVE MONITOR ACTIVE (ROUND {session.round})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-[var(--bg-raised)] text-[var(--text-secondary)] border border-[var(--border)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>COMPLETED ARCHIVE</span>
              </span>
            )}

            {hasSolicitation && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>IDENTITY SOLICITATION FLAGGED</span>
              </span>
            )}
          </div>

          <p className="text-[13px] text-[var(--text-secondary)]">
            Level {session.level_number || session.level?.level_number || 1}: {session.level_name || session.level?.name || 'Assessment'} ({session.level_mode?.toUpperCase() || displayMode.toUpperCase()} Mode) • {session.track_category || 'Technical'} Domain
          </p>
        </div>

        {/* Live Controls & Refresh Toolbar */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {isLive && (
            <button
              type="button"
              onClick={() => setLivePolling(!livePolling)}
              className={`text-xs py-1.5 px-3 rounded-[var(--radius-sm)] border font-mono font-bold flex items-center gap-1.5 cursor-pointer transition ${
                livePolling
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-strong)]'
                  : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border-[var(--border)]'
              }`}
              title="Toggle automatic live syncing"
            >
              {livePolling ? <Play className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{livePolling ? 'Live Sync: ON (2s)' : 'Live Sync: PAUSED'}</span>
            </button>
          )}

          <button
            onClick={() => fetchSessionDetails(false)}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-xs"
            title={`Last refreshed at ${lastRefreshedAt.toLocaleTimeString()}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => navigate('/admin/history')}
            className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All History</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. METRICS OVERVIEW STRIP */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="panel-card p-4 space-y-1 border border-[var(--border)] bg-[var(--bg-card)] shadow-xs">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block tracking-wider">
            Total Duration
          </span>
          <span className="text-[15px] font-bold font-mono text-[var(--text-primary)] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[var(--accent)]" />
            <span>{calculateDuration(session.started_at, session.ended_at)}</span>
          </span>
        </div>

        <div className="panel-card p-4 space-y-1 border border-[var(--border)] bg-[var(--bg-card)] shadow-xs">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block tracking-wider">
            Round Progress & Switch
          </span>
          <span className="text-[14px] font-bold font-mono text-[var(--text-primary)] flex items-center gap-1.5">
            <Repeat className="w-4 h-4 text-[var(--accent)]" />
            <span>{session.round === 2 || session.roles_switched ? 'Round 2 (Swapped)' : 'Round 1 Active'}</span>
          </span>
        </div>

        <div className="panel-card p-4 space-y-1 border border-[var(--border)] bg-[var(--bg-card)] shadow-xs">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block tracking-wider">
            Dialogue Audio Recording
          </span>
          <span className="text-[14px] font-bold font-mono flex items-center gap-1.5">
            <FileAudio className="w-4 h-4 text-[var(--accent)]" />
            <span className={session.recording ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-muted)]'}>
              {session.recording ? 'Audio Available' : 'No Recording'}
            </span>
          </span>
        </div>

        <div className="panel-card p-4 space-y-1 border border-[var(--border)] bg-[var(--bg-card)] shadow-xs">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block tracking-wider">
            Safety & Anonymity Audit
          </span>
          <span className="text-[14px] font-bold font-mono flex items-center gap-1.5">
            {hasSolicitation ? (
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4" />
                <span>Flagged (Review)</span>
              </span>
            ) : (
              <span className="text-[var(--accent)] flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Clean / Compliant</span>
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SECTION PILL TAB SWITCHER */}
      {/* ============================================================ */}
      <div className="flex items-center gap-2.5 overflow-x-auto custom-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setSelectedModule('r1')}
          className={`text-[12px] sm:text-[13px] font-mono font-bold px-4 py-2 rounded-lg transition-all cursor-pointer shadow-xs ${
            selectedModule === 'r1'
              ? 'bg-[#6e56cf] text-white shadow-sm'
              : 'bg-white text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:bg-[#faf9ff]'
          }`}
        >
          1. Round 1
        </button>

        <button
          type="button"
          onClick={() => setSelectedModule('r2')}
          className={`text-[12px] sm:text-[13px] font-mono font-bold px-4 py-2 rounded-lg transition-all cursor-pointer shadow-xs ${
            selectedModule === 'r2'
              ? 'bg-[#6e56cf] text-white shadow-sm'
              : 'bg-white text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:bg-[#faf9ff]'
          }`}
        >
          2. Round 2
        </button>

        <button
          type="button"
          onClick={() => setSelectedModule('audio')}
          className={`text-[12px] sm:text-[13px] font-mono font-bold px-4 py-2 rounded-lg transition-all cursor-pointer shadow-xs ${
            selectedModule === 'audio'
              ? 'bg-[#6e56cf] text-white shadow-sm'
              : 'bg-white text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:bg-[#faf9ff]'
          }`}
        >
          3. Audio & Safety
        </button>

        <button
          type="button"
          onClick={() => setSelectedModule('feedback')}
          className={`text-[12px] sm:text-[13px] font-mono font-bold px-4 py-2 rounded-lg transition-all cursor-pointer shadow-xs ${
            selectedModule === 'feedback'
              ? 'bg-[#6e56cf] text-white shadow-sm'
              : 'bg-white text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:bg-[#faf9ff]'
          }`}
        >
          4. Peer Feedback
        </button>
      </div>

      {/* ============================================================ */}
      {/* 3. ACTIVE SECTION WORKSPACE */}
      {/* ============================================================ */}
      <div className="space-y-6 animate-in fade-in">
        {/* MODULE 1: ROUND 1 */}
        {selectedModule === 'r1' && (
          <AdminRoundArtifactViewer
            roundNumber={1}
            candidate={studentB}
            interviewer={studentA}
            question={session.round1_question || session.current_question}
            code={session.round1_candidate_code || (session.round === 1 ? session.candidate_code : '')}
            lang={session.round1_candidate_lang || session.candidate_lang}
            whiteboardData={session.round1_candidate_whiteboard || (session.round === 1 ? session.candidate_whiteboard : '')}
            rubrics={session.round1_rubrics || (session.round === 1 ? session.interviewer_rubrics : null)}
            executionVerdict={session.round1_execution_verdict || (session.round === 1 ? session.last_execution_verdict : '')}
            executionPassed={session.round1_execution_passed || (session.round === 1 ? session.last_execution_passed : 0)}
            executionTotal={session.round1_execution_total || (session.round === 1 ? session.last_execution_total : 0)}
            executionJson={session.round1_execution_json || (session.round === 1 ? session.last_execution_json : '')}
            isLive={isLive && session.round === 1}
            levelMode={displayMode}
            sessionId={session.id}
          />
        )}

        {/* MODULE 2: ROUND 2 */}
        {selectedModule === 'r2' && (
          <div>
            {hasRound2 ? (
              <AdminRoundArtifactViewer
                roundNumber={2}
                candidate={studentA}
                interviewer={studentB}
                question={session.round2_question}
                code={session.round2_candidate_code || (session.round === 2 ? session.candidate_code : '')}
                lang={session.round2_candidate_lang || session.candidate_lang}
                whiteboardData={session.round2_candidate_whiteboard || (session.round === 2 ? session.candidate_whiteboard : '')}
                rubrics={session.round2_rubrics || (session.round === 2 ? session.interviewer_rubrics : null)}
                executionVerdict={session.round2_execution_verdict || (session.round === 2 ? session.last_execution_verdict : '')}
                executionPassed={session.round2_execution_passed || (session.round === 2 ? session.last_execution_passed : 0)}
                executionTotal={session.round2_execution_total || (session.round === 2 ? session.last_execution_total : 0)}
                executionJson={session.round2_execution_json || (session.round === 2 ? session.last_execution_json : '')}
                isLive={isLive && session.round === 2}
                levelMode={displayMode}
                sessionId={session.id}
              />
            ) : (
              <div className="panel-card p-12 text-center space-y-4 border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--bg-card)] shadow-xs">
                <div className="w-14 h-14 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto border border-purple-500/20">
                  <Repeat className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                    Round 2 Not Initialized
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {isLive
                      ? 'The interview session is currently active in Round 1. Once participants swap roles, Round 2 artifacts and Student A submissions will appear here in real time.'
                      : 'This interview concluded before participants initiated a Round 2 role switch.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODULE 3: DIALOGUE AUDIO & SAFETY AUDIT */}
        {selectedModule === 'audio' && (
          <div className="space-y-6">
            {/* Security Incidents / Anonymity Reports */}
            {hasSolicitation && (
              <div className="rounded-[var(--radius-lg)] bg-[var(--bg-card)] border-2 border-rose-500/40 shadow-sm overflow-hidden space-y-0">
                <div className="bg-rose-500/10 px-5 py-3.5 border-b border-rose-500/20 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold shadow-xs">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-bold block">
                        Anonymity & Safety Policy Violation
                      </span>
                      <h4 className="text-[15px] font-bold text-[var(--text-primary)]">
                        Peer Identity Solicitation Flagged
                      </h4>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-bold uppercase bg-rose-600 text-white px-3 py-1 rounded-full shadow-xs">
                    Admin Action Required
                  </span>
                </div>

                <div className="p-5 space-y-4 bg-[var(--bg-raised)]/40">
                  {session.security_reports.filter((r) => r.asked_credentials).map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-[var(--border)] text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[var(--text-primary)]">{r.reporter?.name || 'Participant'}</span>
                          <span className="text-rose-600 dark:text-rose-400 font-medium">reported that</span>
                          <span className="font-bold text-rose-700 dark:text-rose-300">{r.reported_user?.name || 'Peer'}</span>
                          <span className="text-rose-600 dark:text-rose-400 font-medium">requested personal identity credentials.</span>
                        </div>
                        <span className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDateTime(r.created_at)}</span>
                        </span>
                      </div>

                      {r.details && (
                        <div className="p-3 rounded bg-rose-500/5 border border-rose-500/15 space-y-1">
                          <span className="text-[10px] font-mono font-bold uppercase text-rose-600 block">Student Statement:</span>
                          <p className="text-xs font-mono italic text-[var(--text-primary)]">"{r.details}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audio Player */}
            <div className="panel-card p-6 border border-[var(--border)] space-y-4 rounded-[var(--radius-lg)] bg-[var(--bg-card)] shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[var(--border)]">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[var(--accent)]" />
                    <span>Interview Dialogue Audio Recording</span>
                  </h3>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                    Listen to the technical discussion, question explanations, and conduct verification.
                  </p>
                </div>

                {session.recording ? (
                  <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Audio Recorded</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                    <FileAudio className="w-3.5 h-3.5 opacity-50" />
                    <span>No audio recorded for this session</span>
                  </span>
                )}
              </div>

              <AudioPlayer
                recording={session.recording}
                session={session}
                title={`Session #${session.id} Dialogue Recording`}
              />
            </div>
          </div>
        )}

        {/* MODULE 4: MUTUAL PEER FEEDBACK */}
        {selectedModule === 'feedback' && (
          <div className="panel-card p-6 border border-[var(--border)] space-y-5 rounded-[var(--radius-lg)] bg-[var(--bg-card)] shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] flex-wrap gap-2">
              <div>
                <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[var(--accent)]" />
                  <span>Mutual Peer Feedback & Evaluations</span>
                </h3>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                  Ratings, category rubrics, and feedback submitted by both participants at session conclusion.
                </p>
              </div>

              <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-raised)] px-2.5 py-1 rounded border border-[var(--border)]">
                {(session.feedbacks || []).length} / 2 Reviews Submitted
              </span>
            </div>

            {(!session.feedbacks || session.feedbacks.length === 0) ? (
              <div className="p-8 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] text-center text-xs text-[var(--text-muted)] space-y-1">
                <Award className="w-6 h-6 mx-auto opacity-40 text-[var(--text-muted)]" />
                <p className="font-medium text-[13px] text-[var(--text-primary)]">No peer feedback submitted yet</p>
                <p>Peer evaluations will appear here once submitted by participants at the conclusion of the interview.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {session.feedbacks.map((fb) => {
                  const rev = fb.reviewer || {};
                  const target = fb.reviewee || {};
                  const responses = fb.responses || [];
                  const pct = Math.round(fb.score_percentage || 0);

                  return (
                    <div
                      key={fb.id}
                      className="p-5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] space-y-4 shadow-xs"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span className="font-bold text-[var(--text-primary)]">
                            {rev.name || 'Participant'}
                          </span>
                          <span className="text-[var(--text-muted)] font-mono">evaluated</span>
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {target.name || 'Peer'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-500/20">
                            Score: {fb.total_score} / {fb.max_score} ({pct}%)
                          </span>
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            {formatDateTime(fb.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-xs">
                        {responses.map((resp) => {
                          const q = resp.question || {};
                          return (
                            <div
                              key={resp.id}
                              className="p-3 rounded bg-[var(--bg-card)] border border-[var(--border)] space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[var(--text-muted)] font-medium text-[11px]">
                                  {q.question_text || `Question #${resp.question_id}`}
                                </p>
                                {resp.max_marks > 0 && (
                                  <span className="text-[10px] font-mono font-bold text-[var(--accent)] bg-[var(--accent-dim)] px-1.5 py-0.5 rounded shrink-0">
                                    +{resp.awarded_marks} / {resp.max_marks} pts
                                  </span>
                                )}
                              </div>
                              <p className="font-bold font-mono text-[var(--text-primary)] text-[13px]">
                                {resp.answer_value || '—'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
