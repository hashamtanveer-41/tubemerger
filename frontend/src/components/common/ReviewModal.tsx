import React, { useState, useEffect } from 'react';
import { Star, X, Check, Heart, ExternalLink, Mail } from 'lucide-react';
import { api } from '@/services/api';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewModal({ isOpen, onClose }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);
  const [mailtoUrl, setMailtoUrl] = useState<string | null>(null);
  const [gmailUrl, setGmailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    api.trackEvent('review_modal_shown');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleLater();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLater = () => {
    api.trackEvent('review_modal_later_clicked');
    onClose();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting || submitted) return;

    setSubmitting(true);
    try {
      const res = await api.submitReview({
        rating,
        review_text: reviewText.trim(),
        user_email: email.trim() || undefined,
        system_info: { platform: navigator.platform },
      });

      if (res) {
        if (res.github_url) setGithubUrl(res.github_url);
        if (res.mailto_url) setMailtoUrl(res.mailto_url);
        if (res.gmail_url) setGmailUrl(res.gmail_url);

        // Open their email client pre-populated with their review
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
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const openGitHub = async () => {
    if (githubUrl) {
      try {
        await api.openUrl(githubUrl);
      } catch {
        window.open(githubUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none animate-in fade-in duration-150"
      onClick={handleLater}
    >
      <div
        className="relative w-full max-w-[440px] bg-[#141414] border border-[#2B2B2B] rounded-2xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleLater}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#777777] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <div className="py-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center mx-auto text-brand-red shadow-lg">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="text-lg font-bold text-white">Thank you for your feedback!</h3>
            <p className="text-xs text-[#888888] max-w-xs mx-auto">
              Your review has been prepared to send directly to Hasham (hashamtanveer41@gmail.com).
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
              {githubUrl && (
                <button
                  type="button"
                  onClick={openGitHub}
                  className="mt-1 inline-flex items-center justify-center gap-1.5 text-xs text-[#888888] hover:text-white underline cursor-pointer"
                >
                  <span>Or view on GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleLater}
              className="mt-2 text-xs text-[#666666] hover:text-[#AAAAAA] cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {/* Header with Heart Icon */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0">
                <Heart className="w-5 h-5 fill-brand-red" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Enjoying TubeMerger?
                </h3>
                <p className="text-xs text-[#888888]">
                  How has your downloading experience been?
                </p>
              </div>
            </div>

            {/* Star Rating */}
            <div className="flex items-center justify-center gap-2 py-2 border-y border-[#222222]">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        isFilled
                          ? 'text-brand-red fill-brand-red'
                          : 'text-[#444444] hover:text-[#666666]'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Optional Feedback Textarea */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#888888]">
                Your feedback or suggestions (optional)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="What do you like or what could we improve?"
                rows={3}
                className="w-full text-xs p-2.5 bg-[#1C1C1C] border border-[#2B2B2B] focus:border-brand-red focus:outline-none rounded-xl text-white placeholder-[#555555] resize-none"
              />
            </div>

            {/* Optional Email */}
            <div className="space-y-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email (optional, for follow up)"
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
                <span>{submitting ? 'Submitting…' : 'Submit Review'}</span>
              </button>

              <button
                type="button"
                onClick={handleLater}
                className="flex-1 h-10 px-3 rounded-xl bg-[#1E1E1E] hover:bg-[#252525] active:scale-[0.98] text-[#888888] hover:text-white border border-[#2B2B2B] font-medium text-xs transition-all cursor-pointer text-center"
              >
                <span>Maybe later</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
