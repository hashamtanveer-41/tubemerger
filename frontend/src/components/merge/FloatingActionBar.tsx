import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, RotateCcw, FolderDown } from 'lucide-react';

interface FloatingActionBarProps {
  selectedCount: number;
  onMerge: () => void;
  onClear: () => void;
  loading: boolean;
  mergeVideos?: boolean;
}

export function FloatingActionBar({
  selectedCount,
  onMerge,
  onClear,
  loading,
  mergeVideos = true,
}: FloatingActionBarProps) {
  if (selectedCount === 0) return null;

  const isSingleVideo = selectedCount === 1;

  const buttonLabel = isSingleVideo
    ? 'Download Video'
    : mergeVideos
    ? `Merge Selected (${selectedCount} Videos)`
    : `Download Separately (${selectedCount} Videos)`;

  const buttonIcon = isSingleVideo
    ? FolderDown
    : mergeVideos
    ? Play
    : FolderDown;

  return (
    <div id="merge-action-bar" className="fixed bottom-8 md:bottom-10 left-1/2 -translate-x-1/2 z-30 select-none">
      {/* Solid dark container — zero glassmorphism, zero extra badge pills */}
      <div className="bg-[#161616] border border-[#2E2E2E] shadow-2xl rounded-full p-2 pl-2.5 flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-5 duration-200">
        <Button
          id="merge-cta-btn"
          size="lg"
          variant="default"
          onClick={onMerge}
          loading={loading}
          icon={buttonIcon}
          className="whitespace-nowrap shadow-lg shadow-red-950/30 px-7 font-semibold h-12 text-sm md:text-base"
        >
          {buttonLabel}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={loading}
          icon={RotateCcw}
          className="text-sm text-content-secondary hover:text-content-primary whitespace-nowrap px-4 h-10 rounded-full mr-1 font-medium cursor-pointer"
        >
          Clear Selection
        </Button>
      </div>
    </div>
  );
}
