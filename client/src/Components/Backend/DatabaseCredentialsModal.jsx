import React, { useState, useEffect } from 'react';
import {
  Database,
  Copy,
  Check,
  X,
  Sparkles,
  Server,
  Code2,
  Terminal,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  ShieldCheck,
  Layers
} from 'lucide-react';
import api from '../../api/axios';

export default function DatabaseCredentialsModal({
  isOpen = false,
  onClose,
  sessionId = null,
  activeLang = 'go',
}) {
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [selectedSnippetLang, setSelectedSnippetLang] = useState(activeLang || 'go');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (activeLang) {
      const normalized = activeLang.toLowerCase();
      if (normalized.includes('go')) setSelectedSnippetLang('go');
      else if (normalized.includes('node') || normalized.includes('js') || normalized.includes('javascript')) setSelectedSnippetLang('node');
      else if (normalized.includes('py')) setSelectedSnippetLang('python');
      else if (normalized.includes('java')) setSelectedSnippetLang('java');
    }
  }, [activeLang]);

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchCredentials();
    }
  }, [isOpen, sessionId]);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/interviews/sessions/${sessionId}/database/credentials`);
      const data = res?.data?.data || res?.data || res;
      setCredentials(data);
    } catch (err) {
      console.error('Failed to fetch sandbox credentials', err);
      setError('Could not load database credentials. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleResetDatabase = async () => {
    if (!sessionId || isResetting) return;
    try {
      setIsResetting(true);
      setResetSuccess(false);
      await api.post(`/interviews/sessions/${sessionId}/database/reset`, {});
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
      fetchCredentials();
    } catch (err) {
      console.error('Failed to reset sandbox DB', err);
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOpen) return null;

  const host = credentials?.host || '127.0.0.1';
  const port = credentials?.port || '3306';
  const user = credentials?.user || 'root';
  const pass = credentials?.password || '';
  const dbName = credentials?.database || `mockmate_sandbox_${sessionId}`;
  const dsn = credentials?.dsn || `${user}:${pass}@tcp(${host}:${port})/${dbName}?parseTime=true`;

  const CODE_SNIPPETS = {
    go: `package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

func initDB() (*sql.DB, error) {
	// DSN is also auto-injected in DB_HOST, DB_USER, etc.
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		dsn = "${dsn}"
	}
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	return db, db.Ping()
}`,
    node: `const mysql = require('mysql2/promise');

async function getDBConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '${host}',
    port: Number(process.env.DB_PORT || ${port}),
    user: process.env.DB_USER || '${user}',
    password: process.env.DB_PASSWORD || '${pass}',
    database: process.env.DB_NAME || '${dbName}',
  });
  return connection;
}`,
    python: `import os
import pymysql

def get_db_connection():
    return pymysql.connect(
        host=os.environ.get('DB_HOST', '${host}'),
        port=int(os.environ.get('DB_PORT', ${port})),
        user=os.environ.get('DB_USER', '${user}'),
        password=os.environ.get('DB_PASSWORD', '${pass}'),
        database=os.environ.get('DB_NAME', '${dbName}'),
        cursorclass=pymysql.cursors.DictCursor
    )`,
    java: `import java.sql.Connection;
import java.sql.DriverManager;

public class DatabaseUtil {
    public static Connection getConnection() throws Exception {
        String url = "jdbc:mysql://${host}:${port}/${dbName}?useSSL=false&allowPublicKeyRetrieval=true";
        String user = "${user}";
        String password = "${pass}";
        return DriverManager.getConnection(url, user, password);
    }
}`
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[var(--bg-card)] border-2 border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[var(--bg-raised)] border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Isolated MySQL Database</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Live & Isolated
                </span>
              </h3>
              <p className="text-[11px] font-mono text-[var(--text-secondary)]">
                Dedicated sandbox instance for this session • Automatically wiped on Round 1 role switch
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              <span className="text-xs font-mono text-[var(--text-secondary)]">Connecting to sandbox database...</span>
            </div>
          ) : error ? (
            <div className="p-3.5 rounded-xl bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={fetchCredentials}
                className="btn btn-secondary text-[11px] py-1 px-2.5 font-bold cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Credentials Key-Value Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-secondary)] block">Host</span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-mono font-bold text-[var(--text-primary)] truncate">{host}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(host, 'host')}
                      className="p-1 hover:text-[var(--accent)] text-[var(--text-secondary)] cursor-pointer shrink-0"
                      title="Copy Host"
                    >
                      {copiedKey === 'host' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-secondary)] block">Port</span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-mono font-bold text-[var(--text-primary)]">{port}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(port, 'port')}
                      className="p-1 hover:text-[var(--accent)] text-[var(--text-secondary)] cursor-pointer shrink-0"
                      title="Copy Port"
                    >
                      {copiedKey === 'port' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-secondary)] block">User</span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-mono font-bold text-[var(--text-primary)]">{user}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(user, 'user')}
                      className="p-1 hover:text-[var(--accent)] text-[var(--text-secondary)] cursor-pointer shrink-0"
                      title="Copy User"
                    >
                      {copiedKey === 'user' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-secondary)] block">Password</span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-mono font-bold text-[var(--text-primary)]">{pass ? '••••••••' : '(Empty)'}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(pass, 'pass')}
                      className="p-1 hover:text-[var(--accent)] text-[var(--text-secondary)] cursor-pointer shrink-0"
                      title="Copy Password"
                    >
                      {copiedKey === 'pass' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Database Name Card */}
              <div className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-secondary)] block">Sandbox Database Name</span>
                  <span className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 select-all">
                    {dbName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(dbName, 'dbname')}
                  className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 font-bold cursor-pointer"
                >
                  {copiedKey === 'dbname' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'dbname' ? 'Copied' : 'Copy DB Name'}</span>
                </button>
              </div>

              {/* Full DSN Connection String */}
              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    <span>Formatted MySQL DSN URI</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(dsn, 'dsn')}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    {copiedKey === 'dsn' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'dsn' ? 'Copied URI' : 'Copy DSN URI'}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-primary)] break-all select-all">
                  {dsn}
                </div>
              </div>

              {/* Connection Snippet by Language */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Quick Starter Connection Snippet</span>
                  </span>

                  {/* Language Selector Pills */}
                  <div className="flex items-center gap-1 bg-[var(--bg-raised)] p-1 rounded-lg border border-[var(--border)]">
                    {['go', 'node', 'python', 'java'].map((langKey) => (
                      <button
                        key={langKey}
                        type="button"
                        onClick={() => setSelectedSnippetLang(langKey)}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase transition cursor-pointer ${
                          selectedSnippetLang === langKey
                            ? 'bg-[var(--accent)] text-white shadow-2xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {langKey === 'node' ? 'Node.js' : langKey}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-[#0d1117]">
                  <button
                    type="button"
                    onClick={() => handleCopy(CODE_SNIPPETS[selectedSnippetLang] || CODE_SNIPPETS.go, 'code_snippet')}
                    className="absolute top-2.5 right-2.5 z-10 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono flex items-center gap-1 transition cursor-pointer backdrop-blur-xs"
                  >
                    {copiedKey === 'code_snippet' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'code_snippet' ? 'Copied' : 'Copy Code'}</span>
                  </button>
                  <pre className="p-3.5 text-[11px] font-mono text-gray-200 overflow-x-auto leading-relaxed">
                    <code>{CODE_SNIPPETS[selectedSnippetLang] || CODE_SNIPPETS.go}</code>
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer: Reset Database & Close */}
        <div className="px-5 py-3 bg-[var(--bg-raised)] border-t border-[var(--border)] flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDatabase}
              disabled={isResetting || loading}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer text-[var(--red)] hover:border-[var(--red)]"
              title="Wipe and recreate clean database tables"
            >
              {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>{isResetting ? 'Resetting DB...' : 'Reset Sandbox DB'}</span>
            </button>
            {resetSuccess && (
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Database wiped & ready!
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary text-xs py-1.5 px-4 font-bold cursor-pointer bg-[var(--accent)] hover:bg-[#5c46b5] text-white border-none shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
