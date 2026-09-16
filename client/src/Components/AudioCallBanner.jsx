import React from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Wifi,
  WifiOff,
  Disc3,
  Loader2,
  Sparkles,
  Users
} from 'lucide-react';

export default function AudioCallBanner({
  connectionState,
  isMuted,
  peerMuted,
  isSpeaking,
  isPeerSpeaking,
  isAutoplayBlocked = false,
  onUnblockAudio,
  onToggleMute,
  peerName = 'Peer Student',
  uploadingRecording = false,
}) {
  const isConnected = connectionState === 'connected' || isPeerSpeaking;
  const isConnecting = !isConnected && (connectionState === 'connecting' || connectionState === 'reconnecting');
  const isFailed = !isConnected && (connectionState === 'failed' || connectionState === 'disconnected');

  return (
    <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-sm)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Left: Connection Status & Peer Status */}
      <div className="flex items-center gap-3.5 flex-wrap">
        {/* Connection Status Pill */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] font-mono text-[11px] font-bold border ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : isConnecting
              ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]'
              : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
          }`}>
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>WebRTC P2P Audio Connected</span>
              </>
            ) : isConnecting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" />
                <span>Connecting Audio Channel...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-500" />
                <span>Audio Disconnected</span>
              </>
            )}
          </div>
        </div>

        {/* Remote Peer Voice Status */}
        {isConnected && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] border transition-all ${
              isPeerSpeaking
                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 font-bold scale-102'
                : 'bg-[var(--bg-raised)] text-[var(--text-secondary)] border-[var(--border)]'
            }`}>
              {peerMuted ? (
                <>
                  <MicOff className="w-3 h-3 text-[var(--red)]" />
                  <span>{peerName} (Muted)</span>
                </>
              ) : isPeerSpeaking ? (
                <>
                  <Radio className="w-3 h-3 text-purple-500 animate-pulse" />
                  <span>{peerName} is Speaking...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3 text-[var(--text-muted)]" />
                  <span>{peerName} (Listening)</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Dual-Speaker Recording Indicator */}
        <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)]">
          {uploadingRecording ? (
            <span className="text-[var(--accent)] flex items-center gap-1 font-bold">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving Audio...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <span>Recording Dialogue</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: Mic Control, Autoplay Unlock & Local Speaking Wave */}
      <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
        {/* Autoplay Unblock Button if Browser blocks sound */}
        {isAutoplayBlocked && (
          <button
            type="button"
            onClick={onUnblockAudio}
            className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold animate-bounce shadow-md bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
            title="Click to enable sound output"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Click to Enable Audio</span>
          </button>
        )}

        {/* Local Speaking Status Indicator */}
        {isConnected && (
          <div className={`text-[11px] font-mono px-2 py-1 rounded flex items-center gap-1.5 ${
            isMuted
              ? 'text-[var(--red)] bg-red-500/10 border border-red-500/20'
              : isSpeaking
              ? 'text-[var(--green)] bg-green-500/10 border border-green-500/20 font-bold'
              : 'text-[var(--text-muted)]'
          }`}>
            {isMuted ? (
              <span>Your Mic Muted</span>
            ) : isSpeaking ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                <span>You are Speaking</span>
              </>
            ) : (
              <span>Mic Ready</span>
            )}
          </div>
        )}

        {/* Mute / Unmute Button */}
        <button
          type="button"
          onClick={onToggleMute}
          className={`btn text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold transition-all cursor-pointer shadow-xs ${
            isMuted
              ? 'btn-danger bg-red-600 hover:bg-red-700 text-white'
              : 'btn-secondary text-[var(--text-primary)] hover:border-[var(--accent)]'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? (
            <>
              <MicOff className="w-3.5 h-3.5" />
              <span>Unmute Mic</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-[var(--green)]" />
              <span>Mute Mic</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
