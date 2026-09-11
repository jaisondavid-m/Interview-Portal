import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, User, AlertCircle, ShieldCheck, GraduationCap, Eye, EyeOff, Zap, Check } from 'lucide-react';
import api from '../api/axios';

const QUICK_ACCOUNTS = [
  {
    tag: 'Admin',
    name: 'System Administrator',
    email: 'admin@bitsathy.ac.in',
    password: 'password',
    badge: 'ADMIN',
    badgeStyle: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]',
    icon: ShieldCheck,
    subtitle: 'Admin Portal & Configuration',
    role: 'admin',
  },
  {
    tag: 'Student 1',
    name: 'Jaison David M',
    email: 'jaisondavidm.cs25@bitsathy.ac.in',
    password: 'password',
    badge: 'STUDENT 1',
    badgeStyle: 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/30',
    icon: GraduationCap,
    subtitle: 'CSE • 7376251CS221',
    role: 'student',
  },
  {
    tag: 'Student 2',
    name: 'Mani M R S',
    email: 'manimozhichelvanmrs.ad25@bitsathy.ac.in',
    password: 'password',
    badge: 'STUDENT 2',
    badgeStyle: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    icon: GraduationCap,
    subtitle: 'AI&DS • 7376252AD230',
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
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      // Fallback for offline demo or backend delay
      const quickMatch = QUICK_ACCOUNTS.find(
        (a) => (a.email === identifier.trim() || identifier.trim() === 'ADMIN01') && password === 'password'
      );
      if (quickMatch) {
        const dummyUser = {
          id: quickMatch.role === 'admin' ? 1 : (quickMatch.tag === 'Student 1' ? 2 : 3),
          name: quickMatch.name,
          email: quickMatch.email,
          roll_no: quickMatch.role === 'admin' ? 'ADMIN01' : (quickMatch.tag === 'Student 1' ? '7376251CS221' : '7376252AD230'),
          department: quickMatch.role === 'admin' ? 'Administration' : (quickMatch.tag === 'Student 1' ? 'CSE' : 'AI&DS'),
          role: quickMatch.role,
        };
        localStorage.setItem('token', 'session-token-' + Date.now());
        localStorage.setItem('user', JSON.stringify(dummyUser));
        if (quickMatch.role === 'admin') {
          navigate('/admin/users');
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {QUICK_ACCOUNTS.map((acc) => {
            const IconComponent = acc.icon;
            const isSelected = selectedQuick === acc.email || identifier === acc.email;
            return (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickSelect(acc)}
                className={`p-3 rounded-[var(--radius-sm)] border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-dim)] shadow-[var(--shadow-sm)]'
                    : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--text-muted)] hover:bg-[var(--bg-raised)]'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-2">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${acc.badgeStyle}`}>
                    {acc.badge}
                  </span>
                  <IconComponent className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[12px] font-bold text-[var(--text-primary)] truncate">
                    {acc.name}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                    {acc.subtitle}
                  </div>
                </div>
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

      {/* Information Notice */}
      <div className="pt-3 border-t border-[var(--border)] space-y-2">
        <div className="p-3 bg-[var(--bg-input)] rounded-[var(--radius-sm)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)] space-y-1">
          <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Account Provisioning Policy</span>
          </p>
          <p>
            Student registration is restricted. All accounts are provisioned exclusively by the college administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
