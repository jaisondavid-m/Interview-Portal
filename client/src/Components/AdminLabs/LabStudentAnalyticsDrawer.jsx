import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Code2,
  Terminal,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  User,
  Sliders,
  ShieldCheck,
  FileCheck2
} from 'lucide-react';

export default function LabStudentAnalyticsDrawer({
  isOpen,
  onClose,
  studentData,
  onOpenScheduleOverride,
}) {
  const navigate = useNavigate();
  if (!isOpen || !studentData) return null;

  const {
    student_id,
    name,
    roll_no,
    email,
    section,
    department,
    completed_count = 0,
    total_experiments = 7,
    total_marks = 0,
    overall_pct = 0,
    experiments = [],
  } = studentData;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return { label: 'Approved & Signed', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' };
      case 'SUBMITTED_FOR_VERIFICATION':
        return { label: 'Pending Review', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' };
      case 'TEST_PASSED':
        return { label: 'Tests Passed (Draft)', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30' };
      case 'DRAFT':
        return { label: 'In Progress', cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
      case 'REVISION_REQUIRED':
        return { label: 'Revision Requested', cls: 'bg-rose-500/10 text-rose-500 border-rose-500/30' };
      default:
        return { label: 'Not Started', cls: 'bg-[var(--bg-input)] text-[var(--text-muted)] border-[var(--border)]' };
    }
  };

  const parseBreakdown = (raw) => {
    if (!raw) return null;
    try {
      return typeof raw === 'object' ? raw : JSON.parse(raw);
    } catch {
      return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[var(--bg-card)] border-l border-[var(--border)] h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] font-bold text-lg">
              {name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">{name}</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)]">
                  {roll_no || `ID#${student_id}`}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {section ? `Section ${section}` : 'General'} {department ? `• ${department}` : ''} {email ? `• ${email}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[var(--bg-input)] text-[var(--text-muted)] hover:text-[var(--red)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top KPI Cards */}
        <div className="p-6 border-b border-[var(--border)] bg-[var(--bg-card)] grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border)] text-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] block">
              Completed Labs
            </span>
            <span className="text-lg font-mono font-bold text-[var(--accent)] mt-0.5 block">
              {completed_count} / {total_experiments}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border)] text-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] block">
              Total Marks
            </span>
            <span className="text-lg font-mono font-bold text-emerald-500 mt-0.5 block">
              {total_marks}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border)] text-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] block">
              Score %
            </span>
            <span className="text-lg font-mono font-bold text-[var(--text-primary)] mt-0.5 block">
              {overall_pct}%
            </span>
          </div>
        </div>

        {/* Experiment Progress Details List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Experiment-by-Experiment Breakdown
            </h3>
            <span className="text-[11px] text-[var(--text-muted)]">
              {experiments.length} Curriculum Modules
            </span>
          </div>

          <div className="space-y-3">
            {experiments.map((exp) => {
              const statusInfo = getStatusBadge(exp.status);
              const breakdown = parseBreakdown(exp.marks_breakdown);
              const hasOverride = !!exp.override_window;

              return (
                <div
                  key={exp.experiment_id}
                  className="p-4 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border)] hover:border-[var(--accent)]/40 transition-all space-y-3"
                >
                  {/* Top Line */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--accent)] bg-[var(--accent-dim)] px-2 py-0.5 rounded border border-[var(--border-accent)]">
                          Ex {exp.experiment_no}
                        </span>
                        {exp.question_code && (
                          <span className="font-mono text-[10px] text-[var(--text-muted)]">
                            [{exp.question_code}]
                          </span>
                        )}
                      </div>
                      {exp.question_title && (
                        <p className="text-xs font-semibold text-[var(--text-primary)] pt-1">
                          {exp.question_title}
                        </p>
                      )}
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusInfo.cls} shrink-0`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[var(--border)]/60 text-xs text-[var(--text-secondary)]">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">Attempts</span>
                      <strong className="text-[var(--text-primary)] font-mono">
                        {exp.attempt_count > 0 ? `${exp.attempt_count} ${exp.attempt_count === 1 ? 'Attempt' : 'Attempts'}` : '0 Attempts'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">Test Cases</span>
                      <strong className="text-[var(--text-primary)] font-mono">
                        {exp.pass_count !== undefined && exp.total_test_cases > 0
                          ? `${exp.pass_count}/${exp.total_test_cases} Passed`
                          : '—'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">Awarded Marks</span>
                      <strong className="text-emerald-500 font-mono font-bold">
                        {exp.marks > 0 ? `${exp.marks} / 100` : '—'}
                      </strong>
                    </div>
                  </div>

                  {/* Rubric Breakdown Pills if available */}
                  {breakdown && (
                    <div className="p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] space-y-1.5">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                        Rubric Score Details
                      </span>
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                        {breakdown.algorithm !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)]">
                            Algo: <strong className="text-[var(--text-primary)]">{breakdown.algorithm}/10</strong>
                          </span>
                        )}
                        {breakdown.program !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)]">
                            Program: <strong className="text-[var(--text-primary)]">{breakdown.program}/40</strong>
                          </span>
                        )}
                        {breakdown.output !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)]">
                            Output: <strong className="text-[var(--text-primary)]">{breakdown.output}/20</strong>
                          </span>
                        )}
                        {breakdown.result !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)]">
                            Result: <strong className="text-[var(--text-primary)]">{breakdown.result}/10</strong>
                          </span>
                        )}
                        {breakdown.viva !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)]">
                            Viva: <strong className="text-[var(--text-primary)]">{breakdown.viva}/20</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Faculty Notes */}
                  {exp.faculty_notes && (
                    <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-card)] p-2 rounded-lg border border-[var(--border)] italic">
                      Notes: "{exp.faculty_notes}"
                    </div>
                  )}

                  {/* Actions Bar: Evaluate Submission & Schedule Override */}
                  <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                    {hasOverride ? (
                      <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Individual Override Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        Standard Class Schedule
                      </span>
                    )}

                    <div className="flex items-center gap-3">
                      {exp.submission_id ? (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            navigate(`/lab-incharge/evaluate/${exp.submission_id}`);
                          }}
                          className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Award className="w-3 h-3" />
                          Evaluate Submission &rarr;
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => onOpenScheduleOverride(student_id, exp.experiment_id)}
                        className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sliders className="w-3 h-3" />
                        {hasOverride ? 'Edit Window' : 'Grant Extension'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
