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

  // Web Audio Mixer & Real-time Chunk Streaming Refs
  const audioContextRef = useRef(null);
  const mixedDestRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const isFinalizingRef = useRef(false);
  const uploadSuccessRef = useRef(false);

  // Chunk Streaming Queue (Zero client-side disk storage - streamed & discarded immediately)
  const chunkQueueRef = useRef([]);
  const isStreamingChunkRef = useRef(false);
  const chunkSequenceRef = useRef(0);

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
        remoteAudioElRef.current = null;
      }
    };
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
        const peerSpeaking = avg > 15;
        setIsPeerSpeaking(peerSpeaking);
        if (peerSpeaking) {
          setConnectionState((prev) => (prev !== 'connected' ? 'connected' : prev));
        }
      } else {
        setIsPeerSpeaking(false);
      }
    }, 150);
  }, []);

  // Process and stream chunks asynchronously to the server
  const processChunkQueue = useCallback(async () => {
    if (isStreamingChunkRef.current || chunkQueueRef.current.length === 0 || !sessionId) {
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

      const res = await fetch(chunkUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        console.warn(`[WebRTC Audio Stream] Chunk ${item.seq} upload returned status ${res.status}`);
      }
    } catch (err) {
      console.warn('[WebRTC Audio Stream] Error streaming chunk to server:', err);
    } finally {
      // Chunk is uploaded and memory is freed immediately
      isStreamingChunkRef.current = false;
      if (chunkQueueRef.current.length > 0) {
        processChunkQueue();
      }
    }
  }, [sessionId]);

  // Queue incoming audio chunk from MediaRecorder
  const queueAudioChunk = useCallback((blob) => {
    if (!blob || blob.size === 0) return;
    chunkSequenceRef.current += 1;
    chunkQueueRef.current.push({
      blob,
      seq: chunkSequenceRef.current,
      time: Date.now(),
    });
    processChunkQueue();
  }, [processChunkQueue]);

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

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          // Stream chunk directly to server; zero client-side disk storage
          queueAudioChunk(event.data);
        }
      };

      recorder.onerror = (e) => {
        console.warn('[WebRTC Audio] MediaRecorder error:', e);
      };

      // Emit chunk every 3 seconds for continuous streaming to server
      recorder.start(3000);
      recordingStartTimeRef.current = Date.now();
      console.log('[WebRTC Audio] Real-time chunk streaming active with mimeType:', mimeType || 'default');
    } catch (err) {
      console.warn('[WebRTC Audio] Mixer init warning:', err);
      // Direct stream fallback
      try {
        const mimeType = getSupportedAudioMimeType();
        const fallbackRecorder = new MediaRecorder(localStream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = fallbackRecorder;
        fallbackRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            queueAudioChunk(e.data);
          }
        };
        fallbackRecorder.start(3000);
        recordingStartTimeRef.current = Date.now();
      } catch (fallbackErr) {
        console.error('[WebRTC Audio] Fallback recorder error:', fallbackErr);
      }
    }
  }, [queueAudioChunk]);

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
      console.log('[WebRTC Audio] Remote peer audio attached to real-time mixer');
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

  // Full stop & teardown of all audio hardware, media streams, peer connections, and signaling
  const stopAudioCall = useCallback(() => {
    console.log('[WebRTC Audio] Fully stopping audio call, releasing microphone & closing peer connection');

    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }

    // Stop local microphone tracks completely
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {}
      });
      localStreamRef.current = null;
    }

    // Stop remote tracks
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {}
      });
      remoteStreamRef.current = null;
    }

    // Disconnect and silence audio element
    if (remoteAudioElRef.current) {
      try {
        remoteAudioElRef.current.pause();
        remoteAudioElRef.current.srcObject = null;
      } catch (e) {}
    }

    // Stop recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    // Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch (e) {}
      audioContextRef.current = null;
    }

    // Close PeerConnection
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    }

    // Close WebSocket signaling
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
    if (isFinalizingRef.current) {
      console.log('[WebRTC Audio] Finalize already in progress, ignoring duplicate request');
      return null;
    }
    if (uploadSuccessRef.current) {
      console.log('[WebRTC Audio] Recording already finalized for session:', sessionId);
      return null;
    }

    isFinalizingRef.current = true;
    setUploadingRecording(true);

    try {
      console.log('[WebRTC Audio] Finalizing real-time recording for session:', sessionId);

      // 1. Request final data chunk and stop recorder
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

      // 2. Wait for all pending chunks in the queue to be transmitted
      let waitIterations = 0;
      while ((chunkQueueRef.current.length > 0 || isStreamingChunkRef.current) && waitIterations < 20) {
        await new Promise((r) => setTimeout(r, 150));
        waitIterations++;
      }

      const durationSecs = recordingStartTimeRef.current
        ? Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000))
        : 1;

      // 3. Notify server to seal the recording metadata
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

      // Now that recording is finalized, ensure audio call and mic are completely stopped
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

  // Main WebRTC & WebSocket initialization & cleanup loop
  useEffect(() => {
    if (!enabled || !sessionId) {
      // Immediately stop and release all audio if disabled
      stopAudioCall();
      return;
    }

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
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTracks[0].enabled = !isMutedRef.current;
        }

        await initAudioMixer(stream);

        // 2. Setup RTCPeerConnection
        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
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
            if (hasRemoteTracks) {
              setConnectionState('connected');
            } else {
              setConnectionState('reconnecting');
            }
          } else if (connState === 'failed' || iceState === 'failed') {
            if (hasRemoteTracks) {
              setConnectionState('connected');
            } else {
              setConnectionState('reconnecting');
            }
          } else if (connState === 'closed' || iceState === 'closed') {
            setConnectionState('disconnected');
          }
        };

        pc.onconnectionstatechange = updateCalculatedConnectionState;
        pc.oniceconnectionstatechange = updateCalculatedConnectionState;

        pc.ontrack = (event) => {
          let remoteStream = event.streams && event.streams[0] ? event.streams[0] : null;
          if (!remoteStream && event.track) {
            remoteStream = new MediaStream([event.track]);
          }

          if (remoteStream) {
            remoteStreamRef.current = remoteStream;

            if (remoteAudioElRef.current) {
              remoteAudioElRef.current.srcObject = remoteStream;
              remoteAudioElRef.current.play().catch(() => {});
            }

            connectRemoteToMixer(remoteStream);
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
          }, 15000);
        };

        ws.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (!msg || !msg.type) return;

            switch (msg.type) {
              case 'peer_joined': {
                sendSignaling('mute-status', null, { is_muted: isMutedRef.current });
                try {
                  const offer = await pc.createOffer({
                    offerToReceiveAudio: true,
                  });
                  await pc.setLocalDescription(offer);
                  sendSignaling('offer', offer);
                } catch (offerErr) {
                  console.warn('[WebRTC Audio] Create offer error on peer_joined:', offerErr);
                }
                break;
              }

              case 'peer_ready': {
                sendSignaling('mute-status', null, { is_muted: isMutedRef.current });
                setTimeout(async () => {
                  if (!isDestroyed && pc.signalingState === 'stable' && !pc.remoteDescription) {
                    try {
                      const offer = await pc.createOffer({ offerToReceiveAudio: true });
                      await pc.setLocalDescription(offer);
                      sendSignaling('offer', offer);
                    } catch (e) {}
                  }
                }, 1000);
                break;
              }

              case 'offer': {
                if (msg.payload) {
                  try {
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));

                    while (iceCandidatesQueueRef.current.length > 0) {
                      const cand = iceCandidatesQueueRef.current.shift();
                      try {
                        await pc.addIceCandidate(new RTCIceCandidate(cand));
                      } catch (candErr) {
                        console.warn('[WebRTC Audio] Queued candidate error:', candErr);
                      }
                    }

                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendSignaling('answer', answer);
                    updateCalculatedConnectionState();
                  } catch (err) {
                    console.error('[WebRTC Audio] Offer processing error:', err);
                  }
                }
                break;
              }

              case 'answer': {
                if (msg.payload) {
                  try {
                    await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));

                    while (iceCandidatesQueueRef.current.length > 0) {
                      const cand = iceCandidatesQueueRef.current.shift();
                      try {
                        await pc.addIceCandidate(new RTCIceCandidate(cand));
                      } catch (candErr) {
                        console.warn('[WebRTC Audio] Queued candidate error:', candErr);
                      }
                    }
                    updateCalculatedConnectionState();
                  } catch (err) {
                    console.error('[WebRTC Audio] Answer processing error:', err);
                  }
                }
                break;
              }

              case 'ice-candidate': {
                if (msg.payload) {
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
            console.warn('[WebRTC Signaling] Message handler error:', e);
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
  }, [enabled, sessionId, initAudioMixer, connectRemoteToMixer, sendSignaling, startVAD, stopAudioCall]);

  // Resume AudioContext on any user interaction
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
    toggleMute,
    stopAudioCall,
    stopAndUploadRecording,
    uploadingRecording,
    uploadSuccess,
  };
}
