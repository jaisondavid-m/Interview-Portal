import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  deleteTarget,
  onConfirm,
  formLoading,
}) {
  if (!isOpen || !deleteTarget) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] p-6 w-full max-w-sm shadow-[var(--shadow-lg)] space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--red-bg)] text-[var(--red)] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
            Delete {deleteTarget.type === 'track' ? 'Domain' : deleteTarget.type === 'level' ? 'Level' : 'Question'}?
          </h3>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Are you sure you want to delete <span className="font-semibold text-[var(--text-primary)]">"{deleteTarget.data.title || deleteTarget.data.name}"</span>?
            {deleteTarget.type === 'track' && ' All levels and questions under this domain will also be deleted.'}
            {deleteTarget.type === 'level' && ' All questions in this level will also be deleted.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary text-xs py-2 px-4"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={formLoading}
            className="btn text-xs py-2 px-4 bg-[var(--red)] hover:opacity-90 text-white font-semibold rounded-[var(--radius-sm)]"
          >
            {formLoading ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
