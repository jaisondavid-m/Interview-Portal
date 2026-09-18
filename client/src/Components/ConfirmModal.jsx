import React from 'react';
import { AlertTriangle, LogOut, Repeat, CheckCircle2, X, Loader2 } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = 'Confirmation',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary', // 'primary' | 'danger' | 'warning' | 'info'
  isDanger = false,
  icon = null,
  loading = false,
  showCancel = true,
}) {
  if (!isOpen) return null;

  const handleClose = onCancel || onClose;
  const effectiveVariant = isDanger ? 'danger' : variant;

  const getVariantStyles = () => {
    switch (effectiveVariant) {
      case 'danger':
        return {
          iconBg: 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--accent)]',
          confirmBtn: 'bg-[var(--accent)] hover:opacity-90 text-white shadow-md',
          defaultIcon: AlertTriangle,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
          confirmBtn: 'bg-[var(--accent)] hover:opacity-90 text-white shadow-md',
          defaultIcon: AlertTriangle,
        };
      case 'info':
        return {
          iconBg: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
          confirmBtn: 'bg-[var(--accent)] hover:opacity-90 text-white shadow-md',
          defaultIcon: AlertTriangle,
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-[var(--accent-dim)] border-[var(--border-accent)] text-[var(--accent)]',
          confirmBtn: 'bg-[var(--accent)] hover:opacity-90 text-white shadow-md',
          defaultIcon: Repeat,
        };
    }
  };

  const styles = getVariantStyles();

  const renderIcon = () => {
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function') {
      const CustomIcon = icon;
      return <CustomIcon className="w-5 h-5" />;
    }
    const DefaultIcon = styles.defaultIcon;
    return DefaultIcon ? <DefaultIcon className="w-5 h-5" /> : null;
  };

  return (
    <div 
      onClick={handleClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex min-h-full items-center justify-center p-3 sm:p-6 animate-fadeIn"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl space-y-5 my-auto animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5">
          <div className={`p-3 rounded-2xl border shrink-0 ${styles.iconBg}`}>
            {renderIcon()}
          </div>
          <div className="space-y-1 pr-6">
            <h3 className="text-base font-bold text-[var(--text-primary)] leading-snug">
              {title}
            </h3>
            <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
          {showCancel && (
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`${styles.confirmBtn} text-xs py-2 px-4 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
