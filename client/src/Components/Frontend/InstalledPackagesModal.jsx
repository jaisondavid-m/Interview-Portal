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
    description: 'Component engine with complete hook suite (useState, useEffect, useMemo, useRef, useCallback, useReducer, useContext, createContext, useId, useTransition, useDeferredValue).',
    importExample: "import React, { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext } from 'react';",
    badgeColor: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]',
  },
  {
    id: 'react-dom',
    name: 'react-dom',
    version: '18.2.0',
    category: 'Core Framework',
    description: 'Concurrent React DOM root rendering engine for browser mounts.',
    importExample: "import ReactDOM from 'react-dom';",
    badgeColor: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]',
  },
  {
    id: 'tailwindcss',
    name: 'tailwindcss',
    version: '3.4.1',
    category: 'Styling',
    description: 'Full-featured utility-first CSS engine with flexbox, grid, gradients, arbitrary values, animations, and responsive breakpoints.',
    importExample: '<div className="flex items-center justify-between p-6 bg-white rounded-2xl shadow-xl border border-[var(--border)]">',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  {
    id: 'lucide-react',
    name: 'lucide-react',
    version: '0.344.0',
    category: 'Icons',
    description: 'Over 1,000 clean vector SVG icons with customizable size, strokeWidth, color, and className props.',
    importExample: "import { Sparkles, Heart, Search, Check, Plus, Trash2, Star, ChevronRight, ArrowLeft, User, Bell } from 'lucide-react';",
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  {
    id: 'chart.js',
    name: 'chart.js',
    version: '4.4.2',
    category: 'Data & Charts',
    description: 'Interactive HTML5 canvas data charting engine supporting Line, Bar, Pie, Doughnut, Radar, and Scatter charts for dashboards & telemetry.',
    importExample: "import { Chart } from 'chart.js';\nnew Chart(canvasRef.current, { type: 'line', data: { labels: ['Q1', 'Q2'], datasets: [{ data: [12, 19] }] } });",
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
  {
    id: 'zod',
    name: 'zod',
    version: '3.22.4',
    category: 'Validation',
    description: 'TypeScript-first schema declaration and validation library with nested object validation, custom refine rules, and error formatting.',
    importExample: "import { z } from 'zod';\nconst UserSchema = z.object({ email: z.string().email(), age: z.number().min(18) });\nconst result = UserSchema.safeParse(formData);",
    badgeColor: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  },
  {
    id: 'dayjs',
    name: 'dayjs',
    version: '1.11.10',
    category: 'Date & Time',
    description: 'Fast 2KB immutable date & time library with relative time formatting (e.g., "3 hours ago"), parsing, countdowns, and duration math.',
    importExample: "import dayjs from 'dayjs';\nconst formatted = dayjs().format('YYYY-MM-DD HH:mm:ss');\nconst fromNow = dayjs(timestamp).fromNow();",
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  {
    id: 'sortablejs',
    name: 'sortablejs',
    version: '1.15.2',
    category: 'Drag & Drop',
    description: 'Zero-dependency drag-and-drop library for reorderable Kanban boards, sortable lists, grids, and multi-column workflows.',
    importExample: "import Sortable from 'sortablejs';\nuseEffect(() => { Sortable.create(listRef.current, { animation: 150, onEnd: (evt) => handleReorder(evt) }); }, []);",
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  {
    id: 'framer-motion',
    name: 'framer-motion',
    version: '10.16.4',
    category: 'Animation',
    description: 'Declarative animation and gesture library for React with motion components and AnimatePresence.',
    importExample: "import { motion, AnimatePresence } from 'framer-motion';\n<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} />",
    badgeColor: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]',
  },
  {
    id: 'lodash',
    name: 'lodash',
    version: '4.17.21',
    category: 'Utility',
    description: 'Utility library providing debounce, throttle, cloneDeep, groupBy, sortBy, uniq, range, and shuffle.',
    importExample: "import _ from 'lodash';\n// or: import { debounce, throttle, cloneDeep, groupBy } from 'lodash';",
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  {
    id: 'marked',
    name: 'marked',
    version: '12.0.1',
    category: 'Markdown & Security',
    description: 'High-speed compiler for parsing markdown into HTML for real-time markdown editors and rich note apps.',
    importExample: "import { marked } from 'marked';\nconst htmlOutput = marked.parse('# Hello World');",
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  {
    id: 'dompurify',
    name: 'dompurify',
    version: '3.1.0',
    category: 'Markdown & Security',
    description: 'DOM-only, super-fast, ultra-tolerant XSS sanitizer for HTML to safely inject formatted content via dangerouslySetInnerHTML.',
    importExample: "import DOMPurify from 'dompurify';\nconst cleanHtml = DOMPurify.sanitize(dirtyHtml);\n<div dangerouslySetInnerHTML={{ __html: cleanHtml }} />",
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  {
    id: 'zustand',
    name: 'zustand (createStore)',
    version: '4.5.2',
    category: 'State Management',
    description: 'Lightweight reactive global state management hook creator without Context provider boilerplate, supporting actions & selectors.',
    importExample: "import { create } from 'zustand';\nconst useStore = create((set) => ({ count: 0, inc: () => set((s) => ({ count: s.count + 1 })) }));\nconst count = useStore((s) => s.count);",
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  {
    id: 'axios',
    name: 'axios',
    version: '1.6.8',
    category: 'HTTP & Networking',
    description: 'Promise-based HTTP client for mocking and handling asynchronous REST API requests.',
    importExample: "import axios from 'axios';\nconst response = await axios.get('https://api.example.com/items');",
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  {
    id: 'canvas-confetti',
    name: 'canvas-confetti',
    version: '1.9.2',
    category: 'Visual Effects',
    description: 'High performance canvas-based confetti and celebratory particle burst generator.',
    importExample: "import confetti from 'canvas-confetti';\nconfetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });",
    badgeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  },
  {
    id: 'clsx',
    name: 'clsx',
    version: '2.1.0',
    category: 'Utility',
    description: 'Fast utility for constructing conditional className strings based on state and props.',
    importExample: "import clsx from 'clsx';\nclassName={clsx('btn-base', isActive && 'btn-active', isError && 'border-red-500')}",
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
];

const CATEGORIES = [
  'All',
  'Core Framework',
  'Styling',
  'Icons',
  'Data & Charts',
  'Validation',
  'Date & Time',
  'Drag & Drop',
  'Animation',
  'Markdown & Security',
  'State Management',
  'Utility',
  'HTTP & Networking',
  'Visual Effects',
];

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
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scaleUp"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Installed Packages & Dependencies
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] text-[11px] font-mono font-bold border border-[var(--border-accent)]">
                  {INSTALLED_FRONTEND_PACKAGES.length} pre-installed
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                All packages are bundled and ready to import in your React component workspace.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
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
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-strong)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] transition font-medium"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg transition whitespace-nowrap cursor-pointer text-[11px] font-medium border ${
                  selectedCategory === cat
                    ? 'bg-[var(--accent)] text-white font-bold border-[var(--accent)] shadow-xs'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border-[var(--border)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Packages List Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 bg-[var(--bg)]">
          {filteredPackages.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)] space-y-2">
              <Package className="w-8 h-8 mx-auto text-[var(--text-muted)] opacity-40" />
              <p className="text-xs font-medium">No packages match your search criteria.</p>
            </div>
          ) : (
            filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs space-y-2.5 hover:border-[var(--border-accent)] hover:shadow-md transition"
              >
                {/* Card Header: Name, Version, Category, Status */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                      {pkg.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-secondary)] border border-[var(--border)] font-semibold">
                      v{pkg.version}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${pkg.badgeColor}`}>
                      {pkg.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--green)] font-bold">
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
                  <pre className="p-3 bg-[var(--bg-input)] text-[var(--text-primary)] font-mono text-[11px] rounded-lg border border-[var(--border-strong)] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {pkg.importExample}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy(pkg.id, pkg.importExample)}
                    className="absolute right-2 top-2 px-2.5 py-1 rounded-md bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition shadow-xs cursor-pointer flex items-center gap-1.5 text-[11px] font-mono font-bold"
                    title="Copy Import Statement"
                  >
                    {copiedId === pkg.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--green)]" />
                        <span className="text-[var(--green)]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
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
        <div className="p-4 bg-[var(--bg-raised)] border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--text-secondary)] flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <span>All packages are pre-loaded in browser memory without manual npm install.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary text-xs py-2 px-5 font-bold shadow-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
