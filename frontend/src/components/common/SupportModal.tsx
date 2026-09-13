import React, { useEffect } from 'react';
import { Coffee, X } from 'lucide-react';
import { api } from '@/services/api';

export const SUPPORT_URL = 'https://hashamtanvr.gumroad.com/l/support-tubemerger';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSupportClick = async () => {
    try {
      await api.openUrl(SUPPORT_URL);
    } catch {
      window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[470px] bg-[#161616] border border-[#2E2E2E] rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close icon button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#777777] hover:text-white hover:bg-[#242424] transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Coffee / Heart Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center mx-auto text-brand-red shadow-lg shadow-brand-red/10">
          <Coffee className="w-7 h-7 text-brand-red" />
        </div>

        {/* Short, Friendly Copy */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white tracking-tight">
            Did TubeMerger help or save you time?
          </h3>
          <p className="text-xs sm:text-sm text-[#AAAAAA] leading-relaxed max-w-sm mx-auto">
            As TubeMerger is completely ad-free with no licensing fees or subscriptions, voluntary support helps keep updates and new features coming.
          </p>
        </div>

        {/* 2 Asymmetric Options: Enlarge Support Developer, Smaller Maybe next time */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSupportClick}
            className="flex-[1.5] inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-gradient-to-r from-[#D90412] via-[#F00A18] to-[#FF1E27] hover:brightness-110 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-brand-red/25 transition-all cursor-pointer whitespace-nowrap group"
          >
            <Coffee className="w-4 h-4 text-white shrink-0 transition-transform group-hover:-rotate-12" />
            <span>Support Developer</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center h-11 px-3 rounded-xl bg-[#1E1E1E] hover:bg-[#262626] active:scale-[0.98] text-[#888888] hover:text-white border border-[#2E2E2E] hover:border-[#3E3E3E] font-medium text-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Maybe next time</span>
          </button>
        </div>
      </div>
    </div>
  );
}
