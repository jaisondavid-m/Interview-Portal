import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, ShieldCheck, GraduationCap, Eye, EyeOff, Zap, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEFAULT_GOOGLE_CLIENT_ID = '956639761791-ihog9nl42s3og1b77u4t47mnb0pfo0op.apps.googleusercontent.com';

const QUICK_ACCOUNTS = [
  {
    title: 'Admin',
    email: 'admin@bitsathy.ac.in',
    password: 'password',
    icon: ShieldCheck,
    badgeStyle: 'text-[var(--accent)] bg-[var(--accent-dim)] border-[var(--border-accent)]',
    role: 'admin',
  },
  {
    title: 'Developer',
    email: 'developer@bitsathy.ac.in',
    password: 'password',
    icon: Terminal,
    badgeStyle: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    role: 'developer',
  },
  {
    title: 'Student 1',
    email: 'jaisondavidm.cs25@bitsathy.ac.in',
    password: 'password',
    icon: GraduationCap,
    badgeStyle: 'text-[var(--green)] bg-[var(--green-bg)] border-[var(--green)]/30',
    role: 'student',
  },
  {
    title: 'Student 2',
    email: 'jagaprasanths.cs25@bitsathy.ac.in',
    password: 'password',
    icon: GraduationCap,
    badgeStyle: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    role: 'student',
  },
];

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [activeQuickLogging, setActiveQuickLogging] = useState(null);
  const [error, setError] = useState('');
  const [selectedQuick, setSelectedQuick] = useState(null);
  const [notice, setNotice] = useState('');

  const tokenClientRef = useRef(null);
  const { user, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const savedNotice = sessionStorage.getItem('logoutNotice');
    if (savedNotice) {
      setNotice(savedNotice);
      sessionStorage.removeItem('logoutNotice');
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'developer') {
        navigate('/developer/audit-logs', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  // Initialize Google Identity Services OAuth token client
  useEffect(() => {
    const initGIS = () => {
      if (window.google?.accounts?.oauth2) {
        try {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: 'email profile openid',
            callback: async (tokenResponse) => {
              if (tokenResponse?.access_token) {
                await handleGoogleSuccess({ access_token: tokenResponse.access_token });
              } else if (tokenResponse?.error) {
                setError(tokenResponse.error_description || 'Google sign-in was cancelled or failed.');
                setGoogleLoading(false);
              }
            },
            error_callback: (err) => {
              console.error('Google OAuth Popup Error:', err);
              setError('Failed to open Google sign-in window. Please allow popups.');
              setGoogleLoading(false);
            },
          });
        } catch (err) {
          console.warn('Google OAuth TokenClient initialization warning:', err);
        }
      }
    };

    if (window.google?.accounts) {
      initGIS();
    } else {
      // Retry when script loads
      const interval = setInterval(() => {
        if (window.google?.accounts) {
          initGIS();
          clearInterval(interval);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [googleClientId]);

  // Handle Google Login response from backend
  const handleGoogleSuccess = async (payload) => {
    setError('');
    setGoogleLoading(true);
    try {
      const res = await loginWithGoogle(payload);
      if (res && res.success && res.user) {
        if (res.user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (res.user.role === 'developer') {
          navigate('/developer/audit-logs', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setError(res?.error || 'Google authentication failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Google authentication failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Trigger Google OAuth Popup
  const handleGoogleSignIn = () => {
    setError('');
    if (!tokenClientRef.current) {
      // If token client not ready yet, try to initialize directly
      if (window.google?.accounts?.oauth2) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse?.access_token) {
              await handleGoogleSuccess({ access_token: tokenResponse.access_token });
            }
          },
        });
      }
    }

    if (tokenClientRef.current) {
      setGoogleLoading(true);
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
    } else {
      setError('Google Sign-In service is loading. Please check your internet connection or try again.');
    }
  };

  const performAuth = async (loginIdentifier, loginPassword, quickAcc = null) => {
    setError('');
    setLoading(true);
    if (quickAcc) {
      setActiveQuickLogging(quickAcc.email);
    }

    try {
      const res = await login(loginIdentifier, loginPassword);

      if (res && res.success && res.user) {
        if (res.user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true });
        } else if (res.user.role === 'developer') {
          navigate('/developer/audit-logs', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setError(res?.error || 'Invalid email/roll number or password');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
      setActiveQuickLogging(null);
    }
  };

  const handleQuickLogin = (acc) => {
    setIdentifier(acc.email);
    setPassword(acc.password);
    setSelectedQuick(acc.email);
    performAuth(acc.email, acc.password, acc);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    performAuth(identifier, password);
  };

  return (
    <div className="space-y-6">
      {/* Header / Title */}
      <div className="space-y-1.5">
        <span className="badge-kicker">Campus Portal Access</span>
        <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
          Sign In to MockMate
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          Sign in using your Google Account or College Roll No / Email.
        </p>
      </div>

      {notice && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-[var(--radius-sm)] flex items-start gap-2.5 text-[12px] text-amber-700 dark:text-amber-300 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-[var(--radius-sm)] flex items-center gap-2.5 text-[12px] text-[var(--red)] font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form: Email or Roll Number + Password */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-identifier" className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-mono">
            Email or College Roll No
          </label>
          <input
            id="login-identifier"
            type="text"
            required
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setSelectedQuick(null);
            }}
            placeholder="e.g. 22CS104 or user@bitsathy.ac.in"
            className="custom-input w-full"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider font-mono">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="custom-input pr-10 w-full"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none transition-colors p-1 cursor-pointer"
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || googleLoading || !identifier.trim() || !password}
          className="btn btn-primary w-full py-2.5 mt-2"
        >
          <span>{loading && !activeQuickLogging ? 'Authenticating...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Google Sign-In Section (Light Theme) */}
      <div className="space-y-3">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative px-3 bg-[var(--bg-card)] text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Or Continue With
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className="w-full h-11 flex items-center justify-center gap-3 px-4 bg-white hover:bg-zinc-50 active:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 text-zinc-700 rounded-[var(--radius-sm)] font-semibold text-[14px] shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          {/* Official Google 'G' Logo */}
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span className="font-semibold text-zinc-800">
            {googleLoading ? 'Opening Google Sign-In...' : 'Sign in with Google'}
          </span>
        </button>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center pt-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative px-3 bg-[var(--bg-card)] text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
          Quick Demo Accounts
        </div>
      </div>

      {/* Quick Login Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-bold">
          <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Quick 1-Click Login</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {QUICK_ACCOUNTS.map((acc) => {
            const IconComponent = acc.icon;
            const isSelected = selectedQuick === acc.email || identifier === acc.email;
            const isLoggingIn = activeQuickLogging === acc.email;

            return (
              <button
                key={acc.email}
                type="button"
                disabled={loading || googleLoading}
                onClick={() => handleQuickLogin(acc)}
                className={`py-3 px-2 rounded-[var(--radius-sm)] border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  isSelected || isLoggingIn
                    ? 'border-[var(--accent)] bg-[var(--accent-dim)] shadow-[var(--shadow-sm)]'
                    : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-raised)]'
                }`}
                title={`Instant login as ${acc.title}`}
              >
                <div className={`p-1.5 rounded-full border ${acc.badgeStyle}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className="text-[12px] font-bold text-[var(--text-primary)] truncate max-w-full">
                  {isLoggingIn ? 'Logging in...' : acc.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
