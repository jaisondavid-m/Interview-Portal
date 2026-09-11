import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
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
        <span className="badge-kicker">Student Network</span>
        <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
          Create Account
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          Join fellow engineering students practicing live 1-on-1 audio interviews.
        </p>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="auth-tabs">
        <button type="button" onClick={() => navigate('/login')}>
          Sign In
        </button>
        <button type="button" className="active">
          Register
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="custom-form space-y-4">
        <label>
          <span>Full Name</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Johnson"
            className="custom-input"
          />
        </label>

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
          <span>Create Password</span>
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
          <span>Create Account</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center text-[12px] text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
        Already registered?{' '}
        <Link to="/login" className="text-[var(--accent)] font-semibold hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
