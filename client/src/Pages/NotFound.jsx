import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-4">
      <h1 className="font-mono text-7xl font-extrabold text-[var(--accent-glow)] tracking-tight">
        404
      </h1>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          Page Not Found
        </h2>
        <p className="text-[13px] text-[var(--text-secondary)] max-w-sm mx-auto">
          The requested campus page does not exist or you do not have permission to view it.
        </p>
      </div>
      <div className="pt-2">
        <Link
          to="/dashboard"
          className="btn btn-primary text-xs py-2 px-4 shadow-[var(--shadow-sm)]"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Go to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
