import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const getSupportedAudioMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
};

export default function useWebRTCAudio({
  sessionId,
  currentUserId,
  enabled = true,
  onRecordingUploaded,
}) {
  // State
  const [connectionState, setConnectionState] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'
  const [isMuted, setIsMuted] = useState(false);
  const [peerMuted, setPeerMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPeerSpeaking, setIsPeerSpeaking] = useState(false);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // References
  const isMutedRef = useRef(false);
  const peerMutedRef = useRef(false);
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteAudioElRef = useRef(null);

  // Web Audio Mixer & Recorder Refs
  const audioContextRef = useRef(null);
  const mixedDestRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingStartTimeRef = useRef(null);
  const isUploadingRef = useRef(false);
  const uploadSuccessRef = useRef(false);

  // Audio Analysers for Voice Activity Detection
  const localAnalyserRef = useRef(null);
  const remoteAnalyserRef = useRef(null);
  const vadIntervalRef = useRef(null);

  // Pending ICE candidates queue
  const iceCandidatesQueueRef = useRef([]);

  // Create remote hidden audio element
  useEffect(() => {
    const el = document.createElement('audio');
    el.autoplay = true;
    el.playsInline = true;
    remoteAudioElRef.current = el;
    document.body.appendChild(el);

    return () => {
      if (remoteAudioElRef.current) {
        remoteAudioElRef.current.pause();
        remoteAudioElRef.current.srcObject = null;
        remoteAudioElRef.current.remove();
      }
    };
  }, []);

  // Voice Activity Detection (VAD) Loop - Completely decoupled from effect re-triggers using refs
  const startVAD = useCallback(() => {
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);

    vadIntervalRef.current = setInterval(() => {
      // Local voice check
      if (localAnalyserRef.current && !isMutedRef.current) {
        const dataArray = new Uint8Array(localAnalyserRef.current.frequencyBinCount);
        localAnalyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setIsSpeaking(avg > 15);
      } else {
        setIsSpeaking(false);
      }

      // Remote voice check
      if (remoteAnalyserRef.current && !peerMutedRef.current) {
        const dataArray = new Uint8Array(remoteAnalyserRef.current.frequencyBinCount);
        remoteAnalyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setIsPeerSpeaking(avg > 15);
      } else {
        setIsPeerSpeaking(false);
      }
    }, 150);
  }, []);

  // Setup Web Audio Mixer for Dual-Speaker Recording
  const initAudioMixer = useCallback(async (localStream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume();
        } catch (e) {
          console.warn('[WebRTC Audio] AudioContext resume failed on init:', e);
        }
      }
      audioContextRef.current = audioCtx;

      // Create mixer destination
      const dest = audioCtx.createMediaStreamDestination();
      mixedDestRef.current = dest;

      // Add local stream to mixer & analyser
      const localSource = audioCtx.createMediaStreamSource(localStream);
      const localAnalyser = audioCtx.createAnalyser();
      localAnalyser.fftSize = 64;
      localAnalyserRef.current = localAnalyser;

      localSource.connect(localAnalyser);
      localSource.connect(dest);

      // Create combined recording stream with active audio tracks
      const recordingStream = new MediaStream();
      dest.stream.getAudioTracks().forEach((t) => recordingStream.addTrack(t));
      if (recordingStream.getAudioTracks().length === 0) {
        localStream.getAudioTracks().forEach((t) => recordingStream.addTrack(t));
      }

      // Initialize MediaRecorder on the mixed destination stream
      const mimeType = getSupportedAudioMimeType();
      const recorderOptions = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(recordingStream, recorderOptions);
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (e) => {
        console.warn('[WebRTC Audio] MediaRecorder error:', e);
      };

      recorder.start(1000); // 1-second chunks for continuous buffer population
      recordingStartTimeRef.current = Date.now();
      console.log('[WebRTC Audio] MediaRecorder started recording dialogue with mimeType:', mimeType || 'default');
    } catch (err) {
      console.warn('[WebRTC Audio] Mixer init warning:', err);
      // Direct stream fallback
      try {
        const mimeType = getSupportedAudioMimeType();
        const fallbackRecorder = new MediaRecorder(localStream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = fallbackRecorder;
        recordedChunksRef.current = [];
        fallbackRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        fallbackRecorder.start(1000);
        recordingStartTimeRef.current = Date.now();
      } catch (fallbackErr) {
        console.error('[WebRTC Audio] Fallback recorder error:', fallbackErr);
      }
    }
  }, []);

  // Connect remote stream to mixer when track is received
  const connectRemoteToMixer = useCallback(async (remoteStream) => {
    try {
      if (!audioContextRef.current || !mixedDestRef.current) return;

      const audioCtx = audioContextRef.current;
      if (audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume();
        } catch (e) {}
      }

      const remoteSource = audioCtx.createMediaStreamSource(remoteStream);
      const remoteAnalyser = audioCtx.createAnalyser();
      remoteAnalyser.fftSize = 64;
      remoteAnalyserRef.current = remoteAnalyser;

      remoteSource.connect(remoteAnalyser);
      remoteSource.connect(mixedDestRef.current);
      console.log('[WebRTC Audio] Remote peer audio attached to mixer destination');
    } catch (err) {
      console.warn('[WebRTC Audio] Remote mixer connect warning:', err);
    }
  }, []);

  // Send signaling message via WebSocket
  const sendSignaling = useCallback((type, payload = null, extra = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg = {
        type,
        payload,
        ...extra,
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Stop recording and upload to server
  const stopAndUploadRecording = useCallback(async () => {
    if (!sessionId) return null;
    if (isUploadingRef.current) {
      console.log('[WebRTC Audio] Upload already in progress, ignoring duplicate request');
      return null;
    }
    if (uploadSuccessRef.current) {
      console.log('[WebRTC Audio] Recording already uploaded for session:', sessionId);
      return null;
    }

    isUploadingRef.current = true;
    setUploadingRecording(true);

    try {
      console.log('[WebRTC Audio] Finalizing audio recording for session:', sessionId);

      // Stop recorder and wait for final chunks
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.requestData();
        } catch (e) {}

        await new Promise((resolve) => {
          mediaRecorderRef.current.onstop = () => {
            resolve();
          };
          try {
            mediaRecorderRef.current.stop();
          } catch (e) {
            resolve();
          }
          // Safety timeout fallback
          setTimeout(resolve, 800);
        });
      }

      let blob;
      if (recordedChunksRef.current && recordedChunksRef.current.length > 0) {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        blob = new Blob(recordedChunksRef.current, { type: mimeType });
      }

      if (!blob || blob.size === 0) {
        console.warn('[WebRTC Audio] Empty chunks, creating minimum valid container');
        blob = new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d])], { type: 'audio/webm' });
      }

      const durationSecs = recordingStartTimeRef.current
        ? Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000))
        : 1;

      const formData = new FormData();
      formData.append('file', blob, `interview_${sessionId}_${Date.now()}.webm`);
      formData.append('duration_seconds', String(durationSecs));

      let uploadUrl = `/api/v1/interviews/sessions/${sessionId}/recording`;
      const envApiUrl = import.meta.env.VITE_API_URL;
      if (envApiUrl && envApiUrl.startsWith('http')) {
        uploadUrl = `${envApiUrl.replace(/\/+$/, '')}/interviews/sessions/${sessionId}/recording`;
      } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173') {
        uploadUrl = `http://localhost:8080/api/v1/interviews/sessions/${sessionId}/recording`;
      }

      console.log('[WebRTC Audio] Dispatching audio upload to:', uploadUrl, 'Blob size:', blob.size, 'bytes');

      const token = localStorage.getItem('token') || '';
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Upload failed with HTTP ${response.status}: ${errText}`);
      }

      const resData = await response.json();
      console.log('[WebRTC Audio] Audio successfully stored on server:', resData);

      uploadSuccessRef.current = true;
      setUploadSuccess(true);
      if (onRecordingUploaded) {
        onRecordingUploaded(resData?.recording);
      }
      return resData?.recording;
    } catch (err) {
      console.error('[WebRTC Audio] Failed to upload recording:', err);
      return null;
    } finally {
      isUploadingRef.current = false;
      setUploadingRecording(false);
    }
  }, [sessionId, onRecordingUploaded]);

  // Main WebRTC & WebSocket initialization - Stable lifecycle on [enabled, sessionId]
  useEffect(() => {
    if (!enabled || !sessionId) return;

    let isDestroyed = false;

    const initCall = async () => {
      try {
        setConnectionState('connecting');

        // 1. Get User Media Microphone Audio
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        if (isDestroyed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        // Ensure track enabled matches initial mute state
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTracks[0].enabled = !isMutedRef.current;
        }

        await initAudioMixer(stream);

        // 2. Setup RTCPeerConnection
        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;

        // Add local tracks to RTCPeerConnection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Handle ICE candidate generation
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignaling('ice-candidate', event.candidate);
          }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          if (isDestroyed) return;
          const state = pc.connectionState;
          if (state === 'connected') {
            setConnectionState('connected');
          } else if (state === 'connecting') {
            setConnectionState('connecting');
          } else if (state === 'disconnected' || state === 'failed') {
            setConnectionState('reconnecting');
          } else if (state === 'closed') {
            setConnectionState('disconnected');
          }
        };

        // Handle incoming remote audio track
        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            const remoteStream = event.streams[0];
            remoteStreamRef.current = remoteStream;

            if (remoteAudioElRef.current) {
              remoteAudioElRef.current.srcObject = remoteStream;
              remoteAudioElRef.current.play().catch(() => {});
            }

            connectRemoteToMixer(remoteStream);
          }
        };

        // 3. Connect WebSocket Signaling
        let wsHost = window.location.host;
        let wsPath = `/api/v1/interviews/sessions/${sessionId}/ws`;
        const envApiUrl = import.meta.env.VITE_API_URL || '';

        if (envApiUrl.startsWith('http')) {
          try {
            const parsed = new URL(envApiUrl);
            wsHost = parsed.host;
            const basePath = parsed.pathname.replace(/\/+$/, '');
            wsPath = `${basePath}/interviews/sessions/${sessionId}/ws`;
          } catch (e) {}
        } else if (envApiUrl.startsWith('/')) {
          const basePath = envApiUrl.replace(/\/+$/, '');
          wsPath = `${basePath}/interviews/sessions/${sessionId}/ws`;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const token = localStorage.getItem('token') || '';
        const wsUrl = `${protocol}//${wsHost}${wsPath}?token=${encodeURIComponent(token)}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          sendSignaling('join');
        };

        ws.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (!msg || !msg.type) return;

            switch (msg.type) {
              case 'peer_joined': {
                const offer = await pc.createOffer({
                  offerToReceiveAudio: true,
                });
                await pc.setLocalDescription(offer);
                sendSignaling('offer', offer);
                break;
              }

              case 'peer_ready': {
                break;
              }

              case 'offer': {
                if (msg.payload) {
                  await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));

                  while (iceCandidatesQueueRef.current.length > 0) {
                    const cand = iceCandidatesQueueRef.current.shift();
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                  }

                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);
                  sendSignaling('answer', answer);
                }
                break;
              }

              case 'answer': {
                if (msg.payload) {
                  await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));

                  while (iceCandidatesQueueRef.current.length > 0) {
                    const cand = iceCandidatesQueueRef.current.shift();
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                  }
                }
                break;
              }

              case 'ice-candidate': {
                if (msg.payload) {
                  if (pc.remoteDescription && pc.remoteDescription.type) {
                    await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
                  } else {
                    iceCandidatesQueueRef.current.push(msg.payload);
                  }
                }
                break;
              }

              case 'mute-status': {
                const nextPeerMuted = Boolean(msg.is_muted);
                peerMutedRef.current = nextPeerMuted;
                setPeerMuted(nextPeerMuted);
                if (nextPeerMuted) {
                  setIsPeerSpeaking(false);
                }
                break;
              }

              case 'peer_left': {
                setConnectionState('connecting');
                peerMutedRef.current = false;
                setPeerMuted(false);
                setIsPeerSpeaking(false);
                break;
              }

              default:
                break;
            }
          } catch (e) {
            console.warn('[WebRTC Signaling] Message handler error:', e);
          }
        };

        ws.onerror = () => {
          if (!isDestroyed) setConnectionState('failed');
        };

        startVAD();
      } catch (err) {
        console.error('[WebRTC Audio] Init failed:', err);
        if (!isDestroyed) setConnectionState('failed');
      }
    };

    initCall();

    return () => {
      isDestroyed = true;

      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [enabled, sessionId, initAudioMixer, connectRemoteToMixer, sendSignaling, startVAD]);

  // Resume AudioContext on any user interaction (browser autoplay policy)
  useEffect(() => {
    const handleUserGesture = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    };
    window.addEventListener('click', handleUserGesture);
    window.addEventListener('keydown', handleUserGesture);
    return () => {
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
    };
  }, []);

  // Toggle local mute - purely adjusts track.enabled with ZERO reconnection or effect interruption
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextMuted = !isMutedRef.current;
        isMutedRef.current = nextMuted;
        audioTracks[0].enabled = !nextMuted;
        setIsMuted(nextMuted);
        if (nextMuted) {
          setIsSpeaking(false);
        }
        sendSignaling('mute-status', null, { is_muted: nextMuted });
      }
    }
  }, [sendSignaling]);

  return {
    connectionState,
    isMuted,
    peerMuted,
    isSpeaking,
    isPeerSpeaking,
    toggleMute,
    stopAndUploadRecording,
    uploadingRecording,
    uploadSuccess,
  };
}
