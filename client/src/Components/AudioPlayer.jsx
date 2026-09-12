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
  AlertCircle
} from 'lucide-react';
import api from '../api/axios';

export default function AudioPlayer({
  recording,
  title = 'Interview Audio Recording',
}) {
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const blobUrlRef = useRef('');
  const rafRef = useRef(null);

  const [blobUrl, setBlobUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording?.duration_seconds || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const audioFileName = recording?.file_name || '';

  // Calculate effective duration reliably (fallback to database duration_seconds if audio metadata is Infinity or 0)
  const effectiveDuration = useMemo(() => {
    if (duration && isFinite(duration) && duration > 0) {
      return duration;
    }
    if (recording?.duration_seconds && isFinite(recording.duration_seconds) && recording.duration_seconds > 0) {
      return recording.duration_seconds;
    }
    return 0;
  }, [duration, recording?.duration_seconds]);

  // Keep track of active blob url ref for clean revocation on unmount
  useEffect(() => {
    blobUrlRef.current = blobUrl;
  }, [blobUrl]);

  // Resolve base API URL
  let audioBase = '/api/v1';
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl && envApiUrl.startsWith('http')) {
    audioBase = envApiUrl.replace(/\/+$/, '');
  } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173') {
    audioBase = 'http://localhost:8080/api/v1';
  }

  const directStreamUrl = audioFileName
    ? `${audioBase}/recordings/${encodeURIComponent(audioFileName)}`
    : '';

  // Load audio file as local Blob URL for 100% reliable in-browser playback
  const loadAudioBlob = useCallback(async () => {
    if (!audioFileName) return;

    setIsLoading(true);
    setLoadError('');

    const candidateUrls = [
      `${audioBase}/recordings/${encodeURIComponent(audioFileName)}`,
      `/recordings/${encodeURIComponent(audioFileName)}`,
      `/api/recordings/${encodeURIComponent(audioFileName)}`,
    ];

    let loadedBlob = null;

    // 1. Try Axios first (uses configured auth cookies & credentials)
    for (const url of candidateUrls) {
      try {
        const res = await api.get(url, { responseType: 'blob' });
        if (res && res instanceof Blob && res.size > 0) {
          loadedBlob = res;
          break;
        } else if (res?.data && res.data instanceof Blob && res.data.size > 0) {
          loadedBlob = res.data;
          break;
        }
      } catch (e) {
        // continue to next candidate
      }
    }

    // 2. Fallback: Try native fetch with credentials
    if (!loadedBlob) {
      for (const url of candidateUrls) {
        try {
          const resp = await fetch(url, { credentials: 'include' });
          if (resp.ok) {
            const b = await resp.blob();
            if (b && b.size > 0) {
              loadedBlob = b;
              break;
            }
          }
        } catch (e) {
          // continue
        }
      }
    }

    if (loadedBlob) {
      const mimeType = loadedBlob.type || 'audio/webm';
      const cleanBlob = new Blob([loadedBlob], { type: mimeType });
      const objectUrl = URL.createObjectURL(cleanBlob);
      setBlobUrl((prev) => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return objectUrl;
      });
      setLoadError('');
    } else {
      // Fallback directly to direct stream URL
      setBlobUrl(directStreamUrl);
    }

    setIsLoading(false);
  }, [audioFileName, audioBase, directStreamUrl]);

  // Initial load and unmount teardown
  useEffect(() => {
    if (recording?.duration_seconds && recording.duration_seconds > 0) {
      setDuration(recording.duration_seconds);
    }
    setCurrentTime(0);
    setIsPlaying(false);
    loadAudioBlob();

    return () => {
      // Cleanly stop any playing audio on component unmount (e.g. closing modal)
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
      if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, [recording?.id, recording?.file_name, loadAudioBlob]);

  // Continuously sync currentTime during active playback using requestAnimationFrame
  useEffect(() => {
    const updateProgress = () => {
      if (audioRef.current && !isDragging) {
        const curr = audioRef.current.currentTime;
        setCurrentTime(curr);

        // Check if reached end of effective duration
        if (effectiveDuration > 0 && curr >= effectiveDuration) {
          setIsPlaying(false);
          setCurrentTime(effectiveDuration);
        }
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
  }, [isPlaying, isDragging, effectiveDuration]);

  // Handle native audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setLoadError('');
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      } else if (recording?.duration_seconds && recording.duration_seconds > 0) {
        setDuration(recording.duration_seconds);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setLoadError('');
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audio) audio.currentTime = 0;
    };

    const handleError = (e) => {
      // Only set error if audio is not already playing and actually failed
      if (!audio.paused || audio.currentTime > 0) return;
      console.warn('[AudioPlayer] Playback error event:', e);
      if (blobUrl && !blobUrl.startsWith('blob:')) {
        loadAudioBlob();
      } else {
        setLoadError('Browser was unable to decode audio format. Use the Download button to listen locally.');
      }
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [blobUrl, isDragging, loadAudioBlob, recording?.duration_seconds]);

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
            console.warn('[AudioPlayer] Play request failed:', e);
            setLoadError('Failed to play audio in browser.');
            setIsPlaying(false);
          });
      }
    }
  };

  const seekToPosition = (clientPercent) => {
    if (!audioRef.current) return;
    const clampedPercent = Math.max(0, Math.min(1, clientPercent));
    const target = effectiveDuration > 0 ? clampedPercent * effectiveDuration : 0;
    setCurrentTime(target);
    audioRef.current.currentTime = target;
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
  };

  const handleSpeedChange = (speed) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const cycleSpeed = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    handleSpeedChange(rates[nextIdx]);
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
      {/* Hidden HTML5 Audio Element with local blob URL */}
      {blobUrl && (
        <audio
          ref={audioRef}
          src={blobUrl}
          preload="auto"
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
            {isLoading ? (
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
            <div className="flex items-center gap-2">
              <h4 className="text-[13px] font-bold text-[var(--text-primary)] font-ui">
                {title}
              </h4>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                isPlaying
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]'
              }`}>
                {isLoading ? 'Buffering' : isPlaying ? 'Playing' : 'Ready'}
              </span>
            </div>
            <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
              {audioFileName} • {formatFileSize(recording.file_size)} • {formatTime(effectiveDuration)}
            </p>
          </div>
        </div>

        {/* Action buttons: Reload & Download */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAudioBlob}
            disabled={isLoading}
            className="btn btn-secondary text-[11px] py-1.5 px-2.5 flex items-center gap-1.5 font-mono shadow-xs"
            title="Reload audio stream"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>

          <a
            href={blobUrl || directStreamUrl}
            download={audioFileName}
            className="btn btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1.5 font-mono shadow-xs"
            title="Download original audio file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {/* YouTube-Style Single Line Progress Scrubber */}
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
          title="Click or drag to seek"
        >
          {/* Base Background Track Line */}
          <div className="relative w-full h-1.5 group-hover:h-2 rounded-full bg-[var(--border-strong)]/60 dark:bg-gray-700/80 transition-all duration-150 overflow-hidden">
            {/* Hover Preview Bar (YouTube style) */}
            {hoverTime !== null && (
              <div
                className="absolute top-0 left-0 h-full bg-[var(--accent)]/30 transition-none rounded-full pointer-events-none"
                style={{ width: `${hoverPosition}%` }}
              />
            )}

            {/* Current Audio Played Progress Fill */}
            <div
              className="absolute top-0 left-0 h-full bg-[var(--accent)] rounded-full transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* YouTube-Style Scrubber Thumb / Playhead Dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[var(--accent)] shadow-md border-2 border-white dark:border-gray-900 transition-transform duration-100 group-hover:scale-125 pointer-events-none z-10"
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

        {/* Time Labels: Start to End */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] pt-0.5 px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[var(--text-primary)]">{formatTime(currentTime)}</span>
            <span className="text-[10px] text-[var(--text-muted)]">/</span>
            <span>{formatTime(effectiveDuration)}</span>
          </div>

          <div className="text-[11px] font-mono text-[var(--text-muted)]">
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
          {/* Restart / Back to start */}
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
            {isLoading ? (
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
                className={`px-2 py-1 text-[11px] font-mono font-bold rounded transition-all ${
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
              onClick={loadAudioBlob}
              className="underline font-bold hover:text-amber-600 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
            <span>•</span>
            <a
              href={blobUrl || directStreamUrl}
              download={audioFileName}
              className="underline font-bold hover:text-amber-600"
            >
              Direct Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
