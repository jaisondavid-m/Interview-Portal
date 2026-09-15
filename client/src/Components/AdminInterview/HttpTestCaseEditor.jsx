import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  Lock,
  Code2,
  CheckCircle2,
  Sliders,
  Send,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const HTTP_METHODS = [
  { value: 'GET', label: 'GET', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  { value: 'POST', label: 'POST', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  { value: 'PUT', label: 'PUT', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { value: 'PATCH', label: 'PATCH', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  { value: 'DELETE', label: 'DELETE', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
];

export function parseTestCaseToHttp(tc) {
  const rawInput = (tc.input || '').trim();
  const rawOutput = (tc.output || tc.expected_output || '').trim();

  // If already structured
  if (tc.http_method || tc.path) {
    return {
      http_method: (tc.http_method || 'GET').toUpperCase(),
      path: tc.path || '/',
      input_body: tc.input_body || '',
      expected_status: tc.expected_status || 200,
      expected_body: tc.expected_body || '',
      input: tc.input || '',
      output: tc.output || '',
    };
  }

  // 1. Check if rawInput is JSON { method, path, body }
  if (rawInput.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawInput);
      if (parsed.method || parsed.path) {
        let expStatus = 200;
        let expBody = rawOutput;
        if (rawOutput.startsWith('{')) {
          try {
            const outP = JSON.parse(rawOutput);
            if (outP.status !== undefined) {
              expStatus = outP.status;
              expBody = typeof outP.body === 'object' ? JSON.stringify(outP.body, null, 2) : String(outP.body || '');
            }
          } catch (e) {}
        } else if (/^\d{3}\b/.test(rawOutput)) {
          expStatus = parseInt(rawOutput.substring(0, 3), 10);
          expBody = rawOutput.substring(3).trim();
        }
        return {
          http_method: (parsed.method || 'GET').toUpperCase(),
          path: parsed.path || '/',
          input_body: typeof parsed.body === 'object' ? JSON.stringify(parsed.body, null, 2) : (parsed.body || ''),
          expected_status: expStatus,
          expected_body: expBody,
          input: rawInput,
          output: rawOutput,
        };
      }
    } catch (e) {}
  }

  // 2. Check if rawInput is METHOD /path [json_body]
  const match = rawInput.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([^\s]+)(?:\s+([\s\S]*))?$/i);
  if (match) {
    const method = match[1].toUpperCase();
    const path = match[2];
    const bodyStr = (match[3] || '').trim();

    let expStatus = 200;
    let expBody = rawOutput;
    if (/^\d{3}\b/.test(rawOutput)) {
      expStatus = parseInt(rawOutput.substring(0, 3), 10);
      expBody = rawOutput.substring(3).trim();
    }

    return {
      http_method: method,
      path,
      input_body: bodyStr,
      expected_status: expStatus,
      expected_body: expBody,
      input: rawInput,
      output: rawOutput,
    };
  }

  // Standard fallback
  return {
    http_method: 'POST',
    path: '/api',
    input_body: rawInput,
    expected_status: 200,
    expected_body: rawOutput,
    input: rawInput,
    output: rawOutput,
  };
}

export function compileHttpTestCase(httpTC) {
  const method = (httpTC.http_method || 'GET').toUpperCase();
  const path = (httpTC.path || '/').trim() || '/';
  const inputBody = (httpTC.input_body || '').trim();
  const status = httpTC.expected_status || 200;
  const expectedBody = (httpTC.expected_body || '').trim();

  // Standard backend input format: METHOD /path [JSON]
  const input = inputBody ? `${method} ${path} ${inputBody}` : `${method} ${path}`;
  const output = expectedBody ? `${status} ${expectedBody}` : `${status}`;

  return {
    ...httpTC,
    http_method: method,
    path,
    input_body: inputBody,
    expected_status: status,
    expected_body: expectedBody,
    input,
    output,
  };
}

export default function HttpTestCaseEditor({
  testCases = [],
  onChange,
  isHidden = false,
  title = 'Test Cases',
}) {
  const [viewMode, setViewMode] = useState('http'); // 'http' | 'raw'

  const handleAdd = () => {
    const defaultNew = {
      http_method: 'POST',
      path: '/tasks',
      input_body: '{\n  "title": "Build API"\n}',
      expected_status: 201,
      expected_body: '{\n  "id": 2,\n  "title": "Build API",\n  "completed": false\n}',
    };
    const compiled = compileHttpTestCase(defaultNew);
    onChange([...testCases, compiled]);
  };

  const handleRemove = (idx) => {
    onChange(testCases.filter((_, i) => i !== idx));
  };

  const handleHttpFieldChange = (idx, field, val) => {
    const current = parseTestCaseToHttp(testCases[idx] || {});
    current[field] = val;
    const compiled = compileHttpTestCase(current);
    const updated = [...testCases];
    updated[idx] = compiled;
    onChange(updated);
  };

  const handleRawChange = (idx, field, val) => {
    const updated = [...testCases];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange(updated);
  };

  return (
    <div className={`p-4 rounded-xl border space-y-4 ${
      isHidden
        ? 'bg-amber-500/5 border-amber-500/20'
        : 'bg-[var(--bg-raised)]/60 border-[var(--border)]'
    }`}>
      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isHidden ? (
            <Lock className="w-4 h-4 text-amber-500" />
          ) : (
            <Globe className="w-4 h-4 text-cyan-500" />
          )}
          <div>
            <h4 className="text-xs font-bold font-mono uppercase text-[var(--text-primary)]">
              {title} ({testCases.length})
            </h4>
            <p className="text-[11px] text-[var(--text-muted)]">
              {isHidden
                ? 'Private grading suite executed on final submission.'
                : 'Visible to candidates in problem statement & runner console.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle: Structured HTTP vs Raw */}
          <div className="flex items-center p-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setViewMode('http')}
              className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                viewMode === 'http'
                  ? 'bg-cyan-600 text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              HTTP REST UI
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                viewMode === 'raw'
                  ? 'bg-cyan-600 text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Raw I/O
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className={`btn text-xs py-1 px-2.5 flex items-center gap-1 font-mono font-bold cursor-pointer ${
              isHidden ? 'btn-secondary text-amber-500' : 'btn-secondary text-cyan-500'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Endpoint</span>
          </button>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="space-y-3">
        {testCases.map((tc, idx) => {
          const httpTC = parseTestCaseToHttp(tc);
          const methodMeta = HTTP_METHODS.find((m) => m.value === httpTC.http_method) || HTTP_METHODS[0];

          return (
            <div
              key={idx}
              className="p-3.5 bg-[var(--bg-card)] rounded-lg border border-[var(--border)] shadow-xs space-y-3 font-mono text-xs"
            >
              {/* Row Header: Case #, Method + Path summary, and Remove */}
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-muted)]">
                    #{idx + 1}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${methodMeta.color}`}>
                    {httpTC.http_method}
                  </span>
                  <span className="text-[12px] font-bold text-[var(--text-primary)]">
                    {httpTC.path}
                  </span>
                  <span className="text-[11px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    → {httpTC.expected_status}
                  </span>
                </div>

                {testCases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1 text-[var(--text-muted)] hover:text-red-500 transition cursor-pointer"
                    title="Remove Test Case"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {viewMode === 'http' ? (
                /* STRUCTURED HTTP API VIEW */
                <div className="space-y-3">
                  {/* Top Line: Method Dropdown, Path input, Expected Status input */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Method Dropdown */}
                    <div className="sm:col-span-3">
                      <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                        HTTP Method
                      </label>
                      <select
                        value={httpTC.http_method}
                        onChange={(e) => handleHttpFieldChange(idx, 'http_method', e.target.value)}
                        className="w-full custom-input text-xs font-bold py-1.5 cursor-pointer bg-[var(--bg-raised)]"
                      >
                        {HTTP_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Endpoint / Path */}
                    <div className="sm:col-span-6">
                      <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                        Endpoint Path
                      </label>
                      <input
                        type="text"
                        value={httpTC.path}
                        onChange={(e) => handleHttpFieldChange(idx, 'path', e.target.value)}
                        placeholder="e.g. /tasks, /tasks/1, /users/search"
                        className="w-full custom-input text-xs font-mono py-1.5 bg-[var(--bg-raised)]"
                      />
                    </div>

                    {/* Expected Status Code */}
                    <div className="sm:col-span-3">
                      <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                        Expected Status
                      </label>
                      <input
                        type="number"
                        value={httpTC.expected_status}
                        onChange={(e) => handleHttpFieldChange(idx, 'expected_status', parseInt(e.target.value, 10) || 200)}
                        placeholder="200, 201, 404"
                        className="w-full custom-input text-xs font-bold font-mono py-1.5 bg-[var(--bg-raised)] text-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Body Inputs: Request Body (JSON) + Expected Response Body (JSON) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Request JSON Body */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                          Request Body (JSON / Query)
                        </label>
                        {httpTC.http_method === 'GET' && (
                          <span className="text-[9px] text-[var(--text-muted)] italic">Optional for GET</span>
                        )}
                      </div>
                      <textarea
                        value={httpTC.input_body}
                        onChange={(e) => handleHttpFieldChange(idx, 'input_body', e.target.value)}
                        placeholder={`{\n  "title": "Build API"\n}`}
                        rows={3}
                        className="w-full custom-input text-[11px] font-mono bg-[#21252b] text-cyan-300 border-[#303642] resize-y"
                      />
                    </div>

                    {/* Expected Response JSON Body */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                        Expected Response Body (JSON)
                      </label>
                      <textarea
                        value={httpTC.expected_body}
                        onChange={(e) => handleHttpFieldChange(idx, 'expected_body', e.target.value)}
                        placeholder={`{\n  "id": 2,\n  "title": "Build API",\n  "completed": false\n}`}
                        rows={3}
                        className="w-full custom-input text-[11px] font-mono bg-[#21252b] text-emerald-300 border-[#303642] resize-y"
                      />
                    </div>
                  </div>

                  {/* Compiled Format Preview Bar */}
                  <div className="p-2 rounded bg-[var(--bg-raised)]/80 border border-[var(--border)] text-[10px] text-[var(--text-muted)] flex items-center justify-between gap-2 overflow-x-auto">
                    <span className="truncate">
                      <strong>Input:</strong> <code>{httpTC.http_method} {httpTC.path} {httpTC.input_body.replace(/\s+/g, ' ')}</code>
                    </span>
                    <span className="truncate shrink-0">
                      <strong>Output:</strong> <code className="text-emerald-500">{httpTC.expected_status} {httpTC.expected_body.replace(/\s+/g, ' ')}</code>
                    </span>
                  </div>
                </div>
              ) : (
                /* RAW STDIN / STDOUT VIEW */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                      Raw Standard Input (stdin)
                    </label>
                    <textarea
                      value={tc.input || ''}
                      onChange={(e) => handleRawChange(idx, 'input', e.target.value)}
                      placeholder={'POST /tasks {"title":"Build API"}'}
                      rows={3}
                      className="w-full custom-input text-[11px] font-mono bg-[#21252b] text-cyan-300 border-[#303642]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                      Raw Expected Output (stdout)
                    </label>
                    <textarea
                      value={tc.output || tc.expected_output || ''}
                      onChange={(e) => handleRawChange(idx, 'output', e.target.value)}
                      placeholder={'201 {"id":2,"title":"Build API","completed":false}'}
                      rows={3}
                      className="w-full custom-input text-[11px] font-mono bg-[#21252b] text-emerald-300 border-[#303642]"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
