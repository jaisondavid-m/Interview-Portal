import React from 'react';
import { Plus, Clock, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { INTERVIEW_MODES, formatLevelName, formatFullLevelTitle, getModeMeta } from './constants';

export default function LevelListView({
  currentTrack,
  levels,
  onSelectLevel,
  onCreateLevel,
  onEditLevel,
  onDeleteLevel,
}) {
  return (
    <div className="space-y-6">
      {/* Track Summary Banner */}
      <div className="panel-card p-5 bg-[var(--bg-raised)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-[18px] font-bold text-[var(--text-primary)]">
            {currentTrack?.title || 'Loading Domain...'}
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)]">
            {currentTrack?.description || 'Define progression levels and assessment modes for this domain.'}
          </p>
        </div>

        <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-[var(--border)] pt-3 sm:pt-0 sm:pl-6 text-center shrink-0">
          <div>
            <p className="text-[20px] font-bold font-mono text-[var(--text-primary)]">
              {levels?.length || 0}
            </p>
            <p className="text-[11px] font-mono text-[var(--text-muted)]">Progression Levels</p>
          </div>
        </div>
      </div>

      {/* Level Cards List */}
      <div className="space-y-3.5">
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] flex items-center justify-between">
          <span>Configured Progression Tiers</span>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            Click any level to view and upload questions
          </span>
        </h3>

        {(!levels || levels.length === 0) ? (
          <div className="panel-card p-8 text-center space-y-3">
            <p className="text-[13px] text-[var(--text-muted)]">
              No levels created for this interview domain yet.
            </p>
            <button
              onClick={onCreateLevel}
              className="btn btn-primary text-xs py-2 px-4"
            >
              <Plus className="w-4 h-4" />
              <span>Create Level 1</span>
            </button>
          </div>
        ) : (
          levels.map((level) => {
            const modeMeta = getModeMeta(level.mode);
            const ModeIcon = modeMeta.icon;
            const questionsCount = level.questions_count || 0;

            return (
              <div
                key={level.id}
                onClick={() => onSelectLevel(level)}
                className="panel-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border)] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] font-mono uppercase text-[var(--text-muted)] font-semibold">Lvl</span>
                    <span className="text-[18px] font-bold font-mono text-[var(--text-primary)] leading-none">
                      {level.level_number}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[15px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {formatFullLevelTitle(level)}
                      </h4>

                      {/* Mode Badge */}
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${modeMeta.bg} ${modeMeta.color} ${modeMeta.border}`}>
                        <ModeIcon className="w-3 h-3" />
                        <span>{modeMeta.label}</span>
                      </span>
                    </div>

                    <p className="text-[12px] text-[var(--text-secondary)] line-clamp-1">
                      {level.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0">
                  <div className="flex items-center gap-3 text-[12px] font-mono text-[var(--text-muted)] flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {level.duration_minutes || 45} mins
                    </span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] font-semibold text-[var(--accent)]" title="Number of questions loaded for candidate per interview">
                      {level.question_count || (level.mode === 'mcq' ? 10 : 1)} { (level.question_count === 1 || (!level.question_count && level.mode !== 'mcq')) ? 'qn / session' : 'qns / session' }
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {questionsCount} {questionsCount === 1 ? 'in bank' : 'in bank'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditLevel(level);
                      }}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded"
                      title="Edit Level"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLevel(level);
                      }}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] rounded"
                      title="Delete Level"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
