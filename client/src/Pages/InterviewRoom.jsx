import React, { useState, useEffect, useRef } from 'react';
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
  HelpCircle
} from 'lucide-react';
import api from '../api/axios';

export default function InterviewRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('interviewee'); // 'interviewer' | 'interviewee'
  const [peerUser, setPeerUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [switching, setSwitching] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);

  const pollRef = useRef(null);
  const timerRef = useRef(null);

  // Fetch session data
  const fetchSession = async () => {
    try {
      const res = await api.get(`/interviews/sessions/${sessionId}`);
      const data = res?.data || res;
      if (data?.session) {
        setSessionData(data.session);
        setCurrentUserRole(data.current_user_role || 'interviewee');
        setPeerUser(data.peer || null);
        setError('');

        if (data.session.status === 'completed') {
          // If completed by peer
          setError('This interview session has ended.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load interview session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();

    // Poll session state every 2 seconds to synchronize role switches & session status
    pollRef.current = setInterval(() => {
      fetchSession();
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId]);

  // Session elapsed timer
  useEffect(() => {
    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSecs(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format seconds -> MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // Switch Roles action
  const handleSwitchRoles = async () => {
    try {
      setSwitching(true);
      const res = await api.post(`/interviews/sessions/${sessionId}/switch-roles`);
      const data = res?.data || res;
      if (data?.current_user_role) {
        setCurrentUserRole(data.current_user_role);
      }
      await fetchSession();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to switch roles.');
    } finally {
      setSwitching(false);
    }
  };

  // End Interview Session
  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end this interview session?')) return;
    try {
      await api.post(`/interviews/sessions/${sessionId}/end`);
      navigate('/interviews');
    } catch (e) {
      navigate('/interviews');
    }
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
  const questions = level?.questions || [];
  const interviewer = sessionData?.interviewer;
  const interviewee = sessionData?.interviewee;

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="pb-5 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)] animate-pulse"></span>
            <span className="font-bold text-[var(--green)]">Live Peer Session</span>
            <span>•</span>
            <span>Room #{sessionId}</span>
          </div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)] tracking-tight">
            {track?.title || 'Mock Interview Domain'}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Level {level?.level_number || 1}: {level?.name || 'Assessment'} • Mode: <strong className="uppercase">{level?.mode || 'coding'}</strong>
          </p>
        </div>

        {/* Live Timer & End Button */}
        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          <div className="bg-[var(--bg-card)] px-3.5 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] flex items-center gap-2 font-mono text-[13px] text-[var(--text-primary)] shadow-[var(--shadow-sm)]">
            <Clock className="w-4 h-4 text-[var(--accent)]" />
            <span>Session: <strong>{formatTime(elapsedSecs)}</strong></span>
          </div>

          <button
            onClick={handleEndSession}
            className="btn btn-danger text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>End Interview</span>
          </button>
        </div>
      </div>

      {/* Role Announcement Banner */}
      <div className={`p-4 rounded-[var(--radius-md)] border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
        currentUserRole === 'interviewer'
          ? 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--text-primary)]'
          : 'bg-[var(--green-bg)] border-[var(--green)]/30 text-[var(--text-primary)]'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-[var(--radius-sm)] shadow-[var(--shadow-sm)] ${
            currentUserRole === 'interviewer'
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--green)] text-white'
          }`}>
            {currentUserRole === 'interviewer' ? <Shield className="w-5 h-5" /> : <Award className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-muted)]">
              Your Current Role
            </span>
            <h3 className="text-[16px] font-bold">
              {currentUserRole === 'interviewer' ? 'Interviewer (Assessor)' : 'Candidate (Interviewee)'}
            </h3>
            <p className="text-[12px] text-[var(--text-secondary)]">
              {currentUserRole === 'interviewer'
                ? 'You are conducting the interview. Ask questions, observe candidate logic, and provide constructive guidance.'
                : 'You are answering. Explain your thought process, solve problems step by step, and collaborate with your interviewer.'}
            </p>
          </div>
        </div>

        {/* Switch Roles Button */}
        <button
          onClick={handleSwitchRoles}
          disabled={switching}
          className="btn btn-secondary text-xs py-2.5 px-4 flex items-center gap-2 font-bold shadow-[var(--shadow-sm)] hover:border-[var(--accent)] transition-all shrink-0"
        >
          {switching ? (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
          ) : (
            <Repeat className="w-4 h-4 text-[var(--accent)]" />
          )}
          <span>Switch Roles</span>
          {sessionData?.switch_count > 0 && (
            <span className="text-[10px] font-mono bg-[var(--bg-raised)] px-1.5 py-0.5 rounded border border-[var(--border)]">
              {sessionData.switch_count}x
            </span>
          )}
        </button>
      </div>

      {/* Participants Dual Cards (Anonymized for peer privacy) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Interviewer */}
        <div className={`panel-card p-5 border-2 transition-all ${
          currentUserRole === 'interviewer' ? 'border-[var(--accent)] bg-[var(--bg-card)]' : 'border-[var(--border)] bg-[var(--bg-raised)]'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
              <Shield className="w-3.5 h-3.5" />
              <span>Interviewer</span>
            </span>
            {currentUserRole === 'interviewer' ? (
              <span className="text-[11px] font-mono text-[var(--accent)] font-bold">
                (You)
              </span>
            ) : (
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Peer
              </span>
            )}
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center font-bold text-[16px] text-[var(--accent)]">
              {currentUserRole === 'interviewer' ? 'ME' : 'P1'}
            </div>
            <div className="space-y-0.5">
              <h4 className="text-[15px] font-bold text-[var(--text-primary)]">
                {currentUserRole === 'interviewer' ? 'You (Interviewer)' : 'Peer Interviewer'}
              </h4>
              <p className="text-[12px] font-mono text-[var(--text-muted)]">
                {currentUserRole === 'interviewer' ? 'Conducting Assessment' : 'Assessing Session'}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Interviewee / Candidate */}
        <div className={`panel-card p-5 border-2 transition-all ${
          currentUserRole === 'interviewee' ? 'border-[var(--green)] bg-[var(--bg-card)]' : 'border-[var(--border)] bg-[var(--bg-raised)]'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30">
              <Award className="w-3.5 h-3.5" />
              <span>Candidate</span>
            </span>
            {currentUserRole === 'interviewee' ? (
              <span className="text-[11px] font-mono text-[var(--green)] font-bold">
                (You)
              </span>
            ) : (
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Peer
              </span>
            )}
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[var(--green-bg)] border border-[var(--green)]/30 flex items-center justify-center font-bold text-[16px] text-[var(--green)]">
              {currentUserRole === 'interviewee' ? 'ME' : 'P2'}
            </div>
            <div className="space-y-0.5">
              <h4 className="text-[15px] font-bold text-[var(--text-primary)]">
                {currentUserRole === 'interviewee' ? 'You (Candidate)' : 'Peer Candidate'}
              </h4>
              <p className="text-[12px] font-mono text-[var(--text-muted)]">
                {currentUserRole === 'interviewee' ? 'Answering Assessment' : 'Interviewee'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace / Stage Container */}
      <div className="panel-card p-8 text-center space-y-4 bg-[var(--bg-card)] border border-[var(--border)]">
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] mx-auto shadow-[var(--shadow-sm)]">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-lg mx-auto">
          <h3 className="text-[18px] font-bold text-[var(--text-primary)]">
            Connected to Peer Workspace
          </h3>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            Both peers are connected in real-time. You can practice domain assessment, communicate, and swap roles at any time using the <strong>Switch Roles</strong> button.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
          <div className="bg-[var(--bg-raised)] px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[12px] font-mono text-[var(--text-muted)]">
            Available Questions: <strong>{questions.length}</strong>
          </div>
          <div className="bg-[var(--bg-raised)] px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] text-[12px] font-mono text-[var(--text-muted)]">
            Mode: <strong className="uppercase">{level?.mode || 'coding'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
