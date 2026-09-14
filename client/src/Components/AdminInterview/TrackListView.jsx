import React from 'react';
import { Search, Code, Edit2, Trash2, X } from 'lucide-react';

export default function TrackListView({
  tracks,
  searchQuery,
  setSearchQuery,
  onSelectTrack,
  onEditTrack,
  onDeleteTrack,
}) {
  const filteredTracks = (tracks || []).filter((t) => {
    return (
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-5">
      {/* Search Bar */}
      <div className="panel-card p-4">
        <div className="relative w-full max-w-md flex items-center">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search interview domains (e.g. DSA, System Design)..."
            className="custom-input search-input text-[12px] py-2"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tracks Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTracks.map((track) => {
          const totalQuestions = track.questions_count || 0;
          const levelsCount = track.levels_count || 0;

          return (
            <div
              key={track.id}
              className="data-card data-card-interactive p-5 flex flex-col justify-between group cursor-pointer"
              onClick={() => onSelectTrack(track)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)]">
                    <Code className="w-5 h-5" />
                  </div>

                  <div className="flex items-center gap-1">
                    <div
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-hover)] transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTrack(track);
                      }}
                      title="Edit Track"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </div>
                    <div
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--red)] rounded hover:bg-[var(--red-bg)] transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTrack(track);
                      }}
                      title="Delete Track"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    {track.title}
                  </h3>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                    {track.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                <div className="flex items-center gap-3">
                  <span>{levelsCount} {levelsCount === 1 ? 'Level' : 'Levels'}</span>
                  <span>•</span>
                  <span>{totalQuestions} {totalQuestions === 1 ? 'Question' : 'Questions'}</span>
                </div>
                <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Configure &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
