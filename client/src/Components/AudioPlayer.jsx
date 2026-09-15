import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Download,
  RotateCcw,
  Radio,
  Clock,
  FileAudio,
  Loader2,
  RefreshCw,
  FastForward,
  Rewind,
  SkipBack,
  SkipForward,
  Sparkles,
  AlertCircle,
  Activity,
  Wifi
} from 'lucide-react';

export default function AudioPlayer({
  recording,
  session = null,
  title = 'Interview Audio Recording',
}) {
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const rafRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const audioFileName = recording?.file_name || '';

  // Determine the authoritative recording or session duration
  const dbDuration = useMemo(() => {
    if (recording?.duration_seconds && isFinite(recording.duration_seconds) && recording.duration_seconds > 0) {
      return Number(recording.duration_seconds);
    }
    if (session?.start_time) {
      const start = new Date(session.start_time).getTime();
      const end = session.end_time ? new Date(session.end_time).getTime() : Date.now();
      const diffSecs = Math.max(0, Math.floor((end - start) / 1000));
      if (diffSecs > 0) return diffSecs;
    }
    // Fallback: estimate from file size for Opus audio (~4.5KB/s @ ~36kbps) if file is substantial
    if (recording?.file_size && recording.file_size > 50000) {
      return Math.max(10, Math.round(recording.file_size / 4500));
    }
    return 0;
  }, [recording?.duration_seconds, recording?.file_size, session?.start_time, session?.end_time]);

  const [duration, setDuration] = useState(dbDuration);

  // Sync state whenever recording or session changes
  useEffect(() => {
    if (dbDuration > 0) {
      setDuration((prev) => Math.max(prev, dbDuration));
    }
  }, [dbDuration, recording?.id, recording?.file_name]);

  // Calculate effective duration reliably (never downgraded by WebM initial chunk headers)
  const effectiveDuration = useMemo(() => {
    const candidates = [
      duration,
      dbDuration,
      currentTime,
    ].filter((v) => v && isFinite(v) && v > 0);
    return candidates.length > 0 ? Math.max(...candidates) : 0;
  }, [duration, dbDuration, currentTime]);

  // Resolve base API URL for streaming
  const audioBase = useMemo(() => {
    const envApiUrl = import.meta.env.VITE_API_URL;
    if (envApiUrl && envApiUrl.startsWith('http')) {
      return envApiUrl.replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173') {
      return 'http://localhost:8080/api/v1';
    }
    return '/api/v1';
  }, []);

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') || '' : '';
  const tokenQuery = token ? `token=${encodeURIComponent(token)}` : '';
  const sessionId = recording?.session_id || session?.id;

  // Direct Progressive HTTP Byte-Range Stream URL (Spotify-style chunk streaming)
  const streamUrl = useMemo(() => {
    if (!audioFileName) return '';
    const base = `${audioBase}/admin/recordings/${encodeURIComponent(audioFileName)}`;
    return tokenQuery ? `${base}?${tokenQuery}` : base;
  }, [audioBase, audioFileName, tokenQuery]);

  const directDownloadUrl = useMemo(() => {
    if (!audioFileName) return '';
    const base = `${audioBase}/admin/recordings/${encodeURIComponent(audioFileName)}`;
    const dlParams = tokenQuery ? `?${tokenQuery}&download=true` : '?download=true';
    return `${base}${dlParams}`;
  }, [audioBase, audioFileName, tokenQuery]);

  // Update progressive buffer ranges from HTML5 audio element (Spotify-style buffer tracking)
  const updateBufferedRanges = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      const buf = audio.buffered;
      if (buf && buf.length > 0) {
        const curr = audio.currentTime;
        let activeBufferedEnd = 0;

        // Find the buffer segment covering the current playback position or furthest loaded chunk
        for (let i = 0; i < buf.length; i++) {
          const start = buf.start(i);
          const end = buf.end(i);
          if (start <= curr && curr <= end) {
            activeBufferedEnd = end;
            break;
          } else if (end > activeBufferedEnd) {
            activeBufferedEnd = end;
          }
        }

        const maxDuration = effectiveDuration > 0 ? effectiveDuration : (audio.duration || 1);
        if (maxDuration > 0) {
          const pct = Math.min(100, Math.max(0, (activeBufferedEnd / maxDuration) * 100));
          setBufferedPercent(pct);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [effectiveDuration]);

  // Setup initial state and cleanup on component unmount
  useEffect(() => {
    if (dbDuration > 0) {
      setDuration(dbDuration);
    }
    setCurrentTime(0);
    setIsPlaying(false);
    setBufferedPercent(0);
    setLoadError('');

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.removeAttribute('src');
          audioRef.current.load();
        } catch (err) {
          // ignore
        }
      }
    };
  }, [recording?.id, recording?.file_name, dbDuration]);

  // Continuously sync currentTime during active playback using requestAnimationFrame
  useEffect(() => {
    const updateProgress = () => {
      if (audioRef.current && !isDragging) {
        const curr = audioRef.current.currentTime;
        setCurrentTime(curr);
        setDuration((prev) => Math.max(prev, curr, dbDuration));
        updateBufferedRanges();
      }
      if (isPlaying) {
        rafRef.current = requestAnimationFrame(updateProgress);
      }
    };

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(updateProgress);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, isDragging, dbDuration, updateBufferedRanges]);

  // Handle native audio element event listeners for progressive chunk streaming
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        const curr = audio.currentTime;
        setCurrentTime(curr);
        setDuration((prev) => {
          let maxVal = Math.max(prev, curr, dbDuration);
          if (audio.duration && isFinite(audio.duration) && audio.duration > maxVal) {
            maxVal = audio.duration;
          }
          return maxVal;
        });
        updateBufferedRanges();
      }
    };

    const handleLoadedMetadata = () => {
      setLoadError('');
      setIsLoading(false);
      setIsBuffering(false);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        if (audio.duration > dbDuration) {
          setDuration(audio.duration);
        } else if (dbDuration > 0) {
          setDuration(dbDuration);
        } else {
          setDuration(audio.duration);
        }
      } else if (dbDuration > 0) {
        setDuration(dbDuration);
      }
      updateBufferedRanges();
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setIsBuffering(false);
      setLoadError('');
      updateBufferedRanges();
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handlePlaying = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      setLoadError('');
    };

    const handlePause = () => {
      setIsPlaying(false);
      setIsBuffering(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      setCurrentTime(0);
      if (audio) audio.currentTime = 0;
    };

    const handleProgress = () => {
      updateBufferedRanges();
    };

    const handleError = (e) => {
      // Only set error if audio is not already playing and actually failed
      if (!audio.paused || audio.currentTime > 0) return;
      console.warn('[AudioPlayer] Stream playback error:', e);
      setLoadError('Browser encountered an issue streaming this audio chunk. You can retry or download directly.');
      setIsPlaying(false);
      setIsLoading(false);
      setIsBuffering(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('error', handleError);
    };
  }, [streamUrl, isDragging, updateBufferedRanges, dbDuration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setLoadError('');
      // If at end, restart
      if (effectiveDuration > 0 && currentTime >= effectiveDuration - 0.2) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((e) => {
            console.warn('[AudioPlayer] Play stream failed:', e);
            setLoadError('Click play again to start streaming.');
            setIsPlaying(false);
          });
      }
    }
  };

  // Instant byte-range seeking on timeline (Spotify-style)
  const seekToPosition = (clientPercent) => {
    if (!audioRef.current) return;
    const clampedPercent = Math.max(0, Math.min(1, clientPercent));
    const target = effectiveDuration > 0 ? clampedPercent * effectiveDuration : 0;
    setCurrentTime(target);
    audioRef.current.currentTime = target;
    updateBufferedRanges();
  };

  const handleProgressBarClick = (e) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekToPosition(percent);
  };

  const handleProgressBarMouseMove = (e) => {
    if (!progressBarRef.current || effectiveDuration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(percent * effectiveDuration);
    setHoverPosition(percent * 100);

    if (isDragging) {
      seekToPosition(percent);
    }
  };

  const handleProgressBarMouseLeave = () => {
    setHoverTime(null);
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const skipTime = (seconds) => {
    if (!audioRef.current) return;
    const maxDur = effectiveDuration > 0 ? effectiveDuration : (audioRef.current.duration || 100);
    const target = Math.max(0, Math.min(maxDur, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
    updateBufferedRanges();
  };

  const handleSpeedChange = (speed) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
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
    const totalSecs = Math.floor(seconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const reloadStream = () => {
    if (!audioRef.current) return;
    setLoadError('');
    setIsLoading(true);
    try {
      audioRef.current.load();
    } catch (e) {
      // ignore
    }
  };

  if (!recording || !audioFileName) {
    return (
      <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] text-center text-xs text-[var(--text-muted)] space-y-1.5">
        <FileAudio className="w-6 h-6 mx-auto opacity-40 text-[var(--text-muted)]" />
        <p className="font-medium">No audio recording available for this interview session.</p>
      </div>
    );
  }

  const progressPercent = effectiveDuration > 0
    ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100))
    : 0;

  return (
    <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-card)] border-2 border-[var(--border-strong)] space-y-4 shadow-md transition-all">
      {/* Native HTML5 Audio Element with Direct Progressive HTTP Range Stream */}
      {streamUrl && (
        <audio
          ref={audioRef}
          src={streamUrl}
          preload="metadata"
          crossOrigin="use-credentials"
        />
      )}

      {/* Header Info Banner */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center font-bold relative transition-colors ${
            isPlaying
              ? 'bg-[var(--accent)] text-white shadow-sm ring-2 ring-[var(--accent)]/30'
              : 'bg-[var(--accent-dim)] text-[var(--accent)]'
          }`}>
            {isBuffering || isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <div className="flex items-end gap-0.5 h-4">
                <span className="w-1 bg-white rounded-xs animate-pulse h-full" />
                <span className="w-1 bg-white rounded-xs animate-pulse h-2/3 delay-75" />
                <span className="w-1 bg-white rounded-xs animate-pulse h-4/5 delay-150" />
                <span className="w-1 bg-white rounded-xs animate-pulse h-1/2 delay-100" />
              </div>
            ) : (
              <Radio className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-[13px] font-bold text-[var(--text-primary)] font-ui">
                {title}
              </h4>

              {/* Live Streaming Pill */}
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 ${
                isPlaying
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]'
              }`}>
                <Wifi className="w-2.5 h-2.5 animate-pulse text-emerald-500" />
                <span>{isBuffering ? 'Buffering Chunks' : isPlaying ? 'Streaming Live' : 'HTTP Stream Ready'}</span>
              </span>
            </div>
            <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
              {audioFileName} • {formatFileSize(recording.file_size)} • {formatTime(effectiveDuration)}
            </p>
          </div>
        </div>

        {/* Action buttons: Reload & Direct Download */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reloadStream}
            disabled={isLoading}
            className="btn btn-secondary text-[11px] py-1.5 px-2.5 flex items-center gap-1.5 font-mono shadow-xs cursor-pointer"
            title="Reload audio stream"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>

          <a
            href={directDownloadUrl}
            download={audioFileName || `interview_session_${recording?.session_id || 'recording'}.webm`}
            className="btn btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1.5 font-mono shadow-xs cursor-pointer no-underline text-white"
            title="Download full audio recording file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {/* Spotify-Style Progressive Chunk Buffered Progress Bar */}
      <div className="space-y-2 py-1 px-1">
        {/* Scrubber Track Container */}
        <div
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          onMouseMove={handleProgressBarMouseMove}
          onMouseLeave={handleProgressBarMouseLeave}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          className="relative h-6 w-full flex items-center cursor-pointer select-none group"
          title="Click or drag to seek anywhere (instant byte-range stream)"
        >
          {/* Base Background Track Line */}
          <div className="relative w-full h-2 group-hover:h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 transition-all duration-150 overflow-hidden shadow-inner">
            {/* Spotify-Style Buffered Chunks Bar (Progressively fetched chunks) */}
            <div
              className="absolute top-0 left-0 h-full bg-[var(--accent)]/25 dark:bg-[var(--accent)]/30 rounded-full transition-all duration-200"
              style={{ width: `${bufferedPercent}%` }}
              title={`Buffered ahead: ${Math.round(bufferedPercent)}%`}
            />

            {/* Hover Preview Bar */}
            {hoverTime !== null && (
              <div
                className="absolute top-0 left-0 h-full bg-[var(--accent)]/20 transition-none rounded-full pointer-events-none"
                style={{ width: `${hoverPosition}%` }}
              />
            )}

            {/* Current Audio Played Progress Fill */}
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover,var(--accent))] rounded-full transition-all duration-75 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Scrubber Thumb / Playhead Dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[var(--accent)] shadow-md border-2 border-white dark:border-gray-900 transition-transform duration-100 group-hover:scale-125 pointer-events-none z-10"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 transform -translate-x-1/2 bg-[var(--text-primary)] text-[var(--bg-base)] text-[10px] font-mono font-bold py-0.5 px-1.5 rounded shadow-lg pointer-events-none z-20 whitespace-nowrap"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Time Labels & Buffer Percentage Indicator */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] pt-0.5 px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[var(--text-primary)]">{formatTime(currentTime)}</span>
            <span className="text-[10px] text-[var(--text-muted)]">/</span>
            <span>{formatTime(effectiveDuration)}</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--text-muted)]">
            {bufferedPercent > 0 && (
              <span className="text-[10px] text-[var(--accent)] font-semibold hidden sm:inline">
                {Math.round(bufferedPercent)}% buffered
              </span>
            )}
            {effectiveDuration > currentTime && (
              <span>-{formatTime(effectiveDuration - currentTime)} remaining</span>
            )}
          </div>
        </div>
      </div>

      {/* Control Buttons & Audio Options */}
      <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Jump to start */}
          <button
            type="button"
            onClick={() => skipTime(-effectiveDuration)}
            disabled={isLoading}
            className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors cursor-pointer"
            title="Jump to start"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* -10s Rewind */}
          <button
            type="button"
            onClick={() => skipTime(-10)}
            disabled={isLoading}
            className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors cursor-pointer"
            title="Rewind 10 seconds"
          >
            <Rewind className="w-4 h-4" />
          </button>

          {/* Big Play / Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={isLoading}
            className="w-11 h-11 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title={isPlaying ? 'Pause' : 'Play audio'}
          >
            {isBuffering ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* +10s Fast Forward */}
          <button
            type="button"
            onClick={() => skipTime(10)}
            disabled={isLoading}
            className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors cursor-pointer"
            title="Forward 10 seconds"
          >
            <FastForward className="w-4 h-4" />
          </button>

          {/* Speed Selector Chips */}
          <div className="flex items-center gap-1 ml-1 bg-[var(--bg-raised)] p-0.5 rounded-[var(--radius-sm)] border border-[var(--border)]">
            {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => handleSpeedChange(rate)}
                className={`px-2 py-1 text-[11px] font-mono font-bold rounded transition-all cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2.5 bg-[var(--bg-raised)] py-1.5 px-3 rounded-[var(--radius-sm)] border border-[var(--border)]">
          <button
            type="button"
            onClick={toggleMute}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-500" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4 text-[var(--text-primary)]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[var(--text-primary)]" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1.5 rounded-full bg-[var(--border-strong)] accent-[var(--accent)] cursor-pointer"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />

          <span className="text-[10px] font-mono text-[var(--text-muted)] w-8 text-right font-bold">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>

      {/* Non-intrusive Error / Fallback Banner */}
      {loadError && (
        <div className="p-3 rounded-[var(--radius-sm)] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-mono flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>{loadError}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={reloadStream}
              className="underline font-bold hover:text-amber-600 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
            <span>•</span>
            <a
              href={directDownloadUrl}
              download={audioFileName || 'recording.webm'}
              className="underline font-bold hover:text-amber-600 cursor-pointer"
            >
              Direct Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
