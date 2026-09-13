import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  History,
  Users,
  Shield,
  ShieldAlert,
  Award,
  Clock,
  Repeat,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Calendar,
  Radio,
  FileAudio,
  Mail,
  BookOpen,
  Layers,
  Sparkles,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import api from '../api/axios';
import AudioPlayer from '../Components/AudioPlayer';

export default function AdminInterviewSessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
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
    } catch (err) {
      console.error('Failed to load session details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch session details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails();
    }
  }, [sessionId]);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-[var(--text-muted)] space-y-3">
        <Loader2 className="w-9 h-9 text-[var(--accent)] animate-spin" />
        <span className="text-xs font-mono">Loading Session #{sessionId} Detailed Record...</span>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/admin/history')}
          className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Interview History</span>
        </button>

        <div className="panel-card p-10 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-[var(--red)] mx-auto" />
          <h3 className="text-[17px] font-bold text-[var(--text-primary)]">Session Record Not Found</h3>
          <p className="text-[13px] text-[var(--text-muted)] max-w-md mx-auto">
            {error || `Unable to locate interview session record #${sessionId}.`}
          </p>
          <button
            onClick={fetchSessionDetails}
            className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  const hasSolicitation = session.security_reports?.some((r) => r.asked_credentials);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Breadcrumb & Header */}
      <div className="pb-5 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
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
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-1">
            <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
              {session.track_title || 'Peer Mock Interview'}
            </h1>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded ${
              session.status === 'in_progress'
                ? 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30'
                : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]'
            }`}>
              {session.status === 'in_progress' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
              )}
              <span>{session.status === 'in_progress' ? 'IN PROGRESS' : 'COMPLETED'}</span>
            </span>

            {hasSolicitation && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>IDENTITY SOLICITED</span>
              </span>
            )}
          </div>

          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Level {session.level_number}: {session.level_name} ({session.level_mode?.toUpperCase()} Mode) • {session.track_category || 'Technical'} Domain
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchSessionDetails}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => navigate('/admin/history')}
            className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All History</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. ANONYMITY RULE VIOLATION CALLOUT (IF FLAGGED) */}
      {/* ============================================================ */}
      {hasSolicitation && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--bg-card)] border-2 border-rose-500/40 shadow-sm overflow-hidden animate-in fade-in space-y-0">
          <div className="bg-rose-500/10 px-5 py-3.5 border-b border-rose-500/20 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-bold block">
                  Anonymity & Safety Policy Violation
                </span>
                <h4 className="text-[15px] font-bold text-[var(--text-primary)] font-ui">
                  Peer Identity Solicitation Flagged
                </h4>
              </div>
            </div>

            <span className="text-[11px] font-mono font-bold uppercase bg-rose-600 text-white px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Admin Review Required</span>
            </span>
          </div>

          <div className="p-5 space-y-4 bg-[var(--bg-raised)]/40">
            {session.security_reports.filter((r) => r.asked_credentials).map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="font-bold text-[var(--text-primary)]">
                      {r.reporter?.name || 'Participant'}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                      {r.reporter?.roll_no || 'Reporter'}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">reported that</span>
                    <span className="font-bold text-rose-700 dark:text-rose-300">
                      {r.reported_user?.name || 'Peer'}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold">
                      {r.reported_user?.roll_no || 'Reported Peer'}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">attempted to deanonymize the session.</span>
                  </div>

                  <span className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateTime(r.created_at)}</span>
                  </span>
                </div>

                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                  The student reported that their peer requested personal identity information (such as Register / Roll Number, Full Name, Phone Number, or Social Media / Contact credentials) during the anonymous interview.
                </p>

                {r.details && (
                  <div className="p-3 rounded-[var(--radius-xs)] bg-rose-500/5 border border-rose-500/15 space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                      Student Statement:
                    </span>
                    <p className="text-[12px] text-[var(--text-primary)] font-mono italic">
                      "{r.details}"
                    </p>
                  </div>
                )}
              </div>
            ))}

            <div className="p-3 rounded-[var(--radius-sm)] bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2.5 text-indigo-900 dark:text-indigo-200 text-xs">
              <Radio className="w-4 h-4 text-indigo-500 shrink-0 animate-pulse" />
              <span className="font-medium">
                <strong>Admin Audio Verification:</strong> Use the Dialogue Audio Recording player below to review the session dialogue and verify the report.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. SUMMARY STATS METADATA */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="panel-card p-4 space-y-1 border border-[var(--border)]">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block tracking-wider">
            Session Status
          </span>
          <span className={`text-[14px] font-bold font-mono ${session.status === 'in_progress' ? 'text-[var(--green)]' : 'text-[var(--text-primary)]'}`}>
            {session.status?.toUpperCase()}
          </span>
        </div>

        <div className="panel-card p-4 space-y-1 border border-[var(--border)]">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block tracking-wider">
            Total Duration
          </span>
          <span className="text-[14px] font-bold font-mono text-[var(--text-primary)]">
            {calculateDuration(session.started_at, session.ended_at)}
          </span>
        </div>

        <div className="panel-card p-4 space-y-1 border border-[var(--border)]">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block tracking-wider">
            Role Switches
          </span>
          <span className="text-[14px] font-bold font-mono text-[var(--accent)]">
            {session.switch_count || 0} times
          </span>
        </div>

        <div className="panel-card p-4 space-y-1 border border-[var(--border)]">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block tracking-wider">
            Domain Category
          </span>
          <span className="text-[14px] font-bold text-[var(--text-primary)] truncate block">
            {session.track_category || 'Technical'}
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. PARTICIPANT PROFILE CARDS */}
      {/* ============================================================ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono uppercase tracking-wider">
            <Users className="w-4 h-4 text-[var(--accent)]" />
            <span>Paired Student Participants</span>
          </h3>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            2 Students in Room
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Student A */}
          <div className="panel-card p-5 border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-accent)] transition-all space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                <span className="text-[12px] font-mono font-bold tracking-wider text-[var(--text-primary)] uppercase">
                  Student A
                </span>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] font-bold">
                Round 1 Interviewer
              </span>
            </div>

            {session.interviewer ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center font-bold font-mono text-[16px] border border-[var(--border-accent)] shrink-0 shadow-xs">
                    {session.interviewer.name ? session.interviewer.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[16px] font-bold text-[var(--text-primary)] truncate font-ui">
                      {session.interviewer.name}
                    </h4>
                    <p className="text-[12px] font-mono text-[var(--text-muted)] truncate flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate" title={session.interviewer.email}>
                        {session.interviewer.email}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[var(--border)] text-[12px] font-mono">
                  <div className="bg-[var(--bg-raised)] p-2.5 rounded-[var(--radius-xs)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Roll No</span>
                    <span className="font-bold text-[var(--text-primary)] truncate block mt-0.5">
                      {session.interviewer.roll_no || '—'}
                    </span>
                  </div>
                  <div className="bg-[var(--bg-raised)] p-2.5 rounded-[var(--radius-xs)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Department</span>
                    <span className="font-bold text-[var(--text-primary)] truncate block mt-0.5" title={session.interviewer.department}>
                      {session.interviewer.department || '—'}
                    </span>
                  </div>
                  <div className="bg-[var(--bg-raised)] p-2.5 rounded-[var(--radius-xs)] border border-[var(--border)] col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Year / Batch</span>
                    <span className="font-bold text-[var(--text-primary)] truncate block mt-0.5">
                      {session.interviewer.year ? `Year ${session.interviewer.year}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-[var(--text-muted)] italic">No student profile found.</p>
            )}
          </div>

          {/* Student B */}
          <div className="panel-card p-5 border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-accent)] transition-all space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[12px] font-mono font-bold tracking-wider text-[var(--text-primary)] uppercase">
                  Student B
                </span>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-[var(--radius-xs)] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                Round 1 Candidate
              </span>
            </div>

            {session.interviewee ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold font-mono text-[16px] border border-emerald-500/20 shrink-0 shadow-xs">
                    {session.interviewee.name ? session.interviewee.name.charAt(0).toUpperCase() : 'B'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[16px] font-bold text-[var(--text-primary)] truncate font-ui">
                      {session.interviewee.name}
                    </h4>
                    <p className="text-[12px] font-mono text-[var(--text-muted)] truncate flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate" title={session.interviewee.email}>
                        {session.interviewee.email}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[var(--border)] text-[12px] font-mono">
                  <div className="bg-[var(--bg-raised)] p-2.5 rounded-[var(--radius-xs)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Roll No</span>
                    <span className="font-bold text-[var(--text-primary)] truncate block mt-0.5">
                      {session.interviewee.roll_no || '—'}
                    </span>
                  </div>
                  <div className="bg-[var(--bg-raised)] p-2.5 rounded-[var(--radius-xs)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Department</span>
                    <span className="font-bold text-[var(--text-primary)] truncate block mt-0.5" title={session.interviewee.department}>
                      {session.interviewee.department || '—'}
                    </span>
                  </div>
                  <div className="bg-[var(--bg-raised)] p-2.5 rounded-[var(--radius-xs)] border border-[var(--border)] col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase">Year / Batch</span>
                    <span className="font-bold text-[var(--text-primary)] truncate block mt-0.5">
                      {session.interviewee.year ? `Year ${session.interviewee.year}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-[var(--text-muted)] italic">No student profile found.</p>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. DIALOGUE AUDIO RECORDING PLAYER */}
      {/* ============================================================ */}
      <div className="panel-card p-6 border border-[var(--border)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[var(--border)]">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Radio className="w-4 h-4 text-[var(--accent)]" />
              <span>Interview Dialogue Audio Recording</span>
            </h3>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
              Listen to the peer conversation, technical discussion, and conduct verification.
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
          title={`Session #${session.id} Dialogue Recording`}
        />
      </div>

      {/* ============================================================ */}
      {/* 5. MUTUAL PEER FEEDBACK & SCORECARDS */}
      {/* ============================================================ */}
      <div className="panel-card p-6 border border-[var(--border)] space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] flex-wrap gap-2">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Award className="w-4 h-4 text-[var(--accent)]" />
              <span>Mutual Peer Feedback & Evaluations</span>
            </h3>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
              Individual ratings, evaluation rubrics, and feedback submitted by both participants.
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

      {/* ============================================================ */}
      {/* 6. TIMESTAMPS FOOTER */}
      {/* ============================================================ */}
      <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>Session Started: <strong>{formatDateTime(session.started_at)}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          <span>Session Concluded: <strong>{formatDateTime(session.ended_at)}</strong></span>
        </div>
      </div>
    </div>
  );
}
