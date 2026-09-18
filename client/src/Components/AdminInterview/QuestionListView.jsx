import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  HelpCircle,
  Upload,
  Download,
  CheckSquare,
  Square,
  MinusSquare,
  FileCode,
  FileSpreadsheet,
  EyeOff,
} from 'lucide-react';
import { getModeMeta } from './constants';

export default function QuestionListView({
  currentLevel,
  currentTrack,
  questions,
  onSelectQuestion,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onOpenBulkModal,
  onExportQuestions,
  onBulkDeleteQuestions,
  onToggleQuestionActive,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);

  const modeMeta = getModeMeta(currentLevel?.mode);
  const ModeIcon = modeMeta.icon;

  const isAllSelected = questions?.length > 0 && selectedIds.size === questions.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < (questions?.length || 0);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  };

  const handleToggleSelectQuestion = (qId, e) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  const handleExport = (format) => {
    setShowExportMenu(false);
    if (onExportQuestions) {
      const selected = selectedIds.size > 0
        ? questions.filter((q) => selectedIds.has(q.id))
        : questions;
      onExportQuestions(format, selected);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (onBulkDeleteQuestions) {
      onBulkDeleteQuestions(Array.from(selectedIds), () => setSelectedIds(new Set()));
    }
  };

  const activeCount = (questions || []).filter((q) => q.is_active !== false).length;
  const inactiveCount = (questions || []).length - activeCount;

  return (
    <div className="space-y-6">
      {/* Level Mode Callout Banner */}
      <div className={`p-4 rounded-[var(--radius-md)] border ${modeMeta.bg} ${modeMeta.border} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] ${modeMeta.color} shadow-[var(--shadow-sm)]`}>
            <ModeIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-muted)]">
              Level Assessment Mode
            </span>
            <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
              {modeMeta.label}
            </h3>
            <p className="text-[12px] text-[var(--text-secondary)]">
              {modeMeta.desc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--text-secondary)] flex-wrap">
          <span className="bg-[var(--bg-card)] px-2.5 py-1 rounded border border-[var(--border)]">
            ⏱ {currentLevel?.duration_minutes || 45} mins allotted
          </span>
          <span className="bg-[var(--bg-card)] px-2.5 py-1 rounded border border-[var(--border)] font-semibold text-[var(--accent)]" title="Configured number of questions loaded per session">
            🎯 {currentLevel?.question_count || (currentLevel?.mode === 'mcq' ? 10 : 1)} { (currentLevel?.question_count === 1 || (!currentLevel?.question_count && currentLevel?.mode !== 'mcq')) ? 'qn / session' : 'qns / session' }
          </span>
          {inactiveCount > 0 && (
            <span className="bg-[var(--bg-card)] px-2.5 py-1 rounded border border-[var(--border-strong)] text-[var(--text-muted)] flex items-center gap-1" title="Inactive questions are excluded from sessions">
              <EyeOff className="w-3 h-3" />
              {inactiveCount} inactive
            </span>
          )}
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar when questions are selected */}
      {selectedIds.size > 0 && (
        <div className="p-3 bg-[var(--accent-dim)] border border-[var(--border-accent)] rounded-[var(--radius-md)] flex items-center justify-between gap-4 animate-fadeIn shadow-xs flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-[11px] font-mono font-bold flex items-center justify-center">
              {selectedIds.size}
            </span>
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">
              {selectedIds.size} {selectedIds.size === 1 ? 'question' : 'questions'} selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleExport('json')}
              className="btn btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Download className="w-3 h-3 text-[var(--accent)]" />
              <span>Download JSON ({selectedIds.size})</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="btn btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-500" />
              <span>Download CSV ({selectedIds.size})</span>
            </button>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="btn btn-danger text-[11px] py-1.5 px-3 flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline ml-1 cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Questions List Header with Actions */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            {questions && questions.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] transition cursor-pointer"
                title={isAllSelected ? 'Deselect all questions' : 'Select all questions'}
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                ) : isIndeterminate ? (
                  <MinusSquare className="w-4 h-4 text-[var(--accent)]" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
            )}
            <div>
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
                Questions Bank ({questions?.length || 0})
                {activeCount < (questions?.length || 0) && (
                  <span className="ml-2 text-[11px] font-mono text-[var(--text-muted)] font-normal">
                    · {activeCount} active
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Click any question to view, edit test cases, hints, and starter codes. Toggle to include/exclude from sessions.
              </p>
            </div>
          </div>

          {/* Question Bank Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Download / Export Menu */}
            {questions && questions.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs hover:text-[var(--accent)]"
                  title="Download / Export Questions"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Download</span>
                  <span className="text-[10px] font-mono px-1 py-0.2 bg-[var(--bg-input)] rounded text-[var(--text-muted)]">
                    {questions.length}
                  </span>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-1.5 w-44 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-lg z-20 py-1 animate-scaleUp">
                    <button
                      type="button"
                      onClick={() => handleExport('json')}
                      className="w-full text-left px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Export as JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('csv')}
                      className="w-full text-left px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Export as CSV</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bulk Upload Button */}
            <button
              type="button"
              onClick={onOpenBulkModal}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 cursor-pointer font-semibold shadow-xs"
              title="Bulk Upload Questions (JSON/CSV)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Upload</span>
            </button>

            {/* Add Question Button */}
            <button
              type="button"
              onClick={onAddQuestion}
              className="btn btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 shadow-[var(--shadow-sm)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          </div>
        </div>

        {/* Question Cards List */}
        {(!questions || questions.length === 0) ? (
          <div className="panel-card p-10 text-center space-y-3">
            <HelpCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
            <p className="text-[13px] text-[var(--text-muted)]">
              No questions uploaded for this level yet.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={onOpenBulkModal}
                className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Bulk Upload JSON/CSV</span>
              </button>
              <button
                type="button"
                onClick={onAddQuestion}
                className="btn btn-primary text-xs py-2 px-4 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Question</span>
              </button>
            </div>
          </div>
        ) : (
          questions.map((q, qIndex) => {
            const isSelected = selectedIds.has(q.id);
            const isActive = q.is_active !== false; // default true
            return (
              <div
                key={q.id}
                onClick={() => isActive && onSelectQuestion(q)}
                className={`panel-card p-4 sm:p-5 transition-all group border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isActive
                    ? 'cursor-pointer hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]'
                    : 'cursor-default opacity-55 border-dashed'
                } ${
                  isSelected ? 'bg-[var(--accent-dim)]/40 border-[var(--border-accent)]' : 'bg-[var(--bg-card)] border-[var(--border)]'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Row Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleSelectQuestion(q.id, e)}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent)] transition cursor-pointer mt-0.5"
                    title={isSelected ? 'Deselect question' : 'Select question'}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <span className={`w-6 h-6 rounded-full font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 ${
                    isActive
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                      : 'bg-[var(--bg-input)] text-[var(--text-muted)]'
                  }`}>
                    {qIndex + 1}
                  </span>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-[15px] font-bold transition-colors ${
                        isActive
                          ? 'text-[var(--text-primary)] group-hover:text-[var(--accent)]'
                          : 'text-[var(--text-muted)]'
                      }`}>
                        {q.title}
                      </h4>
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                        q.difficulty === 'Easy' ? 'bg-[var(--green-bg)] text-[var(--green)]' :
                        q.difficulty === 'Hard' ? 'bg-[var(--red-bg)] text-[var(--red)]' :
                        'bg-[var(--amber-bg)] text-[var(--amber)]'
                      }`}>
                        {q.difficulty}
                      </span>
                      {q.test_cases && q.test_cases.length > 0 && (
                        <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-input)] px-1.5 py-0.5 rounded">
                          {q.test_cases.length} test cases
                        </span>
                      )}
                      {!isActive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-muted)]">
                          <EyeOff className="w-2.5 h-2.5" />
                          Excluded
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed font-ui">
                      {q.prompt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                  {/* Active toggle */}
                  {onToggleQuestionActive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleQuestionActive(q);
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors border focus:outline-none shrink-0 ${
                        isActive
                          ? 'bg-[var(--accent)] border-[var(--accent)]'
                          : 'bg-[var(--bg-input)] border-[var(--border-strong)]'
                      }`}
                      title={isActive ? 'Exclude from sessions (deactivate)' : 'Include in sessions (activate)'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          isActive ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditQuestion(q);
                    }}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded border border-transparent hover:border-[var(--border)] transition cursor-pointer"
                    title="Edit Question"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteQuestion(q);
                    }}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] rounded border border-transparent hover:border-[var(--red)]/20 transition cursor-pointer"
                    title="Delete Question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {isActive && (
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
