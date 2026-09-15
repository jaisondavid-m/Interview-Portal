import React, { useState } from 'react';
import {
  Package,
  Check,
  Copy,
  X,
  Search,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Code2
} from 'lucide-react';

export const INSTALLED_FRONTEND_PACKAGES = [
  {
    id: 'react',
    name: 'react',
    version: '18.2.0',
    category: 'Core Framework',
    description: 'Component engine with complete hook suite (useState, useEffect, useMemo, useRef, useCallback, useReducer, useContext, useId).',
    importExample: "import React, { useState, useEffect, useRef, useMemo } from 'react';",
    badgeColor: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
  },
  {
    id: 'react-dom',
    name: 'react-dom',
    version: '18.2.0',
    category: 'Core Framework',
    description: 'Concurrent React DOM root rendering engine for browser mounts.',
    importExample: "import ReactDOM from 'react-dom';",
    badgeColor: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
  },
  {
    id: 'tailwindcss',
    name: 'tailwindcss',
    version: '3.4.1',
    category: 'Styling',
    description: 'Full-featured utility-first CSS engine with flexbox, grid, gradients, arbitrary values, animations, and responsive breakpoints.',
    importExample: '<div className="flex items-center justify-between p-6 bg-slate-900 rounded-2xl shadow-xl border border-slate-800">',
    badgeColor: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  },
  {
    id: 'lucide-react',
    name: 'lucide-react',
    version: '0.344.0',
    category: 'Icons',
    description: 'Over 1,000 clean vector SVG icons with customizable size, strokeWidth, color, and className props.',
    importExample: "import { Sparkles, Heart, Search, Check, Plus, Trash2, Star, ChevronRight, ArrowLeft, User, Bell } from 'lucide-react';",
    badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  },
  {
    id: 'framer-motion',
    name: 'framer-motion',
    version: '10.16.4',
    category: 'Animation',
    description: 'Declarative animation and gesture library for React with motion components and AnimatePresence.',
    importExample: "import { motion, AnimatePresence } from 'framer-motion';\n<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} />",
    badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  },
  {
    id: 'lodash',
    name: 'lodash',
    version: '4.17.21',
    category: 'Utility',
    description: 'Utility library providing debounce, throttle, cloneDeep, groupBy, sortBy, uniq, range, and shuffle.',
    importExample: "import _ from 'lodash';\n// or: import { debounce, throttle, cloneDeep, groupBy } from 'lodash';",
    badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  },
  {
    id: 'axios',
    name: 'axios',
    version: '1.6.8',
    category: 'HTTP & Networking',
    description: 'Promise-based HTTP client for mocking and handling asynchronous REST API requests.',
    importExample: "import axios from 'axios';\nconst response = await axios.get('https://api.example.com/items');",
    badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  },
  {
    id: 'canvas-confetti',
    name: 'canvas-confetti',
    version: '1.9.2',
    category: 'Visual Effects',
    description: 'High performance canvas-based confetti and celebratory particle burst generator.',
    importExample: "import confetti from 'canvas-confetti';\nconfetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });",
    badgeColor: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
  },
  {
    id: 'clsx',
    name: 'clsx',
    version: '2.1.0',
    category: 'Utility',
    description: 'Fast utility for constructing conditional className strings based on state and props.',
    importExample: "import clsx from 'clsx';\nclassName={clsx('btn-base', isActive && 'btn-active', isError && 'border-red-500')}",
    badgeColor: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
  },
];

const CATEGORIES = ['All', 'Core Framework', 'Styling', 'Icons', 'Animation', 'Utility', 'HTTP & Networking', 'Visual Effects'];

export default function InstalledPackagesModal({ isOpen, onClose }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedId, setCopiedId] = useState(null);

  if (!isOpen) return null;

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredPackages = INSTALLED_FRONTEND_PACKAGES.filter((pkg) => {
    const matchesCategory = selectedCategory === 'All' || pkg.category === selectedCategory;
    const matchesSearch =
      pkg.name.toLowerCase().includes(search.toLowerCase()) ||
      pkg.description.toLowerCase().includes(search.toLowerCase()) ||
      pkg.category.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-500 shadow-sm">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Installed Packages & Dependencies
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 text-[11px] font-mono font-bold border border-cyan-500/30">
                  {INSTALLED_FRONTEND_PACKAGES.length} pre-installed
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                All packages are bundled and ready to import in your React component workspace.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="p-3.5 bg-[var(--bg-card)] border-b border-[var(--border)] space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search installed packages (e.g. lucide, framer-motion, lodash, tailwind)..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[var(--bg-raised)] border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md transition whitespace-nowrap cursor-pointer text-[11px] font-medium ${
                  selectedCategory === cat
                    ? 'bg-cyan-600 text-white font-bold shadow-xs'
                    : 'bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Packages List Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 bg-[var(--bg-raised)]/30">
          {filteredPackages.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)] space-y-2">
              <Package className="w-8 h-8 mx-auto text-cyan-500/30" />
              <p className="text-xs">No packages match your search criteria.</p>
            </div>
          ) : (
            filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-2.5 hover:border-cyan-500/40 transition"
              >
                {/* Card Header: Name, Version, Category, Status */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                      {pkg.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                      v{pkg.version}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${pkg.badgeColor}`}>
                      {pkg.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-500 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ready by default</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {pkg.description}
                </p>

                {/* Import Code Box with Copy Button */}
                <div className="relative group">
                  <pre className="p-2.5 bg-[#21252b] text-cyan-300 font-mono text-[11px] rounded-lg border border-[#303642] overflow-x-auto whitespace-pre-wrap">
                    {pkg.importExample}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy(pkg.id, pkg.importExample)}
                    className="absolute right-2 top-2 p-1.5 rounded-md bg-[#282c34] hover:bg-[#3e4451] text-gray-300 hover:text-white transition shadow-xs cursor-pointer flex items-center gap-1 text-[10px] font-mono"
                    title="Copy Import Statement"
                  >
                    {copiedId === pkg.id ? (
                      <>
                        <Check className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-[var(--bg-raised)] border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)] flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            <span>All packages are pre-loaded in browser memory without manual npm install.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary text-xs py-1.5 px-4 font-bold"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
