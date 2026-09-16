import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getSafeUserMedia,
  getHighQualityAudioConstraints,
  optimizeAudioSDP,
  createNoiseCleanedStream
} from './mediaUtils';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
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
  isRecorder = true,
  onRecordingUploaded,
}) {
  // Connection & Voice States
  const [connectionState, setConnectionState] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'
  const [isMuted, setIsMuted] = useState(false);
  const [peerMuted, setPeerMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPeerSpeaking, setIsPeerSpeaking] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [uploadingRecording, setUploadingRecording] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // References
  const isMutedRef = useRef(false);
  const peerMutedRef = useRef(false);
  const isRecorderRef = useRef(isRecorder);
  isRecorderRef.current = isRecorder;
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteAudioElRef = useRef(null);
  const dspCleanupRef = useRef(null);

  // Web Audio Graph & Real-Time Output Destination
  const audioContextRef = useRef(null);
  const mixedDestRef = useRef(null);
  const remoteAudioSourceRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const isFinalizingRef = useRef(false);
  const uploadSuccessRef = useRef(false);

  // Chunk Streaming Queue
  const chunkQueueRef = useRef([]);
  const isStreamingChunkRef = useRef(false);
  const chunkSequenceRef = useRef(0);

  // Audio Analysers for Voice Activity Detection
  const localAnalyserRef = useRef(null);
  const remoteAnalyserRef = useRef(null);
  const vadIntervalRef = useRef(null);

  // State Tracking
  const iceCandidatesQueueRef = useRef([]);
  const fallbackOfferTimerRef = useRef(null);

  // Create persistent remote audio element for ultra-low latency playback
  useEffect(() => {
    const el = document.createElement('audio');
    el.autoplay = true;
    el.playsInline = true;
    el.muted = false;
    el.volume = 1.0;
    el.preload = 'none';
    if ('preservesPitch' in el) {
      el.preservesPitch = false;
    }
    remoteAudioElRef.current = el;
    document.body.appendChild(el);

    return () => {
      if (remoteAudioElRef.current) {
        remoteAudioElRef.current.pause();
        remoteAudioElRef.current.srcObject = null;
        remoteAudioElRef.current.remove();
        remoteAudioElRef.current = null;
      }
    };
  }, []);

  // Unlock Audio Function (called on user gesture or explicitly)
  const unblockAudio = useCallback(async () => {
    try {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      if (remoteAudioElRef.current && remoteStreamRef.current) {
        remoteAudioElRef.current.srcObject = remoteStreamRef.current;
        remoteAudioElRef.current.muted = false;
        remoteAudioElRef.current.volume = 1.0;
        await remoteAudioElRef.current.play();
        setIsAutoplayBlocked(false);
      }
    } catch (err) {
      console.warn('[WebRTC Audio] Manual unblock audio attempt:', err);
    }
  }, []);

  // Voice Activity Detection (VAD) Loop
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
        setIsSpeaking(avg > 12);
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
        const peerSpeaking = avg > 12;
        setIsPeerSpeaking(peerSpeaking);
        if (peerSpeaking) {
          setConnectionState((prev) => (prev !== 'connected' ? 'connected' : prev));
        }
      } else {
        setIsPeerSpeaking(false);
      }
    }, 100);
  }, []);

  // Process and stream chunks asynchronously to the server
  const processChunkQueue = useCallback(async () => {
    if (!isRecorderRef.current || isStreamingChunkRef.current || chunkQueueRef.current.length === 0 || !sessionId) {
      return;
    }

    isStreamingChunkRef.current = true;
    const item = chunkQueueRef.current.shift();

    if (!item || !item.blob || item.blob.size === 0) {
      isStreamingChunkRef.current = false;
      if (chunkQueueRef.current.length > 0) {
        processChunkQueue();
      }
      return;
    }

    try {
      const durationSecs = recordingStartTimeRef.current
        ? Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000))
        : 1;

      const formData = new FormData();
      formData.append('chunk', item.blob, `chunk_${sessionId}_${item.seq}.webm`);
      formData.append('sequence_number', String(item.seq));
      formData.append('duration_seconds', String(durationSecs));

      let chunkUrl = `/api/v1/interviews/sessions/${sessionId}/recording/chunk`;
      const envApiUrl = import.meta.env.VITE_API_URL;
      if (envApiUrl && envApiUrl.startsWith('http')) {
        chunkUrl = `${envApiUrl.replace(/\/+$/, '')}/interviews/sessions/${sessionId}/recording/chunk`;
      } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173') {
        chunkUrl = `http://localhost:8080/api/v1/interviews/sessions/${sessionId}/recording/chunk`;
      }

      const token = localStorage.getItem('token') || '';
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch(chunkUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });
    } catch (err) {
      console.warn('[WebRTC Audio Stream] Error streaming chunk to server:', err);
    } finally {
      isStreamingChunkRef.current = false;
      if (chunkQueueRef.current.length > 0) {
        processChunkQueue();
      }
    }
  }, [sessionId]);

  // Queue incoming audio chunk from MediaRecorder
  const queueAudioChunk = useCallback((blob) => {
    if (!blob || blob.size === 0 || !isRecorderRef.current) return;
    chunkSequenceRef.current += 1;
    chunkQueueRef.current.push({
      blob,
      seq: chunkSequenceRef.current,
      time: Date.now(),
    });
    processChunkQueue();
  }, [processChunkQueue]);

  // Setup Web Audio Mixer & High-Pass Audio Graph
  const initAudioMixer = useCallback(async (localStream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx({ latencyHint: 'interactive' });
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      audioContextRef.current = audioCtx;

      // Add local stream to analyser for Voice Activity Detection (VAD)
      const localSource = audioCtx.createMediaStreamSource(localStream);
      const localAnalyser = audioCtx.createAnalyser();
      localAnalyser.fftSize = 64;
      localAnalyserRef.current = localAnalyser;
      localSource.connect(localAnalyser);

      if (!isRecorderRef.current) {
        return;
      }

      // Create mixer destination for master recording with low-cut filter (80Hz) to eliminate background room rumble & AC hum
      const dest = audioCtx.createMediaStreamDestination();
      mixedDestRef.current = dest;

      const hpFilter = audioCtx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(80, audioCtx.currentTime);
      localSource.connect(hpFilter);
      hpFilter.connect(dest);

      const recordingStream = new MediaStream();
      dest.stream.getAudioTracks().forEach((t) => recordingStream.addTrack(t));
      if (recordingStream.getAudioTracks().length === 0) {
        localStream.getAudioTracks().forEach((t) => recordingStream.addTrack(t));
      }

      const mimeType = getSupportedAudioMimeType();
      const recorderOptions = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(recordingStream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          queueAudioChunk(event.data);
        }
      };

      recorder.start(3000);
      recordingStartTimeRef.current = Date.now();
    } catch (err) {
      console.warn('[WebRTC Audio] Mixer init warning:', err);
    }
  }, [queueAudioChunk]);

  // Connect remote stream to Web Audio graph (Analyser & Recording mixer)
  // Dedicated HTML5 <audio> element handles speaker playback cleanly with hardware AEC
  const connectRemoteAudioStream = useCallback((remoteStream) => {
    try {
      if (!audioContextRef.current) return;
      const audioCtx = audioContextRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      // Disconnect previous remote source if any
      if (remoteAudioSourceRef.current) {
        try {
          remoteAudioSourceRef.current.disconnect();
        } catch (e) {}
      }

      const remoteSource = audioCtx.createMediaStreamSource(remoteStream);
      remoteAudioSourceRef.current = remoteSource;

      // 1. Connect to analyser for Voice Activity Detection (VAD)
      const remoteAnalyser = audioCtx.createAnalyser();
      remoteAnalyser.fftSize = 64;
      remoteAnalyserRef.current = remoteAnalyser;
      remoteSource.connect(remoteAnalyser);

      // 2. Connect through high-pass filter to recording mixer (if master recorder)
      if (isRecorderRef.current && mixedDestRef.current) {
        const hpFilter = audioCtx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.setValueAtTime(80, audioCtx.currentTime);
        remoteSource.connect(hpFilter);
        hpFilter.connect(mixedDestRef.current);
      }
    } catch (err) {
      console.warn('[WebRTC Audio] Remote Web Audio connection warning:', err);
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

  // Drain pending ICE candidates queue after remote description is set
  const drainIceCandidatesQueue = useCallback(async (pc) => {
    while (iceCandidatesQueueRef.current.length > 0) {
      const candidate = iceCandidatesQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC Audio] Queued ICE candidate error:', err);
      }
    }
  }, []);

  // Full stop & teardown of audio hardware and WebRTC sessions
  const stopAudioCall = useCallback(() => {
    console.log('[WebRTC Audio] Stopping audio call, freeing microphone & peer connection');

    if (fallbackOfferTimerRef.current) {
      clearTimeout(fallbackOfferTimerRef.current);
      fallbackOfferTimerRef.current = null;
    }

    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {}
      });
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {}
      });
      remoteStreamRef.current = null;
    }

    if (remoteAudioSourceRef.current) {
      try {
        remoteAudioSourceRef.current.disconnect();
      } catch (e) {}
      remoteAudioSourceRef.current = null;
    }

    if (remoteAudioElRef.current) {
      try {
        remoteAudioElRef.current.pause();
        remoteAudioElRef.current.srcObject = null;
      } catch (e) {}
    }

    if (dspCleanupRef.current) {
      try {
        dspCleanupRef.current();
      } catch (e) {}
      dspCleanupRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch (e) {}
      audioContextRef.current = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    }

    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          sendSignaling('leave');
        }
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    setConnectionState('disconnected');
    setIsSpeaking(false);
    setIsPeerSpeaking(false);
  }, [sendSignaling]);

  // Stop recording, flush remaining chunks, and finalize server recording metadata
  const stopAndUploadRecording = useCallback(async () => {
    if (!sessionId) return null;
    if (!isRecorderRef.current) {
      stopAudioCall();
      return null;
    }
    if (isFinalizingRef.current) {
      return null;
    }
    if (uploadSuccessRef.current) {
      return null;
    }

    isFinalizingRef.current = true;
    setUploadingRecording(true);

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.requestData();
        } catch (e) {}

        await new Promise((resolve) => {
          if (!mediaRecorderRef.current) {
            resolve();
            return;
          }
          mediaRecorderRef.current.onstop = () => resolve();
          try {
            mediaRecorderRef.current.stop();
          } catch (e) {
            resolve();
          }
          setTimeout(resolve, 600);
        });
      }

      let waitIterations = 0;
      while ((chunkQueueRef.current.length > 0 || isStreamingChunkRef.current) && waitIterations < 20) {
        await new Promise((r) => setTimeout(r, 150));
        waitIterations++;
      }

      const durationSecs = recordingStartTimeRef.current
        ? Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000))
        : 1;

      let finalizeUrl = `/api/v1/interviews/sessions/${sessionId}/recording/finalize`;
      const envApiUrl = import.meta.env.VITE_API_URL;
      if (envApiUrl && envApiUrl.startsWith('http')) {
        finalizeUrl = `${envApiUrl.replace(/\/+$/, '')}/interviews/sessions/${sessionId}/recording/finalize`;
      } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173') {
        finalizeUrl = `http://localhost:8080/api/v1/interviews/sessions/${sessionId}/recording/finalize`;
      }

      const token = localStorage.getItem('token') || '';
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(finalizeUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: `duration_seconds=${durationSecs}`,
      });

      let resData = null;
      if (response.ok) {
        resData = await response.json();
      }

      uploadSuccessRef.current = true;
      setUploadSuccess(true);
      if (onRecordingUploaded) {
        onRecordingUploaded(resData?.recording);
      }

      stopAudioCall();
      return resData?.recording;
    } catch (err) {
      console.error('[WebRTC Audio] Failed to finalize recording:', err);
      stopAudioCall();
      return null;
    } finally {
      isFinalizingRef.current = false;
      setUploadingRecording(false);
    }
  }, [sessionId, onRecordingUploaded, stopAudioCall]);

  // Main WebRTC & WebSocket initialization lifecycle
  useEffect(() => {
    if (!enabled || !sessionId) {
      stopAudioCall();
      return;
    }

    let isDestroyed = false;

    const initCall = async () => {
      try {
        setConnectionState('connecting');

        // 1. Get High-Quality Microphone Audio (with noise suppression, echo cancellation, iOS & legacy fallbacks)
        const stream = await getSafeUserMedia(getHighQualityAudioConstraints());

        if (isDestroyed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;

        // Initialize Web Audio Graph & Mixer
        await initAudioMixer(stream);

        // Apply Studio Real-time Voice Noise Cleaner (High-Pass, Notch, Low-Pass, Dynamics Compressor & Smart Noise Gate)
        let transmitStream = stream;
        if (audioContextRef.current) {
          const { cleanedStream, cleanup } = createNoiseCleanedStream(stream, audioContextRef.current);
          transmitStream = cleanedStream;
          dspCleanupRef.current = cleanup;
        }

        const audioTracks = transmitStream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTracks[0].enabled = !isMutedRef.current;
        }

        // 2. Setup RTCPeerConnection
        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;

        // Add studio-cleaned local tracks to peer connection with high network priority
        audioTracks.forEach((track) => {
          const sender = pc.addTrack(track, transmitStream);
          if (sender && sender.getParameters) {
            try {
              const params = sender.getParameters();
              if (params && params.encodings && params.encodings.length > 0) {
                params.encodings[0].networkPriority = 'high';
                params.encodings[0].priority = 'high';
                params.encodings[0].maxBitrate = 64000;
                sender.setParameters(params).catch(() => {});
              }
            } catch (e) {}
          }
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignaling('ice-candidate', event.candidate);
          }
        };

        const updateCalculatedConnectionState = () => {
          if (isDestroyed) return;
          const connState = pc.connectionState;
          const iceState = pc.iceConnectionState;

          const hasRemoteTracks =
            remoteStreamRef.current &&
            remoteStreamRef.current.getAudioTracks().some((t) => t.readyState === 'live');

          if (
            connState === 'connected' ||
            iceState === 'connected' ||
            iceState === 'completed' ||
            hasRemoteTracks
          ) {
            setConnectionState('connected');
          } else if (connState === 'connecting' || iceState === 'checking' || connState === 'new' || iceState === 'new') {
            setConnectionState('connecting');
          } else if (connState === 'disconnected' || iceState === 'disconnected') {
            setConnectionState(hasRemoteTracks ? 'connected' : 'reconnecting');
          } else if (connState === 'failed' || iceState === 'failed') {
            setConnectionState(hasRemoteTracks ? 'connected' : 'reconnecting');
          } else if (connState === 'closed' || iceState === 'closed') {
            setConnectionState('disconnected');
          }
        };

        pc.onconnectionstatechange = updateCalculatedConnectionState;
        pc.oniceconnectionstatechange = updateCalculatedConnectionState;

        // Remote Audio Track Received -> Fast zero-delay output to speakers & mixer
        pc.ontrack = (event) => {
          // 0. Slash jitter buffer & playout delay for instant real-time speech!
          if (event.receiver) {
            try {
              if ('playoutDelayHint' in event.receiver) {
                event.receiver.playoutDelayHint = 0;
              }
              if ('jitterBufferTarget' in event.receiver) {
                event.receiver.jitterBufferTarget = 0;
              }
            } catch (e) {}
          }

          let remoteStream = event.streams && event.streams[0] ? event.streams[0] : null;
          if (!remoteStream && event.track) {
            remoteStream = new MediaStream([event.track]);
          }

          if (remoteStream) {
            remoteStreamRef.current = remoteStream;

            // 1. Connect to Web Audio Analyser & Recording Mixer
            connectRemoteAudioStream(remoteStream);

            // 2. Output to dedicated HTML5 audio element with native hardware echo cancellation & 0ms delay
            if (remoteAudioElRef.current) {
              const el = remoteAudioElRef.current;
              el.srcObject = remoteStream;
              el.muted = false;
              el.volume = 1.0;
              el.play().then(() => {
                setIsAutoplayBlocked(false);
              }).catch((e) => {
                console.warn('[WebRTC Audio] HTML audio autoplay deferred:', e);
                setIsAutoplayBlocked(true);
              });
            }

            setConnectionState('connected');
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

        let pingTimer = null;

        ws.onopen = () => {
          sendSignaling('join');
          sendSignaling('mute-status', null, { is_muted: isMutedRef.current });
          pingTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              sendSignaling('ping');
            }
          }, 10000);
        };

        ws.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (!msg || !msg.type) return;

            switch (msg.type) {
              case 'peer_joined': {
                // Existing peer initiates offer
                sendSignaling('mute-status', null, { is_muted: isMutedRef.current });

                if (pc.signalingState === 'stable') {
                  try {
                    const offer = await pc.createOffer({
                      offerToReceiveAudio: true,
                    });
                    const optimizedSdp = optimizeAudioSDP(offer.sdp);
                    await pc.setLocalDescription({ type: offer.type, sdp: optimizedSdp });
                    sendSignaling('offer', pc.localDescription);
                  } catch (offerErr) {
                    console.warn('[WebRTC Audio] Create offer error on peer_joined:', offerErr);
                  }
                }
                break;
              }

              case 'peer_ready': {
                sendSignaling('mute-status', null, { is_muted: isMutedRef.current });

                // Set fallback timer: if no offer arrives in 1.5 seconds, initiate offer
                if (fallbackOfferTimerRef.current) clearTimeout(fallbackOfferTimerRef.current);
                fallbackOfferTimerRef.current = setTimeout(async () => {
                  if (!isDestroyed && pc.signalingState === 'stable' && !pc.remoteDescription) {
                    try {
                      const offer = await pc.createOffer({ offerToReceiveAudio: true });
                      const optimizedSdp = optimizeAudioSDP(offer.sdp);
                      await pc.setLocalDescription({ type: offer.type, sdp: optimizedSdp });
                      sendSignaling('offer', pc.localDescription);
                    } catch (e) {
                      console.warn('[WebRTC Audio] Fallback offer error:', e);
                    }
                  }
                }, 1500);
                break;
              }

              case 'offer': {
                if (!msg.payload) return;
                if (fallbackOfferTimerRef.current) {
                  clearTimeout(fallbackOfferTimerRef.current);
                  fallbackOfferTimerRef.current = null;
                }

                try {
                  // If we already have a local offer in flight, rollback to accept incoming offer
                  if (pc.signalingState === 'have-local-offer') {
                    await pc.setLocalDescription({ type: 'rollback' });
                  }

                  await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
                  await drainIceCandidatesQueue(pc);

                  const answer = await pc.createAnswer({
                    offerToReceiveAudio: true,
                  });
                  const optimizedSdp = optimizeAudioSDP(answer.sdp);
                  await pc.setLocalDescription({ type: answer.type, sdp: optimizedSdp });
                  sendSignaling('answer', pc.localDescription);
                  updateCalculatedConnectionState();
                } catch (err) {
                  console.error('[WebRTC Audio] Offer processing error:', err);
                }
                break;
              }

              case 'answer': {
                if (!msg.payload) return;
                if (fallbackOfferTimerRef.current) {
                  clearTimeout(fallbackOfferTimerRef.current);
                  fallbackOfferTimerRef.current = null;
                }

                try {
                  if (pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
                    await drainIceCandidatesQueue(pc);
                    updateCalculatedConnectionState();
                  }
                } catch (err) {
                  console.error('[WebRTC Audio] Answer processing error:', err);
                }
                break;
              }

              case 'ice-candidate': {
                if (!msg.payload) return;
                try {
                  if (pc.remoteDescription && pc.remoteDescription.type) {
                    await pc.addIceCandidate(new RTCIceCandidate(msg.payload));
                  } else {
                    iceCandidatesQueueRef.current.push(msg.payload);
                  }
                  updateCalculatedConnectionState();
                } catch (candErr) {
                  console.warn('[WebRTC Audio] ICE candidate add error:', candErr);
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

              case 'peer_left':
              case 'call_ended':
              case 'session_ended': {
                if (remoteAudioSourceRef.current) {
                  try {
                    remoteAudioSourceRef.current.disconnect();
                  } catch (e) {}
                  remoteAudioSourceRef.current = null;
                }
                if (remoteAudioElRef.current) {
                  remoteAudioElRef.current.pause();
                  remoteAudioElRef.current.srcObject = null;
                }
                if (remoteStreamRef.current) {
                  remoteStreamRef.current.getTracks().forEach((t) => t.stop());
                  remoteStreamRef.current = null;
                }
                setConnectionState('disconnected');
                peerMutedRef.current = false;
                setPeerMuted(false);
                setIsPeerSpeaking(false);
                break;
              }

              default:
                break;
            }
          } catch (e) {
            console.warn('[WebRTC Signaling] Message processing error:', e);
          }
        };

        ws.onclose = () => {
          if (pingTimer) clearInterval(pingTimer);
        };

        ws.onerror = () => {
          if (pingTimer) clearInterval(pingTimer);
          if (!isDestroyed) {
            const hasRemoteTracks =
              remoteStreamRef.current &&
              remoteStreamRef.current.getAudioTracks().some((t) => t.readyState === 'live');
            if (!hasRemoteTracks) {
              setConnectionState('reconnecting');
            }
          }
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
      stopAudioCall();
    };
  }, [enabled, sessionId, initAudioMixer, connectRemoteAudioStream, sendSignaling, startVAD, stopAudioCall, drainIceCandidatesQueue]);

  // Global user gesture listener to unlock AudioContext & output
  useEffect(() => {
    const handleUserGesture = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      if (remoteAudioElRef.current && remoteAudioElRef.current.paused && remoteStreamRef.current) {
        remoteAudioElRef.current.play().then(() => setIsAutoplayBlocked(false)).catch(() => {});
      }
    };

    window.addEventListener('click', handleUserGesture);
    window.addEventListener('keydown', handleUserGesture);
    window.addEventListener('touchstart', handleUserGesture);
    window.addEventListener('pointerdown', handleUserGesture);

    return () => {
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
      window.removeEventListener('touchstart', handleUserGesture);
      window.removeEventListener('pointerdown', handleUserGesture);
    };
  }, []);

  // Toggle local mute
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
    isAutoplayBlocked,
    unblockAudio,
    toggleMute,
    stopAudioCall,
    stopAndUploadRecording,
    uploadingRecording,
    uploadSuccess,
  };
}
