import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  BookOpen,
  GraduationCap,
  Sparkles,
  FileCheck2,
  RotateCcw,
  Edit3,
  ShieldCheck,
  Percent
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

export default function LabMarkEntryModal({
  isOpen,
  onClose,
  submissionDetail,
  onSave,
  submitting = false,
}) {
  if (!isOpen || !submissionDetail) return null;

  const sub = submissionDetail.submission || {};
  const student = submissionDetail.student || sub.student || {};
  const course = submissionDetail.course || {};
  const exp = submissionDetail.experiment || sub.experiment || {};
  const question = submissionDetail.question || sub.question || {};

  // Resolve rubric: Course-configured rubric or standard default 100-mark rubric
  const rubricList = useMemo(() => {
    if (course?.evaluation_rubric) {
      try {
        const parsed = JSON.parse(course.evaluation_rubric);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fallback to default
      }
    }
    return DEFAULT_LAB_RUBRIC;
  }, [course]);

  // Initial marks state parsed from existing submission marks breakdown or empty
  const [marksState, setMarksState] = useState({});
  const [facultyNotes, setFacultyNotes] = useState(sub.faculty_notes || 'Verified by Lab Incharge');

  useEffect(() => {
    let existingBreakdown = {};
    if (sub.marks_breakdown) {
      try {
        existingBreakdown = JSON.parse(sub.marks_breakdown);
      } catch {
        existingBreakdown = {};
      }
    }

    const initial = {};
    rubricList.forEach((crit) => {
      if (existingBreakdown[crit.key] !== undefined) {
        initial[crit.key] = Number(existingBreakdown[crit.key]);
      } else {
        // Default empty so faculty manually enters mark
        initial[crit.key] = '';
      }
    });

    setMarksState(initial);
    setFacultyNotes(sub.faculty_notes || 'Verified by Lab Incharge');
  }, [sub, rubricList]);

  // Calculate live grand total from faculty inputs
  const { totalMarks, maxPossibleMarks, percentage } = useMemo(() => {
    let sum = 0;
    let max = 0;
    rubricList.forEach((crit) => {
      const val = Number(marksState[crit.key]) || 0;
      sum += val;
      max += Number(crit.max_marks) || 0;
    });
    const pct = max > 0 ? Math.round((sum / max) * 100) : 0;
    return { totalMarks: sum, maxPossibleMarks: max, percentage: pct };
  }, [marksState, rubricList]);

  const handleMarkChange = (key, maxMarks, rawValue) => {
    if (rawValue === '') {
      setMarksState((prev) => ({ ...prev, [key]: '' }));
      return;
    }
    const num = Number(rawValue);
    if (isNaN(num)) return;
    const clamped = Math.max(0, Math.min(num, maxMarks));
    setMarksState((prev) => ({ ...prev, [key]: clamped }));
  };

  const handleFormSubmit = (status) => {
    // Construct clean marks breakdown object
    const breakdown = {};
    rubricList.forEach((crit) => {
      breakdown[crit.key] = Number(marksState[crit.key]) || 0;
    });
    breakdown['total'] = totalMarks;

    onSave({
      status,
      marks: totalMarks,
      marks_breakdown: breakdown,
      faculty_notes: facultyNotes,
    });
  };

  // Grade badge helper
  const getGradePill = (pct) => {
    if (pct >= 90) return { label: 'Outstanding (O)', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' };
    if (pct >= 80) return { label: 'Excellent (A+)', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' };
    if (pct >= 70) return { label: 'Very Good (A)', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' };
    if (pct >= 60) return { label: 'Good (B+)', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' };
    if (pct >= 50) return { label: 'Pass (B)', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' };
    return { label: 'Needs Improvement', color: 'bg-rose-500/10 text-rose-600 border-rose-500/30' };
  };

  const gradeInfo = getGradePill(percentage);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] w-full max-w-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header with Academic Course Banner */}
        <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                {course?.course_code || '22AI304'}
              </span>
              {course?.semester && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]">
                  {course?.semester}
                </span>
              )}
              {course?.academic_year && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]">
                  {course?.academic_year}
                </span>
              )}
            </div>

            <h2 className="text-[15px] sm:text-[17px] font-bold text-[var(--text-primary)] leading-snug">
              {course?.title || 'Principles of Programming Laboratory'}
            </h2>
            <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              {course?.department || 'Department of Artificial Intelligence and Data Science'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student & Experiment Context Strip */}
        <div className="px-5 py-2.5 bg-[var(--bg-input)] border-b border-[var(--border)] flex items-center justify-between gap-3 text-xs flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--text-primary)]">{student?.name || 'Student'}</span>
            <span className="font-mono text-[var(--text-muted)]">({student?.roll_no || 'N/A'})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">Experiment {exp?.experiment_no}:</span>
            <span className="font-semibold text-[var(--text-primary)] max-w-xs truncate">
              {question?.title || exp?.title}
            </span>
            {question?.question_code && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-bold">
                {question.question_code}
              </span>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body: Rubric Criteria Mark Entry */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          
          <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[var(--accent)]" />
                Evaluation Rubric Breakdown
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Award marks for each rubric component based on your review. Total score is computed automatically.
              </p>
            </div>
            
            <span className="text-[11px] font-mono text-[var(--text-secondary)] font-bold">
              Scale: Out of {maxPossibleMarks} Marks
            </span>
          </div>

          {/* Criteria Cards Grid */}
          <div className="space-y-3">
            {rubricList.map((crit, idx) => {
              const currentVal = marksState[crit.key];
              const numVal = Number(currentVal) || 0;
              const critPct = crit.max_marks > 0 ? Math.round((numVal / crit.max_marks) * 100) : 0;

              return (
                <div
                  key={crit.key || idx}
                  className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border)] hover:border-[var(--border-accent)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[var(--shadow-xs)]"
                >
                  <div className="space-y-1 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        {crit.label}
                      </h4>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)]">
                        Max: {crit.max_marks}
                      </span>
                    </div>
                    {crit.description && (
                      <p className="text-[11px] text-[var(--text-secondary)] pl-7 leading-relaxed">
                        {crit.description}
                      </p>
                    )}
                  </div>

                  {/* Mark Input with Max Badge */}
                  <div className="flex items-center gap-3 sm:pl-4 sm:border-l border-[var(--border)] shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max={crit.max_marks}
                          step="0.5"
                          value={currentVal}
                          onChange={(e) => handleMarkChange(crit.key, crit.max_marks, e.target.value)}
                          placeholder="0"
                          className="w-20 bg-[var(--bg-card)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-center font-mono font-bold text-sm text-[var(--text-primary)] focus:outline-none transition-all"
                        />
                        <span className="ml-2 font-mono text-xs text-[var(--text-muted)] font-semibold">
                          / {crit.max_marks}
                        </span>
                      </div>
                      {currentVal !== '' && (
                        <div className="text-[10px] font-mono text-emerald-600 mt-0.5">
                          {critPct}% scored
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand Total & Summary Card */}
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-card)] border-2 border-[var(--border-accent)] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Total Awarded Score:
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${gradeInfo.color}`}>
                  {gradeInfo.label}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Aggregated sum of all manual faculty rubric criteria marks.
              </p>
            </div>

            <div className="text-center sm:text-right shrink-0">
              <div className="text-2xl sm:text-3xl font-mono font-black text-[var(--accent)] tracking-tight">
                {totalMarks}{' '}
                <span className="text-sm font-semibold text-[var(--text-muted)]">
                  / {maxPossibleMarks}
                </span>
              </div>
              <div className="text-xs font-mono font-semibold text-[var(--text-secondary)]">
                Overall Percentage: <span className="font-bold text-[var(--text-primary)]">{percentage}%</span>
              </div>
            </div>
          </div>

          {/* Faculty Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-[var(--accent)]" />
              Faculty Evaluation Remarks / Notes
            </label>
            <textarea
              rows={2}
              value={facultyNotes}
              onChange={(e) => setFacultyNotes(e.target.value)}
              placeholder="e.g. Excellent conceptual clarity in viva; code algorithm is clean and well-structured."
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] focus:border-[var(--border-accent)] rounded-[var(--radius-sm)] p-3 text-xs text-[var(--text-primary)] focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleFormSubmit('REVISION_REQUIRED')}
              disabled={submitting}
              className="px-4 py-2 rounded-[var(--radius-sm)] bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Request Revision
            </button>

            <button
              type="button"
              onClick={() => handleFormSubmit('APPROVED')}
              disabled={submitting}
              className="px-5 py-2 rounded-[var(--radius-sm)] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving Marks...
                </>
              ) : (
                <>
                  <FileCheck2 className="w-4 h-4" />
                  Approve & Digitally Sign ({totalMarks}/{maxPossibleMarks})
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
