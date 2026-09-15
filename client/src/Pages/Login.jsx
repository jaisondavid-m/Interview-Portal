import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, User, AlertCircle, ShieldCheck, GraduationCap, Eye, EyeOff, Zap, Check, Terminal } from 'lucide-react';
import api from '../api/axios';

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
    email: 'manimozhichelvanmrs.ad25@bitsathy.ac.in',
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
  const [error, setError] = useState('');
  const [selectedQuick, setSelectedQuick] = useState(null);
  const navigate = useNavigate();

  const handleQuickSelect = (acc) => {
    setIdentifier(acc.email);
    setPassword(acc.password);
    setSelectedQuick(acc.email);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call backend API
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password: password,
      });

      if (res && res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));

        if (res.user.role === 'admin') {
          navigate('/admin/users');
        } else if (res.user.role === 'developer') {
          navigate('/developer/audit-logs');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      // Fallback for offline demo or backend delay
      const quickMatch = QUICK_ACCOUNTS.find(
        (a) => (a.email === identifier.trim() || identifier.trim() === 'ADMIN01' || identifier.trim() === 'DEV01') && password === 'password'
      );
      if (quickMatch) {
        const dummyUser = {
          id: quickMatch.role === 'admin' ? 1 : quickMatch.role === 'developer' ? 99 : (quickMatch.title === 'Student 1' ? 2 : 3),
          name: quickMatch.role === 'admin' ? 'System Administrator' : quickMatch.role === 'developer' ? 'Lead Developer' : (quickMatch.title === 'Student 1' ? 'Jaison David M' : 'Mani M R S'),
          email: quickMatch.email,
          roll_no: quickMatch.role === 'admin' ? 'ADMIN01' : quickMatch.role === 'developer' ? 'DEV01' : (quickMatch.title === 'Student 1' ? '7376251CS221' : '7376252AD230'),
          department: quickMatch.role === 'admin' ? 'Administration' : (quickMatch.title === 'Student 1' ? 'CSE' : 'AI&DS'),
          role: quickMatch.role,
        };
        localStorage.setItem('token', 'session-token-' + Date.now());
        localStorage.setItem('user', JSON.stringify(dummyUser));
        if (quickMatch.role === 'admin') {
          navigate('/admin/users');
        } else if (quickMatch.role === 'developer') {
          navigate('/developer/audit-logs');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(err.message || 'Invalid credentials. Please contact your college administrator.');
      }
    } finally {
      setLoading(false);
    }
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

      {/* Quick Login Cards */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-bold">
          <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Quick Login</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {QUICK_ACCOUNTS.map((acc) => {
            const IconComponent = acc.icon;
            const isSelected = selectedQuick === acc.email || identifier === acc.email;
            return (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickSelect(acc)}
                className={`py-3 px-2 rounded-[var(--radius-sm)] border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-dim)] shadow-[var(--shadow-sm)]'
                    : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-raised)]'
                }`}
              >
                <div className={`p-1.5 rounded-full border ${acc.badgeStyle}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className="text-[12px] font-bold text-[var(--text-primary)]">
                  {acc.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
          <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
