import React from 'react';
import { X, AlertCircle, Plus, Eye, Lock } from 'lucide-react';

export default function QuestionFormModal({
  isOpen,
  onClose,
  currentLevel,
  questionForm,
  setQuestionForm,
  onSave,
  formError,
  formLoading,
}) {
  if (!isOpen || !currentLevel) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 w-full max-w-2xl shadow-[var(--shadow-lg)] space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div>
            <span className="badge-kicker">Question Configuration • {currentLevel.mode?.toUpperCase()}</span>
            <h3 className="text-[17px] font-bold text-[var(--text-primary)] mt-0.5">
              {questionForm.id ? 'Edit Question' : 'Upload Question'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <div className="p-3 bg-[var(--red-bg)] text-[var(--red)] text-[12px] rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={onSave} className="custom-form space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="sm:col-span-2">
              <span>Question Title</span>
              <input
                type="text"
                required
                value={questionForm.title}
                onChange={(e) => setQuestionForm({ ...questionForm, title: e.target.value })}
                placeholder="e.g. Reverse Linked List / Rate Limiter Design"
                className="custom-input"
              />
            </label>

            <label className="sm:col-span-1">
              <span>Difficulty</span>
              <select
                value={questionForm.difficulty}
                onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                className="custom-input"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </label>
          </div>

          <label>
            <span>Problem Statement / Prompt Description</span>
            <textarea
              rows="3"
              required
              value={questionForm.prompt}
              onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })}
              placeholder="Full question statement or scenario prompt given to the candidate..."
              className="custom-input font-mono text-[12px]"
            />
          </label>

          {/* DYNAMIC FORM FIELDS BY LEVEL MODE */}

          {/* 1. CODING & BACKEND MODE */}
          {(currentLevel.mode === 'coding' || currentLevel.mode === 'backend') && (
            <div className="space-y-4 pt-2 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-bold text-[var(--accent)] font-mono uppercase tracking-wider">
                  Coding Mode Specifications
                </h4>
              </div>

              <label>
                <span>Starter Code Boilerplate</span>
                <textarea
                  rows="4"
                  value={questionForm.starter_code}
                  onChange={(e) => setQuestionForm({ ...questionForm, starter_code: e.target.value })}
                  placeholder="func solution(nums []int) int {\n    // Code here\n}"
                  className="custom-input font-mono text-[12px]"
                />
              </label>

              <label>
                <span>Constraints</span>
                <input
                  type="text"
                  value={questionForm.constraints}
                  onChange={(e) => setQuestionForm({ ...questionForm, constraints: e.target.value })}
                  placeholder="e.g. 1 <= nums.length <= 10^5, -10^9 <= nums[i] <= 10^9"
                  className="custom-input font-mono text-[12px]"
                />
              </label>

              <label>
                <span>Solution Expected Approach</span>
                <textarea
                  rows="3"
                  value={questionForm.expected_approach}
                  onChange={(e) => setQuestionForm({ ...questionForm, expected_approach: e.target.value })}
                  placeholder="Optimal algorithmic steps (e.g. Single-Pass Hash Map, complement lookup O(N))..."
                  className="custom-input font-ui text-[12px]"
                />
              </label>

              <label>
                <span>Expected Complexity Target</span>
                <input
                  type="text"
                  value={questionForm.expected_complexity}
                  onChange={(e) => setQuestionForm({ ...questionForm, expected_complexity: e.target.value })}
                  placeholder="e.g. Time: O(N), Space: O(N)"
                  className="custom-input font-mono text-[12px]"
                />
              </label>

              {/* Progressive Hints */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
                    Progressive Hints (Hint 1, Hint 2, ...):
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, hints: [...questionForm.hints, ''] })}
                    className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add Hint
                  </button>
                </div>

                {questionForm.hints.map((hint, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[var(--text-muted)] font-bold w-14 shrink-0">
                      Hint #{idx + 1}:
                    </span>
                    <input
                      type="text"
                      placeholder={`Hint ${idx + 1} (e.g. Consider using a Hash Map for O(1) complement lookups)`}
                      value={hint}
                      onChange={(e) => {
                        const updated = [...questionForm.hints];
                        updated[idx] = e.target.value;
                        setQuestionForm({ ...questionForm, hints: updated });
                      }}
                      className="custom-input text-[12px] py-1.5 flex-1"
                    />
                    {questionForm.hints.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = questionForm.hints.filter((_, i) => i !== idx);
                          setQuestionForm({ ...questionForm, hints: updated });
                        }}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Interview Tips for Coding Mode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">
                    Interview Tips & Evaluator Notes:
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, interview_tips: [...questionForm.interview_tips, ''] })}
                    className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add Tip
                  </button>
                </div>

                {questionForm.interview_tips.map((tip, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Tip ${idx + 1} (e.g. Ask candidate to clarify input constraints before coding)`}
                      value={tip}
                      onChange={(e) => {
                        const updated = [...questionForm.interview_tips];
                        updated[idx] = e.target.value;
                        setQuestionForm({ ...questionForm, interview_tips: updated });
                      }}
                      className="custom-input text-[12px] py-1.5 flex-1"
                    />
                    {questionForm.interview_tips.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = questionForm.interview_tips.filter((_, i) => i !== idx);
                          setQuestionForm({ ...questionForm, interview_tips: updated });
                        }}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Open / Sample Test Cases */}
              <div className="p-3.5 bg-[var(--bg-input)] rounded-[var(--radius-sm)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-[var(--accent)]" />
                    <span className="text-[12px] font-bold text-[var(--text-primary)] font-ui">
                      Open Test Cases
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                      Visible to candidate
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, open_test_cases: [...questionForm.open_test_cases, { input: '', output: '' }] })}
                    className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add Open Case
                  </button>
                </div>

                <div className="space-y-2">
                  {questionForm.open_test_cases.map((tc, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Open Input ${idx + 1} (e.g. nums = [2,7,11], target = 9)`}
                        value={tc.input}
                        onChange={(e) => {
                          const updated = [...questionForm.open_test_cases];
                          updated[idx].input = e.target.value;
                          setQuestionForm({ ...questionForm, open_test_cases: updated });
                        }}
                        className="custom-input font-mono text-[11px] py-1.5 flex-1 bg-[var(--bg-card)]"
                      />
                      <input
                        type="text"
                        placeholder="Expected Output (e.g. [0,1])"
                        value={tc.output}
                        onChange={(e) => {
                          const updated = [...questionForm.open_test_cases];
                          updated[idx].output = e.target.value;
                          setQuestionForm({ ...questionForm, open_test_cases: updated });
                        }}
                        className="custom-input font-mono text-[11px] py-1.5 flex-1 bg-[var(--bg-card)]"
                      />
                      {questionForm.open_test_cases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = questionForm.open_test_cases.filter((_, i) => i !== idx);
                            setQuestionForm({ ...questionForm, open_test_cases: updated });
                          }}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                          title="Remove Test Case"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hidden Test Cases */}
              <div className="p-3.5 bg-[var(--amber-bg)]/20 rounded-[var(--radius-sm)] border border-[var(--amber)]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-[var(--amber)]" />
                    <span className="text-[12px] font-bold text-[var(--text-primary)] font-ui">
                      Hidden Test Cases
                    </span>
                    <span className="text-[10px] font-mono text-[var(--amber)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--amber)]/30 font-semibold">
                      Private / Evaluation only
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, hidden_test_cases: [...questionForm.hidden_test_cases, { input: '', output: '' }] })}
                    className="text-[11px] text-[var(--amber)] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add Hidden Case
                  </button>
                </div>

                <p className="text-[11px] text-[var(--text-secondary)]">
                  Hidden test cases are not revealed to students during the interview. They evaluate edge cases, boundary conditions, and large inputs during final test runs.
                </p>

                <div className="space-y-2">
                  {questionForm.hidden_test_cases.map((tc, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Hidden Input ${idx + 1} (e.g. nums = [-1,-2], target = -3)`}
                        value={tc.input}
                        onChange={(e) => {
                          const updated = [...questionForm.hidden_test_cases];
                          updated[idx].input = e.target.value;
                          setQuestionForm({ ...questionForm, hidden_test_cases: updated });
                        }}
                        className="custom-input font-mono text-[11px] py-1.5 flex-1 bg-[var(--bg-card)]"
                      />
                      <input
                        type="text"
                        placeholder="Expected Output (e.g. [0,1])"
                        value={tc.output}
                        onChange={(e) => {
                          const updated = [...questionForm.hidden_test_cases];
                          updated[idx].output = e.target.value;
                          setQuestionForm({ ...questionForm, hidden_test_cases: updated });
                        }}
                        className="custom-input font-mono text-[11px] py-1.5 flex-1 bg-[var(--bg-card)]"
                      />
                      {questionForm.hidden_test_cases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = questionForm.hidden_test_cases.filter((_, i) => i !== idx);
                            setQuestionForm({ ...questionForm, hidden_test_cases: updated });
                          }}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                          title="Remove Test Case"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. VERBAL Q&A MODE */}
          {currentLevel.mode === 'verbal_qa' && (
            <div className="space-y-4 pt-2 border-t border-[var(--border)]">
              <h4 className="text-[13px] font-bold text-[var(--amber)] font-mono uppercase tracking-wider">
                Verbal Q&A Specifications
              </h4>

              <label>
                <span>Ideal / Reference Answer (Evaluator Notes)</span>
                <textarea
                  rows="3"
                  value={questionForm.ideal_answer}
                  onChange={(e) => setQuestionForm({ ...questionForm, ideal_answer: e.target.value })}
                  placeholder="Expected key concepts, technical accuracy points, and architectural tradeoffs..."
                  className="custom-input"
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Evaluation Rubrics / Checklist:</span>
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, rubrics: [...questionForm.rubrics, ''] })}
                    className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add Rubric Point
                  </button>
                </div>

                {questionForm.rubrics.map((rubric, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Rubric item ${idx + 1} (e.g. Explains user vs kernel space)`}
                      value={rubric}
                      onChange={(e) => {
                        const updated = [...questionForm.rubrics];
                        updated[idx] = e.target.value;
                        setQuestionForm({ ...questionForm, rubrics: updated });
                      }}
                      className="custom-input text-[12px] py-1.5 flex-1"
                    />
                    {questionForm.rubrics.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = questionForm.rubrics.filter((_, i) => i !== idx);
                          setQuestionForm({ ...questionForm, rubrics: updated });
                        }}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Interview Tips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Interview Tips & Probing Questions:</span>
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, interview_tips: [...questionForm.interview_tips, ''] })}
                    className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add Tip
                  </button>
                </div>

                {questionForm.interview_tips.map((tip, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Tip ${idx + 1} (e.g. Follow up on M:N scheduler work stealing)`}
                      value={tip}
                      onChange={(e) => {
                        const updated = [...questionForm.interview_tips];
                        updated[idx] = e.target.value;
                        setQuestionForm({ ...questionForm, interview_tips: updated });
                      }}
                      className="custom-input text-[12px] py-1.5 flex-1"
                    />
                    {questionForm.interview_tips.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = questionForm.interview_tips.filter((_, i) => i !== idx);
                          setQuestionForm({ ...questionForm, interview_tips: updated });
                        }}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. MCQ MODE */}
          {currentLevel.mode === 'mcq' && (
            <div className="space-y-4 pt-2 border-t border-[var(--border)]">
              <h4 className="text-[13px] font-bold text-[var(--green)] font-mono uppercase tracking-wider">
                MCQ Multiple-Choice Specifications
              </h4>

              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase block">Answer Choices & Correct Key:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {questionForm.options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2 p-2 rounded bg-[var(--bg-input)] border border-[var(--border)]">
                      <input
                        type="radio"
                        name="correct_option"
                        checked={questionForm.correct_option === opt.id}
                        onChange={() => setQuestionForm({ ...questionForm, correct_option: opt.id })}
                        className="accent-[var(--green)]"
                      />
                      <span className="font-mono font-bold text-[12px] text-[var(--text-primary)]">{opt.id}.</span>
                      <input
                        type="text"
                        required
                        placeholder={`Option ${opt.id} text`}
                        value={opt.text}
                        onChange={(e) => {
                          const updated = [...questionForm.options];
                          updated[idx].text = e.target.value;
                          setQuestionForm({ ...questionForm, options: updated });
                        }}
                        className="custom-input text-[12px] py-1 flex-1 bg-[var(--bg-card)]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <label>
                <span>Explanation / Solution Rationale</span>
                <textarea
                  rows="2"
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="Why the correct option is right and others are incorrect..."
                  className="custom-input text-[12px]"
                />
              </label>

              {/* Interview Tips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Diagnostic Tips & Key Takeaways:</span>
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, interview_tips: [...questionForm.interview_tips, ''] })}
                    className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add Tip
                  </button>
                </div>

                {questionForm.interview_tips.map((tip, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Tip ${idx + 1} (e.g. Highlight amortized vs worst-case distinction)`}
                      value={tip}
                      onChange={(e) => {
                        const updated = [...questionForm.interview_tips];
                        updated[idx] = e.target.value;
                        setQuestionForm({ ...questionForm, interview_tips: updated });
                      }}
                      className="custom-input text-[12px] py-1.5 flex-1"
                    />
                    {questionForm.interview_tips.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = questionForm.interview_tips.filter((_, i) => i !== idx);
                          setQuestionForm({ ...questionForm, interview_tips: updated });
                        }}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. WHITEBOARD MODE */}
          {(currentLevel.mode === 'whiteboard' || currentLevel.mode === 'discussion') && (
            <div className="space-y-4 pt-2 border-t border-[var(--border)]">
              <h4 className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400 font-mono uppercase tracking-wider">
                Whiteboard & System Architecture Specifications
              </h4>

              <label>
                <span>Scenario Context / Scale Target</span>
                <textarea
                  rows="2"
                  value={questionForm.scenario}
                  onChange={(e) => setQuestionForm({ ...questionForm, scenario: e.target.value })}
                  placeholder="e.g. 100k requests/sec, 99.99% availability SLA, multi-region..."
                  className="custom-input text-[12px]"
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Key Discussion Talking Points:</span>
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, talking_points: [...questionForm.talking_points, ''] })}
                    className="text-[11px] text-sky-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add Talking Point
                  </button>
                </div>

                {questionForm.talking_points.map((tp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Talking Point ${idx + 1} (e.g. Consistent Hashing ring & virtual nodes)`}
                      value={tp}
                      onChange={(e) => {
                        const updated = [...questionForm.talking_points];
                        updated[idx] = e.target.value;
                        setQuestionForm({ ...questionForm, talking_points: updated });
                      }}
                      className="custom-input text-[12px] py-1.5 flex-1"
                    />
                    {questionForm.talking_points.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = questionForm.talking_points.filter((_, i) => i !== idx);
                          setQuestionForm({ ...questionForm, talking_points: updated });
                        }}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Architectural Tradeoffs to Evaluate:</span>
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, tradeoffs: [...questionForm.tradeoffs, ''] })}
                    className="text-[11px] text-sky-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add Tradeoff
                  </button>
                </div>

                {questionForm.tradeoffs.map((to, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Tradeoff ${idx + 1} (e.g. Strong Consistency vs High Availability under network partition)`}
                      value={to}
                      onChange={(e) => {
                        const updated = [...questionForm.tradeoffs];
                        updated[idx] = e.target.value;
                        setQuestionForm({ ...questionForm, tradeoffs: updated });
                      }}
                      className="custom-input text-[12px] py-1.5 flex-1"
                    />
                    {questionForm.tradeoffs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = questionForm.tradeoffs.filter((_, i) => i !== idx);
                          setQuestionForm({ ...questionForm, tradeoffs: updated });
                        }}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Interview Tips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Interviewer Facilitation & Probing Guide:</span>
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, interview_tips: [...questionForm.interview_tips, ''] })}
                    className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add Tip
                  </button>
                </div>

                {questionForm.interview_tips.map((tip, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Tip ${idx + 1} (e.g. Probe on clock skew drift with distributed Redis instances)`}
                      value={tip}
                      onChange={(e) => {
                        const updated = [...questionForm.interview_tips];
                        updated[idx] = e.target.value;
                        setQuestionForm({ ...questionForm, interview_tips: updated });
                      }}
                      className="custom-input text-[12px] py-1.5 flex-1"
                    />
                    {questionForm.interview_tips.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = questionForm.interview_tips.filter((_, i) => i !== idx);
                          setQuestionForm({ ...questionForm, interview_tips: updated });
                        }}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--red)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. FRONTEND (REACT) MODE */}
          {currentLevel.mode === 'frontend' && (
            <div className="space-y-4 pt-2 border-t border-[var(--border)]">
              <h4 className="text-[13px] font-bold text-cyan-600 dark:text-cyan-400 font-mono uppercase tracking-wider">
                Frontend (React) Design Specifications
              </h4>

              <label>
                <span>Design & Component Scenario Criteria</span>
                <textarea
                  rows="2"
                  value={questionForm.scenario}
                  onChange={(e) => setQuestionForm({ ...questionForm, scenario: e.target.value })}
                  placeholder="e.g. Build a responsive product card grid with interactive filtering and mobile drawer..."
                  className="custom-input text-[12px]"
                />
              </label>

              <label>
                <span>Responsive Breakpoint Requirements & Constraints</span>
                <textarea
                  rows="2"
                  value={questionForm.constraints}
                  onChange={(e) => setQuestionForm({ ...questionForm, constraints: e.target.value })}
                  placeholder="e.g. Mobile (<640px): 1 col stacked; Tablet (640px-1024px): 2 cols; Desktop (>1024px): 3 cols..."
                  className="custom-input text-[12px] font-mono"
                />
              </label>

              <label>
                <span>Starter React Component (JSX)</span>
                <textarea
                  rows="5"
                  value={questionForm.starter_code}
                  onChange={(e) => setQuestionForm({ ...questionForm, starter_code: e.target.value })}
                  placeholder={`export default function App() {\n  return (\n    <div className="p-4">\n      <h1 className="text-xl font-bold">Hello React</h1>\n    </div>\n  );\n}`}
                  className="custom-input text-[12px] font-mono bg-[#282c34] text-cyan-300 border-[#3e4451]"
                />
              </label>
            </div>
          )}

          {/* 6. DATABASE (ER & SQL) MODE */}
          {currentLevel.mode === 'database' && (
            <div className="space-y-4 pt-2 border-t border-[var(--border)]">
              <h4 className="text-[13px] font-bold text-blue-600 dark:text-blue-400 font-mono uppercase tracking-wider">
                Database Schema & SQL Specifications
              </h4>

              <label>
                <span>Schema Modeling & ER Scenario</span>
                <textarea
                  rows="2"
                  value={questionForm.scenario}
                  onChange={(e) => setQuestionForm({ ...questionForm, scenario: e.target.value })}
                  placeholder="e.g. Design a normalized e-commerce database with users, orders, and order items. Write a query to find top 5 customers by revenue."
                  className="custom-input text-[12px]"
                />
              </label>

              <label>
                <span>Pre-Seeded Schema DDL (CREATE TABLE statements)</span>
                <textarea
                  rows="4"
                  value={questionForm.starter_code}
                  onChange={(e) => setQuestionForm({ ...questionForm, starter_code: e.target.value })}
                  placeholder="CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(100), email VARCHAR(255));"
                  className="custom-input text-[12px] font-mono bg-[#282c34] text-cyan-300 border-[#3e4451]"
                />
              </label>

              <label>
                <span>Initial Seed Records (INSERT INTO statements)</span>
                <textarea
                  rows="3"
                  value={questionForm.seed_data || ''}
                  onChange={(e) => setQuestionForm({ ...questionForm, seed_data: e.target.value })}
                  placeholder="INSERT INTO users (id, username, email) VALUES (1, 'jaison', 'jaison@example.com');"
                  className="custom-input text-[12px] font-mono bg-[#282c34] text-emerald-300 border-[#3e4451]"
                />
              </label>

              <label>
                <span>Optimal Solution SQL Query (Benchmark for Interviewer)</span>
                <textarea
                  rows="3"
                  value={questionForm.expected_approach}
                  onChange={(e) => setQuestionForm({ ...questionForm, expected_approach: e.target.value })}
                  placeholder="SELECT u.id, u.username, SUM(o.amount) FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.id;"
                  className="custom-input text-[12px] font-mono bg-[#282c34] text-amber-300 border-[#3e4451]"
                />
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button type="button" onClick={onClose} className="btn btn-secondary text-xs py-2 px-3.5">
              Cancel
            </button>
            <button type="submit" disabled={formLoading} className="btn btn-primary text-xs py-2 px-4">
              {formLoading ? 'Saving...' : 'Save Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
