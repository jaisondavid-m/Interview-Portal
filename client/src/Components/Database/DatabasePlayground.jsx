import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Layers,
  Database,
  Columns,
  Maximize2,
  Minimize2,
  BookOpen,
  Info,
  Sparkles,
  Eye,
  CheckCircle2,
  HelpCircle,
  FileText,
  X,
  Code2,
  Key
} from 'lucide-react';
import ERDiagramCanvas from './ERDiagramCanvas';
import SQLEditorConsole from './SQLEditorConsole';

export default function DatabasePlayground({
  code = '',
  onCodeChange = null,
  isEditable = true,
  candidateName = 'Candidate',
  question = null,
  payload = {},
  currentUserRole = 'interviewee',
}) {
  const [activeView, setActiveView] = useState('split'); // 'er' | 'sql' | 'split'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGuideDrawer, setShowGuideDrawer] = useState(false);

  // Parse combined state from code string (holds JSON of { diagram, sql })
  const parsedState = useMemo(() => {
    if (!code || typeof code !== 'string') return { diagram: null, sql: '' };
    try {
      if (code.startsWith('{') && code.includes('"diagram"')) {
        const parsed = JSON.parse(code);
        return {
          diagram: parsed.diagram || null,
          sql: parsed.sql || '',
        };
      }
    } catch (e) {
      // Fallback: entire string is sql
    }
    return { diagram: null, sql: code };
  }, [code]);

  const [diagramState, setDiagramState] = useState(parsedState.diagram);
  const [sqlState, setSqlState] = useState(parsedState.sql);

  // Sync external changes (e.g. interviewer receiving stream updates)
  useEffect(() => {
    if (parsedState.diagram) {
      setDiagramState(parsedState.diagram);
    }
    if (parsedState.sql !== undefined) {
      setSqlState(parsedState.sql);
    }
  }, [parsedState]);

  // Combined change emitter
  const emitCombinedChange = (newDiagram, newSql) => {
    if (onCodeChange && isEditable) {
      const combined = JSON.stringify({
        diagram: newDiagram,
        sql: newSql,
      });
      onCodeChange(combined);
    }
  };

  const handleDiagramChange = (newDiagram) => {
    setDiagramState(newDiagram);
    emitCombinedChange(newDiagram, sqlState);
  };

  const handleSqlChange = (newSql) => {
    setSqlState(newSql);
    emitCombinedChange(diagramState, newSql);
  };

  const handleApplyDDLToSQL = (ddl) => {
    const updatedSQL = `${ddl}\n\n${sqlState}`;
    setSqlState(updatedSQL);
    emitCombinedChange(diagramState, updatedSQL);
    setActiveView('sql');
  };

  // Fullscreen keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const schemaDDL = payload?.schema_ddl || payload?.starter_code || '';
  const seedData = payload?.seed_data || '';

  return (
    <div
      className={`flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none w-screen h-screen'
          : 'h-[820px] shadow-lg'
      }`}
    >
      {/* Top Main Navigation Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-3 flex-wrap">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center p-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] shadow-xs">
            <button
              type="button"
              onClick={() => setActiveView('split')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeView === 'split'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('er')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeView === 'er'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ER Diagram</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('sql')}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeView === 'sql'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>SQL Query Editor</span>
            </button>
          </div>

          {/* Role Status Tag */}
          {!isEditable && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold border border-amber-500/20">
              <Eye className="w-3.5 h-3.5" />
              <span>Interviewer Live Observer</span>
            </div>
          )}
        </div>

        {/* Right: Requirements Drawer & Fullscreen Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGuideDrawer(true)}
            className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer"
            title="View Database Requirements, Scenario, and Schema specs"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            <span>Specifications & Context</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-2 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand to Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 overflow-hidden relative">
        {activeView === 'er' && (
          <div className="h-full">
            <ERDiagramCanvas
              diagramData={diagramState}
              onChange={handleDiagramChange}
              isEditable={isEditable}
              candidateName={candidateName}
              onApplyDDL={handleApplyDDLToSQL}
            />
          </div>
        )}

        {activeView === 'sql' && (
          <div className="h-full">
            <SQLEditorConsole
              code={sqlState}
              onCodeChange={handleSqlChange}
              isEditable={isEditable}
              candidateName={candidateName}
              schemaDDL={schemaDDL}
              seedData={seedData}
            />
          </div>
        )}

        {activeView === 'split' && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)] overflow-hidden">
            {/* Left Col: ER Diagram Canvas */}
            <div className="lg:col-span-6 h-full overflow-hidden">
              <ERDiagramCanvas
                diagramData={diagramState}
                onChange={handleDiagramChange}
                isEditable={isEditable}
                candidateName={candidateName}
                onApplyDDL={handleApplyDDLToSQL}
              />
            </div>

            {/* Right Col: SQL Query Runner */}
            <div className="lg:col-span-6 h-full overflow-hidden">
              <SQLEditorConsole
                code={sqlState}
                onCodeChange={handleSqlChange}
                isEditable={isEditable}
                candidateName={candidateName}
                schemaDDL={schemaDDL}
                seedData={seedData}
              />
            </div>
          </div>
        )}
      </div>

      {/* REQUIREMENTS & SCENARIO DRAWER (Slide-over) */}
      {showGuideDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-[var(--bg-card)] border-l border-[var(--border)] h-full p-6 space-y-5 overflow-y-auto shadow-2xl animate-slideLeft">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                  {question?.title || 'Database Assessment Benchmark'}
                </h3>
              </div>
              <button
                onClick={() => setShowGuideDrawer(false)}
                className="p-1.5 rounded hover:bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Problem Prompt */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block">
                Problem Description & Goals
              </span>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                {question?.prompt || 'Design the ER diagram schema and write the analytical SQL queries required for this assessment.'}
              </p>
            </div>

            {/* Scenario & Context */}
            {payload?.scenario && (
              <div className="p-3 bg-[var(--bg-raised)] rounded-[var(--radius-sm)] border border-[var(--border)] space-y-1">
                <span className="text-xs font-bold text-[var(--text-primary)] block">Domain Scenario Context:</span>
                <p className="text-[12px] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                  {payload.scenario}
                </p>
              </div>
            )}

            {/* Schema DDL Preview */}
            {schemaDDL && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-bold uppercase text-[var(--text-muted)] block">
                  Starter Schema DDL
                </span>
                <pre className="p-3 bg-slate-950 text-cyan-300 font-mono text-xs rounded border border-slate-800 overflow-x-auto">
                  {schemaDDL}
                </pre>
              </div>
            )}

            {/* Constraints */}
            {payload?.constraints && (
              <div className="space-y-1.5 font-mono text-xs">
                <span className="text-[11px] font-bold uppercase text-[var(--text-muted)] block">
                  Constraints & Requirements
                </span>
                <div className="p-3 bg-[var(--bg-raised)] rounded border border-[var(--border)] text-[var(--text-secondary)] whitespace-pre-line">
                  {payload.constraints}
                </div>
              </div>
            )}

            {/* Interviewer Only: Solution Query & Rubrics */}
            {currentUserRole === 'interviewer' && payload?.expected_approach && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-[var(--radius-md)] space-y-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Optimal Solution SQL Query (Assessor Benchmark)</span>
                </span>
                <pre className="text-xs font-mono text-emerald-700 dark:text-emerald-300 whitespace-pre-line bg-emerald-950/40 p-2.5 rounded">
                  {payload.expected_approach}
                </pre>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowGuideDrawer(false)}
                className="btn btn-primary w-full text-xs py-2 font-bold"
              >
                Close Specifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
