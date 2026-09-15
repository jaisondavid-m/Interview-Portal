import React, { useState, useEffect, useRef } from 'react';
import {
  Server,
  Play,
  Send,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Sparkles,
  Package,
  Layers,
  Code2,
  Globe,
  Database,
  ShieldCheck,
  Zap,
  Activity,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  AlertCircle,
  Loader2,
  FileCode,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import CodeEditor from '../CodeEditor';
import InstalledBackendLibrariesModal from './InstalledBackendLibrariesModal';

const HTTP_METHODS = [
  { method: 'GET', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  { method: 'POST', color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  { method: 'PUT', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  { method: 'PATCH', color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
  { method: 'DELETE', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' },
];

export default function BackendPlayground({
  code = '',
  onCodeChange,
  language = 'javascript',
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
  const [activeConsoleTab, setActiveConsoleTab] = useState('tester'); // 'tester' | 'testcases' | 'logs' | 'custom'
  const [showPackagesModal, setShowPackagesModal] = useState(false);

  // Mini API Tester State
  const [httpMethod, setHttpMethod] = useState('GET');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [requestHeaders, setRequestHeaders] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [requestParamTab, setRequestParamTab] = useState('body'); // 'body' | 'headers'
  const [apiResponse, setApiResponse] = useState(null);
  const [isSendingApi, setIsSendingApi] = useState(false);

  // Server Log Streamer State
  const [serverLogs, setServerLogs] = useState([
    {
      id: 1,
      time: new Date().toLocaleTimeString(),
      type: 'INFO',
      method: 'SYSTEM',
      path: 'Sandbox Environment Initialized',
      status: 200,
      duration: '0ms',
      message: 'Server sandbox ready with pre-loaded modules.',
    },
  ]);

  // Selected test case tab index
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [copiedResponse, setCopiedResponse] = useState(false);

  const openCases = Array.isArray(payload?.open_test_cases)
    ? payload.open_test_cases
    : Array.isArray(payload?.test_cases)
    ? payload.test_cases
    : [];

  // Auto switch to test results when a run/submit completes
  useEffect(() => {
    if (runResults || submissionResult) {
      setActiveConsoleTab('testcases');
    }
  }, [runResults, submissionResult]);

  // Handle Manual API Request Simulation / Runner
  const handleSendApiRequest = async () => {
    setIsSendingApi(true);
    const startTime = Date.now();

    // Prepare simulated request payload
    let parsedBody = null;
    try {
      if (requestBody && requestBody.trim() && (httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH')) {
        parsedBody = JSON.parse(requestBody);
      }
    } catch (e) {
      // ignore json parse error
    }

    const targetUrl = endpointUrl.trim() || '/';
    // Call onRunCode with custom formatted HTTP stdin request
    const simulatedHttpInput = `${httpMethod} ${targetUrl} ${parsedBody ? JSON.stringify(parsedBody) : (requestBody.trim() || '')}`.trim();
    
    if (onRunCode) {
      try {
        await onRunCode({ isCustom: true, customInput: simulatedHttpInput });
      } catch (err) {
        // handled in parent
      }
    }

    const elapsed = Date.now() - startTime;
    const durationStr = `${Math.max(12, elapsed)}ms`;

    // Determine status code heuristic based on method
    let mockStatus = 200;
    let mockStatusText = 'OK';
    if (httpMethod === 'POST') {
      mockStatus = 201;
      mockStatusText = 'Created';
    } else if (httpMethod === 'DELETE') {
      mockStatus = 204;
      mockStatusText = 'No Content';
    }

    const mockResponseBody = parsedBody
      ? {
          success: true,
          status: mockStatus,
          timestamp: new Date().toISOString(),
          endpoint: targetUrl,
          method: httpMethod,
          data: { id: Math.floor(Math.random() * 900) + 100, ...parsedBody },
        }
      : {
          success: true,
          status: mockStatus,
          timestamp: new Date().toISOString(),
          endpoint: targetUrl,
          method: httpMethod,
          results: [],
        };

    const newResponse = {
      status: mockStatus,
      statusText: mockStatusText,
      duration: durationStr,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-powered-by': `${language.toUpperCase()} Server Sandbox`,
        'cache-control': 'no-cache',
      },
      body: JSON.stringify(mockResponseBody, null, 2),
    };

    setApiResponse(newResponse);

    // Append to live server logs
    setServerLogs((prev) => [
      ...prev,
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        type: 'HTTP',
        method: httpMethod,
        path: endpointUrl,
        status: mockStatus,
        duration: durationStr,
        message: `${httpMethod} ${endpointUrl} -> ${mockStatus} ${mockStatusText} (${durationStr})`,
      },
    ]);

    setIsSendingApi(false);
  };

  const handleCopyResponse = () => {
    if (apiResponse?.body) {
      navigator.clipboard.writeText(apiResponse.body);
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  const handleClearLogs = () => {
    setServerLogs([]);
  };

  const currentMethodColor = HTTP_METHODS.find((m) => m.method === httpMethod)?.color || 'text-blue-500 bg-blue-500/10 border-blue-500/30';

  return (
    <div className="flex flex-col space-y-3">
      {/* Installed Libraries Modal */}
      <InstalledBackendLibrariesModal
        isOpen={showPackagesModal}
        onClose={() => setShowPackagesModal(false)}
        activeLang={language}
      />

      {/* Top Bar: Language & Pre-installed Libraries Trigger */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xs flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/25 text-xs font-mono font-bold">
            <Server className="w-3.5 h-3.5" />
            <span>Backend Service Workspace</span>
          </div>

          <span className="text-xs text-[var(--text-muted)] font-mono">
            {isEditable ? 'Write & Test Server Code' : `Viewing ${candidateName}'s Code Live`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPackagesModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] border border-[var(--border)] flex items-center gap-1.5 transition shadow-xs"
            title="View pre-installed frameworks and libraries"
          >
            <Package className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Installed Libraries</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--accent)] text-white font-mono font-bold">
              Ready
            </span>
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="h-[380px] rounded-xl overflow-hidden border border-[var(--border)] shadow-sm">
        <CodeEditor
          code={code}
          onChange={onCodeChange}
          language={language}
          onLanguageChange={onLanguageChange}
          isEditable={isEditable}
        />
      </div>

      {/* Backend Interactive Console & Mini Postman Workspace */}
      <div className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
        {/* Console Navigation Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--bg-raised)] border-b border-[var(--border)] select-none flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 1. Mini API Tester Tab */}
            <button
              type="button"
              onClick={() => setActiveConsoleTab('tester')}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeConsoleTab === 'tester'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Mini API Tester (Postman)</span>
              {apiResponse && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            {/* 2. Automated Test Cases Tab */}
            <button
              type="button"
              onClick={() => setActiveConsoleTab('testcases')}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeConsoleTab === 'testcases'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Test Cases ({openCases.length})</span>
              {(runResults || submissionResult) && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    submissionResult?.verdict === 'Accepted' || runResults?.all_passed
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  }`}
                />
              )}
            </button>

            {/* 3. Real-Time Server Logs Tab */}
            <button
              type="button"
              onClick={() => setActiveConsoleTab('logs')}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeConsoleTab === 'logs'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Server Logs</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                {serverLogs.length}
              </span>
            </button>

            {/* 4. Custom CLI Input */}
            {isEditable && (
              <button
                type="button"
                onClick={() => setActiveConsoleTab('custom')}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeConsoleTab === 'custom'
                    ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Custom Stdin</span>
              </button>
            )}
          </div>

          {/* Test Runner Action Buttons */}
          {isEditable ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onRunCode && onRunCode({ isCustom: false })}
                disabled={isRunning || isSubmitting}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold shadow-xs"
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-[var(--accent)]" />
                )}
                <span>Run Code</span>
              </button>

              <button
                type="button"
                onClick={() => onSubmitCode && onSubmitCode()}
                disabled={isRunning || isSubmitting}
                className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold shadow-xs"
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
              <span>Interviewer Observing Live</span>
            </div>
          )}
        </div>

        {/* Tab Content 1: Mini API Tester (Postman) */}
        {activeConsoleTab === 'tester' && (
          <div className="p-4 space-y-4">
            {/* Request Bar */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Method Selector */}
              <div className="relative">
                <select
                  value={httpMethod}
                  onChange={(e) => setHttpMethod(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${currentMethodColor}`}
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

              {/* Endpoint Path Input */}
              <div className="flex-1 min-w-[200px] relative">
                <input
                  type="text"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="/api/v1/resource or /tasks"
                  className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition"
                />
              </div>

              {/* Send Request Button */}
              <button
                type="button"
                onClick={handleSendApiRequest}
                disabled={isSendingApi}
                className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-xs shrink-0"
              >
                {isSendingApi ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-white" />
                )}
                <span>Send Request</span>
              </button>
            </div>

            {/* Split Screen: Request Payload Editor & Response Viewer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Request Payload & Headers */}
              <div className="space-y-2 border border-[var(--border)] rounded-xl p-3 bg-[var(--bg-raised)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRequestParamTab('body')}
                      className={`text-xs font-mono font-bold px-2 py-1 rounded transition ${
                        requestParamTab === 'body'
                          ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      JSON Body
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequestParamTab('headers')}
                      className={`text-xs font-mono font-bold px-2 py-1 rounded transition ${
                        requestParamTab === 'headers'
                          ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Headers
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">application/json</span>
                </div>

                {requestParamTab === 'body' ? (
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    rows={6}
                    placeholder="{\n  &quot;key&quot;: &quot;value&quot;\n}"
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-2.5 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                  />
                ) : (
                  <textarea
                    value={requestHeaders}
                    onChange={(e) => setRequestHeaders(e.target.value)}
                    rows={6}
                    placeholder="{\n  &quot;Authorization&quot;: &quot;Bearer token&quot;\n}"
                    className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-2.5 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                  />
                )}
              </div>

              {/* Right Column: Response Inspector */}
              <div className="space-y-2 border border-[var(--border)] rounded-xl p-3 bg-[var(--bg-raised)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[var(--text-primary)]">Response</span>
                    {apiResponse ? (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          apiResponse.status >= 200 && apiResponse.status < 300
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {apiResponse.status} {apiResponse.statusText}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">Waiting for request...</span>
                    )}
                  </div>

                  {apiResponse && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--accent)]" /> {apiResponse.duration}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyResponse}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                        title="Copy Response Body"
                      >
                        {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>

                {apiResponse ? (
                  <div className="p-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg font-mono text-xs text-[var(--text-primary)] max-h-[140px] overflow-y-auto whitespace-pre leading-relaxed select-all">
                    {apiResponse.body}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-[var(--text-muted)] font-mono space-y-1">
                    <p>Click &quot;Send Request&quot; above to test your backend API endpoint.</p>
                    <p className="text-[10px] opacity-70">Inspect HTTP headers, response payload, and status codes.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 2: Automated Test Cases Runner */}
        {activeConsoleTab === 'testcases' && (
          <div className="p-4 space-y-3">
            {openCases.length > 0 ? (
              <div className="space-y-3">
                {/* Case Selector Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {openCases.map((tc, idx) => {
                    const result = runResults?.results?.[idx];
                    const hasResult = !!result;
                    const isPassed = result?.passed;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedCaseIdx(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                          selectedCaseIdx === idx
                            ? 'bg-[var(--bg-raised)] text-[var(--accent)] border border-[var(--border)] shadow-xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {hasResult ? (
                          isPassed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          )
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]/40" />
                        )}
                        <span>Case {idx + 1}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Test Case Breakdown */}
                {openCases[selectedCaseIdx] && (
                  <div className="p-3.5 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                        Input (stdin / HTTP request):
                      </span>
                      <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] whitespace-pre-wrap">
                        {openCases[selectedCaseIdx].input || '(No input)'}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                        Expected Output (stdout / JSON response):
                      </span>
                      <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-emerald-600 dark:text-emerald-400 font-bold whitespace-pre-wrap">
                        {openCases[selectedCaseIdx].output || openCases[selectedCaseIdx].expected || '(No expected output)'}
                      </div>
                    </div>

                    {runResults?.results?.[selectedCaseIdx] && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                          Actual Output:
                        </span>
                        <div
                          className={`p-2.5 rounded-lg border whitespace-pre-wrap ${
                            runResults.results[selectedCaseIdx].passed
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {runResults.results[selectedCaseIdx].actual}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] font-mono">
                No automated test cases configured for this challenge. Use the Mini API Tester to run custom queries.
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Real-Time Server Logs Streamer */}
        {activeConsoleTab === 'logs' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[var(--text-muted)] uppercase">
                Live Server Request & System Stream
              </span>
              <button
                type="button"
                onClick={handleClearLogs}
                className="px-2.5 py-1 rounded text-xs text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Logs</span>
              </button>
            </div>

            <div className="p-3 bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl font-mono text-xs space-y-2 max-h-[220px] overflow-y-auto">
              {serverLogs.length === 0 ? (
                <div className="py-6 text-center text-[var(--text-muted)]">No logs recorded yet.</div>
              ) : (
                serverLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 border-b border-[var(--border)]/40 pb-1.5 last:border-0 last:pb-0">
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 mt-0.5">{log.time}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                        log.method === 'GET'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : log.method === 'POST'
                          ? 'bg-blue-500/15 text-blue-500'
                          : log.method === 'DELETE'
                          ? 'bg-rose-500/15 text-rose-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {log.method}
                    </span>
                    <span className="text-[var(--text-primary)] flex-1">{log.message || log.path}</span>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 font-bold">{log.duration}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab Content 4: Custom Stdin Input */}
        {activeConsoleTab === 'custom' && (
          <div className="p-4 space-y-3">
            <span className="text-xs font-mono font-bold text-[var(--text-muted)] block">
              Provide Custom Standard Input (stdin):
            </span>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              rows={4}
              placeholder="Paste raw input parameters, JSON payloads, or arguments here..."
              className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl p-3 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onRunCode && onRunCode({ isCustom: true, customInput })}
                disabled={isRunning}
                className="btn btn-primary text-xs py-1.5 px-4 font-bold flex items-center gap-1.5 shadow-xs"
              >
                {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Run with Custom Input</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
