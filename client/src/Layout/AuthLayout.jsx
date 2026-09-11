import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { APP_NAME } from '../utils/constants';

export default function AuthLayout() {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg)] p-6 relative overflow-hidden">
      {/* Ambient Radial Glows (Non-intrusive soft pastels) */}
      <div 
        className="absolute -top-48 -left-48 w-[600px] h-[600px] pointer-events-none rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(110, 86, 207, 0.08) 0%, transparent 65%)'
        }}
      />
      <div 
        className="absolute -bottom-48 -right-48 w-[600px] h-[600px] pointer-events-none rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(110, 86, 207, 0.06) 0%, transparent 65%)'
        }}
      />

      <div className="w-full max-w-[440px] relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 font-mono font-semibold text-[14px] text-[var(--accent)] tracking-[0.06em]">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
            <span className="font-bold">{APP_NAME}</span>
          </Link>
        </div>

        {/* Auth Card Container */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-xl)] p-8 sm:p-10 shadow-[var(--shadow-lg)] animate-slide-up">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
