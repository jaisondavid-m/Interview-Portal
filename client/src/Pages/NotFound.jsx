import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

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
          The link you followed may be broken, or the page may have been removed.
        </p>
      </div>
      <div className="pt-2">
        <Link
          to="/"
          className="btn btn-primary text-xs py-2 px-4 shadow-[var(--shadow-sm)]"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
