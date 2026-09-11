import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('token', 'campus-student-token-' + Date.now());
    navigate('/dashboard');
  };

  return (
    <div className="space-y-6">
      {/* Copy Section */}
      <div className="space-y-2">
        <span className="badge-kicker">Internal Portal</span>
        <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight">
          Register Student Profile
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          Create your campus mock interview profile using your student credentials.
        </p>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="auth-tabs">
        <button type="button" onClick={() => navigate('/login')}>
          Student Sign In
        </button>
        <button type="button" className="active">
          Register
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="custom-form space-y-3.5">
        <label>
          <span>Full Name</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rahul Sharma"
            className="custom-input"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span>Roll / Reg No</span>
            <input
              type="text"
              required
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              placeholder="22CS104"
              className="custom-input"
            />
          </label>

          <label>
            <span>Department</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="custom-input bg-[var(--bg-input)]"
            >
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="AI&DS">AI & DS</option>
            </select>
          </label>
        </div>

        <label>
          <span>College / Institute Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rahul.22cs@college.edu"
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
          <span>Complete Registration</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="text-center text-[12px] text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
        Already registered on the portal?{' '}
        <Link to="/login" className="text-[var(--accent)] font-semibold hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
