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

  return (
    <div
      className={`flex flex-col bg-[var(--bg-card)] transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-[60] w-screen h-screen bg-[var(--bg-card)] overflow-hidden shadow-2xl'
          : 'relative w-full h-[650px] rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden shadow-md'
      }`}
    >
      {/* ============================================================ */}
      {/* MAIN PLAYGROUND HEADER TOOLBAR */}
      {/* ============================================================ */}
      <div className="h-14 px-3 sm:px-4 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between gap-2.5 shrink-0 z-20 flex-wrap">
        {/* Left: Role & Mode Indicator + Tab Switcher + Packages Pill */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Status Badge */}
          {isEditable ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>React Frontend Editor</span>
              {isFullscreen && (
                <span className="text-[10px] bg-cyan-500 text-white px-1.5 py-0.2 rounded ml-1 uppercase font-semibold">
                  Fullscreen
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30 text-xs font-mono font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Observer • {candidateName}</span>
              {isFullscreen && (
                <span className="text-[10px] bg-[var(--green)] text-white px-1.5 py-0.2 rounded ml-1 uppercase font-semibold">
                  Fullscreen
                </span>
              )}
            </div>
          )}

          {/* View Mode Layout Switcher (Split, Code Only, Preview Only) */}
          <div className="flex items-center gap-1 bg-[var(--bg-card)] p-0.5 rounded-lg border border-[var(--border)] text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('split')}
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                activeTab === 'split'
                  ? 'bg-[var(--accent)] text-white font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-[var(--accent)] text-white font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Code
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[var(--accent)] text-white font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Live Preview
            </button>
          </div>

          {/* Installed Packages Button */}
          <button
            type="button"
            onClick={() => setShowPackagesModal(true)}
            className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-raised)] text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title="View all installed packages (Tailwind, Lucide, Framer Motion, Lodash, Axios, etc.)"
          >
            <Package className="w-3.5 h-3.5 text-cyan-500" />
            <span>Packages</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-500 font-bold border border-cyan-500/30">
              {INSTALLED_FRONTEND_PACKAGES.length}
            </span>
          </button>

          {/* Requirements & Challenge Drawer Toggle */}
          {question && (
            <button
              type="button"
              onClick={() => setShowRequirements((prev) => !prev)}
              className={`btn text-xs py-1 px-2.5 flex items-center gap-1.5 font-medium transition cursor-pointer ${
                showRequirements
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                  : 'btn-secondary text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="View Challenge Guidelines & Responsive Criteria"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Requirements</span>
            </button>
          )}
        </div>

        {/* Right Tools: Reset, Copy, and Fullscreen */}
        <div className="flex items-center gap-1.5 ml-auto text-xs">
          {isEditable && (
            <button
              type="button"
              onClick={handleResetCode}
              className="p-1.5 rounded-md hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
              title="Reset to Starter Code"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ml-1 border font-bold text-xs cursor-pointer shadow-xs ${
              isFullscreen
                ? 'bg-cyan-600 text-white border-cyan-600 shadow-md hover:opacity-90'
                : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] hover:border-cyan-500 hover:text-cyan-500'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Esc or F)' : 'Expand Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="font-mono">
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </span>
            <kbd className="hidden sm:inline-block text-[9px] font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 uppercase ml-0.5">
              {isFullscreen ? 'Esc' : 'F'}
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
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#21252b] border-b border-[#181a1f] text-xs font-mono">
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-0.5 rounded bg-[#282c34] text-cyan-400 border border-[#3e4451] flex items-center gap-1.5 font-bold">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>App.jsx</span>
                  </div>
                  <span className="text-gray-400 text-[10px] hidden sm:inline flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    React 18 • Tailwind • Lucide • Framer Motion • Lodash • Axios
                  </span>
                </div>
                {!isEditable && (
                  <span className="text-amber-400 text-[10px] bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
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
