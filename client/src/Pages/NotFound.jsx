import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowLeft } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center text-center px-4 py-8 space-y-4 animate-fadeIn font-sans">
      <div className="w-64 h-64 sm:w-80 sm:h-80 mx-auto flex items-center justify-center">
        <DotLottieReact
          src="/lotties/404.lottie"
          loop
          autoplay
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className="space-y-1.5 max-w-md mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
          Page Not Found
        </h2>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          The requested page could not be found, has been moved, or is unavailable.
        </p>
      </div>

      <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn btn-secondary text-xs py-2 px-4 shadow-xs flex items-center gap-1.5 font-mono cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go Back</span>
        </button>

        <Link
          to="/dashboard"
          className="btn btn-primary text-xs py-2 px-4 font-bold shadow-sm inline-flex items-center gap-1.5"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
