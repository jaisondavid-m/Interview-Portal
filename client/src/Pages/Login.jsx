import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, User, AlertCircle, ShieldCheck, GraduationCap, Eye, EyeOff, Zap, Check, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  const [activeQuickLogging, setActiveQuickLogging] = useState(null);
  const [error, setError] = useState('');
  const [selectedQuick, setSelectedQuick] = useState(null);
  const [notice, setNotice] = useState('');
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedNotice = sessionStorage.getItem('logoutNotice');
    if (savedNotice) {
      setNotice(savedNotice);
      sessionStorage.removeItem('logoutNotice');
    }
  }, []);

  // If already authenticated, direct immediately to respective dashboard
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
      setError(err.message || 'Invalid credentials. Please contact your college administrator.');
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
      {/* Copy Section */}
      <div className="space-y-2">
        <span className="badge-kicker">Campus Portal Access</span>
        <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
          Sign In to MockMate
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          Access the internal student & admin mock interview system.
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="custom-form space-y-4">
        <label>
          <span>Email or College Roll No</span>
          <input
            type="text"
            required
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setSelectedQuick(null);
            }}
            placeholder="admin@bitsathy.ac.in or 22CS104"
            className="custom-input"
          />
        </label>

        <label>
          <div className="flex justify-between items-center">
            <span>Password</span>
          </div>
          <div className="relative">
            <input
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none transition-colors p-1"
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </label>

        <button 
          type="submit" 
          disabled={loading || !identifier.trim() || !password}
          className="btn btn-primary w-full py-2.5 mt-2"
        >
          <span>{loading && !activeQuickLogging ? 'Authenticating...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center justify-center pt-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative px-3 bg-[var(--bg-card)] text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
          Or Quick Demo Login
        </div>
      </div>

      {/* Quick Login Cards (Below Sign In button, Single Row of 4 on PC) */}
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
                disabled={loading}
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
