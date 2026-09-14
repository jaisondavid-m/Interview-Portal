import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Info
} from 'lucide-react';

// Default starter DDL & Seed Data for new/unspecified questions
const DEFAULT_SCHEMA_DDL = `CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);`;

const DEFAULT_SEED_DATA = `INSERT INTO users (id, username, email) VALUES
(1, 'jaison_dev', 'jaison@example.com'),
(2, 'sarah_tech', 'sarah@example.com'),
(3, 'alex_code', 'alex@example.com'),
(4, 'priya_data', 'priya@example.com');

INSERT INTO orders (id, user_id, total_amount, status) VALUES
(101, 1, 150.00, 'COMPLETED'),
(102, 1, 85.50, 'COMPLETED'),
(103, 2, 340.00, 'PENDING'),
(104, 3, 49.99, 'SHIPPED'),
(105, 4, 1200.00, 'COMPLETED');`;

const DEFAULT_QUERY = `-- Write your SQL query below to solve the assessment
SELECT 
  u.id AS user_id,
  u.username,
  u.email,
  COUNT(o.id) AS total_orders,
  COALESCE(SUM(o.total_amount), 0) AS lifetime_spend
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username, u.email
ORDER BY lifetime_spend DESC;`;

export default function SQLEditorConsole({
  code = '',
  onCodeChange = null,
  isEditable = true,
  candidateName = 'Candidate',
  schemaDDL = '',
  seedData = '',
  onExecutionSync = null,
  lastExecution = null,
}) {
  const [queryCode, setQueryCode] = useState(code || DEFAULT_QUERY);
  const [activeTab, setActiveTab] = useState('results'); // 'results' | 'schema' | 'history'
  const [isRunning, setIsRunning] = useState(false);
  const [queryResults, setQueryResults] = useState(lastExecution?.results || null);
  const [errorMsg, setErrorMsg] = useState(lastExecution?.error || null);
  const [executionTimeMs, setExecutionTimeMs] = useState(lastExecution?.executionMs || 0);
  const [queryHistory, setQueryHistory] = useState([]);
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [schemaTree, setSchemaTree] = useState([]);
  const [expandedTables, setExpandedTables] = useState({});

  const sqlEngineRef = useRef(null);
  const sqlJsLoadedRef = useRef(false);

  // Sync external code changes when interviewer is observing
  useEffect(() => {
    if (code !== undefined && code !== null && code !== queryCode) {
      setQueryCode(code);
    }
  }, [code]);

  // Sync external execution result if interviewer receives update
  useEffect(() => {
    if (lastExecution) {
      if (lastExecution.results) setQueryResults(lastExecution.results);
      if (lastExecution.error !== undefined) setErrorMsg(lastExecution.error);
      if (lastExecution.executionMs) setExecutionTimeMs(lastExecution.executionMs);
    }
  }, [lastExecution]);

  // Load sql.js SQLite WASM engine in browser
  useEffect(() => {
    let isMounted = true;
    async function initSqlJs() {
      if (window.initSqlJs) {
        try {
          const SQL = await window.initSqlJs({
            locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`,
          });
          if (isMounted) {
            sqlEngineRef.current = new SQL.Database();
            loadInitialSchemaAndSeed();
            sqlJsLoadedRef.current = true;
          }
        } catch (e) {
          console.error('SQL.js initialization error:', e);
        }
        return;
      }

      // Dynamically load sql.js CDN script
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.js';
      script.async = true;
      script.onload = async () => {
        try {
          if (window.initSqlJs && isMounted) {
            const SQL = await window.initSqlJs({
              locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`,
            });
            if (isMounted) {
              sqlEngineRef.current = new SQL.Database();
              loadInitialSchemaAndSeed();
              sqlJsLoadedRef.current = true;
            }
          }
        } catch (err) {
          console.error('Error starting SQL.js:', err);
        }
      };
      document.body.appendChild(script);
    }

    initSqlJs();

    return () => {
      isMounted = false;
      if (sqlEngineRef.current) {
        try {
          sqlEngineRef.current.close();
        } catch (e) {}
      }
    };
  }, [schemaDDL, seedData]);

  // Populate Schema & Seed Data
  const loadInitialSchemaAndSeed = useCallback(() => {
    if (!sqlEngineRef.current) return;
    try {
      const ddl = schemaDDL?.trim() || DEFAULT_SCHEMA_DDL;
      const seed = seedData?.trim() || DEFAULT_SEED_DATA;

      sqlEngineRef.current.run(ddl);
      if (seed) {
        sqlEngineRef.current.run(seed);
      }

      // Build Schema Tree Explorer
      refreshSchemaTree();
    } catch (err) {
      console.warn('Initial schema load warning:', err.message);
    }
  }, [schemaDDL, seedData]);

  // Parse tables and columns for Schema Explorer
  const refreshSchemaTree = useCallback(() => {
    if (!sqlEngineRef.current) return;
    try {
      const res = sqlEngineRef.current.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
      if (res.length > 0 && res[0].values) {
        const tableNames = res[0].values.map((v) => v[0]);
        const tree = [];

        tableNames.forEach((tblName) => {
          const colRes = sqlEngineRef.current.exec(`PRAGMA table_info(${tblName});`);
          const countRes = sqlEngineRef.current.exec(`SELECT COUNT(*) FROM ${tblName};`);
          const rowCount = countRes[0]?.values[0]?.[0] || 0;

          const columns = [];
          if (colRes.length > 0 && colRes[0].values) {
            colRes[0].values.forEach((colRow) => {
              columns.push({
                name: colRow[1],
                type: colRow[2],
                notNull: colRow[3] === 1,
                isPk: colRow[5] === 1,
              });
            });
          }

          tree.push({
            name: tblName,
            columns,
            rowCount,
          });
        });

        setSchemaTree(tree);
        // Expand all by default
        const initExpand = {};
        tree.forEach((t) => (initExpand[t.name] = true));
        setExpandedTables(initExpand);
      }
    } catch (e) {
      console.error('Schema tree refresh failed:', e);
    }
  }, []);

  // Handle Code Changes
  const handleEditorChange = (val) => {
    setQueryCode(val);
    if (onCodeChange && isEditable) {
      onCodeChange(val);
    }
  };

  // Run SQL Query
  const handleExecuteQuery = useCallback(() => {
    if (!queryCode.trim()) return;
    setIsRunning(true);
    setErrorMsg(null);
    const startTime = performance.now();

    setTimeout(() => {
      try {
        if (!sqlEngineRef.current) {
          throw new Error('In-memory SQL engine is initializing. Please retry in a moment.');
        }

        // Clean queries (strip trailing comments / semicolons if needed)
        const execRes = sqlEngineRef.current.exec(queryCode.trim());
        const duration = Math.round(performance.now() - startTime);
        setExecutionTimeMs(duration);

        if (execRes.length > 0) {
          const lastResult = execRes[execRes.length - 1];
          const formatted = {
            columns: lastResult.columns || [],
            values: lastResult.values || [],
            rowCount: lastResult.values?.length || 0,
          };
          setQueryResults(formatted);
          setErrorMsg(null);

          // Add to query history
          setQueryHistory((prev) => [
            {
              id: Date.now(),
              query: queryCode.trim(),
              time: new Date().toLocaleTimeString(),
              rowCount: formatted.rowCount,
              duration,
              status: 'success',
            },
            ...prev.slice(0, 19),
          ]);

          // Notify interviewer sync
          if (onExecutionSync && isEditable) {
            onExecutionSync({
              results: formatted,
              error: null,
              executionMs: duration,
            });
          }
        } else {
          // Query succeeded without returning tabular rows (e.g. INSERT, UPDATE, DDL)
          const formatted = {
            columns: ['Status'],
            values: [['Query executed successfully. 0 rows returned.']],
            rowCount: 0,
          };
          setQueryResults(formatted);
          setErrorMsg(null);
          refreshSchemaTree();

          if (onExecutionSync && isEditable) {
            onExecutionSync({
              results: formatted,
              error: null,
              executionMs: duration,
            });
          }
        }
      } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        setExecutionTimeMs(duration);
        setErrorMsg(err.message || 'SQL Execution Error');
        setQueryResults(null);

        setQueryHistory((prev) => [
          {
            id: Date.now(),
            query: queryCode.trim(),
            time: new Date().toLocaleTimeString(),
            rowCount: 0,
            duration,
            status: 'error',
            error: err.message,
          },
          ...prev.slice(0, 19),
        ]);

        if (onExecutionSync && isEditable) {
          onExecutionSync({
            results: null,
            error: err.message,
            executionMs: duration,
          });
        }
      } finally {
        setIsRunning(false);
      }
    }, 50);
  }, [queryCode, onExecutionSync, isEditable, refreshSchemaTree]);

  // Reset database state back to seed
  const handleResetDatabase = () => {
    if (!window.initSqlJs) return;
    try {
      if (sqlEngineRef.current) {
        sqlEngineRef.current.close();
      }
      const SQL = window.SQL || (window.initSqlJs && sqlEngineRef.current?.constructor);
      if (SQL) {
        sqlEngineRef.current = new SQL.Database();
      }
      loadInitialSchemaAndSeed();
      setQueryResults(null);
      setErrorMsg(null);
    } catch (e) {
      console.warn('DB reset notice:', e);
    }
  };

  // Keyboard shortcut: Ctrl/Cmd + Enter to run query
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (isEditable) {
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

  return (
    <div onKeyDown={handleKeyDown} className="flex flex-col h-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden shadow-md">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/20 font-mono text-[11px]">
            <Database className="w-3.5 h-3.5" />
            <span>SQL Query Playground</span>
          </div>

          {!isEditable && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold border border-amber-500/20">
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
            {copiedQuery ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedQuery ? 'Copied' : 'Copy'}</span>
          </button>

          {isEditable && (
            <>
              <button
                type="button"
                onClick={handleResetDatabase}
                className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 cursor-pointer"
                title="Reset database tables and seed rows"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Seed</span>
              </button>

              <button
                type="button"
                onClick={handleExecuteQuery}
                disabled={isRunning}
                className="btn btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 font-bold shadow-md cursor-pointer bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-none"
                title="Execute SQL Query (Ctrl + Enter)"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
                <span>{isRunning ? 'Running...' : 'Run Query'}</span>
                <span className="text-[10px] opacity-70 font-mono hidden sm:inline">(Ctrl+↵)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Dual View: Left SQL Editor + Right/Bottom Schema Explorer & Results */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-[460px]">
        {/* SQL CODE EDITOR */}
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--border)] min-h-[220px]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-card)] border-b border-[var(--border)] text-[11px] font-mono text-[var(--text-muted)]">
            <span>Query Editor (SQLite Dialect)</span>
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
                className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
                  activeTab === 'results'
                    ? 'bg-[var(--bg-card)] text-cyan-600 dark:text-cyan-400 border border-[var(--border)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Results {queryResults ? `(${queryResults.rowCount})` : ''}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('schema')}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
                  activeTab === 'schema'
                    ? 'bg-[var(--bg-card)] text-cyan-600 dark:text-cyan-400 border border-[var(--border)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tables ({schemaTree.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-[var(--bg-card)] text-cyan-600 dark:text-cyan-400 border border-[var(--border)] shadow-xs'
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
                <Clock className="w-3 h-3 text-cyan-500" />
                <span>{executionTimeMs}ms</span>
              </div>
            )}
          </div>

          {/* Tab 1: TABULAR QUERY RESULTS */}
          {activeTab === 'results' && (
            <div className="flex-1 flex flex-col p-3 overflow-auto">
              {errorMsg ? (
                <div className="p-4 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-mono space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>SQL Error / Query Exception</span>
                  </div>
                  <pre className="whitespace-pre-wrap pl-6 text-[11px]">{errorMsg}</pre>
                </div>
              ) : queryResults ? (
                <div className="space-y-2 flex-1 flex flex-col">
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
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 text-[var(--text-muted)]">
                  <Database className="w-10 h-10 text-cyan-500/40" />
                  <div className="space-y-1">
                    <h4 className="text-[13px] font-bold text-[var(--text-primary)]">Ready for Execution</h4>
                    <p className="text-[11px] max-w-xs">
                      Write your SQL query on the left and click <strong>Run Query</strong> (or press Ctrl+Enter) to preview tabular output.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: SCHEMA & TABLES EXPLORER */}
          {activeTab === 'schema' && (
            <div className="flex-1 p-3 overflow-auto space-y-3">
              <div className="text-[11px] text-[var(--text-muted)]">
                Explore pre-seeded database tables, primary keys, and column data types:
              </div>

              {schemaTree.map((table) => {
                const isExpanded = expandedTables[table.name];
                return (
                  <div key={table.name} className="border border-[var(--border)] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--bg-raised)]/40">
                    <div
                      onClick={() => toggleTableExpand(table.name)}
                      className="flex items-center justify-between p-2.5 bg-[var(--bg-raised)] cursor-pointer hover:bg-[var(--bg-card)] transition font-mono"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-cyan-500" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                        <TableIcon className="w-4 h-4 text-cyan-500" />
                        <span className="font-bold text-xs text-[var(--text-primary)]">{table.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                          {table.rowCount} rows
                        </span>
                      </div>

                      {isEditable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQueryCode(`SELECT * FROM ${table.name} LIMIT 10;`);
                            if (onCodeChange) onCodeChange(`SELECT * FROM ${table.name} LIMIT 10;`);
                          }}
                          className="text-[10px] text-cyan-500 hover:underline"
                        >
                          SELECT *
                        </button>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="p-2 divide-y divide-[var(--border)] text-[11px] font-mono">
                        {table.columns.map((col, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1 px-2 hover:bg-[var(--bg-card)]">
                            <div className="flex items-center gap-1.5">
                              {col.isPk && (
                                <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-500 font-bold">
                                  PK
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
              })}
            </div>
          )}

          {/* Tab 3: QUERY HISTORY */}
          {activeTab === 'history' && (
            <div className="flex-1 p-3 overflow-auto space-y-2">
              {queryHistory.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic text-center py-8">
                  No previous queries executed in this session.
                </p>
              ) : (
                queryHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isEditable) {
                        setQueryCode(item.query);
                        if (onCodeChange) onCodeChange(item.query);
                      }
                    }}
                    className="p-2.5 rounded border border-[var(--border)] bg-[var(--bg-raised)]/40 hover:bg-[var(--bg-raised)] cursor-pointer transition font-mono text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-bold ${item.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                        {item.status === 'success' ? `✓ ${item.rowCount} rows (${item.duration}ms)` : '✗ Execution Error'}
                      </span>
                      <span className="text-[var(--text-muted)]">{item.time}</span>
                    </div>
                    <pre className="text-[11px] text-[var(--text-secondary)] truncate bg-[var(--bg-card)] p-1.5 rounded border border-[var(--border)]">
                      {item.query}
                    </pre>
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
