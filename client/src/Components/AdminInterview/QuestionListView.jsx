import React from 'react';
import { Plus, Edit2, Trash2, ChevronRight, HelpCircle } from 'lucide-react';
import { getModeMeta } from './constants';

export default function QuestionListView({
  currentLevel,
  questions,
  onSelectQuestion,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
}) {
  const modeMeta = getModeMeta(currentLevel?.mode);
  const ModeIcon = modeMeta.icon;

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

        <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--text-secondary)]">
          <span className="bg-[var(--bg-card)] px-2.5 py-1 rounded border border-[var(--border)]">
            ⏱ {currentLevel?.duration_minutes || 45} mins allotted
          </span>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-[var(--text-primary)]">
            Questions Bank ({questions?.length || 0})
          </h3>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            Click any question to view full specifications
          </span>
        </div>

        {(!questions || questions.length === 0) ? (
          <div className="panel-card p-10 text-center space-y-3">
            <HelpCircle className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
            <p className="text-[13px] text-[var(--text-muted)]">
              No questions uploaded for this level yet.
            </p>
            <button
              onClick={onAddQuestion}
              className="btn btn-primary text-xs py-2 px-4"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Question</span>
            </button>
          </div>
        ) : (
          questions.map((q, qIndex) => {
            return (
              <div
                key={q.id}
                onClick={() => onSelectQuestion(q)}
                className="panel-card p-5 cursor-pointer hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all group bg-[var(--bg-card)] border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {qIndex + 1}
                  </span>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-[15px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {q.title}
                      </h4>
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                        q.difficulty === 'Easy' ? 'bg-[var(--green-bg)] text-[var(--green)]' :
                        q.difficulty === 'Hard' ? 'bg-[var(--red-bg)] text-[var(--red)]' :
                        'bg-[var(--amber-bg)] text-[var(--amber)]'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>
                    <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed font-ui">
                      {q.prompt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditQuestion(q);
                    }}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded border border-transparent hover:border-[var(--border)] transition"
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
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] rounded border border-transparent hover:border-[var(--red)]/20 transition"
                    title="Delete Question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
