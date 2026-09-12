import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  RotateCcw,
  Sparkles,
  Radio,
  Clock,
  FileAudio
} from 'lucide-react';

export default function AudioPlayer({
  recording,
  title = 'Interview Audio Recording',
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording?.duration_seconds || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [audioError, setAudioError] = useState(false);

  // Construct recording URL with backend base resolution
  const audioFileName = recording?.file_name || '';
  let audioBase = '/api/v1';
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl && envApiUrl.startsWith('http')) {
    audioBase = envApiUrl.replace(/\/+$/, '');
  } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173') {
    audioBase = 'http://localhost:8080/api/v1';
  }

  const audioSrc = audioFileName
    ? `${audioBase}/recordings/${encodeURIComponent(audioFileName)}`
    : '';

  useEffect(() => {
    if (recording?.duration_seconds && recording.duration_seconds > 0) {
      setDuration(recording.duration_seconds);
    }
    setAudioError(false);
  }, [recording?.duration_seconds, recording?.file_name]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setAudioError(false);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e) => {
      console.warn('[AudioPlayer] Audio stream error:', e);
      setAudioError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioSrc]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setAudioError(false);
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Audio play error:', e);
        setAudioError(true);
      });
    }
  };

  const handleSeek = (e) => {
    const seekTarget = parseFloat(e.target.value);
    setCurrentTime(seekTarget);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTarget;
    }
  };

  const handleSpeedChange = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  if (!recording || !audioFileName) {
    return (
      <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] text-center text-xs text-[var(--text-muted)] space-y-1">
        <FileAudio className="w-6 h-6 mx-auto opacity-40 text-[var(--text-muted)]" />
        <p>No audio recording available for this interview session.</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border-accent)] space-y-3.5 shadow-sm">
      {/* Hidden HTML5 Audio Element */}
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      {/* Header Info */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center font-bold">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-[var(--text-primary)] font-ui">
              {title}
            </h4>
            <p className="text-[11px] font-mono text-[var(--text-muted)]">
              File: {audioFileName} • {formatFileSize(recording.file_size)}
            </p>
          </div>
        </div>

        {/* Download Action */}
        <a
          href={audioSrc}
          download={audioFileName}
          className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1.5 font-mono"
          title="Download original audio recording"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </a>
      </div>

      {/* Player Scrubber & Time */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
          <span className="text-[var(--text-primary)] font-bold">{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 rounded-lg bg-[var(--border)] accent-[var(--accent)] cursor-pointer"
        />
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        {/* Play/Pause & Speed */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-md hover:scale-105 transition-all cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handleSpeedChange}
            className="px-2.5 py-1 rounded-[var(--radius-xs)] bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer"
            title="Change playback speed"
          >
            {playbackRate}x
          </button>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-[var(--red)]" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1.5 rounded bg-[var(--border)] accent-[var(--accent)] cursor-pointer"
          />
        </div>
      </div>

      {audioError && (
        <div className="p-2.5 rounded-[var(--radius-xs)] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-mono flex items-center justify-between gap-2">
          <span>Audio stream codec unavailable in current browser. Use Download to listen.</span>
          <a
            href={audioSrc}
            download={audioFileName}
            className="underline font-bold hover:text-amber-600"
          >
            Direct File
          </a>
        </div>
      )}
    </div>
  );
}
