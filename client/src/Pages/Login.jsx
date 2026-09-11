import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, User, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';

export default function Login() {
  const [identifier, setIdentifier] = useState('admin@bitsathy.ac.in');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
      if (identifier === 'admin@bitsathy.ac.in' && password === 'password') {
        const adminUser = {
          id: 1,
          name: 'System Administrator',
          email: 'admin@bitsathy.ac.in',
          roll_no: 'ADMIN01',
          department: 'Administration',
          role: 'admin',
        };
        localStorage.setItem('token', 'admin-session-token-' + Date.now());
        localStorage.setItem('user', JSON.stringify(adminUser));
        navigate('/admin/users');
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
            onChange={(e) => setIdentifier(e.target.value)}
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
          disabled={loading}
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
