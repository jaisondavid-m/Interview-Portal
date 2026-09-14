import React from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import { INTERVIEW_MODES } from './constants';

export default function LevelModal({
  isOpen,
  onClose,
  levelForm,
  setLevelForm,
  onSave,
  formError,
  formLoading,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 w-full max-w-lg shadow-[var(--shadow-lg)] space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div>
            <span className="badge-kicker">Progression Setup</span>
            <h3 className="text-[17px] font-bold text-[var(--text-primary)] mt-0.5">
              {levelForm.id ? 'Edit Progression Level' : 'Add Progression Level'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <div className="p-3 bg-[var(--red-bg)] text-[var(--red)] text-[12px] rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={onSave} className="custom-form space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <label className="col-span-1">
              <span>Level #</span>
              <input
                type="number"
                min="1"
                required
                value={levelForm.level_number}
                onChange={(e) => setLevelForm({ ...levelForm, level_number: parseInt(e.target.value) || 1 })}
                className="custom-input"
              />
            </label>

            <label className="col-span-2">
              <span>Duration (Mins)</span>
              <input
                type="number"
                min="10"
                step="5"
                value={levelForm.duration_minutes}
                onChange={(e) => setLevelForm({ ...levelForm, duration_minutes: parseInt(e.target.value) || 45 })}
                className="custom-input"
              />
            </label>
          </div>

          <label>
            <span>Level Name</span>
            <input
              type="text"
              required
              value={levelForm.name}
              onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
              placeholder="e.g. Fundamentals & Basic Hashing"
              className="custom-input"
            />
          </label>

          {/* Mode Selector Cards */}
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] block mb-2 font-ui">
              Select Interview Assessment Mode:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {INTERVIEW_MODES.map((mode) => {
                const ModeIcon = mode.icon;
                const isSelected = levelForm.mode === mode.id;
                return (
                  <div
                    key={mode.id}
                    onClick={() => setLevelForm({ ...levelForm, mode: mode.id })}
                    className={`p-3 rounded-[var(--radius-sm)] border cursor-pointer transition-all ${
                      isSelected
                        ? `${mode.bg} border-[var(--accent)] shadow-[0_0_0_1.5px_var(--accent)]`
                        : 'bg-[var(--bg-input)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <ModeIcon className={`w-4 h-4 ${mode.color}`} />
                        <span className="text-[13px] font-bold text-[var(--text-primary)]">
                          {mode.label}
                        </span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {mode.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <label>
            <span>Description (Optional)</span>
            <textarea
              rows="2"
              value={levelForm.description}
              onChange={(e) => setLevelForm({ ...levelForm, description: e.target.value })}
              placeholder="Scope or expectations for candidate in this level..."
              className="custom-input resize-none"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button type="button" onClick={onClose} className="btn btn-secondary text-xs py-2 px-3.5">
              Cancel
            </button>
            <button type="submit" disabled={formLoading} className="btn btn-primary text-xs py-2 px-4">
              {formLoading ? 'Saving...' : 'Save Level'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
