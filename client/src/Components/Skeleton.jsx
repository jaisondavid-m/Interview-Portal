import React from 'react';

/**
 * Base shimmer block component
 */
export function Skeleton({ className = '', variant = 'rect', ...props }) {
  const variantClass =
    variant === 'circle'
      ? 'rounded-full'
      : variant === 'badge'
      ? 'rounded-full h-5 w-16'
      : variant === 'text'
      ? 'rounded-[4px] h-4 w-3/4'
      : 'rounded-[var(--radius-md)]';

  return (
    <div
      className={`skeleton-shimmer shrink-0 ${variantClass} ${className}`}
      {...props}
    />
  );
}

/**
 * Skeleton for Level Progression Tiers (Admin / Student)
 */
export function SkeletonLevels({ count = 3 }) {
  return (
    <div className="space-y-3.5 animate-fadeIn">
      {/* Top Banner Skeleton */}
      <div className="panel-card p-5 bg-[var(--bg-raised)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[var(--border)]">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Skeleton className="h-8 w-20 rounded-[var(--radius-sm)]" />
        </div>
      </div>

      {/* Subheader */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-32" />
      </div>

      {/* Level Cards */}
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="panel-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[var(--border)]"
        >
          <div className="flex items-start gap-4 flex-1">
            <Skeleton className="w-12 h-12 rounded-[var(--radius-md)]" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
          </div>
          <div className="flex items-center gap-4 border-t md:border-t-0 pt-2 md:pt-0">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-16 rounded-[var(--radius-sm)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Question Bank List (Admin)
 */
export function SkeletonQuestions({ count = 4 }) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Mode Callout Banner */}
      <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-raised)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="w-9 h-9 rounded-[var(--radius-sm)]" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-32 rounded" />
          <Skeleton className="h-7 w-28 rounded" />
        </div>
      </div>

      {/* Action Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-60 rounded-[var(--radius-sm)]" />
        </div>
      </div>

      {/* Question Items */}
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="panel-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[var(--border)]"
          >
            <div className="flex items-start gap-3.5 flex-1">
              <Skeleton className="w-5 h-5 rounded mt-0.5" />
              <Skeleton className="w-6 h-6 rounded-full mt-0.5" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Skeleton className="h-4 w-60" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full max-w-xl" />
                <div className="flex items-center gap-3 pt-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded" />
              <Skeleton className="h-7 w-7 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for Question Details View
 */
export function SkeletonQuestionDetail() {
  return (
    <div className="panel-card p-6 space-y-6 animate-fadeIn border border-[var(--border)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-72" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-8 w-20 rounded-[var(--radius-sm)]" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-raised)] space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-14 w-full" />
        </div>
        <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-raised)] space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Track Grid Cards (Admin & Student Dashboard)
 */
export function SkeletonTrackGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fadeIn">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="panel-card p-6 flex flex-col justify-between border border-[var(--border)] space-y-4 bg-[var(--bg-card)]"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="w-11 h-11 rounded-[var(--radius-md)]" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-full max-w-sm" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-28 rounded-[var(--radius-sm)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Table Rows (Users, Interview History, Leaderboard)
 */
export function SkeletonTableRows({ rows = 6, cols = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="border-b border-[var(--border)] animate-fadeIn">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="py-3.5 px-4">
              {cIdx === 0 ? (
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-7 h-7 rounded-full" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              ) : cIdx === 1 ? (
                <Skeleton className="h-3.5 w-32" />
              ) : cIdx === cols - 1 ? (
                <div className="flex items-center justify-end gap-1.5">
                  <Skeleton className="h-7 w-7 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
              ) : (
                <Skeleton className="h-4 w-20 rounded-full" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Skeleton for Dashboard / Metrics Stat Cards
 */
export function SkeletonStatsGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="panel-card p-5 border border-[var(--border)] space-y-3 bg-[var(--bg-card)]"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="w-8 h-8 rounded-[var(--radius-sm)]" />
          </div>
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      ))}
    </div>
  );
}
