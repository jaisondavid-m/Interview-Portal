import React, { useState, useEffect, useRef, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  Code2,
  Play,
  RotateCcw,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Sparkles,
  BookOpen,
  Layout,
  Layers,
  FileCode,
  X,
  Eye,
  Info,
  Package,
  CheckCircle2
} from 'lucide-react';
import FrontendLivePreview from './FrontendLivePreview';
import InstalledPackagesModal, { INSTALLED_FRONTEND_PACKAGES } from './InstalledPackagesModal';

const DEFAULT_STARTER_CODE = `export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Hello World</h1>
    </div>
  );
}`;

export default function FrontendPlayground({
  code = '',
  onCodeChange,
  isEditable = true,
  candidateName = 'Candidate',
  question = null,
  payload = null,
  currentUserRole = 'interviewee',
}) {
  const [activeTab, setActiveTab] = useState('split'); // 'split' | 'code' | 'preview'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [showPackagesModal, setShowPackagesModal] = useState(false);

  // Extract the admin-configured starter code from payload or question templates
  const adminStarterCode = useMemo(() => {
    return (
      payload?.starter_code ||
      question?.payload?.starter_code ||
      (Array.isArray(question?.templates) && question?.templates.find((t) => t.starter_code)?.starter_code) ||
      ''
    );
  }, [payload, question]);

  // If code is empty and editable, provide starter boilerplate (prioritizes admin starter code)
  useEffect(() => {
    if ((!code || !code.trim()) && isEditable && onCodeChange) {
      const initialStarter = adminStarterCode || DEFAULT_STARTER_CODE;
      onCodeChange(initialStarter);
    }
  }, [code, isEditable, onCodeChange, adminStarterCode]);

  const displayCode = typeof code === 'string' ? code : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetCode = () => {
    if (!isEditable) return;
    if (window.confirm('Reset code to starter boilerplate? All current changes will be overwritten.')) {
      const starter = adminStarterCode || DEFAULT_STARTER_CODE;
      onCodeChange(starter);
    }
  };

  // Keyboard shortcut (F / Esc for fullscreen)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          setIsFullscreen((prev) => !prev);
        }
      } else if (e.key === 'Escape') {
        if (showPackagesModal) {
          setShowPackagesModal(false);
        } else if (showRequirements) {
          setShowRequirements(false);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, showRequirements, showPackagesModal]);

  // Compact Room View Launcher Card (When not in Fullscreen)
  if (!isFullscreen) {
    return (
      <div className="panel-card p-6 border-2 border-[var(--border)] bg-[var(--bg-card)] rounded-[var(--radius-lg)] shadow-md flex flex-col justify-between space-y-6 animate-fadeIn min-h-[460px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] flex items-center justify-center shadow-xs">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>Frontend Studio</span>
                  <span className="text-[10px] bg-[var(--accent-dim)] text-[var(--accent)] px-2 py-0.5 rounded-full font-mono font-bold uppercase border border-[var(--border-accent)]">
                    Studio Mode
                  </span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  React 19 & Tailwind CSS Component Studio
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md font-mono text-[11px] font-bold border bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                <span>Live Hot Reload</span>
              </span>
            </div>
          </div>

          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            Build, iterate, and test modern React components in real-time with responsive viewport rendering across Mobile, Tablet, and Desktop screen sizes.
          </p>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <Code2 className="w-4 h-4 text-[var(--accent)]" />
                <span>Interactive JSX Editor</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Full ES6+ React editor with instant compilation and syntax highlight.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <Layout className="w-4 h-4 text-indigo-500" />
                <span>Responsive Viewports</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Live sandbox iframe preview with preset device breakpoints and console logs.
              </p>
            </div>
          </div>

          {/* Package Info */}
          <div className="p-3 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-accent)] text-xs font-mono flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Package className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Installed Packages:</span>
              <strong className="text-[var(--text-primary)]">TailwindCSS, Lucide, Framer Motion, Lodash</strong>
            </div>
            <button
              type="button"
              onClick={() => setShowPackagesModal(true)}
              className="text-[11px] text-[var(--accent)] font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View Packages ({INSTALLED_FRONTEND_PACKAGES.length})</span>
            </button>
          </div>
        </div>

        {/* Action Dock */}
        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Click below or press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)] text-[10px] font-bold text-[var(--text-primary)]">F</kbd> for full screen</span>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="btn btn-primary h-10 px-5 text-xs font-bold flex items-center gap-2 shadow-lg shadow-[var(--accent-glow)] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            title="Open Frontend Studio in Full Screen (Shortcut: F)"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Open Frontend Studio</span>
            <Maximize2 className="w-3.5 h-3.5 opacity-80 ml-0.5" />
          </button>
        </div>

        {/* Installed Packages Modal */}
        <InstalledPackagesModal
          isOpen={showPackagesModal}
          onClose={() => setShowPackagesModal(false)}
        />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] w-screen h-screen bg-[var(--bg-card)] overflow-hidden shadow-2xl flex flex-col transition-all duration-200"
    >
      {/* ============================================================ */}
      {/* MAIN PLAYGROUND HEADER TOOLBAR */}
      {/* ============================================================ */}
      <div className="h-14 px-4 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between gap-3 shrink-0 z-20 select-none overflow-x-auto">
        {/* Left Section: Studio Brand & Requirements */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Role Status Badge */}
          {isEditable ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] animate-pulse" />
              <span className="text-[var(--text-primary)]">Frontend</span>
              <span className="text-[10px] bg-[var(--accent-dim)] text-[var(--accent)] px-1.5 py-0.5 rounded font-bold uppercase border border-[var(--border-accent)]">
                Studio
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[var(--text-primary)]">Live Observer</span>
              <span className="text-[10px] bg-[var(--green-bg)] text-[var(--green)] px-1.5 py-0.5 rounded font-bold uppercase border border-[var(--green)]/30">
                {candidateName}
              </span>
            </div>
          )}

          {/* Requirements Drawer Toggle */}
          {question && (
            <button
              type="button"
              onClick={() => setShowRequirements((prev) => !prev)}
              className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border shadow-xs ${
                showRequirements
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
              }`}
              title="View Challenge Guidelines & Specifications"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Requirements</span>
              {payload?.scenario && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          )}
        </div>

        {/* Center Section: View Mode Segmented Switcher & Packages Dock */}
        <div className="flex items-center gap-1.5 bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border)] shadow-xs shrink-0">
          <div className="flex items-center p-0.5 bg-[var(--bg-raised)] rounded-md">
            <button
              type="button"
              onClick={() => setActiveTab('split')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                activeTab === 'split'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Code Only
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Live Preview
            </button>
          </div>

          <div className="w-[1px] h-4 bg-[var(--border)] mx-0.5" />

          {/* Installed Packages Button */}
          <button
            type="button"
            onClick={() => setShowPackagesModal(true)}
            className="h-7.5 px-2.5 rounded-md hover:bg-[var(--bg-raised)] text-[var(--accent)] text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="View pre-installed npm packages (Tailwind, Lucide, Framer Motion, Lodash, Axios...)"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Packages</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] font-bold border border-[var(--border-accent)]">
              {INSTALLED_FRONTEND_PACKAGES.length}
            </span>
          </button>
        </div>

        {/* Right Section: Code Actions & Exit Studio */}
        <div className="flex items-center gap-2 shrink-0">
          {isEditable && (
            <button
              type="button"
              onClick={handleResetCode}
              className="h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Reset to Starter Code"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title="Copy Code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[var(--green)]" />
                <span className="text-[var(--green)] font-bold hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>

          {/* Exit Studio Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="h-8 px-3 rounded-lg bg-[var(--accent)] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-95 transition cursor-pointer border border-[var(--accent)]"
            title="Exit Fullscreen Mode (Press Esc or F)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="font-mono">Exit Studio</span>
            <kbd className="hidden sm:inline-block text-[9px] font-mono px-1 py-0.2 rounded bg-black/20 uppercase ml-0.5">
              Esc
            </kbd>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* PLAYGROUND WORKSPACE: CODE EDITOR & LIVE PREVIEW PANELS */}
      {/* ============================================================ */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 h-full overflow-hidden">
          {/* LEFT PANE: CodeMirror JSX Editor */}
          {(activeTab === 'split' || activeTab === 'code') && (
            <div
              className={`flex flex-col h-full border-r border-[var(--border)] bg-[#282c34] overflow-hidden ${
                activeTab === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'
              }`}
            >
              {/* Editor Tab Header */}
              <div className="h-11 px-4 bg-[#1e2227] border-b border-[#181a1f] flex items-center justify-between text-xs font-mono shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="px-2.5 py-1 rounded-md bg-[#282c34] text-[var(--accent)] border border-[var(--accent)]/30 flex items-center gap-1.5 font-bold shadow-xs">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>App.jsx</span>
                  </div>
                  <span className="text-gray-400 text-[11px] hidden sm:flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live JSX • React 18</span>
                  </span>
                </div>
                {!isEditable && (
                  <span className="text-amber-400 text-[10px] bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-500/30 font-bold">
                    Live Observer View
                  </span>
                )}
              </div>

              {/* CodeMirror Workspace */}
              <div className="flex-1 overflow-auto relative">
                <CodeMirror
                  value={displayCode}
                  height="100%"
                  theme={oneDark}
                  extensions={[javascript({ jsx: true })]}
                  readOnly={!isEditable}
                  editable={isEditable}
                  onChange={(val) => onCodeChange && onCodeChange(val)}
                  placeholder="// Type your React component here..."
                  className="text-[13px] font-mono h-full"
                  basicSetup={{
                    lineNumbers: true,
                    highlightActiveLineGutter: true,
                    foldGutter: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                  }}
                />
              </div>
            </div>
          )}

          {/* RIGHT PANE: Sandboxed Live Responsive Preview */}
          {(activeTab === 'split' || activeTab === 'preview') && (
            <div
              className={`flex flex-col h-full bg-[var(--bg-card)] overflow-hidden ${
                activeTab === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'
              }`}
            >
              <FrontendLivePreview
                code={displayCode}
                candidateName={candidateName}
                isCandidate={isEditable}
                onOpenPackages={() => setShowPackagesModal(true)}
              />
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* SLIDE-OVER DRAWER FOR REQUIREMENTS & EVALUATION */}
        {/* ============================================================ */}
        {showRequirements && question && (
          <div className="w-80 md:w-96 bg-[var(--bg-card)] border-l border-[var(--border)] flex flex-col h-full shadow-2xl z-40 animate-in slide-in-from-right duration-200">
            <div className="p-4 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-500" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Frontend Challenge Criteria
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRequirements(false)}
                className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500">
                    {question.difficulty || 'Medium'}
                  </span>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">
                    React + Responsive
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  {question.title || 'Responsive Component Design'}
                </h4>
              </div>

              {/* Pre-installed Packages Quick Banner */}
              <div className="p-3 bg-[var(--bg-raised)] rounded-[var(--radius-sm)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Pre-Installed Packages ({INSTALLED_FRONTEND_PACKAGES.length}):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPackagesModal(true)}
                    className="text-[10px] text-cyan-500 font-bold hover:underline cursor-pointer"
                  >
                    View All →
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {INSTALLED_FRONTEND_PACKAGES.map((pkg) => (
                    <span
                      key={pkg.id}
                      className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[10px] font-mono text-[var(--text-secondary)]"
                    >
                      {pkg.name}
                    </span>
                  ))}
                </div>
              </div>

              {question.prompt && (
                <div className="text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                  {question.prompt}
                </div>
              )}

              {payload?.scenario && (
                <div className="p-3 bg-[var(--bg-raised)] rounded-[var(--radius-sm)] border border-[var(--border)] space-y-1">
                  <span className="font-bold text-[var(--text-primary)] block text-xs">
                    Design & Layout Requirements:
                  </span>
                  <div className="text-[11px] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                    {payload.scenario}
                  </div>
                </div>
              )}

              {payload?.constraints && (
                <div className="p-3 bg-[var(--bg-raised)] rounded-[var(--radius-sm)] border border-[var(--border)] font-mono text-[11px] space-y-1">
                  <span className="font-bold text-[var(--text-primary)] block">Responsive Breakpoints:</span>
                  <div className="text-[var(--text-muted)] whitespace-pre-line">
                    {payload.constraints}
                  </div>
                </div>
              )}

              {/* Evaluator Rubrics (Interviewer only) */}
              {currentUserRole === 'interviewer' && payload?.rubrics && (
                <div className="p-3 bg-cyan-500/10 rounded-[var(--radius-sm)] border border-cyan-500/30 space-y-1">
                  <span className="font-bold text-cyan-600 dark:text-cyan-400 block text-xs">
                    Evaluation Rubrics:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-[var(--text-secondary)]">
                    {payload.rubrics.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Installed Packages Modal */}
      <InstalledPackagesModal
        isOpen={showPackagesModal}
        onClose={() => setShowPackagesModal(false)}
      />
    </div>
  );
}
