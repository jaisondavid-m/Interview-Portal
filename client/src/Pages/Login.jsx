import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('token', 'mock-auth-token-12345');
    navigate('/dashboard');
  };

  return (
    <div className="space-y-6">
      {/* Copy Section */}
      <div className="space-y-2">
        <span className="badge-kicker">Security Portal</span>
        <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
          Welcome back
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          Sign in to access your student dashboard and active voice sessions.
        </p>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="auth-tabs">
        <button type="button" className="active">
          Sign In
        </button>
        <button type="button" onClick={() => navigate('/register')}>
          Register
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="custom-form space-y-4">
        <label>
          <span>Email Address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@university.edu"
            className="custom-input"
          />
        </label>

        <label>
          <div className="flex justify-between items-center">
            <span>Password</span>
            <a href="#" className="font-ui text-[11px] text-[var(--accent)] hover:underline capitalize">
              Forgot?
            </a>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="custom-input"
          />
        </label>

        <button type="submit" className="btn btn-primary w-full py-2.5 mt-2">
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center text-[12px] text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
        Don't have an account?{' '}
        <Link to="/register" className="text-[var(--accent)] font-semibold hover:underline">
          Create one now
        </Link>
      </div>
    </div>
  );
}
