import React, { useState, useEffect } from 'react';
import { AlertCircle, X, Check, Mail, ExternalLink } from 'lucide-react';
import { api } from '@/services/api';

interface CancellationComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobDetails?: {
    overall_percent?: number;
    clip_count?: number;
    preset?: string;
  };
}

const COMMON_REASONS = [
  'Loading bar felt stuck / frozen',
  'Download was taking too long',
  'Download speed was too slow',
  'Wrong video or preset chosen',
  'Encountered an issue or error',
  'Other reason',
];

export function CancellationComplaintModal({
  isOpen,
  onClose,
  jobDetails,
}: CancellationComplaintModalProps) {
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mailtoUrl, setMailtoUrl] = useState<string | null>(null);
  const [gmailUrl, setGmailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    api.trackEvent('cancellation_complaint_modal_shown', {
      overall_percent: jobDetails?.overall_percent || 0,
      clip_count: jobDetails?.clip_count || 0,
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, jobDetails]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    api.trackEvent('cancellation_complaint_dismissed');
    onClose();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting || submitted) return;

    setSubmitting(true);
    try {
      const res = await api.submitCancellationComplaint({
        reason: selectedReason,
        complaint_text: notes.trim() || undefined,
        job_details: jobDetails,
        user_email: email.trim() || undefined,
      });
      if (res) {
        if (res.mailto_url) setMailtoUrl(res.mailto_url);
        if (res.gmail_url) setGmailUrl(res.gmail_url);
        if (res.mailto_url) {
          try {
            await api.openUrl(res.mailto_url);
          } catch {
            // fallback
          }
        }
      }
      setSubmitted(true);
    } catch {
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none animate-in fade-in duration-150"
      onClick={handleDismiss}
    >
      <div
        className="relative w-full max-w-[460px] bg-[#141414] border border-[#2B2B2B] rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#777777] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <div className="py-4 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center mx-auto text-brand-red shadow-lg">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="text-base font-bold text-white">Complaint prepared for dispatch</h3>
            <p className="text-xs text-[#888888] max-w-xs mx-auto">
              Your report has been prepared to send directly to Hasham (hashamtanveer41@gmail.com).
            </p>

            <div className="flex flex-col gap-2 pt-2">
              {mailtoUrl && (
                <button
                  type="button"
                  onClick={() => api.openUrl(mailtoUrl)}
                  className="w-full h-9 rounded-xl bg-brand-red hover:bg-[#D90412] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-[0.98]"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send via Email App</span>
                </button>
              )}
              {gmailUrl && (
                <button
                  type="button"
                  onClick={() => api.openUrl(gmailUrl)}
                  className="w-full h-9 rounded-xl bg-[#1E1E1E] hover:bg-[#252525] border border-[#333333] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <span>Open in Gmail Web</span>
                  <ExternalLink className="w-3 h-3 text-[#888888]" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="mt-2 text-xs text-[#666666] hover:text-[#AAAAAA] cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0">
                <AlertCircle className="w-5 h-5 text-brand-red" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Why did you cancel?
                </h3>
                <p className="text-xs text-[#888888]">
                  Help us understand what went wrong so we can fix it.
                </p>
              </div>
            </div>

            {/* Quick Reason Chips */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#888888]">
                Select primary reason
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {COMMON_REASONS.map((r) => {
                  const isSelected = selectedReason === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedReason(r)}
                      className={`text-left text-xs px-2.5 py-2 rounded-lg border transition-all cursor-pointer truncate ${
                        isSelected
                          ? 'bg-brand-red/10 border-brand-red text-white font-medium shadow-sm'
                          : 'bg-[#1C1C1C] border-[#2A2A2A] text-[#999999] hover:text-white hover:border-[#383838]'
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#888888]">
                Any additional details or complaint? (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What happened or what were you expecting?"
                rows={2}
                className="w-full text-xs p-2.5 bg-[#1C1C1C] border border-[#2B2B2B] focus:border-brand-red focus:outline-none rounded-xl text-white placeholder-[#555555] resize-none"
              />
            </div>

            {/* Optional Email */}
            <div className="space-y-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email (optional, if you'd like a fix notification)"
                className="w-full text-xs px-3 py-2 bg-[#1C1C1C] border border-[#2B2B2B] focus:border-brand-red focus:outline-none rounded-xl text-white placeholder-[#555555]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex-[1.4] h-10 px-4 rounded-xl bg-brand-red hover:bg-[#D90412] active:scale-[0.98] text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{submitting ? 'Sending…' : 'Send Feedback'}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 h-10 px-3 rounded-xl bg-[#1E1E1E] hover:bg-[#252525] active:scale-[0.98] text-[#888888] hover:text-white border border-[#2B2B2B] font-medium text-xs transition-all cursor-pointer text-center"
              >
                <span>Dismiss</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
