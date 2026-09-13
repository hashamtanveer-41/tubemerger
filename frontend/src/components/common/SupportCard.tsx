import React, { useState } from 'react';
import { Coffee, Heart, X, ExternalLink } from 'lucide-react';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

export const SUPPORT_URL = 'https://hashamtanvr.gumroad.com/l/support-tubemerger';

interface SupportCardProps {
  className?: string;
  variant?: 'card' | 'compact' | 'minimal';
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function SupportCard({
  className,
  variant = 'card',
  dismissible = false,
  onDismiss,
}: SupportCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    onDismiss?.();
  };

  const handleSupportClick = async (e: React.MouseEvent) => {
    // Attempt host desktop opening; anchor target="_blank" handles browser tabs
    try {
      await api.openUrl(SUPPORT_URL);
    } catch {
      // Browser fallback handled by native anchor tag
    }
  };

  // Compact horizontal bar (for queues, history footer, etc.)
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'p-3.5 rounded-2xl border border-[#262626] bg-[#141414] hover:border-[#333333] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-red/10 border border-brand-red/25 flex items-center justify-center text-brand-red shrink-0">
            <Heart className="w-4 h-4 text-brand-red fill-brand-red/30" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">
              TubeMerger is 100% Free & Open-Source
            </p>
            <p className="text-[11px] text-[#888888]">
              No ads, no accounts, and no paywalls. Help keep maintenance active.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleSupportClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-red hover:bg-[#E00000] text-white text-xs font-semibold shadow-md shadow-brand-red/20 transition-all cursor-pointer"
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Support the Developer</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-[#222222] text-[#666666] hover:text-white transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full Card layout (for completion screens like SuccessModal)
  return (
    <div
      className={cn(
        'relative w-full rounded-2xl border border-[#282828] bg-[#151515] p-5 text-left transition-all hover:border-[#383838] select-none space-y-3.5',
        className
      )}
    >
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-[#666666] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-brand-red/20 border border-brand-red/30 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-black/40">
          <Coffee className="w-5 h-5 text-brand-red" />
        </div>
        <div className="space-y-1 pr-6">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Enjoying TubeMerger?
            </h3>
          </div>
          <p className="text-xs text-[#999999] leading-relaxed">
            TubeMerger runs completely local without subscriptions or cloud queues. If it saved you time, consider fueling continued maintenance with a voluntary contribution.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#222222]">
        <span className="text-[11px] text-[#666666]">
          Choose any voluntary amount · Powered by Gumroad
        </span>

        <a
          href={SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleSupportClick}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D90412] via-[#F00A18] to-[#FF1E27] hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-brand-red/25 transition-all cursor-pointer group"
        >
          <Coffee className="w-3.5 h-3.5 text-white transition-transform group-hover:-rotate-12" />
          <span>Support the Developer</span>
          <ExternalLink className="w-3 h-3 text-white/70 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
    </div>
  );
}
