import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  Maximize2,
  Minimize2,
  RefreshCw,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  RotateCw,
  Eye,
  Sparkles,
  Layers,
  X,
  Trash2,
  Package
} from 'lucide-react';
import InstalledPackagesModal, { INSTALLED_FRONTEND_PACKAGES } from './InstalledPackagesModal';

const DEVICE_PRESETS = [
  { id: 'mobile', label: 'Mobile', width: 375, height: 667, icon: Smartphone, tag: '375px' },
  { id: 'mobile_lg', label: 'Mobile Lg', width: 414, height: 736, icon: Smartphone, tag: '414px' },
  { id: 'tablet', label: 'Tablet', width: 768, height: 1024, icon: Tablet, tag: '768px' },
  { id: 'laptop', label: 'Laptop', width: 1024, height: 680, icon: Monitor, tag: '1024px' },
  { id: 'responsive', label: '100% Fluid', width: '100%', height: '100%', icon: Monitor, tag: 'Fluid' },
];

export default function FrontendLivePreview({
  code = '',
  title = 'Responsive Preview',
  candidateName = 'Candidate',
  isCandidate = false,
  onOpenPackages = null,
}) {
  const [activeDevice, setActiveDevice] = useState('responsive');
  const [customWidth, setCustomWidth] = useState(null); // number or null
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(false);
  const [showPackagesModal, setShowPackagesModal] = useState(false);
  const [syntaxError, setSyntaxError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  // Clean and transform user code for in-browser Babel execution
  const processedCode = useMemo(() => {
    if (!code || !code.trim()) {
      return `
        function App() {
          return (
            <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center justify-center text-center">
              <h1 className="text-xl font-bold">Waiting for Component...</h1>
            </div>
          );
        }
      `;
    }

    let cleaned = code;
    // Strip import statements (e.g. import React, { useState } from 'react';)
    cleaned = cleaned.replace(/import\s+(?:(?:\*\s+as\s+\w+)|(?:\{[\s\S]*?\})|(?:\w+))\s+from\s+['"][^'"]+['"];?/gm, '');
    cleaned = cleaned.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?/gm, '');
    cleaned = cleaned.replace(/^import\s+['"][^'"]+['"];?/gm, '');

    // Convert export default function App -> function App
    cleaned = cleaned.replace(/export\s+default\s+function\s+([a-zA-Z0-9_$]+)/g, 'function $1');
    cleaned = cleaned.replace(/export\s+function\s+([a-zA-Z0-9_$]+)/g, 'function $1');
    cleaned = cleaned.replace(/export\s+default\s+([a-zA-Z0-9_$]+);?/g, '');
    cleaned = cleaned.replace(/export\s+const\s+([a-zA-Z0-9_$]+)/g, 'const $1');

    return cleaned;
  }, [code]);

  // Construct iframe srcDoc HTML with pre-installed ecosystem packages
  const srcDoc = useMemo(() => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Core Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- React 18 & ReactDOM 18 -->
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <!-- Babel Standalone JSX Compiler -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- Lucide Vector Icons Engine -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
  <!-- Framer Motion -->
  <script src="https://unpkg.com/framer-motion@10.16.4/dist/framer-motion.js"></script>
  <!-- Lodash -->
  <script src="https://unpkg.com/lodash@4.17.21/lodash.min.js"></script>
  <!-- Axios -->
  <script src="https://unpkg.com/axios@1.6.8/dist/axios.min.js"></script>
  <!-- Canvas Confetti -->
  <script src="https://unpkg.com/canvas-confetti@1.9.2/dist/confetti.browser.js"></script>
  <!-- Clsx -->
  <script src="https://unpkg.com/clsx@2.1.0/dist/clsx.min.js"></script>
  <style>
    *, ::before, ::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      overflow-x: hidden;
    }
    /* Custom scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 3px; }
  </style>
</head>
<body>
  <div id="root"></div>
  <div id="runtime-error-mount"></div>

  <script>
    // Console log interceptor
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    function emitLog(type, args) {
      try {
        const text = Array.from(args).map(arg => {
          if (typeof arg === 'object' && arg !== null) {
            try { return JSON.stringify(arg, null, 2); } catch (e) { return String(arg); }
          }
          return String(arg);
        }).join(' ');
        window.parent.postMessage({ type: 'MOCKMATE_PREVIEW_LOG', level: type, message: text, time: new Date().toLocaleTimeString() }, '*');
      } catch (e) {}
    }

    console.log = function(...args) { origLog.apply(console, args); emitLog('log', args); };
    console.warn = function(...args) { origWarn.apply(console, args); emitLog('warn', args); };
    console.error = function(...args) { origError.apply(console, args); emitLog('error', args); };

    window.onerror = function(message, source, lineno, colno, error) {
      const errText = message + (lineno ? ' (Line: ' + lineno + ')' : '');
      emitLog('error', [errText]);
      showError(errText);
      return false;
    };

    function showError(msg) {
      const mount = document.getElementById('runtime-error-mount');
      if (mount) {
        mount.innerHTML = '<div style="margin:16px;padding:14px 18px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:10px;color:#fca5a5;font-family:monospace;font-size:12px;line-height:1.5;box-shadow:0 10px 25px -5px rgba(0,0,0,0.5);"><div style="font-weight:bold;color:#ef4444;margin-bottom:6px;display:flex;align-items:center;gap:6px;">⚠️ React Preview Runtime Error</div><div style="white-space:pre-wrap;">' + msg + '</div></div>';
      }
    }
  </script>

  <script type="text/babel">
    try {
      // 1. React & Hooks
      const {
        useState, useEffect, useRef, useMemo, useCallback,
        useReducer, useContext, createContext, useId, useTransition, useDeferredValue
      } = React;

      // 2. Lodash
      const _ = window._ || {};
      const {
        debounce, throttle, cloneDeep, groupBy, sortBy,
        uniq, uniqBy, range, shuffle, isEmpty, chunk, sum, min, max, clamp
      } = _ || {};

      // 3. Axios
      const axios = window.axios;

      // 4. Canvas Confetti
      const confetti = window.confetti || (() => {});

      // 5. Clsx
      const clsx = window.clsx || ((...args) => args.filter(Boolean).join(' '));

      // 6. Framer Motion
      const MotionPackage = window.Motion || window.FramerMotion || {};
      const motion = MotionPackage.motion || new Proxy({}, {
        get: (target, prop) => (props) => React.createElement(prop || 'div', props)
      });
      const AnimatePresence = MotionPackage.AnimatePresence || (({ children }) => children);

      // 7. Dynamic Lucide Icons Component Engine
      const LucideIcons = {};
      if (window.lucide && window.lucide.icons) {
        Object.keys(window.lucide.icons).forEach(iconKey => {
          const iconDef = window.lucide.icons[iconKey];
          const pascalName = iconKey.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');

          const IconComponent = ({ size = 20, color = 'currentColor', strokeWidth = 2, className = '', ...props }) => {
            return React.createElement(
              'svg',
              {
                xmlns: 'http://www.w3.org/2000/svg',
                width: size,
                height: size,
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: color,
                strokeWidth: strokeWidth,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                className: className,
                ...props
              },
              Array.isArray(iconDef) ? iconDef.map(([tag, attrs], idx) => React.createElement(tag, { key: idx, ...attrs })) : null
            );
          };
          LucideIcons[pascalName] = IconComponent;
          LucideIcons[iconKey] = IconComponent;
        });
      }

      const SafeLucideIcons = new Proxy(LucideIcons, {
        get: (target, prop) => {
          if (typeof prop === 'string' && prop in target) return target[prop];
          return ({ size = 20, className = '', ...props }) => (
            React.createElement('span', { className: 'inline-flex items-center justify-center font-bold text-xs ' + className, ...props }, '✦')
          );
        }
      });

      // Destructure 60+ popular Lucide icons directly into global Babel scope
      const {
        Sparkles, Heart, Search, Check, Plus, Minus, Trash, Trash2, Star,
        User, Users, Settings, Mail, Lock, Unlock, Eye, EyeOff,
        ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
        ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ExternalLink,
        Upload, Download, Image, Play, Pause, RotateCcw, RefreshCw,
        Sliders, Filter, Calendar, Clock, Shield, Zap, Award, Flame,
        AlertCircle, AlertTriangle, CheckCircle, CheckCircle2, Info, HelpCircle,
        X, Menu, Bell, Moon, Sun, Folder, FileText, FileCode,
        Database, Code, Code2, Terminal, Layers, Layout, Globe, Activity,
        Cpu, Laptop, Smartphone, Tablet, Monitor, Send, MessageSquare,
        ThumbsUp, ThumbsDown, Bookmark, Share2, Copy, Edit, Edit2, Edit3,
        Package: PackageIcon, ShoppingCart, CreditCard, DollarSign
      } = SafeLucideIcons;

      ${processedCode}

      const TargetComponent = (typeof App !== 'undefined' && typeof App === 'function')
        ? App
        : (typeof Main !== 'undefined' && typeof Main === 'function'
            ? Main
            : (typeof Component !== 'undefined' && typeof Component === 'function'
                ? Component
                : (typeof Card !== 'undefined' && typeof Card === 'function'
                    ? Card
                    : null)));

      if (TargetComponent) {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<TargetComponent />);
      } else {
        document.getElementById('root').innerHTML = '<div style="padding:40px 20px;text-align:center;color:#94a3b8;font-family:sans-serif;"><div style="font-size:32px;margin-bottom:8px;">🎨</div><div style="font-weight:bold;color:#e2e8f0;font-size:16px;">Ready for Component</div><p style="font-size:13px;max-width:320px;margin:8px auto;">Define <code>export default function App() { return (...) }</code> to preview.</p></div>';
      }
    } catch (err) {
      showError(err.message || String(err));
    }
  </script>
</body>
</html>`;
  }, [processedCode, reloadKey]);

  // Listen for console logs emitted from inside the sandbox iframe
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'MOCKMATE_PREVIEW_LOG') {
        setConsoleLogs((prev) => [
          ...prev.slice(-49), // Keep last 50 logs
          {
            id: Date.now() + Math.random(),
            level: e.data.level,
            message: e.data.message,
            time: e.data.time,
          },
        ]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle draggable width resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(320, Math.min(rect.width, e.clientX - rect.left));
      setCustomWidth(Math.round(newWidth));
      setActiveDevice('custom');
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Compute actual preview frame dimensions
  const { frameWidth, frameHeight } = useMemo(() => {
    if (activeDevice === 'custom' && customWidth) {
      return { frameWidth: `${customWidth}px`, frameHeight: '100%' };
    }
    const preset = DEVICE_PRESETS.find((p) => p.id === activeDevice) || DEVICE_PRESETS[4];
    if (preset.id === 'responsive') {
      return { frameWidth: '100%', frameHeight: '100%' };
    }

    let w = preset.width;
    let h = preset.height;
    if (orientation === 'landscape') {
      w = preset.height;
      h = preset.width;
    }
    return { frameWidth: `${w}px`, frameHeight: `${h}px` };
  }, [activeDevice, customWidth, orientation]);

  const activePreset = DEVICE_PRESETS.find((p) => p.id === activeDevice);

  return (
    <div
      className={`flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-md overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'fixed inset-0 z-[70] w-screen h-screen rounded-none' : 'relative w-full h-full min-h-[460px]'
      }`}
    >
      {/* ============================================================ */}
      {/* TOP RESPONSIVE VIEWPORT TOOLBAR */}
      {/* ============================================================ */}
      <div className="h-12 px-3 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between gap-2 shrink-0 z-10 flex-wrap">
        {/* Device Switcher Chips */}
        <div className="flex items-center gap-1">
          {DEVICE_PRESETS.map((device) => {
            const IconComponent = device.icon;
            const isSelected = activeDevice === device.id;
            return (
              <button
                key={device.id}
                type="button"
                onClick={() => {
                  setActiveDevice(device.id);
                  setCustomWidth(null);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--accent)] text-white shadow-xs font-bold'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] border border-[var(--border)]'
                }`}
                title={`Test in ${device.label} (${device.tag})`}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{device.label}</span>
                <span className="text-[10px] opacity-75 font-normal">({device.tag})</span>
              </button>
            );
          })}

          {/* Orientation Toggle (if fixed mobile/tablet) */}
          {activeDevice !== 'responsive' && (
            <button
              type="button"
              onClick={() => setOrientation((o) => (o === 'portrait' ? 'landscape' : 'portrait'))}
              className="p-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer ml-1"
              title={`Rotate to ${orientation === 'portrait' ? 'Landscape' : 'Portrait'}`}
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Tools: Packages, Dimension Pill, Reload, Console & Fullscreen */}
        <div className="flex items-center gap-1.5 ml-auto text-xs">
          {/* Packages Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenPackages) {
                onOpenPackages();
              } else {
                setShowPackagesModal(true);
              }
            }}
            className="px-2 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-cyan-600 dark:text-cyan-400 hover:border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title="View pre-installed npm packages"
          >
            <Package className="w-3.5 h-3.5 text-cyan-500" />
            <span className="hidden sm:inline">Packages</span>
            <span className="text-[10px] px-1 rounded-full bg-cyan-500/10 text-cyan-500">
              {INSTALLED_FRONTEND_PACKAGES.length}
            </span>
          </button>

          {/* Active Viewport Dimension Pill */}
          <div className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)] hidden md:inline-block">
            {activeDevice === 'custom'
              ? `${customWidth}px × Fluid`
              : activePreset?.id === 'responsive'
              ? '100% Fluid'
              : `${frameWidth} × ${orientation}`}
          </div>

          {/* Refresh Preview */}
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="p-1.5 rounded-md hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Reload live preview"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Console Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowConsole((c) => !c)}
            className={`px-2 py-1 rounded-md text-xs font-mono transition flex items-center gap-1 cursor-pointer border ${
              showConsole
                ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]'
                : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle Console Log Output"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logs</span>
            {consoleLogs.length > 0 && (
              <span className="text-[10px] px-1 rounded-full bg-[var(--accent)] text-white font-bold">
                {consoleLogs.length}
              </span>
            )}
          </button>

          {/* Fullscreen Preview Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            className="p-1.5 rounded-md hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen Preview (Esc)' : 'Expand Fullscreen Preview'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* INTERACTIVE PREVIEW WORKSPACE & RESIZE CONTAINER */}
      {/* ============================================================ */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full bg-slate-950/80 overflow-auto flex items-center justify-center p-2 sm:p-4 select-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(148, 163, 184, 0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {/* Device Frame Wrapper */}
        <div
          className={`relative transition-all duration-150 flex flex-col bg-slate-900 shadow-2xl overflow-hidden ${
            activeDevice !== 'responsive'
              ? 'rounded-2xl border-4 border-slate-700 ring-4 ring-black/40'
              : 'w-full h-full rounded-lg border border-slate-800'
          }`}
          style={{
            width: frameWidth,
            maxWidth: '100%',
            height: activeDevice !== 'responsive' ? frameHeight : '100%',
            maxHeight: '100%',
          }}
        >
          {/* Device Notch / Header for simulated phones */}
          {activeDevice !== 'responsive' && (
            <div className="h-4 bg-slate-800 flex items-center justify-center shrink-0 border-b border-slate-700/50">
              <div className="w-12 h-1.5 rounded-full bg-slate-600/60" />
            </div>
          )}

          {/* Sandboxed Live React Iframe */}
          <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            title="React Live Preview Sandbox"
            sandbox="allow-scripts allow-modals allow-same-origin"
            className="w-full flex-1 border-none bg-slate-900 overflow-auto"
          />
        </div>

        {/* Draggable Width Resize Handle on Right Border */}
        {activeDevice === 'responsive' || activeDevice === 'custom' ? (
          <div
            onMouseDown={() => setIsResizing(true)}
            className={`absolute top-0 right-0 w-3 h-full cursor-ew-resize flex items-center justify-center hover:bg-[var(--accent)]/30 transition-colors z-20 ${
              isResizing ? 'bg-[var(--accent)]' : ''
            }`}
            title="Drag horizontally to test fluid responsiveness"
          >
            <div className="w-1 h-8 rounded-full bg-slate-500/50" />
          </div>
        ) : null}
      </div>

      {/* ============================================================ */}
      {/* CONSOLE LOGS DRAWER */}
      {/* ============================================================ */}
      {showConsole && (
        <div className="h-40 bg-slate-950 border-t border-slate-800 flex flex-col shrink-0 font-mono text-xs z-30 animate-in slide-in-from-bottom duration-150">
          <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-[11px] text-slate-200 uppercase tracking-wider">
                Preview Console Logs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConsoleLogs([])}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Clear Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowConsole(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Close Console"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-1 text-[11px]">
            {consoleLogs.length === 0 ? (
              <div className="text-slate-500 italic">No console logs emitted yet. Use console.log() in your code.</div>
            ) : (
              consoleLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 py-0.5 font-mono ${
                    log.level === 'error'
                      ? 'text-rose-400 bg-rose-950/20 px-1 rounded'
                      : log.level === 'warn'
                      ? 'text-amber-400 bg-amber-950/20 px-1 rounded'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-500 text-[10px] shrink-0">{log.time}</span>
                  <span className="font-bold shrink-0 uppercase text-[10px] opacity-75">[{log.level}]</span>
                  <span className="whitespace-pre-wrap break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Installed Packages Modal */}
      <InstalledPackagesModal
        isOpen={showPackagesModal}
        onClose={() => setShowPackagesModal(false)}
      />
    </div>
  );
}
