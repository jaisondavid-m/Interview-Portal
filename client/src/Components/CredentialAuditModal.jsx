import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  Radio,
  Send,
  X,
  EyeOff,
  UserX
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

  const peerDisplayName = 'Anonymous Peer';

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
      setError('Please select Yes or No to complete the verification.');
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
      setError(err.response?.data?.message || err.message || 'Failed to submit verification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-[var(--radius-lg)] bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-[var(--shadow-xl)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-raised)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center font-bold">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block font-bold">
                Anonymous Interview Guidelines
              </span>
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] font-ui">
                Peer Anonymity & Identity Verification
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[var(--radius-xs)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
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
                  Verification Recorded
                </h4>
                <p className="text-[12px] text-[var(--text-secondary)] max-w-sm mx-auto">
                  {askedCredentials
                    ? 'Your incident report has been registered. Administrators will review the session audio recording to verify the identity solicitation.'
                    : 'Thank you. Your interview anonymity verification has been safely recorded.'}
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-primary text-xs py-2 px-6 font-bold shadow-sm cursor-pointer"
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
              <div className="space-y-1.5">
                <label className="text-[13.5px] font-bold text-[var(--text-primary)] block leading-snug">
                  Did the peer student ask for your personal identity details (such as your Register / Roll Number, Full Name, Phone Number, or Contact info) during this anonymous interview?
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
                  className={`p-4 rounded-[var(--radius-md)] border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                    askedCredentials === false
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500 shadow-xs'
                      : 'bg-[var(--bg-raised)] border-[var(--border)] hover:border-[var(--border-accent)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[14px]">No</span>
                    <ShieldCheck className={`w-4 h-4 ${askedCredentials === false ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`} />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-tight">
                    Anonymity was maintained. No identity details were requested.
                  </p>
                </button>

                {/* Option: YES */}
                <button
                  type="button"
                  onClick={() => setAskedCredentials(true)}
                  className={`p-4 rounded-[var(--radius-md)] border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                    askedCredentials === true
                      ? 'bg-rose-500/10 border-rose-500 text-rose-950 dark:text-rose-200 ring-1 ring-rose-500 shadow-xs'
                      : 'bg-[var(--bg-raised)] border-[var(--border)] hover:border-[var(--border-accent)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[14px] text-rose-600 dark:text-rose-400">Yes (Report)</span>
                    <ShieldAlert className={`w-4 h-4 ${askedCredentials === true ? 'text-rose-500' : 'text-[var(--text-muted)]'}`} />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-tight">
                    Yes, the peer asked for my register number, name, phone, or contact.
                  </p>
                </button>
              </div>

              {/* Conditional Detail Form if YES */}
              {askedCredentials === true && (
                <div className="p-4 rounded-[var(--radius-md)] bg-rose-500/5 border border-rose-500/20 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-[11px] font-bold font-mono">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>Admin Audit Trigger: Dialogue Audio Will Be Inspected</span>
                  </div>

                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Selecting <strong>Yes</strong> automatically flags this session in the Administrator portal. Admins will review the dual-speaker dialogue audio recording to verify the identity solicitation.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-bold text-[var(--text-primary)]">
                      Additional Details (Optional):
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
                  className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
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
                      <span>{askedCredentials === true ? 'Submit Report' : 'Confirm & Complete'}</span>
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
