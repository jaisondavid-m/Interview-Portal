import React, { useState } from 'react';
import { Play, Send, CheckCircle2, XCircle, Terminal, Clock, Cpu, Sparkles, Loader2, FileCode } from 'lucide-react';

export default function TestCasesConsole({
  openTestCases = [],
  onRunCode,
  onSubmitCode,
  isRunning = false,
  isSubmitting = false,
  isCandidate = true,
  runResults = null,
  submissionResult = null,
  lastExecutionInfo = null,
}) {
  const [activeTab, setActiveTab] = useState(submissionResult || runResults ? 'result' : (openTestCases.length > 0 ? 'sample' : 'custom')); // 'sample' | 'custom' | 'result'
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [customInput, setCustomInput] = useState('');

  // Automatically show verdict tab if a new execution comes in
  React.useEffect(() => {
    if (submissionResult || runResults) {
      setActiveTab('result');
    }
  }, [submissionResult, runResults]);

  const handleRun = () => {
    if (activeTab === 'custom') {
      onRunCode && onRunCode({ isCustom: true, customInput });
    } else {
      onRunCode && onRunCode({ isCustom: false });
    }
  };

  return (
    <div className="flex flex-col rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-[var(--shadow-sm)]">
      {/* Console Header Tabs */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[var(--bg-raised)] border-b border-[var(--border)] select-none flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('sample')}
            className={`px-3 py-1 text-[11px] font-mono font-bold rounded transition-all ${
              activeTab === 'sample'
                ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Sample Cases ({openTestCases.length})
          </button>

          {isCandidate && (
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1 text-[11px] font-mono font-bold rounded transition-all ${
                activeTab === 'custom'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Custom Input
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('result')}
            className={`px-3 py-1 text-[11px] font-mono font-bold rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'result'
                ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span>Verdict & Execution</span>
            {(runResults || submissionResult) && (
              <span className={`w-2 h-2 rounded-full ${
                (submissionResult?.verdict === 'Accepted' || runResults?.all_passed)
                  ? 'bg-[var(--green)]'
                  : 'bg-[var(--red)]'
              }`} />
            )}
          </button>
        </div>

        {/* Action Run & Submit Buttons (Candidate only) OR Live Status Indicator (Interviewer) */}
        {isCandidate ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning || isSubmitting}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold shadow-[var(--shadow-sm)]"
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
              onClick={onSubmitCode}
              disabled={isRunning || isSubmitting}
              className="btn btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 font-bold shadow-[var(--shadow-sm)]"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Submit Solution</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
            <span className="text-[var(--text-muted)]">
              Candidate Live Console {lastExecutionInfo ? `(${lastExecutionInfo})` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Tab Content Panel */}
      <div className="p-4 space-y-3 min-h-[160px] max-h-[300px] overflow-y-auto">
        {/* TAB 1: Sample Test Cases */}
        {activeTab === 'sample' && (
          <div className="space-y-3">
            {openTestCases.length === 0 ? (
              <div className="p-6 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)] text-center space-y-2">
                <FileCode className="w-6 h-6 mx-auto text-[var(--text-muted)] opacity-60" />
                <p className="text-[12px] font-bold text-[var(--text-primary)]">No Sample Test Cases</p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-sm mx-auto">
                  This question does not have automated sample test cases. You can click <strong>Run Code</strong> or test with <strong>Custom Input</strong>.
                </p>
              </div>
            ) : (
              <>
                {/* Case selector pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  {openTestCases.map((tc, idx) => {
                    const isSelected = selectedCaseIdx === idx;
                    const result = runResults?.results?.[idx] || submissionResult?.results?.[idx];
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedCaseIdx(idx)}
                        className={`px-3 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]'
                            : 'border-[var(--border)] bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span>Case {idx + 1}</span>
                        {result && (
                          result.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)]" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-[var(--red)]" />
                          )
                        )}
                      </button>
                    );
                  })}
                </div>

            {/* Selected Case Content */}
            {openTestCases[selectedCaseIdx] && (() => {
              const activeResult = runResults?.results?.[selectedCaseIdx] || submissionResult?.results?.[selectedCaseIdx];
              return (
                <div className="space-y-2.5 bg-[var(--bg-raised)] p-3.5 rounded-[var(--radius-sm)] border border-[var(--border)] font-mono text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold">
                      Case #{selectedCaseIdx + 1} Specification:
                    </span>
                    {activeResult && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        activeResult.passed
                          ? 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30'
                          : 'bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/30'
                      }`}>
                        {activeResult.passed ? '✓ Passed' : '✗ Failed'}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold block mb-1">
                      Standard Input (stdin):
                    </span>
                    <div className="bg-[var(--bg-input)] p-2 rounded border border-[var(--border)] text-[var(--text-primary)] font-mono whitespace-pre-wrap">
                      {openTestCases[selectedCaseIdx].input || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold block mb-1">
                      Expected Output (stdout):
                    </span>
                    <div className="bg-[var(--bg-input)] p-2 rounded border border-[var(--border)] text-[var(--green)] font-bold font-mono whitespace-pre-wrap">
                      {openTestCases[selectedCaseIdx].output || 'N/A'}
                    </div>
                  </div>

                  {activeResult && (
                    <div>
                      <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold block mb-1">
                        Actual Output (stdout):
                      </span>
                      <div className={`p-2 rounded border font-mono whitespace-pre-wrap ${
                        activeResult.passed
                          ? 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]'
                          : 'bg-[var(--red-bg)]/40 border-[var(--red)]/40 text-[var(--red)] font-bold'
                      }`}>
                        {activeResult.actual}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
              </>
            )}
          </div>
        )}

        {/* TAB 2: Custom Test Case */}
        {activeTab === 'custom' && (
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-[var(--text-muted)] font-bold uppercase">
              Custom Standard Input (stdin):
            </span>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Type any raw input lines to pipe directly into process stdin..."
              rows={3}
              className="w-full custom-input font-mono text-[12px] p-2.5 resize-none bg-[var(--bg-input)]"
            />
            <p className="text-[11px] text-[var(--text-muted)] font-mono">
              Input is piped to standard input. Read with <code>fs.readFileSync(0, 'utf-8')</code> (JS) or <code>sys.stdin.read()</code> (Python).
            </p>
          </div>
        )}

        {/* TAB 3: Verdict & Output */}
        {activeTab === 'result' && (
          <div className="space-y-3 font-mono text-[12px]">
            {submissionResult && (
              <div className={`p-4 rounded-[var(--radius-sm)] border flex items-center justify-between ${
                submissionResult.verdict === 'Accepted'
                  ? 'bg-[var(--green-bg)] border-[var(--green)]/30 text-[var(--green)]'
                  : 'bg-[var(--red-bg)] border-[var(--red)]/30 text-[var(--red)]'
              }`}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {submissionResult.verdict === 'Accepted' ? (
                      <CheckCircle2 className="w-5 h-5 text-[var(--green)] shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[var(--red)] shrink-0" />
                    )}
                    <h4 className="text-[16px] font-bold">
                      {submissionResult.verdict}
                    </h4>
                  </div>
                  <p className="text-[11px] opacity-90">
                    Passed {submissionResult.passed_cases} of {submissionResult.total_cases} test cases ({submissionResult.hidden_cases || 0} hidden test cases evaluated)
                  </p>
                </div>

                <div className="text-right text-[11px] opacity-80 shrink-0">
                  <div>Runtime: {submissionResult.runtime_ms} ms</div>
                  <div>Memory: {submissionResult.memory_mb || '14.2 MB'}</div>
                </div>
              </div>
            )}

            {/* If Run Code was executed without submission */}
            {!submissionResult && runResults && (
              <div className={`p-3 rounded-[var(--radius-sm)] border flex items-center justify-between ${
                runResults.all_passed
                  ? 'bg-[var(--green-bg)] border-[var(--green)]/30 text-[var(--green)]'
                  : 'bg-[var(--red-bg)] border-[var(--red)]/30 text-[var(--red)]'
              }`}>
                <div className="flex items-center gap-2">
                  {runResults.all_passed ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--green)] shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[var(--red)] shrink-0" />
                  )}
                  <span className="font-bold text-[13px]">
                    {runResults.all_passed ? 'Sample Cases Passed' : 'Sample Cases Failed'}
                  </span>
                </div>
                <div className="text-[11px] opacity-80">
                  {runResults.results?.filter(r => r.passed).length || 0} of {runResults.results?.length || 0} sample cases passed
                </div>
              </div>
            )}

            {/* Execution Output Summary (Lists all Sample Cases AND Hidden Cases individually) */}
            {(() => {
              const activeResults = submissionResult?.results || runResults?.results || [];
              const isSubmission = !!submissionResult;
              const allPassed = isSubmission
                ? (submissionResult.verdict === 'Accepted' || submissionResult.all_passed)
                : !!runResults?.all_passed;
              const totalCount = isSubmission
                ? (submissionResult.total_cases || activeResults.length)
                : activeResults.length;
              const passedCount = isSubmission
                ? (submissionResult.passed_cases ?? activeResults.filter(r => r.passed).length)
                : activeResults.filter(r => r.passed).length;
              const failedCount = totalCount - passedCount;

              if (activeResults.length === 0) {
                return (
                  <div className="p-6 text-center text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded">
                    No execution results yet. Click <strong>Run Code</strong> or <strong>Submit Solution</strong> to evaluate.
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)]">
                    <span className="flex items-center gap-1.5">
                      <span>Execution Output Summary:</span>
                      {isSubmission && (
                        <span className="text-[10px] font-mono font-normal text-[var(--text-muted)]">
                          ({submissionResult.open_cases || 0} Sample + {submissionResult.hidden_cases || 0} Hidden)
                        </span>
                      )}
                    </span>
                    <span className={allPassed ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                      {allPassed
                        ? (isSubmission ? '✓ All Test Cases Passed' : '✓ All Sample Cases Passed')
                        : (isSubmission ? `✗ ${failedCount} Test Case(s) Failed` : '✗ Some Cases Failed')}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {activeResults.map((res, i) => {
                      const isHidden = !!res.is_hidden;
                      const passed = !!res.passed;

                      return (
                        <div
                          key={i}
                          className={`p-2.5 rounded-[var(--radius-sm)] border flex flex-col gap-1.5 transition-all ${
                            passed
                              ? 'bg-[var(--bg-raised)] hover:bg-[var(--bg-card)] border-[var(--border)]'
                              : 'bg-[var(--red-bg)]/40 hover:bg-[var(--red-bg)]/60 border-[var(--red)]/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 pr-2 flex-wrap">
                              {passed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)] shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-[var(--red)] shrink-0" />
                              )}

                              {isHidden ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                                    Hidden Case
                                  </span>
                                  <span className="font-bold text-[var(--text-primary)] text-[11px]">
                                    Case {res.index}:
                                  </span>
                                </div>
                              ) : (
                                <span className="font-bold text-[var(--text-primary)] shrink-0 text-[11px]">
                                  Case {res.index}:
                                </span>
                              )}

                              {/* Only show input string for open/sample cases or interviewer */}
                              {!isHidden && res.input && (
                                <span className="text-[var(--text-muted)] text-[11px] truncate max-w-[260px] sm:max-w-md font-mono">
                                  {res.input}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                              <span className={`font-bold text-[10px] uppercase px-1.5 py-0.2 rounded ${
                                passed
                                  ? 'bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30'
                                  : 'bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/30'
                              }`}>
                                {passed ? 'Passed' : 'Failed'}
                              </span>
                              {res.execution_ms !== undefined && (
                                <span className="text-[10px] text-[var(--text-muted)]">
                                  {res.execution_ms}ms
                                </span>
                              )}
                            </div>
                          </div>

                          {/* If case failed, only show output diff breakdown for open/sample cases (never for hidden cases) */}
                          {!passed && !isHidden && (
                            <div className="mt-1 pt-1.5 border-t border-[var(--border)] text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[var(--bg-card)]/60 p-2 rounded">
                              <div>
                                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Expected:</span>
                                <span className="text-[var(--green)] font-mono">{res.expected || 'Correct Result'}</span>
                              </div>
                              <div>
                                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Actual:</span>
                                <span className="text-[var(--red)] font-mono">{res.actual || 'Incorrect Output'}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
