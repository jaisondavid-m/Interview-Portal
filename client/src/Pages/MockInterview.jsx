import React, { useState, useEffect } from 'react';
import { 
  Users, Mic, MicOff, Volume2, VolumeX, PhoneOff, Send, 
  RotateCw, Play, Clock, MessageSquare, Code, CheckCircle, Shield, Radio 
} from 'lucide-react';
import ConfirmModal from '../Components/ConfirmModal';
import { INTERVIEW_TRACKS } from '../utils/constants';

export default function MockInterview() {
  const [selectedTrack, setSelectedTrack] = useState(INTERVIEW_TRACKS[0].id);
  const [inRoom, setInRoom] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [myRole, setMyRole] = useState('interviewer'); // 'interviewer' | 'candidate'
  const [callDuration, setCallDuration] = useState(0);
  const [sharedNotes, setSharedNotes] = useState(
    "// Shared Scratchpad - both students see live changes\n\nfunction findTwoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}"
  );

  const sampleQuestions = [
    "1. Explain how Go's goroutines differ from standard OS threads, and how channels facilitate safe communication.",
    "2. Walk me through designing a rate-limiter in a distributed system.",
    "3. Implement LRU Cache with O(1) get and put operations.",
  ];

  useEffect(() => {
    let timer;
    if (inRoom) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [inRoom]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight">
            Student 1-on-1 Audio Room
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            Connect over audio with a fellow student. Practice technical problems with a synchronized scratchpad.
          </p>
        </div>
      </div>

      {!inRoom ? (
        <div className="panel-card p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-[18px] font-bold text-[var(--text-primary)]">
              1. Select Practice Track & Join Queue
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Pick a domain to get matched with an active peer.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INTERVIEW_TRACKS.map((track) => (
              <div
                key={track.id}
                onClick={() => setSelectedTrack(track.id)}
                className={`p-5 rounded-[var(--radius-md)] border cursor-pointer transition-all ${
                  selectedTrack === track.id
                    ? 'bg-[var(--bg-raised)] border-[var(--accent)] shadow-[var(--shadow-sm)]'
                    : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[15px] text-[var(--text-primary)] font-ui">
                    {track.title}
                  </h3>
                  {selectedTrack === track.id && (
                    <CheckCircle className="w-5 h-5 text-[var(--accent)]" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 text-[12px] font-mono">
                  <span className="text-[var(--text-secondary)]">Level: {track.level}</span>
                  <span className="status-pill status-green">● {track.peersOnline} Online</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-[var(--bg-input)] rounded-[var(--radius-sm)] border border-[var(--border)] flex items-center gap-3 text-[13px] text-[var(--text-secondary)]">
            <Shield className="w-5 h-5 text-[var(--accent)] shrink-0" />
            <span>
              Microphone access is enabled automatically on entry. You can swap between Interviewer and Candidate roles at any time.
            </span>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setInRoom(true)}
              className="btn btn-primary py-2.5 px-6 shadow-[var(--shadow-md)]"
            >
              <Mic className="w-4 h-4" />
              <span>Match & Enter Audio Room</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Audio Call Control Bar */}
          <div className="panel-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[var(--shadow-md)]">
            {/* Peer Info */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="card-avatar">
                  RK
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--green)] border-2 border-white rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[14px] text-[var(--text-primary)] font-ui">Rahul K.</h3>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)]">
                    4th Year CS
                  </span>
                </div>
                <p className="text-[12px] text-[var(--green)] flex items-center gap-1.5 mt-0.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse"></span>
                  WebRTC Audio Connected • 24ms
                </p>
              </div>
            </div>

            {/* Audio Wave & Timer & Role Switcher */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-[var(--bg-input)] px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] text-[12px] font-mono text-[var(--text-primary)] font-semibold">
                <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{formatTime(callDuration)}</span>
              </div>

              {/* Role Switcher Tabs */}
              <div className="auth-tabs p-1">
                <button
                  type="button"
                  onClick={() => setMyRole('interviewer')}
                  className={myRole === 'interviewer' ? 'active' : ''}
                >
                  Interviewer
                </button>
                <button
                  type="button"
                  onClick={() => setMyRole('candidate')}
                  className={myRole === 'candidate' ? 'active' : ''}
                >
                  Candidate
                </button>
              </div>
            </div>

            {/* Audio Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`btn ${isMuted ? 'btn-danger' : 'btn-secondary'} p-2.5`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsDeafened(!isDeafened)}
                className={`btn ${isDeafened ? 'btn-danger' : 'btn-secondary'} p-2.5`}
                title={isDeafened ? 'Enable Sound' : 'Deafen Sound'}
              >
                {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setShowLeaveModal(true)}
                className="btn btn-danger text-xs py-2 px-3.5"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Leave</span>
              </button>
            </div>
          </div>

          {/* Workspace Area: Questions Sheet + Shared Coding Scratchpad */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Suggested Questions & Prompts (4 Cols) */}
            <div className="lg:col-span-4 panel-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <h3 className="font-bold text-[14px] text-[var(--text-primary)] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[var(--accent)]" />
                  <span>Curated Questions</span>
                </h3>
                <span className="status-pill status-accent text-[10px]">
                  {myRole === 'interviewer' ? 'Asking' : 'Answering'}
                </span>
              </div>

              <div className="space-y-3">
                {sampleQuestions.map((q, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 bg-[var(--bg-input)] rounded-[var(--radius-sm)] border border-[var(--border)] text-[12px] text-[var(--text-secondary)] leading-relaxed"
                  >
                    <p>{q}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Collaborative Real-Time Scratchpad (8 Cols) */}
            <div className="lg:col-span-8 panel-card p-5 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <span className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Code className="w-4 h-4 text-[var(--accent)]" />
                  <span>Shared Live Scratchpad</span>
                </span>
                <span className="font-mono text-[11px] text-[var(--green)] flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]"></span>
                  Live Sync
                </span>
              </div>
              <textarea
                value={sharedNotes}
                onChange={(e) => setSharedNotes(e.target.value)}
                rows={13}
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] p-4 text-[13px] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-dim)] resize-none leading-relaxed transition"
              />
            </div>
          </div>
        </div>
      )}

      {/* Leave Room Confirmation Modal */}
      <ConfirmModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={() => {
          setShowLeaveModal(false);
          setInRoom(false);
        }}
        title="Leave Interview Session?"
        message="Are you sure you want to leave the peer audio session? You will be prompted for peer feedback."
        confirmText="Leave Session"
        cancelText="Stay in Room"
        variant="danger"
      />
    </div>
  );
}
