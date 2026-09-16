/**
 * Safe Cross-Platform Media Utilities
 * Handles iOS Safari / WebKit quirks, insecure context detections (HTTP vs HTTPS),
 * and legacy getUserMedia fallbacks.
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
 * Robust cross-browser getUserMedia wrapper
 * @param {MediaStreamConstraints} constraints
 * @returns {Promise<MediaStream>}
 */
export async function getSafeUserMedia(constraints = { audio: true, video: false }) {
  const support = checkMicrophoneSupport();

  // 1. Standard modern navigator.mediaDevices.getUserMedia
  if (navigator?.mediaDevices?.getUserMedia) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      // If overconstrained (e.g. sampleRate or specific audio settings not supported by iOS)
      if (err.name === 'OverconstrainedError' || err.name === 'TypeError') {
        try {
          return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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
      legacyGetUserMedia.call(navigator, constraints, resolve, (err) => {
        if (err.name === 'OverconstrainedError') {
          legacyGetUserMedia.call(navigator, { audio: true, video: false }, resolve, reject);
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
