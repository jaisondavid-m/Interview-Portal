/**
 * Safe Cross-Platform Media Utilities & Audio Optimization
 * Handles iOS Safari / WebKit quirks, insecure context detections (HTTP vs HTTPS),
 * legacy getUserMedia fallbacks, real-time noise cleaning DSP, and WebRTC SDP tuning.
 */

export function isIOS() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isSecureContextAvailable() {
  if (typeof window === 'undefined') return true;
  if (window.isSecureContext !== undefined) {
    return window.isSecureContext;
  }
  // Localhost is inherently secure
  const host = window.location.hostname;
  return (
    window.location.protocol === 'https:' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1'
  );
}

export function checkMicrophoneSupport() {
  const isSecure = isSecureContextAvailable();
  const onIOS = isIOS();
  const hasMediaDevices =
    typeof navigator !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasLegacy =
    typeof navigator !== 'undefined' &&
    !!(
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia
    );

  const supported = hasMediaDevices || hasLegacy;

  let reason = '';
  if (!supported) {
    if (!isSecure) {
      if (onIOS) {
        reason = `iOS Safari disables microphone access on insecure HTTP (${window.location.host}). Please connect using HTTPS or a secure tunnel (e.g. ngrok/Cloudflare/local SSL).`;
      } else {
        reason = `Microphone access requires a Secure Context (HTTPS). Current connection is insecure HTTP (${window.location.host}).`;
      }
    } else {
      reason = `Microphone access is not supported on this browser version.`;
    }
  }

  return {
    supported,
    isSecure,
    isIOS: onIOS,
    reason,
  };
}

/**
 * Returns optimized audio constraints for high-clarity voice with ultra-low latency and maximum noise suppression
 */
export function getHighQualityAudioConstraints() {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      latency: { ideal: 0.005, max: 0.02 }, // 5ms-20ms low latency capture buffer
      channelCount: 1, // Mono for voice avoids phasing artifacts & cuts bandwidth
      sampleRate: 48000,
      // Vendor-specific extensions (Chromium / WebKit)
      googEchoCancellation: true,
      googEchoCancellation2: true,
      googAutoGainControl: true,
      googAutoGainControl2: true,
      googNoiseSuppression: true,
      googNoiseSuppression2: true,
      googHighpassFilter: true,
      googTypingNoiseDetection: true,
      googAudioMirroring: false,
    },
    video: false,
  };
}

/**
 * Real-time Studio Voice DSP Chain:
 * 1. High-Pass Filter (85 Hz): Removes table thumps, AC airflow, and breath plosives.
 * 2. 50Hz & 60Hz Mains Notch Filters: Strips electrical power line hum.
 * 3. Low-Pass Filter (7800 Hz): Removes computer coil whine and fan hiss.
 * 4. Dynamics Compressor: Levels voice volume without boosting background noise.
 * 5. Intelligent Real-Time Noise Gate: Closes background noise by ~98% during silence and opens instantly when speech begins.
 */
export function createNoiseCleanedStream(rawStream, audioCtx) {
  try {
    if (!audioCtx || !rawStream || rawStream.getAudioTracks().length === 0) {
      return { cleanedStream: rawStream, cleanup: () => {} };
    }

    const source = audioCtx.createMediaStreamSource(rawStream);

    // 1. High-pass filter (85Hz)
    const highpass = audioCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(85, audioCtx.currentTime);
    highpass.Q.setValueAtTime(0.707, audioCtx.currentTime);

    // 2. Low-pass filter (7800Hz)
    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(7800, audioCtx.currentTime);
    lowpass.Q.setValueAtTime(0.707, audioCtx.currentTime);

    // 3. Electrical Notch Filters (50Hz / 60Hz)
    const notch50 = audioCtx.createBiquadFilter();
    notch50.type = 'notch';
    notch50.frequency.setValueAtTime(50, audioCtx.currentTime);
    notch50.Q.setValueAtTime(4.0, audioCtx.currentTime);

    const notch60 = audioCtx.createBiquadFilter();
    notch60.type = 'notch';
    notch60.frequency.setValueAtTime(60, audioCtx.currentTime);
    notch60.Q.setValueAtTime(4.0, audioCtx.currentTime);

    // 4. Dynamics Compressor
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
    compressor.knee.setValueAtTime(8, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(3.5, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.12, audioCtx.currentTime);

    // 5. Intelligent Noise Gate
    const gateGain = audioCtx.createGain();
    gateGain.gain.setValueAtTime(1.0, audioCtx.currentTime);

    const gateAnalyser = audioCtx.createAnalyser();
    gateAnalyser.fftSize = 256;
    gateAnalyser.smoothingTimeConstant = 0.2;

    // Connect DSP chain
    source.connect(highpass);
    highpass.connect(notch50);
    notch50.connect(notch60);
    notch60.connect(lowpass);
    lowpass.connect(compressor);
    compressor.connect(gateAnalyser);
    compressor.connect(gateGain);

    const dest = audioCtx.createMediaStreamDestination();
    gateGain.connect(dest);

    // Fast noise-gate loop
    const dataArray = new Uint8Array(gateAnalyser.frequencyBinCount);
    let isGateOpen = true;
    let silenceFrames = 0;

    const gateInterval = setInterval(() => {
      if (audioCtx.state !== 'running') return;
      gateAnalyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;

      if (avg > 8) {
        silenceFrames = 0;
        if (!isGateOpen) {
          isGateOpen = true;
          gateGain.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.008); // 8ms instant smooth open
        }
      } else {
        silenceFrames++;
        if (silenceFrames > 6 && isGateOpen) {
          isGateOpen = false;
          gateGain.gain.setTargetAtTime(0.02, audioCtx.currentTime, 0.035); // 35ms smooth close
        }
      }
    }, 25);

    const cleanup = () => {
      clearInterval(gateInterval);
      try {
        source.disconnect();
        highpass.disconnect();
        notch50.disconnect();
        notch60.disconnect();
        lowpass.disconnect();
        compressor.disconnect();
        gateGain.disconnect();
        dest.disconnect();
      } catch (e) {}
    };

    const cleanedStream = dest.stream;
    return { cleanedStream, cleanup };
  } catch (err) {
    console.warn('[WebRTC Audio] Noise cleaning DSP fallback to raw stream:', err);
    return { cleanedStream: rawStream, cleanup: () => {} };
  }
}

/**
 * Optimizes WebRTC SDP by tuning Opus codec parameters for real-time, ultra-low latency voice:
 * - ptime=10, minptime=10, maxptime=20 : 10ms fast packetization (reduces packet buffering delay by 50-70%)
 * - usedtx=1 : Discontinuous transmission (silences packet transmission during pauses to eliminate background hiss)
 * - useinbandfec=1 : Forward Error Correction (recovers dropped voice frames without static/clicks)
 * - maxaveragebitrate=64000 : High speech clarity
 * - stereo=0 : Clean mono encoding
 */
export function optimizeAudioSDP(sdp) {
  if (!sdp || typeof sdp !== 'string') return sdp;

  let modifiedSdp = sdp;

  // 1. Force 10ms packet time in audio media section if not already present
  if (!modifiedSdp.includes('a=ptime:10')) {
    modifiedSdp = modifiedSdp.replace(/(m=audio[^\r\n]+[\r\n]+)/, '$1a=ptime:10\r\na=maxptime:20\r\n');
  }

  // 2. Find Opus payload type number (e.g., a=rtpmap:111 opus/48000/2)
  const opusMatch = modifiedSdp.match(/a=rtpmap:(\d+)\s+opus\/48000/i);
  if (!opusMatch) return modifiedSdp;

  const opusPt = opusMatch[1];
  const fmtpRegex = new RegExp(`a=fmtp:${opusPt}\\s+([^\r\n]+)`);
  const opusParams = 'minptime=10;ptime=10;maxptime=20;useinbandfec=1;usedtx=1;maxaveragebitrate=64000;stereo=0;sprop-stereo=0;cbr=0';

  if (fmtpRegex.test(modifiedSdp)) {
    modifiedSdp = modifiedSdp.replace(fmtpRegex, (match, existingParams) => {
      const parts = existingParams.split(';').map((p) => p.trim()).filter(Boolean);
      const keys = ['minptime', 'ptime', 'maxptime', 'useinbandfec', 'usedtx', 'maxaveragebitrate', 'stereo', 'sprop-stereo', 'cbr'];
      const filtered = parts.filter((p) => !keys.some((k) => p.startsWith(`${k}=`)));
      return `a=fmtp:${opusPt} ${[...filtered, opusParams].join(';')}`;
    });
  } else {
    // Insert new fmtp line directly after the rtpmap line
    modifiedSdp = modifiedSdp.replace(
      new RegExp(`(a=rtpmap:${opusPt}\\s+[^\r\n]+[\r\n]+)`),
      `$1a=fmtp:${opusPt} ${opusParams}\r\n`
    );
  }

  return modifiedSdp;
}

/**
 * Robust cross-browser getUserMedia wrapper
 * @param {MediaStreamConstraints} constraints
 * @returns {Promise<MediaStream>}
 */
export async function getSafeUserMedia(constraints = null) {
  const finalConstraints = constraints || getHighQualityAudioConstraints();
  const support = checkMicrophoneSupport();

  // 1. Standard modern navigator.mediaDevices.getUserMedia
  if (navigator?.mediaDevices?.getUserMedia) {
    try {
      return await navigator.mediaDevices.getUserMedia(finalConstraints);
    } catch (err) {
      // If overconstrained on older iOS / Safari, retry with basic clean audio
      if (err.name === 'OverconstrainedError' || err.name === 'TypeError') {
        try {
          return await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: false,
          });
        } catch (retryErr) {
          throw retryErr;
        }
      }
      throw err;
    }
  }

  // 2. Legacy vendor prefixes
  const legacyGetUserMedia =
    navigator?.getUserMedia ||
    navigator?.webkitGetUserMedia ||
    navigator?.mozGetUserMedia ||
    navigator?.msGetUserMedia;

  if (legacyGetUserMedia) {
    return new Promise((resolve, reject) => {
      legacyGetUserMedia.call(navigator, finalConstraints, resolve, (err) => {
        if (err.name === 'OverconstrainedError') {
          legacyGetUserMedia.call(
            navigator,
            { audio: { echoCancellation: true, noiseSuppression: true }, video: false },
            resolve,
            reject
          );
        } else {
          reject(err);
        }
      });
    });
  }

  // 3. Fallback error with actionable explanation
  if (!support.isSecure) {
    const errorMsg = support.isIOS
      ? `Microphone blocked by iOS Safari: WebKit requires HTTPS for microphone access. Accessing over insecure HTTP (${window.location.host}) disables mediaDevices. Please open via HTTPS or localhost.`
      : `Microphone access requires HTTPS (Secure Context). Please open via HTTPS.`;
    const err = new Error(errorMsg);
    err.name = 'SecurityError';
    throw err;
  }

  const err = new Error('Microphone access (getUserMedia) is not available in this browser environment.');
  err.name = 'NotSupportedError';
  throw err;
}
