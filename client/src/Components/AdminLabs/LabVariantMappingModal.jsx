import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Check,
  Sliders,
  ChevronDown
} from 'lucide-react';
import api from '../../api/axios';

export default function LabVariantMappingModal({
  isOpen,
  onClose,
  courseId,
  experiment,
  onSuccess
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoDistributing, setAutoDistributing] = useState(false);
  const [toast, setToast] = useState(null);

  const [variants, setVariants] = useState([]);
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);

  const [selectedSection, setSelectedSection] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [bulkVariantId, setBulkVariantId] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (isOpen && courseId && experiment?.id) {
      fetchAllocations();
    }
  }, [isOpen, courseId, experiment?.id, selectedSection]);

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/lab-incharge/courses/${courseId}/experiments/${experiment.id}/variant-allocations?section=${encodeURIComponent(
          selectedSection
        )}&search=${encodeURIComponent(searchQuery.trim())}`
      );
      setVariants(res?.variants || []);
      setStudents(res?.students || []);
      setSections(res?.sections || []);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to load variant allocations.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle single student variant change
  const handleStudentVariantChange = async (studentId, variantId) => {
    const vId = Number(variantId);
    if (!vId) return;

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) => {
        if (s.student_id === studentId) {
          const vObj = variants.find((v) => v.id === vId);
          return {
            ...s,
            variant_id: vId,
            variant_code: vObj?.variant_code || '',
            variant_title: vObj?.title || '',
            is_manually_mapped: true,
          };
        }
        return s;
      })
    );

    try {
      await api.post(`/lab-incharge/courses/${courseId}/experiments/${experiment.id}/variant-allocations`, {
        student_id: studentId,
        variant_id: vId,
      });
      showToast('Student variant mapping updated!', 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to update variant mapping.', 'error');
      fetchAllocations();
    }
  };

  // Handle Bulk Assignment to selected students
  const handleBulkAssign = async () => {
    if (selectedStudentIds.length === 0) {
      showToast('Please select at least one student.', 'error');
      return;
    }
    if (!bulkVariantId) {
      showToast('Please choose a target variant for bulk assignment.', 'error');
      return;
    }

    const vId = Number(bulkVariantId);
    try {
      setSaving(true);
      const allocations = selectedStudentIds.map((sId) => ({
        student_id: sId,
        variant_id: vId,
      }));
      await api.post(`/lab-incharge/courses/${courseId}/experiments/${experiment.id}/variant-allocations`, {
        allocations,
      });
      showToast(`Assigned ${allocations.length} student(s) to selected variant!`, 'success');
      setSelectedStudentIds([]);
      fetchAllocations();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Bulk assignment failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle 1-Click Auto Distribution (Round-robin)
  const handleAutoDistribute = async (mode = 'round_robin') => {
    if (variants.length === 0) {
      showToast('No variants configured for this experiment.', 'error');
      return;
    }
    try {
      setAutoDistributing(true);
      const res = await api.post(
        `/lab-incharge/courses/${courseId}/experiments/${experiment.id}/variant-allocations/auto`,
        {
          section: selectedSection,
          mode,
        }
      );
      showToast(res?.message || 'Variants distributed evenly across students!', 'success');
      fetchAllocations();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to auto-distribute variants.', 'error');
    } finally {
      setAutoDistributing(false);
    }
  };

  // Filter students by search term
  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roll_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.student_id));
    }
  };

  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Variant stats
  const variantDistribution = variants.map((v) => {
    const count = students.filter((s) => s.variant_id === v.id).length;
    return { ...v, count };
  });

  const allocatedCount = students.filter((s) => s.variant_id > 0).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="panel-card w-full max-w-5xl max-h-[92vh] flex flex-col bg-[var(--bg-raised)] border border-[var(--border)] shadow-2xl rounded-[var(--radius-lg)] overflow-hidden">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] text-xs font-semibold shadow-lg border animate-slide-up ${
              toast.type === 'error'
                ? 'bg-[var(--red-bg)] text-[var(--red)] border-[var(--red)]/30'
                : 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{toast.msg}</span>
          </div>
        )}

        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-card)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)]">
                  Exp {experiment?.experiment_no || 1}
                </span>
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] truncate">
                  {experiment?.title}
                </span>
              </div>
              <h2 className="text-[16px] font-bold text-[var(--text-primary)]">
                Student Variant Mapping & Allocation
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Distribution Summary & Action Bar */}
        <div className="px-6 py-3 bg-[var(--bg-card)]/50 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Variant Counts Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mr-1">
              Distribution:
            </span>
            {variantDistribution.map((v) => (
              <span
                key={v.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border)] text-[var(--text-primary)] font-mono text-[11px]"
              >
                <span className="font-bold text-[var(--accent)]">{v.variant_code}:</span>
                <span className="font-semibold">{v.count} students</span>
              </span>
            ))}
            <span className="text-[11px] text-[var(--text-muted)] ml-1">
              ({allocatedCount}/{students.length} assigned)
            </span>
          </div>

          {/* 1-Click Auto-Distribute */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleAutoDistribute('round_robin')}
              disabled={autoDistributing || variants.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--border-accent)] hover:bg-[var(--accent)] hover:text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
              title="Evenly assigns Variant A, B, C... in alternating round-robin across roster"
            >
              {autoDistributing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Auto-Distribute (Round-Robin)
            </button>
          </div>
        </div>

        {/* Filter Controls & Bulk Action Bar */}
        <div className="p-4 bg-[var(--bg-raised)] border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 max-w-xl">
            {/* Section Filter */}
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] transition cursor-pointer"
            >
              <option value="ALL">All Sections</option>
              {sections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students by roll no, name, or email..."
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] transition"
              />
            </div>
          </div>

          {/* Bulk Assign Controls */}
          {selectedStudentIds.length > 0 && (
            <div className="flex items-center gap-2 bg-[var(--accent-dim)] border border-[var(--border-accent)] px-3 py-1.5 rounded-[var(--radius-sm)] animate-fade-in shrink-0">
              <span className="text-[11px] font-bold text-[var(--accent)]">
                {selectedStudentIds.length} Selected
              </span>
              <select
                value={bulkVariantId}
                onChange={(e) => setBulkVariantId(e.target.value)}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-accent)] cursor-pointer"
              >
                <option value="">Choose Variant...</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    Assign to {v.variant_code} ({v.title})
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={saving || !bulkVariantId}
                className="px-3 py-1 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
              </button>
            </div>
          )}
        </div>

        {/* Student Roster Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-[var(--text-muted)] gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
              <span className="text-sm">Loading enrolled student allocations...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Users className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No students found matching current filters.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border)] z-10 text-[11px] font-mono text-[var(--text-secondary)] uppercase">
                <tr>
                  <th className="py-2.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudents.length > 0 &&
                        selectedStudentIds.length === filteredStudents.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-[var(--border)] text-[var(--accent)] cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-4">Roll No / Reg No</th>
                  <th className="py-2.5 px-4">Student Name</th>
                  <th className="py-2.5 px-4">Section</th>
                  <th className="py-2.5 px-4">Mapped Variant</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-sans">
                {filteredStudents.map((s) => {
                  const isSelected = selectedStudentIds.includes(s.student_id);
                  const isAssigned = s.variant_id > 0;

                  return (
                    <tr
                      key={s.student_id}
                      className={`hover:bg-[var(--bg-hover)] transition-colors ${
                        isSelected ? 'bg-[var(--accent-dim)]/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudent(s.student_id)}
                          className="rounded border-[var(--border)] text-[var(--accent)] cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[var(--text-primary)]">
                        {s.roll_no || '—'}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-[var(--text-primary)]">{s.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">{s.email}</div>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-medium text-[var(--text-secondary)]">
                        {s.section || 'General'}
                      </td>
                      <td className="py-2.5 px-4">
                        {/* Interactive Variant Dropdown */}
                        <select
                          value={s.variant_id || ''}
                          onChange={(e) =>
                            handleStudentVariantChange(s.student_id, e.target.value)
                          }
                          className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] border font-mono text-xs font-bold transition cursor-pointer focus:outline-none ${
                            isAssigned
                              ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--border-accent)]'
                              : 'bg-[var(--bg-input)] text-[var(--text-muted)] border-[var(--border)]'
                          }`}
                        >
                          <option value="">Unassigned</option>
                          {variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              Variant {v.variant_code} ({v.title})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2.5 px-4">
                        {isAssigned ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-500 font-bold">
                            <Check className="w-3 h-3" />
                            Allocated
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[var(--bg-card)] border-t border-[var(--border)] flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            Students will automatically receive problem statements and questions from their assigned variant in the lab workspace.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-white text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
