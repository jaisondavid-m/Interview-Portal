import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { APP_NAME } from '../utils/constants';

export default function Login() {
  const [collegeId, setCollegeId] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Set campus session token
    localStorage.setItem('token', 'campus-student-token-' + Date.now());
    navigate('/dashboard');
  };

  return (
    <div className="space-y-6">
      {/* Copy Section */}
      <div className="space-y-2">
        <span className="badge-kicker">Campus Access Only</span>
        <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
          Student Portal Login
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          Sign in with your College Roll Number or Institute Email to join peer mock interviews.
        </p>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="auth-tabs">
        <button type="button" className="active">
          Student Sign In
        </button>
        <button type="button" onClick={() => navigate('/register')}>
          Register
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="custom-form space-y-4">
        <label>
          <span>College Roll No / Institute Email</span>
          <input
            type="text"
            required
            value={collegeId}
            onChange={(e) => setCollegeId(e.target.value)}
            placeholder="22CS104 or student@college.edu"
            className="custom-input"
          />
        </label>

        <label>
          <div className="flex justify-between items-center">
            <span>Portal Password</span>
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
          <span>Enter Campus Portal</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center text-[12px] text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
        New to the campus portal?{' '}
        <Link to="/register" className="text-[var(--accent)] font-semibold hover:underline">
          Register student profile
        </Link>
      </div>
    </div>
  );
}
