import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layers,
  Database,
  Maximize2,
  Minimize2,
  BookOpen,
  Eye,
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
  Server
} from 'lucide-react';
import ERDiagramCanvas from './ERDiagramCanvas';
import SQLEditorConsole from './SQLEditorConsole';
import api from '../../api/axios';

export default function DatabasePlayground({
  code = '',
  onCodeChange = null,
  isEditable = true,
  candidateName = 'Candidate',
  question = null,
  payload = {},
  currentUserRole = 'interviewee',
  sessionId = null,
  round = 1,
}) {
  const [activeTab, setActiveTab] = useState('sql'); // 'sql' | 'er'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGuideDrawer, setShowGuideDrawer] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(true);
  const [provisionError, setProvisionError] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');

  // Track round & question changes to ensure clean transition
  const prevRoundRef = React.useRef(round);
  const prevQuestionIdRef = React.useRef(question?.id);

  // Parse combined state if code holds JSON of { diagram, sql, database }
  const parsedState = useMemo(() => {
    if (!code || typeof code !== 'string') return { diagram: null, sql: '', database: '' };
    try {
      if (code.startsWith('{') && (code.includes('"diagram"') || code.includes('"sql"'))) {
        const parsed = JSON.parse(code);
        return {
          diagram: parsed.diagram || null,
          sql: parsed.sql || '',
          database: parsed.database || '',
        };
      }
    } catch (e) {
      // Fallback
    }
    return { diagram: null, sql: code, database: '' };
  }, [code]);

  const [diagramState, setDiagramState] = useState(parsedState.diagram || { tables: [], relationships: [] });
  const [sqlState, setSqlState] = useState(parsedState.sql || payload?.starter_code || payload?.schema_ddl || '');

  // Reset local state when Round or Question changes (Round 1 -> Round 2 transition)
  useEffect(() => {
    if (prevRoundRef.current !== round || prevQuestionIdRef.current !== question?.id) {
      prevRoundRef.current = round;
      prevQuestionIdRef.current = question?.id;

      const freshStarter = payload?.schema_ddl || payload?.starter_code || '';
      setSqlState(freshStarter);
      setDiagramState({ tables: [], relationships: [] });
      setSelectedDatabase(`mockmate_sandbox_${sessionId || '1'}`);
      setDatabases([]);
    }
  }, [round, question?.id, payload, sessionId]);

  // Sync external changes
  useEffect(() => {
    if (parsedState.diagram) {
      setDiagramState(parsedState.diagram);
    }
    if (parsedState.sql !== undefined && parsedState.sql !== null) {
      setSqlState(parsedState.sql);
    }
    if (parsedState.database) {
      setSelectedDatabase(parsedState.database);
    }
  }, [parsedState]);

  // Combined change emitter
  const emitCombinedChange = useCallback((newDiagram, newSql, newDb) => {
    if (onCodeChange && isEditable) {
      const combined = JSON.stringify({
        diagram: newDiagram,
        sql: newSql,
        database: newDb || selectedDatabase,
      });
      onCodeChange(combined);
    }
  }, [onCodeChange, isEditable, selectedDatabase]);

  // Handler for real-time schema update returned from SQL execution or DB switch
  const handleSchemaUpdate = (newSchema, updatedDB, updatedDatabases) => {
    if (!newSchema) return;
    setDiagramState(newSchema);
    const dbToSet = updatedDB || newSchema.database || selectedDatabase;
    if (dbToSet) setSelectedDatabase(dbToSet);
    if (Array.isArray(updatedDatabases) && updatedDatabases.length > 0) {
      setDatabases(updatedDatabases);
    } else if (Array.isArray(newSchema.databases) && newSchema.databases.length > 0) {
      setDatabases(newSchema.databases);
    }
    emitCombinedChange(newSchema, sqlState, dbToSet);
  };

  const handleSqlChange = (newSql) => {
    setSqlState(newSql);
    emitCombinedChange(diagramState, newSql, selectedDatabase);
  };

  // Switch selected database and fetch its schema (candidate only)
  const handleSelectDatabase = async (newDb) => {
    if (!newDb || !sessionId || !isEditable) return;
    try {
      setSelectedDatabase(newDb);
      const res = await api.get(`/interviews/sessions/${sessionId}/database/schema?db=${encodeURIComponent(newDb)}`);
      const data = res?.data || res;
      if (data?.schema) {
        setDiagramState(data.schema);
        if (Array.isArray(data.databases)) setDatabases(data.databases);
        emitCombinedChange(data.schema, sqlState, newDb);
      }
    } catch (err) {
      console.warn('Switch database error:', err);
    }
  };

  // Sync table positions when candidate drags tables in ER diagram
  const handleTablePositionChange = (updatedTables) => {
    if (!isEditable) return;
    setDiagramState((prev) => {
      const updated = { ...prev, tables: updatedTables };
      emitCombinedChange(updated, sqlState, selectedDatabase);
      return updated;
    });
  };

  // Provision / Sync sandbox database on session load, round transition, or question change
  useEffect(() => {
    let isMounted = true;
    async function initSandbox() {
      if (!sessionId) {
        setIsProvisioning(false);
        return;
      }

      try {
        setIsProvisioning(true);
        setProvisionError(null);

        const schemaDDL = payload?.schema_ddl || payload?.starter_code || '';

        // Provision fresh sandbox database with new question starter DDL
        const provRes = await api.post(`/interviews/sessions/${sessionId}/database/provision`, {
          initial_ddl: schemaDDL,
          force_reset: round === 2,
        });
        const data = provRes?.data || provRes;
        if (isMounted) {
          if (data?.schema) {
            setDiagramState(data.schema);
          }
          if (data?.database) setSelectedDatabase(data.database);
          if (Array.isArray(data?.databases)) setDatabases(data.databases);
          setIsProvisioning(false);
        }
      } catch (err) {
        console.warn('Sandbox provision notice:', err);
        if (isMounted) {
          setProvisionError(err?.response?.data?.error || err?.message || 'Provisioning error');
          setIsProvisioning(false);
        }
      }
    }

    initSandbox();
    return () => {
      isMounted = false;
    };
  }, [sessionId, round, question?.id]);

  // Fullscreen keyboard handler
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
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const schemaDDL = payload?.schema_ddl || payload?.starter_code || '';

  // Compact Room View Launcher Card (When not in Fullscreen)
  if (!isFullscreen) {
    return (
      <div className="panel-card p-6 border-2 border-[var(--border)] bg-[var(--bg-card)] rounded-[var(--radius-lg)] shadow-md flex flex-col justify-between space-y-6 animate-fadeIn min-h-[460px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>Database Studio</span>
                  <span className="text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-mono font-bold uppercase border border-blue-500/30">
                    Studio Mode
                  </span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  MySQL 8.0 Sandbox & ER Diagram Workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md font-mono text-[11px] font-bold border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>MySQL 8.0 Live</span>
              </span>
            </div>
          </div>

          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            Access the complete database engineering studio in full-screen mode to write SQL queries, execute transactions against an isolated MySQL 8.0 sandbox, and visually inspect auto-generated Entity-Relationship (ER) diagrams.
          </p>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <Database className="w-4 h-4 text-blue-500" />
                <span>SQL Query Editor</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Full-featured editor with syntax highlighting, auto-complete, and query history.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Live ER Modeler</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Visual database schema graph automatically generated from your SQL table definitions.
              </p>
            </div>
          </div>

          {/* Sandbox & Status Info */}
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs font-mono flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Server className="w-3.5 h-3.5 text-blue-500" />
              <span>Target Database:</span>
              <strong className="text-blue-600 dark:text-blue-400">{selectedDatabase || `mockmate_sandbox_${sessionId || '1'}`}</strong>
            </div>
            {diagramState?.tables?.length > 0 && (
              <span className="text-[11px] text-[var(--text-muted)]">
                {diagramState.tables.length} schema {diagramState.tables.length === 1 ? 'table' : 'tables'} mapped
              </span>
            )}
          </div>
        </div>

        {/* Action Dock */}
        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Click below or press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)] text-[10px] font-bold text-[var(--text-primary)]">F</kbd> for full screen</span>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            title="Open Database Studio in Full Screen (Shortcut: F)"
          >
            <Database className="w-4 h-4" />
            <span>Open Database Studio</span>
            <Maximize2 className="w-3.5 h-3.5 opacity-80 ml-0.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 rounded-none w-screen h-screen flex flex-col bg-[var(--bg-card)] border-none overflow-hidden transition-all"
    >
      {/* Top Main Navigation Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-3 flex-wrap">
        {/* Left: View Mode Tabs (SQL Editor | ER Diagram) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('sql')}
              className={`px-3.5 py-1.5 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'sql'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>SQL Query Editor</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('er')}
              className={`px-3.5 py-1.5 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'er'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ER Diagram {diagramState?.tables?.length > 0 ? `(${diagramState.tables.length})` : ''}</span>
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
            title="View Database Requirements, Scenario, and Specs"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            <span>Specifications & Context</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-blue-700 transition cursor-pointer"
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

      {/* Main Workspace Area with Provisioning Guard */}
      <div className="flex-1 overflow-hidden relative">
        {isProvisioning ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-[var(--bg-card)] space-y-4 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 shadow-xl relative animate-pulse">
              <Server className="w-8 h-8" />
              <Loader2 className="w-4 h-4 animate-spin absolute -bottom-1 -right-1 text-cyan-400" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Provisioning Isolated MySQL Sandbox
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
                Starting your private, ephemeral MySQL database sandbox container for this interview session...
              </p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'sql' && (
              <div className="h-full">
                <SQLEditorConsole
                  code={sqlState}
                  onCodeChange={handleSqlChange}
                  isEditable={isEditable}
                  candidateName={candidateName}
                  sessionId={sessionId}
                  schemaDDL={schemaDDL}
                  schemaTree={diagramState?.tables || []}
                  databases={databases}
                  selectedDatabase={selectedDatabase}
                  onSelectDatabase={handleSelectDatabase}
                  onSchemaUpdate={handleSchemaUpdate}
                />
              </div>
            )}

            {activeTab === 'er' && (
              <div className="h-full">
                <ERDiagramCanvas
                  diagramData={diagramState}
                  isEditable={isEditable}
                  candidateName={candidateName}
                  databases={databases}
                  selectedDatabase={selectedDatabase}
                  onSelectDatabase={isEditable ? handleSelectDatabase : null}
                  onSwitchToSQL={() => setActiveTab('sql')}
                  onTablePositionChange={isEditable ? handleTablePositionChange : null}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* REQUIREMENTS & SCENARIO DRAWER (Slide-over) */}
      {showGuideDrawer && (
        <div 
          onClick={() => setShowGuideDrawer(false)}
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[var(--bg-card)] border-l border-[var(--border)] h-full p-6 space-y-5 overflow-y-auto shadow-2xl animate-slideLeft"
          >
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
