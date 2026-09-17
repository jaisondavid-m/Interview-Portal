import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  Clock,
  Code2,
  Globe,
  Sliders,
  Sparkles,
  ShieldCheck,
  FileCode,
  Terminal,
  Layers,
  Key,
  Database,
  RefreshCw,
  HelpCircle,
  FolderPlus,
  Edit2,
  FileJson,
  Activity,
  AlertCircle
} from 'lucide-react';

export const HTTP_METHODS = [
  { method: 'GET', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  { method: 'POST', color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  { method: 'PUT', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  { method: 'PATCH', color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
  { method: 'DELETE', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' },
  { method: 'HEAD', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30' },
  { method: 'OPTIONS', color: 'text-gray-400 bg-gray-500/10 border-gray-500/30' },
];

const DEFAULT_REQUESTS = [
  {
    id: 'req-1',
    name: 'Health Check',
    method: 'GET',
    url: '/api/v1/health',
    params: [],
    headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
    auth: { type: 'none', token: '', username: '', password: '', apiKey: '', apiValue: '', addTo: 'header' },
    bodyType: 'none',
    bodyJson: '{\n  \n}',
    bodyFormData: [],
    bodyRaw: '',
  },
  {
    id: 'req-2',
    name: 'Get All Resources',
    method: 'GET',
    url: '/api/v1/items',
    params: [{ key: 'limit', value: '10', enabled: true }, { key: 'page', value: '1', enabled: true }],
    headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
    auth: { type: 'none', token: '', username: '', password: '', apiKey: '', apiValue: '', addTo: 'header' },
    bodyType: 'none',
    bodyJson: '{\n  \n}',
    bodyFormData: [],
    bodyRaw: '',
  },
  {
    id: 'req-3',
    name: 'Create Resource',
    method: 'POST',
    url: '/api/v1/items',
    params: [],
    headers: [
      { key: 'Content-Type', value: 'application/json', enabled: true },
      { key: 'Accept', value: 'application/json', enabled: true },
    ],
    auth: { type: 'none', token: '', username: '', password: '', apiKey: '', apiValue: '', addTo: 'header' },
    bodyType: 'json',
    bodyJson: '{\n  "name": "Sample Item",\n  "price": 49.99,\n  "category": "electronics"\n}',
    bodyFormData: [],
    bodyRaw: '',
  },
];

export default function PostmanWorkspace({
  serverLogs = [],
  onAddServerLog = null,
  code = '',
  language = 'go',
  isEditable = true,
  candidateName = 'Candidate',
}) {
  const [requests, setRequests] = useState(DEFAULT_REQUESTS);
  const [activeReqId, setActiveReqId] = useState('req-1');
  const [requestTab, setRequestTab] = useState('params'); // 'params' | 'headers' | 'auth' | 'body'
  const [responseTab, setResponseTab] = useState('body'); // 'body' | 'headers' | 'logs'
  const [isSending, setIsSending] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [jsonFormatError, setJsonFormatError] = useState(null);

  const activeRequest = useMemo(() => {
    return requests.find((r) => r.id === activeReqId) || requests[0] || DEFAULT_REQUESTS[0];
  }, [requests, activeReqId]);

  const updateActiveRequest = (updates) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === activeRequest.id ? { ...r, ...updates } : r))
    );
  };

  const handleAddRequest = () => {
    const newId = `req-${Date.now()}`;
    const newReq = {
      id: newId,
      name: `Request ${requests.length + 1}`,
      method: 'GET',
      url: '/api/v1/resource',
      params: [],
      headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
      auth: { type: 'none', token: '', username: '', password: '', apiKey: '', apiValue: '', addTo: 'header' },
      bodyType: 'none',
      bodyJson: '{\n  \n}',
      bodyFormData: [],
      bodyRaw: '',
    };
    setRequests((prev) => [...prev, newReq]);
    setActiveReqId(newId);
  };

  const handleDeleteRequest = (id, e) => {
    e.stopPropagation();
    if (requests.length <= 1) return;
    const remaining = requests.filter((r) => r.id !== id);
    setRequests(remaining);
    if (activeReqId === id) {
      setActiveReqId(remaining[0].id);
    }
  };

  // Build full URL string including active query parameters
  const computedUrl = useMemo(() => {
    let url = activeRequest.url || '';
    const activeParams = (activeRequest.params || []).filter((p) => p.enabled && p.key?.trim());
    if (activeParams.length > 0) {
      const qs = activeParams
        .map((p) => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value || '')}`)
        .join('&');
      url = url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
    }
    return url;
  }, [activeRequest.url, activeRequest.params]);

  // Handle URL edit and extract query params
  const handleUrlChange = (newUrl) => {
    if (newUrl.includes('?')) {
      const [path, queryString] = newUrl.split('?');
      const pairs = queryString.split('&');
      const newParams = pairs
        .filter(Boolean)
        .map((pair) => {
          const [k, v] = pair.split('=');
          return {
            key: decodeURIComponent(k || ''),
            value: decodeURIComponent(v || ''),
            enabled: true,
          };
        });
      updateActiveRequest({ url: path, params: newParams });
    } else {
      updateActiveRequest({ url: newUrl });
    }
  };

  // Query Params row handlers
  const handleParamChange = (index, field, value) => {
    const updated = [...(activeRequest.params || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateActiveRequest({ params: updated });
  };

  const handleAddParam = () => {
    updateActiveRequest({
      params: [...(activeRequest.params || []), { key: '', value: '', enabled: true }],
    });
  };

  const handleRemoveParam = (index) => {
    const updated = (activeRequest.params || []).filter((_, i) => i !== index);
    updateActiveRequest({ params: updated });
  };

  // Headers row handlers
  const handleHeaderChange = (index, field, value) => {
    const updated = [...(activeRequest.headers || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateActiveRequest({ headers: updated });
  };

  const handleAddHeader = () => {
    updateActiveRequest({
      headers: [...(activeRequest.headers || []), { key: '', value: '', enabled: true }],
    });
  };

  const handleRemoveHeader = (index) => {
    const updated = (activeRequest.headers || []).filter((_, i) => i !== index);
    updateActiveRequest({ headers: updated });
  };

  // Prettify JSON
  const handlePrettifyJson = () => {
    try {
      const parsed = JSON.parse(activeRequest.bodyJson || '{}');
      const formatted = JSON.stringify(parsed, null, 2);
      updateActiveRequest({ bodyJson: formatted });
      setJsonFormatError(null);
    } catch (e) {
      setJsonFormatError('Invalid JSON syntax');
    }
  };

  // Send Simulated API Request against the running sandbox code
  const handleSendRequest = async () => {
    setIsSending(true);
    setJsonFormatError(null);
    const startTime = Date.now();

    // Validate body if JSON
    let parsedBody = null;
    if (activeRequest.bodyType === 'json' && activeRequest.bodyJson?.trim()) {
      try {
        parsedBody = JSON.parse(activeRequest.bodyJson);
      } catch (e) {
        setJsonFormatError('Invalid JSON format in request body');
        setIsSending(false);
        return;
      }
    }

    // Simulate network latency against sandbox (between 25ms - 75ms)
    await new Promise((res) => setTimeout(res, Math.floor(Math.random() * 50) + 30));

    const duration = Date.now() - startTime;
    const path = activeRequest.url || '/';
    const method = activeRequest.method || 'GET';

    // Generate intelligent simulated response payload based on path and method
    let statusCode = 200;
    let statusText = 'OK';
    let responseData = {};
    const respHeaders = {
      'content-type': 'application/json; charset=utf-8',
      'date': new Date().toUTCString(),
      'server': `mockmate-microservice/${language}`,
      'x-response-time': `${duration}ms`,
      'connection': 'keep-alive',
    };

    if (method === 'POST') {
      statusCode = 201;
      statusText = 'Created';
      responseData = {
        success: true,
        message: 'Resource created successfully',
        id: Math.floor(Math.random() * 9000) + 1000,
        data: parsedBody || { name: 'Item', created_at: new Date().toISOString() },
      };
    } else if (method === 'DELETE') {
      statusCode = 200;
      statusText = 'OK';
      responseData = {
        success: true,
        message: `Resource at ${path} deleted successfully`,
      };
    } else if (method === 'PUT' || method === 'PATCH') {
      statusCode = 200;
      statusText = 'OK';
      responseData = {
        success: true,
        message: 'Resource updated successfully',
        updated_at: new Date().toISOString(),
        changes: parsedBody || {},
      };
    } else {
      if (path.includes('health')) {
        responseData = {
          status: 'UP',
          uptime: '4h 12m',
          timestamp: new Date().toISOString(),
          service: 'mockmate-backend-node',
          database: 'connected',
        };
      } else {
        responseData = {
          success: true,
          count: 3,
          data: [
            { id: 1, name: 'Alpha Task', status: 'completed', priority: 'high' },
            { id: 2, name: 'Beta Microservice', status: 'in-progress', priority: 'medium' },
            { id: 3, name: 'Gamma Route', status: 'pending', priority: 'low' },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 3,
          },
        };
      }
    }

    const responseBodyStr = JSON.stringify(responseData, null, 2);
    const byteSize = new Blob([responseBodyStr]).size;

    const finalResponse = {
      status: statusCode,
      statusText,
      duration: `${duration}ms`,
      size: byteSize > 1024 ? `${(byteSize / 1024).toFixed(2)} KB` : `${byteSize} B`,
      body: responseBodyStr,
      headers: respHeaders,
      timestamp: new Date().toLocaleTimeString(),
    };

    setApiResponse(finalResponse);
    setIsSending(false);

    // Notify parent to log server activity
    if (onAddServerLog) {
      onAddServerLog({
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        type: statusCode >= 400 ? 'ERROR' : 'HTTP',
        method,
        path: computedUrl,
        status: statusCode,
        duration: `${duration}ms`,
        message: `${method} ${computedUrl} -> ${statusCode} ${statusText}`,
      });
    }
  };

  const handleCopyResponse = () => {
    if (apiResponse?.body) {
      navigator.clipboard.writeText(apiResponse.body);
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  const currentMethodColor =
    HTTP_METHODS.find((m) => m.method === activeRequest.method)?.color ||
    'text-blue-500 bg-blue-500/10 border-blue-500/30';

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden shadow-sm">
      {/* Top Request Tabs Switcher Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-raised)] border-b border-[var(--border)] overflow-x-auto gap-2 select-none">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {requests.map((req) => {
            const mColor = HTTP_METHODS.find((m) => m.method === req.method)?.color || '';
            const isActive = req.id === activeRequest.id;

            return (
              <div
                key={req.id}
                onClick={() => setActiveReqId(req.id)}
                className={`group px-3 py-1 rounded-[var(--radius-sm)] text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition border ${
                  isActive
                    ? 'bg-[var(--bg-card)] text-[var(--accent)] border-[var(--border)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border-transparent hover:bg-[var(--bg-card)]/50'
                }`}
              >
                <span className={`text-[10px] px-1 py-0.2 rounded border font-extrabold ${mColor}`}>
                  {req.method}
                </span>
                <span className="truncate max-w-[120px]">{req.name || req.url || 'Untitled'}</span>
                {requests.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteRequest(req.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-500 transition p-0.5 rounded"
                    title="Close Tab"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleAddRequest}
            className="px-2 py-1 rounded-[var(--radius-sm)] text-xs text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-card)] transition flex items-center gap-1 font-mono cursor-pointer"
            title="Add New Request"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            Base: <code className="text-[var(--accent)] font-bold">http://localhost:8080</code>
          </span>
        </div>
      </div>

      {/* URL & Method Action Bar */}
      <div className="p-3 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {/* Method Selector */}
        <div className="relative shrink-0">
          <select
            value={activeRequest.method}
            onChange={(e) => updateActiveRequest({ method: e.target.value })}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-extrabold border appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition ${currentMethodColor}`}
          >
            {HTTP_METHODS.map((m) => (
              <option key={m.method} value={m.method} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                {m.method}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-current text-[10px]">
            ▼
          </div>
        </div>

        {/* URL Input Bar */}
        <div className="flex-1 min-w-[200px] relative flex items-center">
          <span className="absolute left-3 text-[11px] font-mono text-[var(--text-muted)] pointer-events-none select-none hidden sm:inline">
            http://localhost:8080
          </span>
          <input
            type="text"
            value={activeRequest.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="/api/v1/items or /health"
            className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl py-2 pr-3.5 pl-3 sm:pl-[145px] text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSendRequest}
          disabled={isSending}
          className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold font-mono flex items-center gap-2 shadow-md shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer shrink-0 disabled:opacity-50"
        >
          {isSending ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>Send</span>
        </button>
      </div>

      {/* Main Split Body: Left = Request Config Tabs, Right = Response Inspector */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 overflow-hidden">
        {/* Left Side: Request Configurator */}
        <div className="flex flex-col border-r border-[var(--border)] bg-[var(--bg-card)] min-h-0 overflow-hidden">
          {/* Sub-tabs: Params | Headers | Auth | Body */}
          <div className="flex items-center px-3 py-1.5 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-1 text-xs select-none">
            <button
              type="button"
              onClick={() => setRequestTab('params')}
              className={`px-3 py-1 rounded-[var(--radius-sm)] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                requestTab === 'params'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Params</span>
              {(activeRequest.params || []).filter((p) => p.enabled && p.key).length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setRequestTab('headers')}
              className={`px-3 py-1 rounded-[var(--radius-sm)] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                requestTab === 'headers'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Headers</span>
              {(activeRequest.headers || []).filter((h) => h.enabled && h.key).length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setRequestTab('auth')}
              className={`px-3 py-1 rounded-[var(--radius-sm)] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                requestTab === 'auth'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Key className="w-3 h-3" />
              <span>Auth</span>
            </button>

            <button
              type="button"
              onClick={() => setRequestTab('body')}
              className={`px-3 py-1 rounded-[var(--radius-sm)] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                requestTab === 'body'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Body</span>
              {activeRequest.bodyType !== 'none' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              )}
            </button>
          </div>

          {/* Request Tab Content */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 font-mono text-xs">
            {/* 1. QUERY PARAMS */}
            {requestTab === 'params' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">
                    Query Parameters
                  </span>
                  <button
                    type="button"
                    onClick={handleAddParam}
                    className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Param
                  </button>
                </div>

                <div className="space-y-1.5">
                  {(activeRequest.params || []).map((param, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={param.enabled}
                        onChange={(e) => handleParamChange(idx, 'enabled', e.target.checked)}
                        className="rounded border-[var(--border)] text-[var(--accent)] cursor-pointer"
                      />
                      <input
                        type="text"
                        placeholder="Key (e.g. limit)"
                        value={param.key}
                        onChange={(e) => handleParamChange(idx, 'key', e.target.value)}
                        className="flex-1 bg-[var(--bg-raised)] border border-[var(--border)] rounded px-2.5 py-1 text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 10)"
                        value={param.value}
                        onChange={(e) => handleParamChange(idx, 'value', e.target.value)}
                        className="flex-1 bg-[var(--bg-raised)] border border-[var(--border)] rounded px-2.5 py-1 text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveParam(idx)}
                        className="p-1 text-[var(--text-muted)] hover:text-rose-500 transition cursor-pointer"
                        title="Delete parameter"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {(!activeRequest.params || activeRequest.params.length === 0) && (
                    <div className="p-4 text-center text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-lg">
                      No query parameters configured. Click &quot;Add Param&quot; above to append query parameters to URL.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. HEADERS */}
            {requestTab === 'headers' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">
                    HTTP Request Headers
                  </span>
                  <button
                    type="button"
                    onClick={handleAddHeader}
                    className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Header
                  </button>
                </div>

                <div className="space-y-1.5">
                  {(activeRequest.headers || []).map((hdr, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hdr.enabled}
                        onChange={(e) => handleHeaderChange(idx, 'enabled', e.target.checked)}
                        className="rounded border-[var(--border)] text-[var(--accent)] cursor-pointer"
                      />
                      <input
                        type="text"
                        placeholder="Header (e.g. Content-Type)"
                        value={hdr.key}
                        onChange={(e) => handleHeaderChange(idx, 'key', e.target.value)}
                        className="flex-1 bg-[var(--bg-raised)] border border-[var(--border)] rounded px-2.5 py-1 text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. application/json)"
                        value={hdr.value}
                        onChange={(e) => handleHeaderChange(idx, 'value', e.target.value)}
                        className="flex-1 bg-[var(--bg-raised)] border border-[var(--border)] rounded px-2.5 py-1 text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveHeader(idx)}
                        className="p-1 text-[var(--text-muted)] hover:text-rose-500 transition cursor-pointer"
                        title="Delete header"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {(!activeRequest.headers || activeRequest.headers.length === 0) && (
                    <div className="p-4 text-center text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-lg">
                      No custom headers added. Click &quot;Add Header&quot; to configure headers.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. AUTHENTICATION */}
            {requestTab === 'auth' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Auth Type:</span>
                  <select
                    value={activeRequest.auth?.type || 'none'}
                    onChange={(e) =>
                      updateActiveRequest({ auth: { ...activeRequest.auth, type: e.target.value } })
                    }
                    className="bg-[var(--bg-raised)] border border-[var(--border)] rounded px-2.5 py-1 text-xs font-bold text-[var(--text-primary)] cursor-pointer"
                  >
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="apiKey">API Key</option>
                  </select>
                </div>

                {activeRequest.auth?.type === 'bearer' && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)]">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Bearer Token</span>
                    <input
                      type="text"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={activeRequest.auth?.token || ''}
                      onChange={(e) =>
                        updateActiveRequest({ auth: { ...activeRequest.auth, token: e.target.value } })
                      }
                      className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                )}

                {activeRequest.auth?.type === 'basic' && (
                  <div className="space-y-2 p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)]">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">Username</span>
                      <input
                        type="text"
                        placeholder="admin"
                        value={activeRequest.auth?.username || ''}
                        onChange={(e) =>
                          updateActiveRequest({ auth: { ...activeRequest.auth, username: e.target.value } })
                        }
                        className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">Password</span>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={activeRequest.auth?.password || ''}
                        onChange={(e) =>
                          updateActiveRequest({ auth: { ...activeRequest.auth, password: e.target.value } })
                        }
                        className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>
                )}

                {activeRequest.auth?.type === 'apiKey' && (
                  <div className="space-y-2 p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)]">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">Key Name</span>
                      <input
                        type="text"
                        placeholder="X-API-Key"
                        value={activeRequest.auth?.apiKey || ''}
                        onChange={(e) =>
                          updateActiveRequest({ auth: { ...activeRequest.auth, apiKey: e.target.value } })
                        }
                        className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">Value</span>
                      <input
                        type="text"
                        placeholder="secret_key_12345"
                        value={activeRequest.auth?.apiValue || ''}
                        onChange={(e) =>
                          updateActiveRequest({ auth: { ...activeRequest.auth, apiValue: e.target.value } })
                        }
                        className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>
                )}

                {activeRequest.auth?.type === 'none' && (
                  <div className="p-4 text-center text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-lg">
                    This request does not use any authorization headers.
                  </div>
                )}
              </div>
            )}

            {/* 4. REQUEST BODY */}
            {requestTab === 'body' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {['none', 'json', 'raw'].map((bType) => (
                      <label key={bType} className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="bodyType"
                          value={bType}
                          checked={activeRequest.bodyType === bType}
                          onChange={(e) => updateActiveRequest({ bodyType: e.target.value })}
                          className="text-[var(--accent)]"
                        />
                        <span className="capitalize">{bType === 'json' ? 'JSON (application/json)' : bType}</span>
                      </label>
                    ))}
                  </div>

                  {activeRequest.bodyType === 'json' && (
                    <button
                      type="button"
                      onClick={handlePrettifyJson}
                      className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      title="Format JSON"
                    >
                      <Sparkles className="w-3 h-3" /> Prettify
                    </button>
                  )}
                </div>

                {jsonFormatError && (
                  <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{jsonFormatError}</span>
                  </div>
                )}

                {activeRequest.bodyType === 'json' && (
                  <div className="space-y-1">
                    <textarea
                      value={activeRequest.bodyJson}
                      onChange={(e) => updateActiveRequest({ bodyJson: e.target.value })}
                      rows={10}
                      placeholder="{\n  &quot;name&quot;: &quot;Resource Name&quot;\n}"
                      className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl p-3 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-y leading-relaxed"
                    />
                  </div>
                )}

                {activeRequest.bodyType === 'raw' && (
                  <textarea
                    value={activeRequest.bodyRaw}
                    onChange={(e) => updateActiveRequest({ bodyRaw: e.target.value })}
                    rows={10}
                    placeholder="Plain text or raw payload..."
                    className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl p-3 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-y leading-relaxed"
                  />
                )}

                {activeRequest.bodyType === 'none' && (
                  <div className="p-6 text-center text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-lg">
                    This request does not have a body.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Response Inspector */}
        <div className="flex flex-col bg-[var(--bg-card)] min-h-0 overflow-hidden">
          {/* Response Status & Sub-tabs */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-raised)] border-b border-[var(--border)] gap-2 flex-wrap text-xs select-none">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setResponseTab('body')}
                className={`px-3 py-1 rounded-[var(--radius-sm)] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  responseTab === 'body'
                    ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>Response Body</span>
              </button>

              <button
                type="button"
                onClick={() => setResponseTab('headers')}
                className={`px-3 py-1 rounded-[var(--radius-sm)] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  responseTab === 'headers'
                    ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>Headers</span>
              </button>

              <button
                type="button"
                onClick={() => setResponseTab('logs')}
                className={`px-3 py-1 rounded-[var(--radius-sm)] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  responseTab === 'logs'
                    ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>Logs ({serverLogs.length})</span>
              </button>
            </div>

            {/* Response Status Pills */}
            {apiResponse && (
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span
                  className={`px-2 py-0.5 rounded font-extrabold border ${
                    apiResponse.status >= 200 && apiResponse.status < 300
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  }`}
                >
                  {apiResponse.status} {apiResponse.statusText}
                </span>

                <span className="text-[var(--text-muted)] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[var(--accent)]" /> {apiResponse.duration}
                </span>

                <span className="text-[var(--text-muted)]">{apiResponse.size}</span>

                <button
                  type="button"
                  onClick={handleCopyResponse}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
                  title="Copy Response Body"
                >
                  {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                </button>
              </div>
            )}
          </div>

          {/* Response Body Content */}
          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
            {responseTab === 'body' && (
              <>
                {apiResponse ? (
                  <pre className="p-3 bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl font-mono text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed select-all">
                    {apiResponse.body}
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[var(--text-muted)] space-y-2">
                    <Globe className="w-8 h-8 text-[var(--text-muted)]/40 stroke-1" />
                    <p className="font-bold text-[var(--text-secondary)]">No response received yet</p>
                    <p className="text-[11px] max-w-sm">
                      Click <strong className="text-[var(--accent)]">Send</strong> above to execute the HTTP request against your backend microservice.
                    </p>
                  </div>
                )}
              </>
            )}

            {responseTab === 'headers' && (
              <>
                {apiResponse?.headers ? (
                  <div className="space-y-1.5">
                    {Object.entries(apiResponse.headers).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between p-2 rounded bg-[var(--bg-raised)] border border-[var(--border)] text-xs font-mono"
                      >
                        <span className="text-[var(--accent)] font-bold">{k}:</span>
                        <span className="text-[var(--text-primary)]">{v}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-[var(--text-muted)]">
                    Send a request to inspect response headers.
                  </div>
                )}
              </>
            )}

            {responseTab === 'logs' && (
              <div className="space-y-2">
                {serverLogs.length === 0 ? (
                  <div className="p-8 text-center text-[var(--text-muted)]">No server logs recorded yet.</div>
                ) : (
                  serverLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-[var(--bg-raised)] border border-[var(--border)] text-xs font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                        <span className="font-bold text-[var(--text-secondary)]">{log.time}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded font-extrabold ${
                            log.status >= 400 ? 'bg-rose-500/15 text-rose-500' : 'bg-emerald-500/15 text-emerald-500'
                          }`}
                        >
                          {log.status || 200}
                        </span>
                      </div>
                      <div className="text-[var(--text-primary)] font-bold">{log.message || log.path}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
