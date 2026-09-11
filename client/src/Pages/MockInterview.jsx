import React, { useState, useEffect } from 'react';
import { 
  Users, Mic, MicOff, Volume2, VolumeX, PhoneOff, Send, 
  RotateCw, Play, Clock, MessageSquare, Code, CheckCircle, Shield 
} from 'lucide-react';
import { INTERVIEW_TRACKS } from '../utils/constants';

export default function MockInterview() {
  const [selectedTrack, setSelectedTrack] = useState(INTERVIEW_TRACKS[0].id);
  const [inRoom, setInRoom] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [myRole, setMyRole] = useState('interviewer'); // 'interviewer' | 'candidate'
  const [callDuration, setCallDuration] = useState(0);
  const [sharedNotes, setSharedNotes] = useState(
    "// Shared Scratchpad - both students see changes in real time\n\nfunction findTwoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Student 1-on-1 Audio Mock Room</h1>
          <p className="text-slate-400 text-sm mt-1">
            Connect over voice with a fellow student. Practice real interview questions with shared scratchpad & feedback.
          </p>
        </div>
      </div>

      {!inRoom ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-semibold text-white">1. Select Practice Track & Join Peer Queue</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INTERVIEW_TRACKS.map((track) => (
              <div
                key={track.id}
                onClick={() => setSelectedTrack(track.id)}
                className={`p-5 rounded-xl border cursor-pointer transition ${
                  selectedTrack === track.id
                    ? 'bg-indigo-950/40 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{track.title}</h3>
                  {selectedTrack === track.id && <CheckCircle className="w-5 h-5 text-indigo-400" />}
                </div>
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-slate-400">Level: {track.level}</span>
                  <span className="text-emerald-400 font-medium">● {track.peersOnline} Online</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center space-x-3 text-sm text-slate-300">
            <Shield className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>
              Both peers will join the <strong>voice room</strong> directly with microphone permissions. You can switch interviewer/candidate roles during the session.
            </span>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setInRoom(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 transition"
            >
              <Mic className="w-5 h-5" />
              <span>Match & Enter Audio Room</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Audio Call Control Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Peer Info */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                  RK
                </div>
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-white">Rahul K. (Student Peer)</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    4th Year CS
                  </span>
                </div>
                <p className="text-xs text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Connected via WebRTC Audio • Latency: 28ms
                </p>
              </div>
            </div>

            {/* Audio Wave & Timer */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{formatTime(callDuration)}</span>
              </div>

              {/* Role Switcher */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
                <button
                  onClick={() => setMyRole('interviewer')}
                  className={`px-3 py-1 rounded-lg transition ${
                    myRole === 'interviewer' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Interviewer Role
                </button>
                <button
                  onClick={() => setMyRole('candidate')}
                  className={`px-3 py-1 rounded-lg transition ${
                    myRole === 'candidate' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Candidate Role
                </button>
              </div>
            </div>

            {/* Audio Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-xl border transition ${
                  isMuted
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
                title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setIsDeafened(!isDeafened)}
                className={`p-3 rounded-xl border transition ${
                  isDeafened
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
                title={isDeafened ? 'Enable Sound' : 'Deafen Audio'}
              >
                {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <button
                onClick={() => {
                  if (confirm('End peer audio interview session? You will be prompted to leave peer feedback.')) {
                    setInRoom(false);
                  }
                }}
                className="inline-flex items-center space-x-2 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition text-xs shadow-lg shadow-rose-600/30"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Leave Session</span>
              </button>
            </div>
          </div>

          {/* Workspace Area: Questions Sheet + Shared Coding Scratchpad */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Suggested Questions & Prompts */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>Curated Interview Questions</span>
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {myRole === 'interviewer' ? 'Ask Peer' : 'Peer is Asking'}
                </span>
              </div>

              <div className="space-y-3">
                {sampleQuestions.map((q, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-2">
                    <p>{q}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Collaborative Real-Time Scratchpad */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-400" />
                  <span>Shared Live Scratchpad & Solution Space</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">Sync: Live</span>
              </div>
              <textarea
                value={sharedNotes}
                onChange={(e) => setSharedNotes(e.target.value)}
                rows={14}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
