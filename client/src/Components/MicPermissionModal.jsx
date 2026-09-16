import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { getSafeUserMedia, checkMicrophoneSupport } from '../utils/mediaUtils';

export default function MicPermissionModal({
  isOpen,
  onPermissionGranted,
}) {
  const [permissionState, setPermissionState] = useState('checking'); // 'checking' | 'prompt' | 'granted' | 'denied'
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100
  const [requesting, setRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [supportInfo, setSupportInfo] = useState({ supported: true, isSecure: true, isIOS: false, reason: '' });

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  // Check initial permission status & support
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const support = checkMicrophoneSupport();
    setSupportInfo(support);

    if (!support.supported) {
      setPermissionState('denied');
      setErrorMessage(support.reason || 'Microphone access is unavailable.');
      return;
    }

    const checkInitialPermission = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'microphone' });
          if (isMounted) {
            if (status.state === 'granted') {
              setPermissionState('granted');
              startAudioLevelMeter();
            } else if (status.state === 'denied') {
              setPermissionState('denied');
            } else {
              setPermissionState('prompt');
            }

            status.onchange = () => {
              if (status.state === 'granted') {
                setPermissionState('granted');
                startAudioLevelMeter();
              } else if (status.state === 'denied') {
                setPermissionState('denied');
              } else {
                setPermissionState('prompt');
              }
            };
          }
        } else {
          // Fallback if permissions.query not supported (e.g. iOS Safari)
          if (isMounted) setPermissionState('prompt');
        }
      } catch (err) {
        if (isMounted) setPermissionState('prompt');
      }
    };

    checkInitialPermission();

    return () => {
      isMounted = false;
      stopAudioLevelMeter();
    };
  }, [isOpen]);

  const startAudioLevelMeter = async () => {
    try {
      const stream = await getSafeUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {});
        }

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateMeter = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(100, Math.round((avg / 128) * 100));
          setAudioLevel(normalized);
          animFrameRef.current = requestAnimationFrame(updateMeter);
        };

        updateMeter();
      }
    } catch (e) {
      // ignore visualizer startup failures if permission is already granted
    }
  };

  const stopAudioLevelMeter = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const handleRequestAccess = async () => {
    setRequesting(true);
    setErrorMessage('');
    try {
      const stream = await getSafeUserMedia({
        audio: true,
        video: false,
      });

      setPermissionState('granted');
      stream.getTracks().forEach((t) => t.stop());
      await startAudioLevelMeter();
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorMessage('Microphone access was denied. Please allow microphone access in your browser / iOS settings.');
      } else if (err.name === 'SecurityError') {
        setPermissionState('denied');
        setErrorMessage(err.message || 'Microphone access blocked: HTTPS is required on iOS / Mobile browsers.');
      } else {
        setErrorMessage(err.message || 'Unable to access microphone on this device.');
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleProceed = () => {
    stopAudioLevelMeter();
    if (onPermissionGranted) {
      onPermissionGranted();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="panel-card w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 space-y-5 shadow-2xl animate-scaleUp text-center">
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] flex items-center justify-center mx-auto shadow-sm">
          {permissionState === 'denied' ? (
            <MicOff className="w-7 h-7 text-[var(--red)]" />
          ) : (
            <Mic className="w-7 h-7" />
          )}
        </div>

        {/* Text Details */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-[var(--accent)] uppercase font-bold tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pre-Flight Audio Verification</span>
          </div>
          <h3 className="text-[18px] font-bold text-[var(--text-primary)]">
            {permissionState === 'granted'
              ? 'Microphone Ready & Connected'
              : permissionState === 'denied'
              ? 'Microphone Access Issue'
              : 'Enable Microphone for Live Call'}
          </h3>
          <p className="text-[13px] text-[var(--text-secondary)] max-w-xs mx-auto">
            {permissionState === 'granted'
              ? 'Speak into your microphone to verify the volume visualizer before entering.'
              : permissionState === 'denied'
              ? (supportInfo.reason || 'Your browser has blocked microphone permissions or requires HTTPS on iOS.')
              : 'Peer mock interviews require microphone audio so you and your partner can communicate in real time.'}
          </p>
        </div>

        {/* Audio Meter Visualizer (When Granted) */}
        {permissionState === 'granted' && (
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Live Audio Level:</span>
              </span>
              <span className="font-bold text-[var(--text-primary)]">{audioLevel}%</span>
            </div>

            {/* Dynamic Volume Bar */}
            <div className="w-full h-3 rounded-full bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden p-0.5 flex items-center">
              <div
                className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-[var(--green)] via-[var(--accent)] to-purple-500"
                style={{ width: `${Math.max(4, audioLevel)}%` }}
              />
            </div>
            <p className="text-[11px] text-[var(--green)] font-mono flex items-center justify-center gap-1 pt-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Microphone input detected successfully</span>
            </p>
          </div>
        )}

        {/* Insecure Context / iOS Warning Tip */}
        {!supportInfo.isSecure && (
          <div className="p-3 rounded-[var(--radius-sm)] bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-start gap-2 text-left">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>iOS / Mobile Notice:</strong> iOS Safari strictly requires a Secure Context (<strong>HTTPS</strong>). Connecting over plain HTTP ({typeof window !== 'undefined' ? window.location.host : 'local IP'}) disables microphone APIs.
            </p>
          </div>
        )}

        {/* Error Callout */}
        {errorMessage && (
          <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] text-xs flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {permissionState === 'granted' ? (
            <button
              onClick={handleProceed}
              className="btn btn-primary w-full py-2.5 px-4 font-bold flex items-center justify-center gap-2 shadow-sm text-[13px] cursor-pointer"
            >
              <span>Enter Live Audio Session</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : permissionState === 'denied' ? (
            <div className="space-y-2">
              <button
                onClick={handleRequestAccess}
                disabled={requesting}
                className="btn btn-secondary w-full py-2 px-4 text-xs font-semibold"
              >
                {requesting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Retry Permission Check'}
              </button>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                💡 Tip: Check address bar settings 🔒 → Microphone → Allow, or open via HTTPS.
              </p>
            </div>
          ) : (
            <button
              onClick={handleRequestAccess}
              disabled={requesting}
              className="btn btn-primary w-full py-2.5 px-4 font-bold flex items-center justify-center gap-2 shadow-sm text-[13px] cursor-pointer"
            >
              {requesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              <span>Allow Microphone Access</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
