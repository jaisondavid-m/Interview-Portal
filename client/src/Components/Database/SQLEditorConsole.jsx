import React, { useState, useEffect, useRef, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  Play,
  RotateCcw,
  Database,
  Table as TableIcon,
  Columns,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  Info,
  Loader2,
  RefreshCw,
  Search
} from 'lucide-react';
import api from '../../api/axios';
import SearchableSelect from '../SearchableSelect';

const DEFAULT_QUERY_STARTER = `-- Write your SQL statements below (CREATE TABLE, INSERT, SELECT, ALTER, etc.)
-- Executing queries will automatically update your database and ER Diagram in real-time.
`;

export default function SQLEditorConsole({
  code = '',
  onCodeChange = null,
  isEditable = true,
  candidateName = 'Candidate',
  sessionId = null,
  schemaDDL = '',
  schemaTree = [],
  databases = [],
  selectedDatabase = '',
  onSelectDatabase = null,
  onSchemaUpdate = null,
  onExecutionSync = null,
  lastExecution = null,
}) {
  const [queryCode, setQueryCode] = useState(code || schemaDDL || DEFAULT_QUERY_STARTER);
  const [activeTab, setActiveTab] = useState('results'); // 'results' | 'schema' | 'history'
  const [isRunning, setIsRunning] = useState(false);
  const [queryResults, setQueryResults] = useState(lastExecution?.results || null);
  const [errorMsg, setErrorMsg] = useState(lastExecution?.error || null);
  const [executionTimeMs, setExecutionTimeMs] = useState(lastExecution?.executionMs || 0);
  const [queryHistory, setQueryHistory] = useState([]);
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [expandedTables, setExpandedTables] = useState({});
  const [statusMessage, setStatusMessage] = useState(null);
  const [tableSearch, setTableSearch] = useState('');

  // Sync external code changes when interviewer is observing or when round/schema changes
  useEffect(() => {
    if (code !== undefined && code !== null && code !== queryCode) {
      setQueryCode(code);
      setQueryResults(null);
      setErrorMsg(null);
    }
  }, [code]);

  // Sync starter schema DDL when switching questions/rounds
  useEffect(() => {
    if (!code && schemaDDL && schemaDDL !== queryCode) {
      setQueryCode(schemaDDL);
      setQueryResults(null);
      setErrorMsg(null);
    }
  }, [schemaDDL]);

  // Sync external execution result if interviewer receives update
  useEffect(() => {
    if (lastExecution) {
      if (lastExecution.results) setQueryResults(lastExecution.results);
      if (lastExecution.error !== undefined) setErrorMsg(lastExecution.error);
      if (lastExecution.executionMs) setExecutionTimeMs(lastExecution.executionMs);
    }
  }, [lastExecution]);

  // Auto-expand tables in schema explorer
  useEffect(() => {
    if (schemaTree && schemaTree.length > 0) {
      const exp = {};
      schemaTree.forEach((t) => (exp[t.name] = true));
      setExpandedTables(exp);
    }
  }, [schemaTree]);

  // Handle Code Changes
  const handleEditorChange = (val) => {
    setQueryCode(val);
    if (onCodeChange && isEditable) {
      onCodeChange(val);
    }
  };

  // Run SQL Query against backend MySQL sandbox container
  const handleExecuteQuery = useCallback(async () => {
    const trimmed = queryCode.trim();
    if (!trimmed || !sessionId) return;
    setIsRunning(true);
    setErrorMsg(null);
    setStatusMessage(null);

    const startTime = performance.now();

    try {
      const res = await api.post(`/interviews/sessions/${sessionId}/database/execute`, {
        query: trimmed,
        database: selectedDatabase || undefined,
      });
      const data = res?.data || res;
      const duration = data?.execution_ms || data?.executionMs || Math.max(1, Math.round(performance.now() - startTime));
      setExecutionTimeMs(duration);

      // Notify parent of updated schema for the ER Diagram & database state
      if (data?.schema && onSchemaUpdate) {
        onSchemaUpdate(data.schema, data.database, data.databases);
      }

      if (data?.error || data?.success === false) {
        const errText = data?.error || 'Execution failed';
        setErrorMsg(errText);
        setQueryResults(null);
        setActiveTab('results');
        setQueryHistory((prev) => [
          {
            id: Date.now(),
            query: trimmed,
            time: new Date().toLocaleTimeString(),
            rowCount: 0,
            duration,
            status: 'error',
            error: errText,
          },
          ...prev.slice(0, 19),
        ]);
        if (onExecutionSync && isEditable) {
          onExecutionSync({ results: null, error: errText, executionMs: duration });
        }
      } else {
        const resResults = data?.results;
        const cols = resResults?.columns || data?.columns || [];
        const rows = resResults?.rows || data?.rows || [];
        const vals = resResults?.values || data?.values || (
          Array.isArray(rows) ? rows.map((r) => (Array.isArray(r) ? r : cols.map((c) => r[c]))) : []
        );
        const isQuery = resResults?.is_query || (cols.length > 0 && cols[0] !== 'Status');

        if (isQuery && cols.length > 0) {
          const rowCount = resResults?.row_count !== undefined ? resResults.row_count : vals.length;
          const formatted = {
            columns: cols,
            values: vals,
            rowCount,
          };
          setQueryResults(formatted);
          setErrorMsg(null);
          setStatusMessage(null);
          setActiveTab('results');

          setQueryHistory((prev) => [
            {
              id: Date.now(),
              query: trimmed,
              time: new Date().toLocaleTimeString(),
              rowCount,
              duration,
              status: 'success',
            },
            ...prev.slice(0, 19),
          ]);

          if (onExecutionSync && isEditable) {
            onExecutionSync({ results: formatted, error: null, executionMs: duration });
          }
        } else {
          // DDL / DML execution with affected rows
          const msg = resResults?.message || data?.message || 'Query executed successfully.';
          setStatusMessage(msg);
          const formatted = {
            columns: ['Status'],
            values: [[msg]],
            rowCount: 0,
            affectedRows: resResults?.affected_rows || 0,
          };
          setQueryResults(formatted);
          setErrorMsg(null);
          setActiveTab('results');

          setQueryHistory((prev) => [
            {
              id: Date.now(),
              query: trimmed,
              time: new Date().toLocaleTimeString(),
              rowCount: 0,
              affectedRows: resResults?.affected_rows || 0,
              duration,
              status: 'success',
            },
            ...prev.slice(0, 19),
          ]);

          if (onExecutionSync && isEditable) {
            onExecutionSync({ results: formatted, error: null, executionMs: duration });
          }
        }
      }
    } catch (err) {
      const duration = Math.max(1, Math.round(performance.now() - startTime));
      setExecutionTimeMs(duration);
      const errText = err?.response?.data?.error || err?.message || 'Execution failed';
      setErrorMsg(errText);
      setQueryResults(null);
      setActiveTab('results');

      setQueryHistory((prev) => [
        {
          id: Date.now(),
          query: trimmed,
          time: new Date().toLocaleTimeString(),
          rowCount: 0,
          duration,
          status: 'error',
          error: errText,
        },
        ...prev.slice(0, 19),
      ]);

      if (onExecutionSync && isEditable) {
        onExecutionSync({ results: null, error: errText, executionMs: duration });
      }
    } finally {
      setIsRunning(false);
    }
  }, [queryCode, sessionId, selectedDatabase, onSchemaUpdate, onExecutionSync, isEditable]);

  // Reset database sandbox by re-provisioning fresh schema
  const handleResetDatabase = async () => {
    if (!sessionId || !isEditable) return;
    try {
      setIsRunning(true);
      const res = await api.post(`/interviews/sessions/${sessionId}/database/reset`, {
        initial_ddl: schemaDDL,
      });
      const data = res?.data || res;
      if (data?.schema && onSchemaUpdate) {
        onSchemaUpdate(data.schema, data.database, data.databases);
      }
      setQueryResults(null);
      setErrorMsg(null);
      setQueryHistory([]);
      setStatusMessage('Database sandbox wiped and reset to clean state.');
    } catch (e) {
      console.warn('DB reset notice:', e);
    } finally {
      setIsRunning(false);
    }
  };

  // Keyboard shortcut: Ctrl/Cmd + Enter to run query
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (isEditable && !isRunning) {
        handleExecuteQuery();
      }
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(queryCode);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  const toggleTableExpand = (tableName) => {
    setExpandedTables((prev) => ({ ...prev, [tableName]: !prev[tableName] }));
  };

  const filteredTables = schemaTree.filter((t) =>
    t.name?.toLowerCase().includes(tableSearch.toLowerCase())
  );

  return (
    <div onKeyDown={handleKeyDown} className="flex flex-col h-full bg-[var(--bg-card)] rounded-[var(--radius-md)] overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-bold border border-[var(--border-accent)] font-mono text-[11px]">
            <Database className="w-3.5 h-3.5" />
            <span>MySQL 8.0 Sandbox</span>
          </div>

          {/* Database Selector Dropdown — candidate editable, interviewer read-only */}
          {isEditable && databases && databases.length > 0 && (
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <SearchableSelect
                label="DB:"
                options={databases.map((dbName) => ({
                  value: dbName,
                  label: dbName.startsWith('apiportal_sandbox_') ? `${dbName} (Default)` : dbName,
                }))}
                value={selectedDatabase}
                onChange={(val) => onSelectDatabase && onSelectDatabase(val)}
                menuWidth="w-60"
              />
            </div>
          )}

          {!isEditable && selectedDatabase && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] font-mono text-[11px]">
              <span className="text-[var(--text-muted)] font-bold text-[10px] uppercase">Active DB:</span>
              <span className="text-[var(--accent)] font-bold">
                {selectedDatabase.startsWith('apiportal_sandbox_') ? `${selectedDatabase} (Default)` : selectedDatabase}
              </span>
            </div>
          )}

          {!isEditable && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] text-[10px] font-mono font-bold border border-[var(--border-accent)]">
              <Info className="w-3 h-3" />
              <span>Observing {candidateName}'s Query Console (View-Only)</span>
            </div>
          )}
        </div>

        {/* Top Actions: Copy, Reset, Run Query */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 cursor-pointer"
            title="Copy SQL Query"
          >
            {copiedQuery ? <Check className="w-3.5 h-3.5 text-[var(--accent)]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedQuery ? 'Copied' : 'Copy'}</span>
          </button>

          {isEditable && (
            <>
              <button
                type="button"
                onClick={handleResetDatabase}
                disabled={isRunning}
                className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Reset database to empty fresh sandbox"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset DB</span>
              </button>

              <button
                type="button"
                onClick={handleExecuteQuery}
                disabled={isRunning}
                className="btn btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 font-bold shadow-md cursor-pointer bg-[var(--accent)] hover:opacity-90 text-white border-none disabled:opacity-50"
                title="Execute SQL Query in Sandbox (Ctrl + Enter)"
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{isRunning ? 'Executing...' : 'Run Query'}</span>
                <span className="text-[10px] opacity-70 font-mono hidden sm:inline">(Ctrl+↵)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Dual View: Left SQL Editor + Right/Bottom Schema Explorer & Results */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-[460px]">
        {/* SQL CODE EDITOR */}
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--border)] min-h-[260px]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-card)] border-b border-[var(--border)] text-[11px] font-mono text-[var(--text-muted)]">
            <span className="flex items-center gap-2">
              <span>Query Editor (MySQL 8.0)</span>
              {selectedDatabase && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-primary)] font-bold">
                  {selectedDatabase.startsWith('apiportal_sandbox_') ? 'default db' : selectedDatabase}
                </span>
              )}
            </span>
            <span>{queryCode.split('\n').length} lines</span>
          </div>

          <div className="flex-1 relative overflow-auto bg-[#282c34]">
            <CodeMirror
              value={queryCode}
              height="100%"
              theme={oneDark}
              editable={isEditable}
              onChange={handleEditorChange}
              className="text-[13px] font-mono"
            />
          </div>
        </div>

        {/* RESULTS & SCHEMA TABS PANEL */}
        <div className="flex-1 flex flex-col bg-[var(--bg-card)] overflow-hidden">
          {/* Navigation Tabs */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-raised)] border-b border-[var(--border)] text-xs">
            <div className="flex items-center gap-1 font-mono font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('results')}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'results'
                    ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>
                  Results {queryResults && queryResults.columns?.[0] !== 'Status' ? `(${queryResults.rowCount})` : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('schema')}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'schema'
                    ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tables ({schemaTree.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History ({queryHistory.length})</span>
              </button>
            </div>

            {/* Execution Telemetry Pill */}
            {executionTimeMs > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)]">
                <Clock className="w-3 h-3 text-[var(--accent)]" />
                <span>{executionTimeMs}ms</span>
              </div>
            )}
          </div>

          {/* Tab 1: TABULAR QUERY RESULTS */}
          {activeTab === 'results' && (
            <div className="flex-1 flex flex-col p-3 overflow-auto">
              {errorMsg ? (
                <div className="p-4 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red-border)] text-[var(--red)] text-xs font-mono space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>SQL Execution Error</span>
                  </div>
                  <pre className="whitespace-pre-wrap pl-6 text-[11px] leading-relaxed">{errorMsg}</pre>
                </div>
              ) : queryResults ? (
                <div className="space-y-2 flex-1 flex flex-col">
                  {queryResults.columns?.[0] === 'Status' ? (
                    <div className="p-4 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] text-xs font-mono space-y-1">
                      <div className="flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Execution Complete</span>
                      </div>
                      <p className="text-[12px] pl-6">{statusMessage || queryResults.values?.[0]?.[0] || 'Statements executed successfully.'}</p>
                      <div className="pl-6 pt-1 text-[11px] text-[var(--text-muted)]">Execution time: {executionTimeMs} ms</div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{queryResults.rowCount} rows returned</span>
                        </span>
                        <span>Execution: {executionTimeMs} ms</span>
                      </div>

                      {/* Rendered Data Grid */}
                      <div className="flex-1 overflow-auto border border-[var(--border)] rounded-[var(--radius-sm)] shadow-xs max-h-[380px]">
                        <table className="w-full text-left text-xs font-mono border-collapse">
                          <thead className="bg-[var(--bg-raised)] sticky top-0 border-b border-[var(--border)]">
                            <tr>
                              <th className="py-2 px-3 text-[10px] text-[var(--text-muted)] border-r border-[var(--border)] w-10 text-center">
                                #
                              </th>
                              {queryResults.columns.map((col, i) => (
                                <th key={i} className="py-2 px-3 text-[11px] font-bold text-[var(--text-primary)] border-r border-[var(--border)] last:border-r-0">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-card)]">
                            {queryResults.values.map((row, rowIdx) => (
                              <tr key={rowIdx} className="hover:bg-[var(--bg-raised)]/50 transition">
                                <td className="py-1.5 px-3 text-[10px] text-[var(--text-muted)] border-r border-[var(--border)] text-center">
                                  {rowIdx + 1}
                                </td>
                                {row.map((cell, colIdx) => (
                                  <td key={colIdx} className="py-1.5 px-3 text-[11px] text-[var(--text-secondary)] border-r border-[var(--border)] last:border-r-0 whitespace-nowrap">
                                    {cell === null ? (
                                      <span className="text-[var(--text-muted)] italic">NULL</span>
                                    ) : typeof cell === 'boolean' ? (
                                      <span className={cell ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{cell ? 'TRUE' : 'FALSE'}</span>
                                    ) : (
                                      String(cell)
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 text-[var(--text-muted)]">
                  <Database className="w-10 h-10 text-cyan-500/40" />
                  <div className="space-y-1">
                    <h4 className="text-[13px] font-bold text-[var(--text-primary)]">Ready for Execution</h4>
                    <p className="text-[11px] max-w-xs leading-relaxed">
                      Write your SQL queries on the left and click <strong>Run Query</strong> (or press Ctrl+Enter) to execute against your sandbox and preview tabular output.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: SCHEMA & TABLES EXPLORER */}
          {activeTab === 'schema' && (
            <div className="flex-1 p-3 overflow-auto space-y-3">
              {/* Database Context Filter & Search */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border)] text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  {databases && databases.length > 0 ? (
                    <SearchableSelect
                      label="Database:"
                      options={databases.map((db) => ({
                        value: db,
                        label: db.startsWith('apiportal_sandbox_') ? `${db} (Default)` : db,
                      }))}
                      value={selectedDatabase}
                      onChange={(val) => onSelectDatabase && onSelectDatabase(val)}
                      menuWidth="w-60"
                    />
                  ) : (
                    <span className="font-bold text-[var(--text-primary)]">{selectedDatabase || 'default'}</span>
                  )}
                </div>

                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search tables..."
                    className="pl-6 pr-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)] text-[11px] text-[var(--text-primary)] w-32 focus:w-44 transition-all focus:outline-none"
                  />
                </div>
              </div>

              {filteredTables.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10 space-y-2 text-[var(--text-muted)]">
                  <TableIcon className="w-8 h-8 text-[var(--accent)]/30" />
                  <p className="text-xs">No tables found in this database.</p>
                  <p className="text-[11px]">Run a <code>CREATE TABLE</code> query to define tables and see them listed here.</p>
                </div>
              ) : (
                filteredTables.map((table) => {
                  const isExpanded = expandedTables[table.name];
                  return (
                    <div key={table.name || table.id} className="border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--bg-raised)]/40">
                      <div
                        onClick={() => toggleTableExpand(table.name)}
                        className="flex items-center justify-between p-2.5 bg-[var(--bg-raised)] cursor-pointer hover:bg-[var(--bg-card)] transition font-mono"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[var(--accent)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                          <TableIcon className="w-4 h-4 text-[var(--accent)]" />
                          <span className="font-bold text-xs text-[var(--text-primary)]">{table.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                            {table.rowCount !== undefined ? table.rowCount : 0} rows
                          </span>
                        </div>

                        {isEditable && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newQ = `SELECT * FROM ${table.name} LIMIT 25;`;
                              setQueryCode(newQ);
                              if (onCodeChange) onCodeChange(newQ);
                            }}
                            className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer font-bold"
                          >
                            SELECT *
                          </button>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="p-2 divide-y divide-[var(--border)] text-[11px] font-mono">
                          {table.columns?.map((col, idx) => (
                            <div key={idx} className="flex items-center justify-between py-1 px-2 hover:bg-[var(--bg-card)]">
                              <div className="flex items-center gap-1.5">
                                {col.isPk && (
                                  <span className="text-[9px] px-1 rounded bg-[var(--accent)] text-white font-bold">
                                    PK
                                  </span>
                                )}
                                {col.isFk && (
                                  <span className="text-[9px] px-1 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-bold border border-[var(--border-accent)]">
                                    FK
                                  </span>
                                )}
                                <span className="font-bold text-[var(--text-primary)]">{col.name}</span>
                              </div>
                              <span className="text-[10px] text-[var(--text-muted)]">{col.type}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 3: QUERY HISTORY */}
          {activeTab === 'history' && (
            <div className="flex-1 p-3 overflow-auto space-y-2.5">
              {queryHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10 space-y-2 text-[var(--text-muted)]">
                  <History className="w-8 h-8 text-[var(--accent)]/30" />
                  <p className="text-xs">No queries executed yet.</p>
                </div>
              ) : (
                queryHistory.map((item) => (
                  <div key={item.id} className="p-2.5 bg-[var(--bg-raised)] rounded border border-[var(--border)] font-mono text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5">
                        {item.status === 'success' ? (
                          <span className="px-1.5 py-0.2 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] text-[10px] font-bold">
                            SUCCESS
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red-border)] text-[10px] font-bold">
                            ERROR
                          </span>
                        )}
                        <span className="text-[var(--text-muted)]">{item.time}</span>
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{item.duration}ms</span>
                    </div>

                    <pre className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-card)] p-2 rounded border border-[var(--border)] overflow-x-auto whitespace-pre-wrap max-h-20">
                      {item.query}
                    </pre>

                    {item.error && (
                      <p className="text-[11px] text-[var(--red)]">{item.error}</p>
                    )}

                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => {
                          setQueryCode(item.query);
                          if (onCodeChange) onCodeChange(item.query);
                        }}
                        className="text-[10px] text-[var(--accent)] hover:underline font-bold cursor-pointer"
                      >
                        Restore Query
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
