import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Code,
  Layers,
  Cpu,
  BrainCircuit,
  Search,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../api/axios';

export default function StudentInterviews() {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Matchmaking State
  const [activeQueue, setActiveQueue] = useState(null); // { trackId, trackTitle, queueId, startTime }
  const [matchStatus, setMatchStatus] = useState('idle'); // 'idle' | 'searching' | 'matched' | 'error'
  const [matchedSession, setMatchedSession] = useState(null);
  const [queueElapsed, setQueueElapsed] = useState(0);

  const pollIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Fetch student interview tracks
  const fetchTracks = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/interviews/tracks');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setTracks(list);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load interview domains.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  // Timer tick for queue searching
  useEffect(() => {
    if (matchStatus === 'searching') {
      const start = Date.now();
      timerIntervalRef.current = setInterval(() => {
        setQueueElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setQueueElapsed(0);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [matchStatus]);

  // Polling for match status
  useEffect(() => {
    if (matchStatus === 'searching') {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await api.get('/interviews/matchmake/status');
          const data = res?.data || res;
          if (data?.status === 'matched' && data?.session_id) {
            setMatchStatus('matched');
            setMatchedSession(data);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

            // Smooth redirect after visual confirmation
            setTimeout(() => {
              navigate(`/interviews/room/${data.session_id}`);
            }, 1200);
          }
        } catch (e) {
          // ignore transient errors
        }
      }, 1500);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [matchStatus, navigate]);

  // Start matchmaking on a selected domain
  const handleTakeInterview = async (track) => {
    try {
      setError('');
      setActiveQueue({
        trackId: track.id,
        trackTitle: track.title,
        trackIcon: track.icon,
      });
      setMatchStatus('searching');

      const res = await api.post('/interviews/matchmake', { track_id: track.id });
      const data = res?.data || res;
      if (data?.matched && data?.session_id) {
        // Immediate match found!
        setMatchStatus('matched');
        setMatchedSession(data);
        setTimeout(() => {
          navigate(`/interviews/room/${data.session_id}`);
        }, 1200);
      }
    } catch (err) {
      setMatchStatus('error');
      setError(err.response?.data?.message || err.message || 'Failed to start matchmaking.');
    }
  };

  // Cancel matchmaking
  const handleCancelMatchmaking = async () => {
    try {
      await api.post('/interviews/matchmake/cancel');
    } catch (e) {}
    setMatchStatus('idle');
    setActiveQueue(null);
    setMatchedSession(null);
  };

  // Format seconds -> MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // Filter tracks
  const filteredTracks = tracks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTrackIcon = (iconName) => {
    switch (iconName) {
      case 'Layers': return Layers;
      case 'Cpu': return Cpu;
      case 'BrainCircuit': return BrainCircuit;
      default: return Code;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="pb-5 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-[var(--green)]"></span>
            <span>Live Peer Matchmaking Available</span>
          </div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
            Campus Peer Interviews
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Select an interview domain, match instantly with a fellow student, and alternate between interviewer & candidate roles.
          </p>
        </div>

        {/* Live Active Stats Banner */}
        <div className="flex items-center gap-3 bg-[var(--bg-raised)] px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--border)] self-start md:self-auto">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase text-[var(--text-muted)]">Active Peer Pool</p>
            <p className="text-[13px] font-bold text-[var(--text-primary)]">Open for Matchmaking</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="panel-card p-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search interview domains (e.g., DSA, System Design)..."
            className="custom-input search-input text-[12px] py-2"
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>
      </div>

      {/* Error Callout */}
      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-[13px] font-medium">{error}</p>
        </div>
      )}

      {/* Domain Cards Grid */}
      {loading ? (
        <div className="panel-card p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
          <p className="text-[13px] text-[var(--text-muted)]">Loading available interview domains...</p>
        </div>
      ) : filteredTracks.length === 0 ? (
        <div className="panel-card p-10 text-center space-y-2">
          <Video className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
          <h3 className="text-[15px] font-bold text-[var(--text-primary)]">No interview domains found</h3>
          <p className="text-[13px] text-[var(--text-muted)]">Try adjusting your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTracks.map((track) => {
            const IconComponent = getTrackIcon(track.icon);
            const levels = track.levels || [];
            const primaryMode = levels[0]?.mode || 'coding';

            return (
              <div
                key={track.id}
                className="panel-card p-6 flex flex-col justify-between group hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all bg-[var(--bg-card)] border border-[var(--border)]"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)]">
                      <IconComponent className="w-6 h-6" />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                        {track.category || 'Technical'}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                        {primaryMode.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[17px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {track.title}
                    </h3>
                    <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                      {track.description || 'Comprehensive peer mock interview assessment.'}
                    </p>
                  </div>

                  {/* Level Badges */}
                  <div className="pt-2 flex items-center gap-2 flex-wrap">
                    {levels.map((lvl) => (
                      <span
                        key={lvl.id}
                        className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-raised)] px-2.5 py-1 rounded border border-[var(--border)]"
                      >
                        Level {lvl.level_number}: {lvl.name} ({lvl.duration_minutes || 45}m)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-5 mt-5 border-t border-[var(--border)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--text-muted)]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>~45 Mins</span>
                  </div>

                  <button
                    onClick={() => handleTakeInterview(track)}
                    className="btn btn-primary text-[13px] py-2 px-4 flex items-center gap-2 shadow-[var(--shadow-sm)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Take Interview</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* MATCHMAKING RADAR MODAL OVERLAY */}
      {/* ============================================================ */}
      {matchStatus !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="panel-card w-full max-w-md p-8 bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-[var(--shadow-xl)] rounded-[var(--radius-lg)] text-center space-y-6 relative animate-fadeIn">
            {/* Close / Cancel Button */}
            {matchStatus !== 'matched' && (
              <button
                onClick={handleCancelMatchmaking}
                className="absolute right-4 top-4 p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition"
                title="Cancel Search"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Radar / Matched Visual Animation */}
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              {matchStatus === 'matched' ? (
                <div className="w-24 h-24 rounded-full bg-[var(--green-bg)] border-2 border-[var(--green)] flex items-center justify-center text-[var(--green)] animate-bounce">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
              ) : (
                <>
                  {/* Concentric Pulse Rings */}
                  <div className="absolute inset-0 rounded-full border border-[var(--accent)]/20 animate-ping" />
                  <div className="absolute inset-3 rounded-full border border-[var(--accent)]/40 animate-pulse" />
                  <div className="absolute inset-8 rounded-full border border-[var(--accent)]/60" />
                  <div className="w-16 h-16 rounded-full bg-[var(--accent-dim)] border-2 border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shadow-lg shadow-[var(--accent)]/20">
                    <Users className="w-7 h-7 animate-pulse" />
                  </div>
                </>
              )}
            </div>

            {/* Status Text & Domain */}
            <div className="space-y-1.5">
              <h2 className="text-[20px] font-bold text-[var(--text-primary)]">
                {matchStatus === 'matched'
                  ? 'Peer Match Found!'
                  : 'Finding Peer Candidate...'}
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)] font-medium">
                {activeQueue?.trackTitle || 'Mock Interview Track'}
              </p>
            </div>

            {/* Timer & Queue Info */}
            {matchStatus === 'searching' && (
              <div className="bg-[var(--bg-raised)] py-2.5 px-4 rounded-[var(--radius-md)] border border-[var(--border)] inline-flex items-center gap-2 text-[13px] font-mono text-[var(--text-primary)]">
                <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
                <span>Time in Queue: <strong>{formatTime(queueElapsed)}</strong></span>
              </div>
            )}

            {matchStatus === 'matched' && (
              <div className="bg-[var(--green-bg)] text-[var(--green)] py-2.5 px-4 rounded-[var(--radius-md)] border border-[var(--green)]/30 text-[13px] font-semibold">
                Connecting to live interview room...
              </div>
            )}

            {/* Actions */}
            {matchStatus === 'searching' && (
              <div className="pt-2">
                <button
                  onClick={handleCancelMatchmaking}
                  className="btn btn-secondary text-[12px] py-2 px-5 font-semibold"
                >
                  Cancel Matchmaking
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
