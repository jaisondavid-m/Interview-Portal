import React from 'react';
import { X, AlertCircle } from 'lucide-react';

export default function TrackModal({
  isOpen,
  onClose,
  trackForm,
  setTrackForm,
  onSave,
  formError,
  formLoading,
}) {
  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex min-h-full items-center justify-center p-3 sm:p-6 animate-fadeIn"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90vh] bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-lg)] space-y-4 my-auto overflow-y-auto custom-scrollbar animate-scaleUp"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
            {trackForm.id ? 'Edit Interview Domain' : 'Create Interview Domain'}
          </h3>
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

        <form onSubmit={onSave} className="custom-form space-y-3">
          <label>
            <span>Domain Title</span>
            <input
              type="text"
              required
              value={trackForm.title}
              onChange={(e) => setTrackForm({ ...trackForm, title: e.target.value })}
              placeholder="e.g. Data Structures & Algorithms"
              className="custom-input"
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              rows="3"
              value={trackForm.description}
              onChange={(e) => setTrackForm({ ...trackForm, description: e.target.value })}
              placeholder="Brief overview of topics covered in this domain..."
              className="custom-input resize-none"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button type="button" onClick={onClose} className="btn btn-secondary text-xs py-2 px-3.5">
              Cancel
            </button>
            <button type="submit" disabled={formLoading} className="btn btn-primary text-xs py-2 px-4">
              {formLoading ? 'Saving...' : 'Save Domain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
