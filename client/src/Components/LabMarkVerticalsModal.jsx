import React, { useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  X,
  BookOpen,
  GraduationCap,
  Sparkles,
  FileCheck2,
  Clock,
  MessageSquareCheck,
  CheckCheck,
  Percent,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export const DEFAULT_LAB_RUBRIC = [
  {
    key: 'algorithm',
    label: 'Aim & Algorithm',
    description: 'Structure, sequential clarity, and logical correctness of procedure steps.',
    max_marks: 10,
  },
  {
    key: 'program',
    label: 'Program / Code Implementation',
    description: 'Code organization, correct syntax, appropriate logic, and edge-case handling.',
    max_marks: 40,
  },
  {
    key: 'output',
    label: 'Execution & Output',
    description: 'Successful compilation, test case verification, and clean execution output.',
    max_marks: 20,
  },
  {
    key: 'result',
    label: 'Result & Discussion',
    description: 'Analysis of algorithmic complexity, data interpretation, and final output.',
    max_marks: 10,
  },
  {
    key: 'viva',
    label: 'Oral Viva Voce',
    description: 'Verbal assessment of concept fundamentals, complexity, and problem solving.',
    max_marks: 20,
  },
];

export default function LabMarkVerticalsModal({
  isOpen,
  onClose,
  experiment,
  course,
  submission,
}) {
  if (!isOpen) return null;

  const sub = submission || {};
  const exp = experiment || {};
  const crs = course || {};

  // Parse evaluation rubric
  const rubricList = useMemo(() => {
    if (crs.evaluation_rubric) {
      try {
        const parsed = JSON.parse(crs.evaluation_rubric);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fallback to default
      }
    }
    return DEFAULT_LAB_RUBRIC;
  }, [crs]);

  // Parse breakdown JSON
  const breakdown = useMemo(() => {
    if (!sub.marks_breakdown) return {};
    if (typeof sub.marks_breakdown === 'object') return sub.marks_breakdown;
    try {
      return JSON.parse(sub.marks_breakdown);
    } catch {
      return {};
    }
  }, [sub.marks_breakdown]);

  // Grand Total Calculation
  const { totalMarks, maxPossibleMarks, percentage } = useMemo(() => {
    let max = 0;
    rubricList.forEach((crit) => {
      max += Number(crit.max_marks) || 0;
    });
    const total = sub.marks !== undefined && sub.marks !== null ? Number(sub.marks) : (Number(breakdown.total) || 0);
    const maxVal = max > 0 ? max : 100;
    const pct = Math.min(100, Math.round((total / maxVal) * 100));
    return { totalMarks: total, maxPossibleMarks: maxVal, percentage: pct };
  }, [rubricList, sub.marks, breakdown]);

  // Grade Pill Helper
  const getGradeInfo = (pct) => {
    if (pct >= 90) return { label: 'Outstanding (O)', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' };
    if (pct >= 80) return { label: 'Excellent (A+)', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' };
    if (pct >= 70) return { label: 'Very Good (A)', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' };
    if (pct >= 60) return { label: 'Good (B+)', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' };
    if (pct >= 50) return { label: 'Pass (B)', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' };
    return { label: 'Needs Improvement (F)', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30' };
  };

  const gradeInfo = getGradeInfo(percentage);
  const isApproved = sub.status === 'APPROVED';
  const isSubmitted = sub.status === 'SUBMITTED_FOR_VERIFICATION';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                Experiment #{exp.experiment_no || 1}
              </span>
              {crs.course_code && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]">
                  {crs.course_code}
                </span>
              )}
              {sub.status && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                    isApproved
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : isSubmitted
                      ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  }`}
                >
                  {isApproved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {isApproved ? 'Verified & Signed' : 'Submitted for Verification'}
                </span>
              )}
            </div>

            <h2 className="text-[16px] sm:text-[18px] font-bold text-[var(--text-primary)] leading-snug">
              {exp.title}
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {crs.title || 'Practical Laboratory Assessment'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 custom-scrollbar">
          
          {/* Total Score & Grade Highlight Box */}
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[var(--shadow-xs)]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent)] flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
                  Faculty Evaluation Mark Verticals
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-[var(--text-primary)]">
                    {totalMarks}
                  </span>
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    / {maxPossibleMarks} Total Marks
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--border)]">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${gradeInfo.color}`}>
                {gradeInfo.label}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                Grade Score: {percentage}%
              </span>
            </div>
          </div>

          {/* Sub-breakdown details (Code Marks vs Viva Marks) */}
          {(sub.code_marks !== undefined || sub.viva_marks !== undefined) && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-between">
                <span className="text-[var(--text-secondary)] font-medium">Code Implementation</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">{sub.code_marks || 0} Marks</span>
              </div>
              <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-between">
                <span className="text-[var(--text-secondary)] font-medium">Oral Viva Evaluation</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">{sub.viva_marks || 0} Marks</span>
              </div>
            </div>
          )}

          {/* Faculty Remarks / Notes */}
          {sub.faculty_notes && (
            <div className="p-3.5 rounded-[var(--radius-sm)] bg-indigo-500/5 border border-indigo-500/20 text-xs space-y-1">
              <div className="font-semibold text-indigo-900 flex items-center gap-1.5">
                <MessageSquareCheck className="w-4 h-4 text-indigo-600" />
                <span>Faculty Incharge Remarks:</span>
              </div>
              <p className="text-[var(--text-secondary)] italic leading-relaxed pl-5">
                "{sub.faculty_notes}"
              </p>
            </div>
          )}

          {/* Detailed Mark Verticals Breakdown List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" />
              Detailed Vertical Breakdown ({rubricList.length} Rubrics)
            </h3>

            {!isApproved && !Object.keys(breakdown).length ? (
              <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)] text-center text-xs text-[var(--text-muted)] italic">
                {isSubmitted
                  ? 'Your experiment is currently in the faculty viva queue. Specific vertical scores will appear here once faculty completes evaluation.'
                  : 'Faculty evaluation pending.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {rubricList.map((crit, idx) => {
                  const maxM = Number(crit.max_marks) || 10;
                  const val = breakdown[crit.key] !== undefined && breakdown[crit.key] !== null
                    ? Number(breakdown[crit.key])
                    : null;
                  const itemPct = val !== null && maxM > 0 ? Math.min(100, Math.round((val / maxM) * 100)) : 0;

                  return (
                    <div
                      key={crit.key || idx}
                      className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-xs)] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold w-5 h-5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {crit.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-xs">
                          {val !== null ? (
                            <span className="font-bold text-[var(--text-primary)]">
                              {val} <span className="text-[var(--text-muted)] font-normal">/ {maxM}</span>
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] italic text-[11px]">Pending</span>
                          )}
                        </div>
                      </div>

                      {crit.description && (
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed pl-7">
                          {crit.description}
                        </p>
                      )}

                      {/* Visual Vertical Bar */}
                      <div className="pl-7 pt-1">
                        <div className="w-full h-1.5 rounded-full bg-[var(--bg-raised)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              itemPct >= 85
                                ? 'bg-emerald-500'
                                : itemPct >= 70
                                ? 'bg-indigo-500'
                                : itemPct >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${itemPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] text-xs font-bold text-[var(--text-primary)] transition cursor-pointer"
          >
            Close Verticals Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
