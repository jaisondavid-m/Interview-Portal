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
  
  // Navigation State: null = Card Hub Overview | 'r1' | 'r2' | 'audio' | 'feedback'
  const [selectedModule, setSelectedModule] = useState(null);
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
    whiteboard: { label: 'System Design (Whiteboard)', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    database: { label: 'Database & SQL Sandbox', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    mcq: { label: 'Multiple Choice (MCQ)', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    frontend: { label: 'Frontend UI (React)', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
    backend: { label: 'Backend API Service', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
    verbal_qa: { label: 'Verbal Technical Q&A', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
    coding: { label: 'Algorithmic Coding (DSA)', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  }[displayMode] || { label: displayMode.toUpperCase(), color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };

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
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse shadow-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>LIVE MONITOR ACTIVE (ROUND {session.round})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-[var(--bg-raised)] text-[var(--text-secondary)] border border-[var(--border)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
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
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border-[var(--border)]'
              }`}
              title="Toggle automatic live syncing"
            >
              {livePolling ? <Play className="w-3.5 h-3.5 text-emerald-500" /> : <Pause className="w-3.5 h-3.5" />}
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
            <Repeat className="w-4 h-4 text-purple-500" />
            <span>{session.round === 2 || session.roles_switched ? 'Round 2 (Swapped)' : 'Round 1 Active'}</span>
          </span>
        </div>

        <div className="panel-card p-4 space-y-1 border border-[var(--border)] bg-[var(--bg-card)] shadow-xs">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block tracking-wider">
            Dialogue Audio Recording
          </span>
          <span className="text-[14px] font-bold font-mono flex items-center gap-1.5">
            <FileAudio className="w-4 h-4 text-emerald-500" />
            <span className={session.recording ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-muted)]'}>
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
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Clean / Compliant</span>
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. IF IN CARD HUB OVERVIEW (selectedModule === null): RENDER 4 CARDS */}
      {/* ============================================================ */}
      {selectedModule === null ? (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h2 className="text-[16px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Grid className="w-4 h-4 text-[var(--accent)]" />
                <span>Interview Session Modules & Artifact Workspaces</span>
              </h2>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Click any module card below to inspect candidate code, whiteboard architecture, audio recordings, or peer evaluation rubrics in detail.
              </p>
            </div>
            <span className="text-[11px] font-mono text-[var(--text-muted)] hidden sm:block">
              4 Modules Available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CARD 1: ROUND 1 WORKSPACE */}
            <div
              onClick={() => setSelectedModule('r1')}
              className="panel-card p-5 border border-[var(--border)] hover:border-[var(--accent)] bg-[var(--bg-card)] hover:bg-[var(--bg-card)]/90 transition-all rounded-[var(--radius-lg)] cursor-pointer group shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 font-mono font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                      1
                    </span>
                    <span className="text-[13px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      Round 1 Workspace
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${modeBadgeInfo.color}`}>
                      {modeBadgeInfo.label}
                    </span>
                    {isLive && session.round === 1 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </div>
                </div>

                {/* Candidate info snippet */}
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-raised)]/70 border border-[var(--border)] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      Candidate: {studentB?.name || 'Student B'}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {studentB?.roll_no || ''}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--text-primary)] truncate font-medium">
                    {session.round1_question?.title || session.current_question?.title || 'Assessment Question'}
                  </p>
                </div>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  View submitted code, live frontend preview, database SQL queries, or whiteboard canvas for Round 1 along with test case evaluations and assessor rubrics.
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono font-bold text-[var(--accent)] group-hover:translate-x-1 transition-transform">
                <span>Open Round 1 Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 2: ROUND 2 WORKSPACE */}
            <div
              onClick={() => setSelectedModule('r2')}
              className="panel-card p-5 border border-[var(--border)] hover:border-purple-500 bg-[var(--bg-card)] hover:bg-[var(--bg-card)]/90 transition-all rounded-[var(--radius-lg)] cursor-pointer group shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500/15 text-purple-600 font-mono font-bold text-xs flex items-center justify-center border border-purple-500/30">
                      2
                    </span>
                    <span className="text-[13px] font-bold text-[var(--text-primary)] group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      Round 2 Workspace
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                      hasRound2 ? 'bg-purple-500/10 text-purple-600 border-purple-500/30' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                    }`}>
                      {hasRound2 ? (session.round === 2 && isLive ? 'Live Active' : 'Swapped') : 'Not Started'}
                    </span>
                    {isLive && session.round === 2 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </div>
                </div>

                {/* Candidate info snippet */}
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-raised)]/70 border border-[var(--border)] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-mono font-bold uppercase text-purple-600 dark:text-purple-400">
                      Candidate: {studentA?.name || 'Student A'}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {studentA?.roll_no || ''}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--text-primary)] truncate font-medium">
                    {session.round2_question?.title || (hasRound2 ? 'Round 2 Problem' : 'Waiting for Role Swap')}
                  </p>
                </div>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  Inspect student role swap submissions, Round 2 code artifacts, whiteboard studio, test verification, and assessor scorecard.
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
                <span>{hasRound2 ? 'Open Round 2 Workspace' : 'View Round 2 Status'}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 3: DIALOGUE AUDIO & SAFETY AUDIT */}
            <div
              onClick={() => setSelectedModule('audio')}
              className="panel-card p-5 border border-[var(--border)] hover:border-indigo-500 bg-[var(--bg-card)] hover:bg-[var(--bg-card)]/90 transition-all rounded-[var(--radius-lg)] cursor-pointer group shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-600 flex items-center justify-center border border-indigo-500/30">
                      <Radio className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[13px] font-bold text-[var(--text-primary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Dialogue Audio & Safety Audit
                    </span>
                  </div>

                  {hasSolicitation ? (
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 border border-rose-500/30 animate-pulse">
                      Safety Flagged
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Compliant
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-raised)]/70 border border-[var(--border)] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileAudio className="w-4 h-4 text-indigo-500" />
                    <span className="font-medium text-[var(--text-primary)]">
                      {session.recording ? 'Audio Recording Available' : 'No Recording Captured'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">
                    {calculateDuration(session.started_at, session.ended_at)}
                  </span>
                </div>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  Listen to the synchronized voice recording, technical dialogue, peer collaboration, and review flagged anonymity incidents.
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                <span>Open Audio & Safety Audit</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 4: MUTUAL PEER FEEDBACK */}
            <div
              onClick={() => setSelectedModule('feedback')}
              className="panel-card p-5 border border-[var(--border)] hover:border-amber-500 bg-[var(--bg-card)] hover:bg-[var(--bg-card)]/90 transition-all rounded-[var(--radius-lg)] cursor-pointer group shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center border border-amber-500/30">
                      <Award className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[13px] font-bold text-[var(--text-primary)] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Mutual Peer Feedback & Scores
                    </span>
                  </div>

                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    {(session.feedbacks || []).length} / 2 Reviews
                  </span>
                </div>

                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-raised)]/70 border border-[var(--border)] flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--text-primary)]">
                    Cross-Evaluations & Peer Scorecards
                  </span>
                  <span className="font-mono text-[11px] text-[var(--accent)] font-bold">
                    {(session.feedbacks || []).length === 2 ? 'Both Submitted' : 'Pending Completion'}
                  </span>
                </div>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  Review side-by-side mutual peer feedback submitted by both students, qualitative comments, awarded points, and rubric breakdowns.
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
                <span>View Peer Reviews & Scores</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 3. DRILL-DOWN DETAIL VIEW: WITH "BACK TO CARDS" NAVIGATION */
        /* ============================================================ */
        <div className="space-y-6 animate-in fade-in">
          {/* Back Navigation Bar & Quick Switcher */}
          <div className="p-3 sm:p-4 rounded-[var(--radius-lg)] bg-[var(--bg-card)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <button
              type="button"
              onClick={() => setSelectedModule(null)}
              className="btn btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 cursor-pointer font-bold self-start sm:self-auto hover:border-[var(--accent)] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Back</span>
            </button>

            {/* Quick module selector pill strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectedModule('r1')}
                className={`text-[11px] font-mono font-bold px-2.5 py-1.5 rounded transition cursor-pointer ${
                  selectedModule === 'r1'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                1. Round 1
              </button>

              <button
                type="button"
                onClick={() => setSelectedModule('r2')}
                className={`text-[11px] font-mono font-bold px-2.5 py-1.5 rounded transition cursor-pointer ${
                  selectedModule === 'r2'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                2. Round 2
              </button>

              <button
                type="button"
                onClick={() => setSelectedModule('audio')}
                className={`text-[11px] font-mono font-bold px-2.5 py-1.5 rounded transition cursor-pointer ${
                  selectedModule === 'audio'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                3. Audio & Safety
              </button>

              <button
                type="button"
                onClick={() => setSelectedModule('feedback')}
                className={`text-[11px] font-mono font-bold px-2.5 py-1.5 rounded transition cursor-pointer ${
                  selectedModule === 'feedback'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                4. Peer Feedback
              </button>
            </div>
          </div>

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
      )}
    </div>
  );
}
