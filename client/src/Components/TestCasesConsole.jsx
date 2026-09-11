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
}) {
  const [activeTab, setActiveTab] = useState('sample'); // 'sample' | 'custom' | 'result'
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [customInput, setCustomInput] = useState('nums = [2,7,11,15], target = 9');

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
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('sample')}
            className={`px-3 py-1 text-[11px] font-mono font-bold rounded transition-all ${
              activeTab === 'sample'
                ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Sample Cases ({openTestCases.length || 2})
          </button>

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

          {(runResults || submissionResult) && (
            <button
              type="button"
              onClick={() => setActiveTab('result')}
              className={`px-3 py-1 text-[11px] font-mono font-bold rounded transition-all flex items-center gap-1 ${
                activeTab === 'result'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span>Verdict & Output</span>
            </button>
          )}
        </div>

        {/* Action Run & Submit Buttons */}
        {isCandidate && (
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
        )}
      </div>

      {/* Tab Content Panel */}
      <div className="p-4 space-y-3 min-h-[160px] max-h-[260px] overflow-y-auto">
        {/* TAB 1: Sample Test Cases */}
        {activeTab === 'sample' && (
          <div className="space-y-3">
            {/* Case selector pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {openTestCases.map((tc, idx) => {
                const isSelected = selectedCaseIdx === idx;
                const result = runResults?.results?.[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedCaseIdx(idx)}
                    className={`px-3 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span>Case {idx + 1}</span>
                    {result && (
                      result.passed ? (
                        <CheckCircle2 className="w-3 h-3 text-[var(--green)]" />
                      ) : (
                        <XCircle className="w-3 h-3 text-[var(--red)]" />
                      )
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Case Content */}
            {openTestCases[selectedCaseIdx] && (
              <div className="space-y-2.5 bg-[var(--bg-raised)] p-3 rounded-[var(--radius-sm)] border border-[var(--border)] font-mono text-[12px]">
                <div>
                  <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold block mb-1">
                    Input:
                  </span>
                  <div className="bg-[var(--bg-input)] p-2 rounded border border-[var(--border)] text-[var(--text-primary)]">
                    {openTestCases[selectedCaseIdx].input || 'N/A'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold block mb-1">
                    Expected Output:
                  </span>
                  <div className="bg-[var(--bg-input)] p-2 rounded border border-[var(--border)] text-[var(--green)] font-bold">
                    {openTestCases[selectedCaseIdx].output || 'N/A'}
                  </div>
                </div>

                {runResults?.results?.[selectedCaseIdx] && (
                  <div>
                    <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold block mb-1">
                      Actual Execution Output:
                    </span>
                    <div className="bg-[var(--bg-input)] p-2 rounded border border-[var(--border)] text-[var(--text-primary)]">
                      {runResults.results[selectedCaseIdx].actual}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Custom Test Case */}
        {activeTab === 'custom' && (
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-[var(--text-muted)] font-bold uppercase">
              Custom Execution Arguments:
            </span>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="e.g. nums = [1, 5, 8], target = 9"
              rows={3}
              className="w-full custom-input font-mono text-[12px] p-2.5 resize-none bg-[var(--bg-input)]"
            />
            <p className="text-[11px] text-[var(--text-muted)] font-mono">
              Tip: Provide parameter assignments to test custom edge cases. Click <strong>Run Code</strong> to evaluate.
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
                      <CheckCircle2 className="w-5 h-5 text-[var(--green)]" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[var(--red)]" />
                    )}
                    <h4 className="text-[16px] font-bold">
                      {submissionResult.verdict}
                    </h4>
                  </div>
                  <p className="text-[11px] opacity-90">
                    Passed {submissionResult.passed_cases} of {submissionResult.total_cases} test cases ({submissionResult.hidden_cases} hidden test cases evaluated)
                  </p>
                </div>

                <div className="text-right text-[11px] opacity-80">
                  <div>Runtime: {submissionResult.runtime_ms} ms</div>
                  <div>Memory: {submissionResult.memory_mb}</div>
                </div>
              </div>
            )}

            {runResults && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)]">
                  <span>Execution Output Summary:</span>
                  <span className={runResults.all_passed ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
                    {runResults.all_passed ? '✓ All Sample Cases Passed' : '✗ Some Cases Failed'}
                  </span>
                </div>

                {runResults.results?.map((res, i) => (
                  <div key={i} className="p-2.5 bg-[var(--bg-raised)] rounded border border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {res.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)]" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-[var(--red)]" />
                      )}
                      <span>Case {res.index}:</span>
                      <span className="text-[var(--text-muted)]">{res.input}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">{res.execution_ms}ms</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
