import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  limit = 10,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = true,
  showTotal = true,
  className = '',
}) {
  if (totalItems === 0 && totalPages <= 1) return null;

  const startItem = totalItems > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(page - 1);
        pages.push(page);
        pages.push(page + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] text-xs select-none ${className}`}
    >
      {/* Left: Range and Total Display */}
      {showTotal && (
        <div className="text-[var(--text-secondary)] font-medium">
          Showing <span className="font-mono font-bold text-[var(--text-primary)]">{startItem}</span>–
          <span className="font-mono font-bold text-[var(--text-primary)]">{endItem}</span> of{' '}
          <span className="font-mono font-bold text-[var(--text-primary)]">{totalItems}</span> items
        </div>
      )}

      {/* Right: Controls + Page Buttons */}
      <div className="flex items-center gap-2 flex-wrap ml-auto">
        {/* Page Size Selector */}
        {showPageSize && onLimitChange && (
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-[11px] text-[var(--text-muted)]">Per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                const newLimit = parseInt(e.target.value, 10);
                if (onLimitChange) onLimitChange(newLimit);
              }}
              className="bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] font-mono text-xs rounded-[var(--radius-sm)] px-2 py-1 focus:outline-none focus:border-[var(--border-accent)] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page Jump Navigation */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            title="First Page"
            className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            title="Previous Page"
            className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Numeric Page Buttons */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((pNum, i) =>
              pNum === '...' ? (
                <span key={`dots-${i}`} className="px-1.5 text-[var(--text-muted)] font-mono">
                  ...
                </span>
              ) : (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => onPageChange(pNum)}
                  className={`min-w-[28px] h-7 px-2 font-mono text-xs font-bold rounded-[var(--radius-sm)] border transition-all cursor-pointer ${
                    page === pNum
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {pNum}
                </button>
              )
            )}
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            title="Next Page"
            className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            title="Last Page"
            className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
