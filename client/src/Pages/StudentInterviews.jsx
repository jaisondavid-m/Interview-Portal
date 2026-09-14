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
  ArrowLeft,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  BookOpen,
  CheckSquare,
  Award
} from 'lucide-react';
import api from '../api/axios';
import { SkeletonTrackGrid } from '../Components/Skeleton';

export default function StudentInterviews() {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(null);

  // Matchmaking State
  const [activeQueue, setActiveQueue] = useState(null); // { trackId, trackTitle, levelId, levelName, levelNumber, queueId }
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
          const params = new URLSearchParams();
          if (activeQueue?.queueId) params.append('queue_id', activeQueue.queueId);
          if (activeQueue?.trackId) params.append('track_id', activeQueue.trackId);
          const queryString = params.toString() ? `?${params.toString()}` : '';

          const res = await api.get(`/interviews/matchmake/status${queryString}`);
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
  }, [matchStatus, activeQueue, navigate]);

  // Start matchmaking on a selected track and level
  const handleTakeInterview = async (track, level) => {
    try {
      setError('');
      setActiveQueue({
        trackId: track.id,
        trackTitle: track.title,
        trackIcon: track.icon,
        levelId: level?.id || null,
        levelName: level?.name || null,
        levelNumber: level?.level_number || 1,
        durationMinutes: level?.duration_minutes || 45,
        queueId: null,
      });
      setMatchStatus('searching');

      const payload = { track_id: track.id };
      if (level?.id) payload.level_id = level.id;

      const res = await api.post('/interviews/matchmake', payload);
      const data = res?.data || res;
      if (data?.matched && data?.session_id) {
        // Immediate match found!
        setMatchStatus('matched');
        setMatchedSession(data);
        setTimeout(() => {
          navigate(`/interviews/room/${data.session_id}`);
        }, 1200);
      } else if (data?.status === 'waiting' && data?.queue_id) {
        setActiveQueue((prev) => ({
          ...prev,
          queueId: data.queue_id,
        }));
      }
    } catch (err) {
      setMatchStatus('error');
      setError(err.response?.data?.message || err.message || 'Failed to start matchmaking.');
    }
  };

  // Cancel matchmaking
  const handleCancelMatchmaking = async () => {
    try {
      const qId = activeQueue?.queueId;
      await api.post(`/interviews/matchmake/cancel${qId ? `?queue_id=${qId}` : ''}`);
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
      case 'CheckSquare': return CheckSquare;
      default: return Code;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="pb-5 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
            Campus Peer Interviews
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Select an interview domain, choose your target level, and practice live mock sessions with peer students.
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

      {/* Error Callout */}
      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-[13px] font-medium">{error}</p>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 1: SELECTED TRACK DRILL-DOWN (LEVELS CARDS VIEW) */}
      {/* ============================================================ */}
      {selectedTrack ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Breadcrumbs & Back Navigation */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button
              onClick={() => setSelectedTrack(null)}
              className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1.5 px-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-[var(--shadow-sm)]"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--accent)]" />
              <span>Back to All Domains</span>
            </button>

            <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--text-muted)]">
              <span>Domain:</span>
              <strong className="text-[var(--text-primary)]">{selectedTrack.title}</strong>
              <span>•</span>
              <span>{selectedTrack.levels?.length || 0} Levels Available</span>
            </div>
          </div>

          {/* Selected Track Detail Banner */}
          <div className="panel-card p-6 bg-[var(--bg-card)] border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-[var(--shadow-sm)]">
            <div className="flex items-start gap-4">
              {(() => {
                const IconComponent = getTrackIcon(selectedTrack.icon);
                return (
                  <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] shrink-0">
                    <IconComponent className="w-6 h-6" />
                  </div>
                );
              })()}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                    {selectedTrack.category || 'Technical'}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                    {selectedTrack.levels?.[0]?.mode?.toUpperCase() || 'CODING'}
                  </span>
                </div>
                <h2 className="text-[20px] font-bold text-[var(--text-primary)] tracking-tight">
                  {selectedTrack.title}
                </h2>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed max-w-3xl">
                  {selectedTrack.description || 'Comprehensive peer mock interview assessment.'}
                </p>
              </div>
            </div>
          </div>

          {/* Levels Header Section */}
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--accent)]" />
              <span>Select Difficulty Level</span>
            </h3>
            <span className="text-[12px] font-mono text-[var(--text-muted)]">
              Choose a level to start peer matchmaking
            </span>
          </div>

          {/* Level Cards Grid */}
          {(!selectedTrack.levels || selectedTrack.levels.length === 0) ? (
            <div className="panel-card p-10 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
              <h4 className="text-[15px] font-bold text-[var(--text-primary)]">No levels configured yet</h4>
              <p className="text-[13px] text-[var(--text-muted)]">Levels for this track will be added soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {selectedTrack.levels.map((lvl) => {
                const duration = lvl.duration_minutes || 45;
                const modeName = (lvl.mode || 'coding').toUpperCase();
                const qCount = lvl.questions_count || (lvl.questions ? lvl.questions.length : 3);

                return (
                  <div
                    key={lvl.id}
                    className="panel-card p-6 flex flex-col justify-between group hover:border-[var(--border-accent)] hover:shadow-[var(--shadow-md)] transition-all bg-[var(--bg-card)] border border-[var(--border)] relative"
                  >
                    <div className="space-y-3.5">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                          Level {lvl.level_number}
                        </span>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                          {modeName} MODE
                        </span>
                      </div>

                      {/* Level Title & Description */}
                      <div>
                        <h4 className="text-[17px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                          {lvl.name}
                        </h4>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed line-clamp-3">
                          {lvl.description || 'Hands-on live interview assessment with real peer evaluation.'}
                        </p>
                      </div>

                      {/* Level Specs Meta Pill */}
                      <div className="pt-2 flex items-center gap-3 font-mono text-[11px] text-[var(--text-muted)]">
                        <div className="flex items-center gap-1.5 bg-[var(--bg-raised)] px-2.5 py-1 rounded border border-[var(--border)]">
                          <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                          <span>Duration: <strong>{duration} Mins</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[var(--bg-raised)] px-2.5 py-1 rounded border border-[var(--border)]">
                          <Sparkles className="w-3.5 h-3.5 text-[var(--green)]" />
                          <span>Pool: <strong>{qCount} Questions</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Start Interview Action Footer */}
                    <div className="pt-5 mt-5 border-t border-[var(--border)] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
                        <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
                        <span>Instant Match</span>
                      </div>

                      <button
                        onClick={() => handleTakeInterview(selectedTrack, lvl)}
                        className="btn btn-primary text-[13px] py-2 px-4 flex items-center gap-2 shadow-[var(--shadow-sm)] hover:scale-[1.02] active:scale-[0.98] transition-transform font-bold cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Start Interview</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ============================================================ */
        /* VIEW 2: CLEAN DOMAIN OVERVIEW CARDS (CLICK TO ENTER) */
        /* ============================================================ */
        <div className="space-y-6">
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

          {/* Domain Cards Grid */}
          {loading ? (
            <SkeletonTrackGrid count={4} />
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
                const levelCount = levels.length || track.levels_count || 1;

                return (
                  <div
                    key={track.id}
                    onClick={() => setSelectedTrack(track)}
                    className="panel-card p-6 flex flex-col justify-between group hover:border-[var(--border-accent)] hover:shadow-[var(--shadow-md)] transition-all bg-[var(--bg-card)] border border-[var(--border)] cursor-pointer"
                  >
                    <div className="space-y-4">
                      {/* Icon & Category Tags */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] group-hover:scale-105 transition-transform">
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

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-[18px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                          {track.title}
                        </h3>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                          {track.description || 'Core computer science fundamentals, algorithmic problem solving, and system design.'}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer Info */}
                    <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-[12px] font-mono text-[var(--text-muted)]">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span><strong>{levelCount}</strong> {levelCount === 1 ? 'Level' : 'Levels'} Available</span>
                      </div>

                      <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:underline">
                        <span>View Levels</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                className="absolute right-4 top-4 p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
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
              <div className="space-y-0.5">
                <p className="text-[14px] font-bold text-[var(--text-primary)]">
                  {activeQueue?.trackTitle || 'Mock Interview Track'}
                </p>
                {activeQueue?.levelName && (
                  <p className="text-[12px] text-[var(--accent)] font-mono font-medium">
                    Level {activeQueue.levelNumber}: {activeQueue.levelName} ({activeQueue.durationMinutes}m)
                  </p>
                )}
              </div>
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
                  className="btn btn-secondary text-[12px] py-2 px-5 font-semibold cursor-pointer"
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
