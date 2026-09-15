import React, { useState } from 'react';
import { useRouteError, useNavigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  RotateCcw,
  Home,
  Code2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  LifeBuoy
} from 'lucide-react';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const errorMessage =
    error?.message ||
    error?.statusText ||
    (typeof error === 'string' ? error : 'An unexpected error occurred while loading this page.');
  const errorStack = error?.stack || '';
  const errorStatus = error?.status || error?.statusCode || null;

  const handleCopyError = () => {
    const fullDetails = `URL: ${window.location.href}\nPath: ${location.pathname}\nStatus: ${errorStatus || 'N/A'}\nMessage: ${errorMessage}\n\nStack:\n${errorStack}`;
    navigator.clipboard.writeText(fullDetails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl panel-card p-6 sm:p-8 bg-[var(--bg-card)] border-2 border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl space-y-6 text-center animate-fadeIn">
        {/* Friendly Top Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30 shadow-xs">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* User-Friendly Message */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] font-bold border border-[var(--border)]">
            Application Notice
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Something went unexpectedly
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
            We encountered a temporary hiccup while rendering this view. Don't worry, your account progress is safe.
          </p>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-sm cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reload Page</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn btn-secondary text-xs py-2 px-4 flex items-center gap-1.5 font-bold cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Go to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/interviews')}
            className="btn btn-secondary text-xs py-2 px-4 flex items-center gap-1.5 font-bold cursor-pointer"
          >
            <LifeBuoy className="w-3.5 h-3.5 text-purple-500" />
            <span>Interviews Hub</span>
          </button>
        </div>

        {/* Discrete Developer Debug Toggle */}
        <div className="pt-4 border-t border-[var(--border)] text-left">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="w-full flex items-center justify-between p-2 rounded hover:bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition text-xs font-mono cursor-pointer select-none"
          >
            <span className="flex items-center gap-1.5 font-bold">
              <Code2 className="w-3.5 h-3.5" />
              <span>Technical Details (for Developers)</span>
            </span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDetails && (
            <div className="mt-2.5 p-3.5 bg-[var(--bg-input)] rounded-lg border border-[var(--border)] font-mono text-[11px] space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <span className="text-rose-600 dark:text-rose-400 font-bold truncate">
                  {errorMessage}
                </span>
                <button
                  type="button"
                  onClick={handleCopyError}
                  className="px-2 py-0.5 rounded bg-[var(--bg-raised)] hover:bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy Trace'}</span>
                </button>
              </div>

              {errorStack && (
                <pre className="max-h-40 overflow-y-auto p-2 bg-[var(--bg-card)] rounded border border-[var(--border)] text-[10px] text-[var(--text-muted)] whitespace-pre-wrap break-all leading-tight">
                  {errorStack}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <RouteErrorBoundary />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
