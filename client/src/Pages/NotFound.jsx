import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-8xl font-black text-indigo-500/30">404</h1>
      <h2 className="text-2xl sm:text-3xl font-bold text-white mt-4">Page Not Found</h2>
      <p className="text-slate-400 max-w-md mt-2">
        The page you are looking for might have been moved, removed, or does not exist.
      </p>
      <div className="flex items-center space-x-4 mt-8">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg transition"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
