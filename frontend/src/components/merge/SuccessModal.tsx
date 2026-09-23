import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { CheckCircle2, Play, FolderOpen, FolderCheck, Coffee, X } from 'lucide-react';

interface SuccessModalProps {
  outputFile: string;
  onReset: () => void;
  onOpenSupport?: () => void;
}

export function SuccessModal({ outputFile, onReset, onOpenSupport }: SuccessModalProps) {
  const [openingFile, setOpeningFile] = useState(false);
  const [openingFolder, setOpeningFolder] = useState(false);

  // Check whether this is a folder (individual videos) or a single merged file
  const isFolder = !outputFile.toLowerCase().endsWith('.mp4') && !outputFile.toLowerCase().endsWith('.mkv');

  const handleOpenFile = async () => {
    setOpeningFile(true);
    try {
      await api.openFile(outputFile);
    } catch (err: any) {
      alert(err.message || 'Could not open file');
    } finally {
      setOpeningFile(false);
    }
  };

  const handleOpenFolder = async () => {
    setOpeningFolder(true);
    try {
      await api.openFolder(outputFile);
    } catch (err: any) {
      alert(err.message || 'Could not open folder');
    } finally {
      setOpeningFolder(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-200"
      onClick={onReset}
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        className="relative p-8 max-w-xl w-full flex flex-col items-center text-center space-y-6 border border-stroke-hover bg-[#141414] shadow-2xl select-none animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onReset}
          className="absolute top-4 right-4 p-2 rounded-full text-content-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-full bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red shadow-xl shadow-brand-red/20">
        {isFolder ? (
          <FolderCheck className="w-10 h-10 stroke-[2.2]" />
        ) : (
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        )}
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-black text-content-primary">
          {isFolder ? 'Download Complete!' : 'Merge Complete!'}
        </h2>
        <p className="text-sm text-content-muted">
          {isFolder
            ? 'All individual videos have been saved into your dedicated Downloads folder.'
            : 'Your selected clips were standardized and stitched with chapter markers.'}
        </p>
      </div>

      {/* Output Path Pill */}
      <div
        className="bg-theme-panel border border-stroke-card px-4 py-2 rounded-xl text-xs font-mono text-content-secondary max-w-md truncate"
        title={outputFile}
      >
        {outputFile}
      </div>

      {/* Native Desktop Actions */}
      <div className="flex items-center gap-3 w-full justify-center">
        {!isFolder && (
          <Button
            variant="default"
            size="default"
            onClick={handleOpenFile}
            loading={openingFile}
            icon={Play}
            className="min-w-[140px]"
          >
            Open File
          </Button>
        )}

        <Button
          variant={isFolder ? 'default' : 'secondary'}
          size="default"
          onClick={handleOpenFolder}
          loading={openingFolder}
          icon={FolderOpen}
          className="min-w-[150px]"
        >
          Open Folder
        </Button>
      </div>

      {/* Navigation and Support Actions */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <button
          onClick={onReset}
          className="text-xs text-content-dim hover:text-content-primary underline cursor-pointer transition-colors"
        >
          {isFolder ? 'Download Another Playlist' : 'Start New Merge'}
        </button>

        {onOpenSupport && (
          <button
            type="button"
            onClick={onOpenSupport}
            className="text-[11px] text-[#666666] hover:text-[#AAAAAA] flex items-center gap-1.5 transition-colors cursor-pointer mt-1"
          >
            <Coffee className="w-3 h-3 text-brand-red/80" />
            <span>Support the Developer</span>
          </button>
        )}
      </div>
    </Card>
  </div>
  );
}
