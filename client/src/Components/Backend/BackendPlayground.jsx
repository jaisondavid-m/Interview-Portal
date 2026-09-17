import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Server,
  Play,
  Send,
  Terminal,
  Clock,
  Sparkles,
  Package,
  Layers,
  Code2,
  Globe,
  Maximize2,
  Minimize2,
  BookOpen,
  Eye,
  X,
  Loader2,
  CheckCircle2,
  FileCode,
  RotateCcw,
  Copy,
  Check,
  Columns
} from 'lucide-react';
import CodeEditor from '../CodeEditor';
import PostmanWorkspace from './PostmanWorkspace';
import InstalledBackendLibrariesModal from './InstalledBackendLibrariesModal';

export default function BackendPlayground({
  code = '',
  onCodeChange,
  language = 'go',
  onLanguageChange,
  isEditable = true,
  candidateName = 'Candidate',
  question = null,
  payload = {},
  currentUserRole = 'interviewee',
  sessionId = null,
  round = 1,
  onRunCode,
  onSubmitCode,
  isRunning = false,
  isSubmitting = false,
  runResults = null,
  submissionResult = null,
  lastExecutionInfo = null,
}) {
  const [activeTab, setActiveTab] = useState('split'); // 'split' | 'code' | 'postman'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [showPackagesModal, setShowPackagesModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Server Log Streamer State
  const [serverLogs, setServerLogs] = useState([
    {
      id: 1,
      time: new Date().toLocaleTimeString(),
      type: 'INFO',
      method: 'SYSTEM',
      path: 'Microservice Sandbox Ready',
      status: 200,
      duration: '0ms',
      message: 'Server sandbox ready with pre-loaded modules.',
    },
  ]);

  const handleAddServerLog = (logEntry) => {
    setServerLogs((prev) => [logEntry, ...prev.slice(0, 49)]);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  // =========================================================================
  // 1. COMPACT ROOM LAUNCHER CARD (Rendered when NOT in full-screen mode)
  // =========================================================================
  if (!isFullscreen) {
    return (
      <div className="panel-card p-6 border-2 border-[var(--border)] bg-[var(--bg-card)] rounded-[var(--radius-lg)] shadow-md flex flex-col justify-between space-y-6 animate-fadeIn min-h-[460px]">
        {/* Modals */}
        <InstalledBackendLibrariesModal
          isOpen={showPackagesModal}
          onClose={() => setShowPackagesModal(false)}
          activeLang={language}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>Backend Studio</span>
                  <span className="text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-mono font-bold uppercase border border-purple-500/30">
                    Studio Mode
                  </span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  Microservice Server & Postman API Workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md font-mono text-[11px] font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="capitalize">{language} Runtime Live</span>
              </span>
            </div>
          </div>

          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            Access the complete backend engineering studio in full-screen mode to build RESTful microservice architectures, run live concurrent servers, and test endpoints interactively with the fully flexible <strong>Postman API Client</strong>.
          </p>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <Code2 className="w-4 h-4 text-purple-500" />
                <span>Multi-Language Server Editor</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Full-featured editor supporting Go, Python, Node.js, Java, and C++ with pre-loaded modules.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <Globe className="w-4 h-4 text-emerald-500" />
                <span>Full Postman API Tester</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Send GET, POST, PUT, DELETE requests with customizable query params, headers, auth, and JSON body.
              </p>
            </div>
          </div>

          {/* Sandbox & Status Info */}
          <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs font-mono flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Server className="w-3.5 h-3.5 text-purple-500" />
              <span>Runtime Port:</span>
              <strong className="text-purple-600 dark:text-purple-400">:8080 (http://localhost:8080)</strong>
            </div>
            <button
              type="button"
              onClick={() => setShowPackagesModal(true)}
              className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
            >
              <Package className="w-3 h-3" /> View Installed Libraries
            </button>
          </div>
        </div>

        {/* Action Dock */}
        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>Click below or press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)] text-[10px] font-bold text-[var(--text-primary)]">F</kbd> for full screen</span>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            title="Open Backend Studio in Full Screen (Shortcut: F)"
          >
            <Server className="w-4 h-4" />
            <span>Open Backend Studio</span>
            <Maximize2 className="w-3.5 h-3.5 opacity-80 ml-0.5" />
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. FULL-SCREEN BACKEND STUDIO (Split View, Code Editor Tab, Postman Tab)
  // =========================================================================
  return (
    <div className="fixed inset-0 z-50 rounded-none w-screen h-screen flex flex-col bg-[var(--bg-card)] border-none overflow-hidden transition-all">
      {/* Installed Libraries Modal */}
      <InstalledBackendLibrariesModal
        isOpen={showPackagesModal}
        onClose={() => setShowPackagesModal(false)}
        activeLang={language}
      />

      {/* Top Header Navigation */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-3 flex-wrap select-none shrink-0">
        {/* Left: View Mode Tabs Switcher */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25 text-xs font-mono font-bold">
            <Server className="w-3.5 h-3.5" />
            <span>Backend Studio</span>
          </div>

          <div className="flex items-center p-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('split')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'split'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code Editor</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('postman')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'postman'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Postman API Client</span>
            </button>
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowPackagesModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-purple-500 border border-[var(--border)] flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            title="View pre-installed frameworks and libraries"
          >
            <Package className="w-3.5 h-3.5 text-purple-500" />
            <span>Installed Libraries</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-600 text-white font-mono font-bold">
              Ready
            </span>
          </button>

          {/* Problem Specifications Drawer Button */}
          <button
            type="button"
            onClick={() => setShowRequirements(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-purple-500 border border-[var(--border)] flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            title="View problem prompt and endpoints specification"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-500" />
            <span>Requirements & Endpoints</span>
          </button>

          {/* Execution Controls for Candidate */}
          {isEditable ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onRunCode && onRunCode({ isCustom: false })}
                disabled={isRunning || isSubmitting}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold shadow-xs cursor-pointer"
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-purple-500" />
                )}
                <span>Run Server</span>
              </button>

              <button
                type="button"
                onClick={() => onSubmitCode && onSubmitCode()}
                disabled={isRunning || isSubmitting}
                className="btn btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 font-bold shadow-xs cursor-pointer bg-purple-600 hover:bg-purple-700 text-white border-none"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-white" />
                )}
                <span>Submit Solution</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Interviewer Live Observer</span>
            </div>
          )}

          {/* Minimize / Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border)] transition cursor-pointer"
            title="Exit Fullscreen (Esc or F)"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="flex-1 min-h-0 overflow-hidden p-2.5 bg-[var(--bg-body)]">
        {/* 1. SPLIT VIEW */}
        {activeTab === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 h-full min-h-0">
            {/* Left: Code Editor */}
            <div className="flex flex-col h-full rounded-xl overflow-hidden border border-[var(--border)] shadow-sm">
              <CodeEditor
                code={code}
                onChange={onCodeChange}
                language={language}
                onLanguageChange={onLanguageChange}
                isEditable={isEditable}
              />
            </div>

            {/* Right: Postman Workspace */}
            <div className="flex flex-col h-full min-h-0">
              <PostmanWorkspace
                serverLogs={serverLogs}
                onAddServerLog={handleAddServerLog}
                code={code}
                language={language}
                isEditable={isEditable}
                candidateName={candidateName}
              />
            </div>
          </div>
        )}

        {/* 2. DEDICATED FULL-WIDTH CODE EDITOR */}
        {activeTab === 'code' && (
          <div className="h-full rounded-xl overflow-hidden border border-[var(--border)] shadow-sm">
            <CodeEditor
              code={code}
              onChange={onCodeChange}
              language={language}
              onLanguageChange={onLanguageChange}
              isEditable={isEditable}
            />
          </div>
        )}

        {/* 3. DEDICATED FULL-WIDTH POSTMAN WORKSPACE */}
        {activeTab === 'postman' && (
          <div className="h-full min-h-0">
            <PostmanWorkspace
              serverLogs={serverLogs}
              onAddServerLog={handleAddServerLog}
              code={code}
              language={language}
              isEditable={isEditable}
              candidateName={candidateName}
            />
          </div>
        )}
      </div>

      {/* Slide-in Requirements & Endpoints Drawer */}
      {showRequirements && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setShowRequirements(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-lg bg-[var(--bg-card)] border-l border-[var(--border)] shadow-2xl h-full flex flex-col z-10 animate-slideLeft">
            <div className="p-4 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-500" />
                <h3 className="font-bold text-sm text-[var(--text-primary)] font-mono">
                  Microservice Requirements & Specs
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRequirements(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs leading-relaxed">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-muted)] block mb-1">
                  Question Title
                </span>
                <h4 className="text-base font-bold text-[var(--text-primary)]">
                  {question?.title || 'Backend Microservice Challenge'}
                </h4>
              </div>

              <div className="p-3.5 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)] space-y-1.5">
                <span className="text-[10px] font-mono uppercase font-bold text-purple-500 block">
                  Problem Prompt
                </span>
                <p className="text-[13px] text-[var(--text-primary)] whitespace-pre-line leading-relaxed">
                  {question?.prompt || 'Implement the backend API endpoints as described in the scenario.'}
                </p>
              </div>

              {payload?.scenario && (
                <div className="p-3.5 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-purple-500 block">
                    Scenario Context
                  </span>
                  <div className="text-[12px] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                    {payload.scenario}
                  </div>
                </div>
              )}

              {payload?.constraints && (
                <div className="p-3.5 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-muted)] block">
                    Endpoints & Limits
                  </span>
                  <div className="font-mono text-[11px] text-[var(--text-secondary)] whitespace-pre-line">
                    {payload.constraints}
                  </div>
                </div>
              )}

              {payload?.hints && payload.hints.length > 0 && (
                <div className="p-3.5 bg-purple-500/5 rounded-xl border border-purple-500/20 space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-purple-600 dark:text-purple-400 block">
                    Architecture Hints
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-[var(--text-secondary)]">
                    {payload.hints.map((hint, idx) => (
                      <li key={idx}>{hint}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-3.5 bg-[var(--bg-raised)] border-t border-[var(--border)] flex justify-end">
              <button
                type="button"
                onClick={() => setShowRequirements(false)}
                className="btn btn-secondary text-xs py-1.5 px-4 font-bold"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
