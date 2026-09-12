import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  FileAudio,
  Radio,
  Send,
  X
} from 'lucide-react';
import api from '../api/axios';

export default function CredentialAuditModal({
  isOpen,
  onClose,
  sessionId,
  peerUser,
  onCompleted,
}) {
  const [askedCredentials, setAskedCredentials] = useState(null); // true | false | null
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [hasReportedBefore, setHasReportedBefore] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const peerDisplayName = peerUser?.name || 'Peer Student';

  // Check if student already submitted this verification
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    let isMounted = true;
    const checkStatus = async () => {
      try {
        setLoadingStatus(true);
        setError('');
        const res = await api.get(`/interviews/sessions/${sessionId}/security-report`);
        const data = res?.data || res;
        if (data?.has_submitted) {
          if (isMounted) {
            setHasReportedBefore(true);
            setSubmittedSuccess(true);
          }
        }
      } catch (e) {
        // ignore
      } finally {
        if (isMounted) {
          setLoadingStatus(false);
        }
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [isOpen, sessionId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (askedCredentials === null) {
      setError('Please select Yes or No to complete the security review.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await api.post(`/interviews/sessions/${sessionId}/security-report`, {
        asked_credentials: askedCredentials,
        details: details.trim(),
      });

      setSubmittedSuccess(true);
      if (onCompleted) {
        onCompleted({ asked_credentials: askedCredentials });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit security review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-[var(--radius-lg)] bg-[var(--bg-card)] border border-[var(--border)] shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-raised)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block font-bold">
                Security & Integrity Verification
              </span>
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] font-ui">
                Peer Identity Audit
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[var(--radius-xs)] hover:bg-[var(--bg-hover)] transition-colors"
            title="Dismiss verification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {loadingStatus ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-7 h-7 text-[var(--accent)] animate-spin mx-auto" />
              <p className="text-[12px] font-mono text-[var(--text-muted)]">Checking audit status...</p>
            </div>
          ) : submittedSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-[16px] font-bold text-[var(--text-primary)]">
                  Verification Complete
                </h4>
                <p className="text-[12px] text-[var(--text-secondary)] max-w-sm mx-auto">
                  {askedCredentials
                    ? 'Your incident report has been registered. Administrators will review the session audio recording to verify identity solicitation.'
                    : 'Thank you. Your interview verification has been safely recorded.'}
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-primary text-xs py-2 px-6 font-bold shadow-sm"
                >
                  Conclude & Exit
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--red-bg)] border border-[var(--red)]/30 text-[var(--red)] flex items-center gap-2 text-[12px]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Main Question */}
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[var(--text-primary)] block leading-snug">
                  Did the peer student ask for your personal identity details (such as your Register / Roll Number, Phone Number, Real Name, or Personal Contact details) during this interview?
                </label>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                  Target Peer: <span className="text-[var(--text-primary)] font-bold">{peerDisplayName}</span>
                </p>
              </div>

              {/* Two Option Selection Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Option: NO */}
                <button
                  type="button"
                  onClick={() => setAskedCredentials(false)}
                  className={`p-4 rounded-[var(--radius-md)] border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    askedCredentials === false
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-300 ring-1 ring-emerald-500'
                      : 'bg-[var(--bg-raised)] border-[var(--border)] hover:border-[var(--border-accent)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[14px]">No</span>
                    <ShieldCheck className={`w-4 h-4 ${askedCredentials === false ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`} />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-tight">
                    No identity request was made. Interview remained anonymous and followed guidelines.
                  </p>
                </button>

                {/* Option: YES */}
                <button
                  type="button"
                  onClick={() => setAskedCredentials(true)}
                  className={`p-4 rounded-[var(--radius-md)] border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    askedCredentials === true
                      ? 'bg-rose-500/10 border-rose-500 text-rose-900 dark:text-rose-300 ring-1 ring-rose-500'
                      : 'bg-[var(--bg-raised)] border-[var(--border)] hover:border-[var(--border-accent)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[14px]">Yes (Report)</span>
                    <ShieldAlert className={`w-4 h-4 ${askedCredentials === true ? 'text-rose-500' : 'text-[var(--text-muted)]'}`} />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-tight">
                    Yes, the student asked for my register number, phone number, name, or contact details.
                  </p>
                </button>
              </div>

              {/* Conditional Detail Form if YES */}
              {askedCredentials === true && (
                <div className="p-3.5 rounded-[var(--radius-md)] bg-rose-500/5 border border-rose-500/20 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-[11px] font-bold font-mono">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>Admin Audit Trigger: Session Audio Will Be Reviewed</span>
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)]">
                    Selecting <strong>Yes</strong> automatically flags this session with high priority in the Administrator portal. Admins will inspect the dual-speaker dialogue audio recording to verify the identity solicitation.
                  </p>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono font-bold text-[var(--text-primary)]">
                      Additional Context or Notes (Optional):
                    </label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="e.g. The student asked for my register number and WhatsApp / phone number during Round 1..."
                      rows={2}
                      className="input-field text-xs py-2 w-full custom-scrollbar"
                      maxLength={500}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary text-xs py-2 px-4"
                  disabled={submitting}
                >
                  Skip
                </button>

                <button
                  type="submit"
                  disabled={submitting || askedCredentials === null}
                  className={`btn text-xs py-2 px-5 font-bold flex items-center gap-2 shadow-xs cursor-pointer ${
                    askedCredentials === true
                      ? 'btn-danger bg-red-600 hover:bg-red-700 text-white'
                      : 'btn-primary'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{askedCredentials === true ? 'Submit Incident Report' : 'Confirm & Complete'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
