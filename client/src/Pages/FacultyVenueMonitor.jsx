import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Radio,
  Building2,
  Users,
  Search,
  RefreshCw,
  Loader2,
  UserCheck,
  Clock,
  Sparkles,
  Layers,
  MapPin,
  CheckCircle2,
  Wifi,
  WifiOff,
  Mic,
  MicOff,
  ShieldCheck,
  ArrowRight,
  Headphones
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function FacultyVenueMonitor() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeListeningId, setActiveListeningId] = useState(null);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const audioRef = useRef(null);

  // Fetch live venue sessions
  const fetchVenueData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await api.get('/faculty/venue-monitor');
      const data = res?.data?.sessions || [];
      setSessions(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('Failed to load venue monitor data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Poll venue monitor data every 3 seconds for sub-second status updates
  useEffect(() => {
    fetchVenueData(false);
    const interval = setInterval(() => {
      fetchVenueData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update audio volume / mute state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, activeListeningId]);

  const handleToggleListen = (sessionId) => {
    if (activeListeningId === sessionId) {
      setActiveListeningId(null);
    } else {
      setActiveListeningId(sessionId);
      setIsMuted(false);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const query = searchQuery.toLowerCase();
    const vName = (s.venue_name || '').toLowerCase();
    const rNum = (s.room_number || '').toLowerCase();
    const eeName = (s.interviewee?.name || '').toLowerCase();
    const eeRoll = (s.interviewee?.roll_no || '').toLowerCase();
    const erName = (s.interviewer?.name || '').toLowerCase();
    const erRoll = (s.interviewer?.roll_no || '').toLowerCase();
    const qTitle = (s.current_question_title || '').toLowerCase();

    return (
      vName.includes(query) ||
      rNum.includes(query) ||
      eeName.includes(query) ||
      eeRoll.includes(query) ||
      erName.includes(query) ||
      erRoll.includes(query) ||
      qTitle.includes(query)
    );
  });

  const activeAudioSession = sessions.find((s) => s.session_id === activeListeningId);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hidden Audio Player Element */}
      {activeAudioSession && (
        <audio
          ref={audioRef}
          src={activeAudioSession.audio_stream_url}
          autoPlay
          onError={() => {
            console.warn('Audio stream connection fallback');
          }}
        />
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-[var(--radius-lg)] shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Headphones className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
                <span>Live Venue Audio & Candidate Monitor</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                  Real-time Invigilator Stream
                </span>
              </h1>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Monitor active interview rooms, inspect connected students per venue, and listen to live candidate audio.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[var(--text-secondary)]">Active Monitor Pulse</span>
            <span className="text-[var(--text-muted)] text-[11px]">
              ({lastRefreshed.toLocaleTimeString()})
            </span>
          </div>

          <button
            type="button"
            onClick={() => fetchVenueData(false)}
            disabled={loading}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold cursor-pointer"
            title="Refresh Live Venue Feeds"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Feeds</span>
          </button>
        </div>
      </div>

      {/* Active Global Listener Player Bar (Sticky when listening to a session) */}
      {activeAudioSession && (
        <div className="p-4 rounded-2xl bg-indigo-950/80 border-2 border-indigo-500/50 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-slideDown">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg relative">
              <Radio className="w-5 h-5 animate-pulse" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-indigo-950 absolute -top-1 -right-1" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 font-mono">
                <span>LIVE STREAMING AUDIO</span>
                <span>•</span>
                <span>Room {activeAudioSession.room_number} ({activeAudioSession.venue_name})</span>
              </div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{activeAudioSession.interviewee?.name || 'Student 1'}</span>
                <span className="text-indigo-300 font-mono text-xs">&</span>
                <span>{activeAudioSession.interviewer?.name || 'Student 2'}</span>
              </h4>
            </div>
          </div>

          {/* Audio Waveform Animation & Volume Dock */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-900/60 border border-indigo-700/50">
              <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1 h-6 bg-cyan-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
              <span className="w-1 h-5 bg-emerald-400 rounded-full animate-bounce [animation-delay:450ms]" />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted((prev) => !prev)}
                className="p-2 rounded-xl bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 transition cursor-pointer"
                title={isMuted ? 'Unmute Live Stream' : 'Mute Live Stream'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="w-24 accent-indigo-500 cursor-pointer"
                title="Adjust Monitor Audio Volume"
              />

              <button
                type="button"
                onClick={() => setActiveListeningId(null)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition ml-2"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Listening</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by venue name, room number, candidate name, or roll no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>

        <div className="text-xs font-mono text-[var(--text-muted)]">
          Showing <strong className="text-[var(--text-primary)]">{filteredSessions.length}</strong> active venue room(s)
        </div>
      </div>

      {/* Live Sessions Grid */}
      {loading ? (
        <div className="p-16 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-xs font-mono text-[var(--text-muted)]">
            Loading live venue interview rooms & audio streams...
          </p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-12 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center mx-auto shadow-lg">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              No Active In-Venue Interviews Right Now
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              When candidates enter their assigned venue rooms and launch their interview sessions, they will automatically appear here with real-time student connection statuses and live audio monitoring.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredSessions.map((session) => {
            const isListening = activeListeningId === session.session_id;

            return (
              <div
                key={session.session_id}
                className={`p-5 rounded-2xl bg-[var(--bg-card)] border-2 transition-all space-y-4 shadow-md ${
                  isListening
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'border-[var(--border)] hover:border-indigo-500/50'
                }`}
              >
                {/* Top Venue Header Pill */}
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold font-mono text-xs border border-indigo-500/20 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Room {session.room_number}</span>
                    </div>

                    <div className="text-xs font-bold text-[var(--text-primary)]">
                      {session.venue_name}
                      <span className="text-[11px] font-mono text-[var(--text-muted)] ml-1 font-normal">
                        ({session.building})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>LIVE SESSION</span>
                    </span>

                    <span className="px-2 py-1 rounded bg-[var(--bg-raised)] border border-[var(--border)] text-[10px] font-mono font-bold text-[var(--text-muted)] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      <span>
                        {Math.floor(session.elapsed_seconds / 60)}m {session.elapsed_seconds % 60}s
                      </span>
                    </span>
                  </div>
                </div>

                {/* Candidate Pair Connection Mapping */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Candidate 1: Interviewee */}
                  <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        Interviewee (Candidate 1)
                      </span>
                      {session.interviewee_connected ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-500">
                          <Wifi className="w-3 h-3" />
                          <span>Connected</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-500">
                          <WifiOff className="w-3 h-3" />
                          <span>Connecting...</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] truncate" title={session.interviewee?.name}>
                        {session.interviewee?.name || 'Student Candidate'}
                      </h4>
                      <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                        Roll: {session.interviewee?.roll_no || 'N/A'}
                      </p>
                      <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                        Dept: {session.interviewee?.department || 'Engineering'}
                      </p>
                    </div>
                  </div>

                  {/* Candidate 2: Interviewer */}
                  <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        Interviewer (Candidate 2)
                      </span>
                      {session.interviewer_connected ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-500">
                          <Wifi className="w-3 h-3" />
                          <span>Connected</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-500">
                          <WifiOff className="w-3 h-3" />
                          <span>Connecting...</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] truncate" title={session.interviewer?.name}>
                        {session.interviewer?.name || 'Peer Assessor'}
                      </h4>
                      <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                        Roll: {session.interviewer?.roll_no || 'N/A'}
                      </p>
                      <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                        Dept: {session.interviewer?.department || 'Engineering'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Session Topic & Benchmark Question */}
                <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      Track: {session.track_title}
                    </span>
                    <span className="text-[var(--text-muted)] font-mono">
                      Session ID: #{session.session_id}
                    </span>
                  </div>
                  <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                    Question: {session.current_question_title}
                  </p>
                </div>

                {/* Bottom Action Dock: Live Audio Stream Listener */}
                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-3">
                  <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Real-time Audio Stream Available</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleListen(session.session_id)}
                    className={`h-9 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm ${
                      isListening
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop Listening</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>Listen Live Audio</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
