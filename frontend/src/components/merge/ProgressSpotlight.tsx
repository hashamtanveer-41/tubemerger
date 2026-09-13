import React, { useState } from 'react';
import { ProgressEvent, VideoClip } from '@/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, PlayCircle, XCircle, ArrowDown, Pause, Play } from 'lucide-react';

interface ProgressSpotlightProps {
  progress: ProgressEvent;
  selectedClips: VideoClip[];
  onCancel: () => void;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
}

export function ProgressSpotlight({
  progress,
  selectedClips,
  onCancel,
  isPaused = false,
  onPause,
  onResume,
}: ProgressSpotlightProps) {
  const currentIdx = progress.current_item || 1;
  const currentClip = selectedClips[currentIdx - 1];
  const [cancelClicked, setCancelClicked] = useState(false);

  return (
    <Card className="p-6 space-y-6 border-stroke-card bg-theme-surface select-none shadow-2xl max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isPaused ? (
            <div className="w-6 h-6 rounded-full bg-brand-red/20 text-brand-red flex items-center justify-center">
              <Pause className="w-3.5 h-3.5 text-brand-red fill-brand-red" />
            </div>
          ) : (
            <Spinner size="md" variant="red" />
          )}
          <h2 className="text-base font-semibold text-content-primary leading-tight">
            {isPaused ? 'Download Paused' : 'Download in Progress'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {isPaused ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onResume}
              className="text-xs border-[#333333] hover:border-brand-red/60 text-content-primary hover:text-white hover:bg-[#1E1E1E] cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 text-brand-red fill-brand-red" />
              <span>Resume</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onPause}
              className="text-xs border-[#333333] hover:border-[#555555] active:border-brand-red text-content-secondary hover:text-white hover:bg-[#1E1E1E] group cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 mr-1.5 text-white fill-white group-hover:text-white group-active:text-brand-red group-active:fill-brand-red transition-colors" />
              <span>Pause</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCancelClicked(true);
              onCancel();
            }}
            className={cn(
              "text-xs border-[#333333] hover:border-[#555555] active:border-brand-red text-content-secondary hover:text-white hover:bg-[#1E1E1E] group cursor-pointer",
              cancelClicked && "border-brand-red text-white"
            )}
          >
            <XCircle
              className={cn(
                "w-3.5 h-3.5 mr-1.5 transition-colors",
                cancelClicked ? "text-brand-red" : "text-white group-hover:text-white group-active:text-brand-red"
              )}
            />
            <span>Cancel</span>
          </Button>
        </div>
      </div>

      {/* Overall Progress Bar with Live Download Speed */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-content-secondary font-medium">Overall Progress</span>
            {isPaused ? (
              <span className="text-[11px] font-semibold text-brand-red bg-black border border-brand-red/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md shadow-black/80 animate-in fade-in duration-150">
                <Pause className="w-3 h-3 text-brand-red fill-brand-red" />
                <span>Paused</span>
              </span>
            ) : progress.speed ? (
              <span className="text-[11px] font-semibold text-brand-red bg-black border border-brand-red/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md shadow-black/80 animate-in fade-in duration-150">
                <ArrowDown className="w-3 h-3 text-brand-red stroke-[2.5]" />
                <span>{progress.speed}</span>
              </span>
            ) : null}
          </div>
          <span className="text-content-primary font-semibold text-sm font-mono">
            {progress.overall_percent}%
          </span>
        </div>
        <Progress value={progress.overall_percent} className="h-2" />
      </div>

      {/* Active Clip Spotlight Card */}
      <div className="rounded-xl border border-stroke-light bg-theme-elevated p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-20 h-12 rounded-lg bg-theme-card overflow-hidden shrink-0 border border-stroke-hover relative flex items-center justify-center">
            {currentClip?.thumbnail_url ? (
              <img
                src={currentClip.thumbnail_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <PlayCircle className="w-6 h-6 text-brand-red" />
            )}
            <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
              {isPaused ? (
                <div className="w-6 h-6 rounded-full bg-black/60 border border-brand-red/50 text-brand-red flex items-center justify-center shadow-lg">
                  <Pause className="w-3.5 h-3.5 text-brand-red fill-brand-red" />
                </div>
              ) : (
                <Spinner size="xs" variant="red" />
              )}
            </span>
          </div>

          <div className="min-w-0 space-y-1">
            <span className="text-xs text-content-muted font-medium">
              Clip {progress.current_item || 1} of {progress.total_items || selectedClips.length}
            </span>
            <p className="text-sm font-medium text-content-primary truncate max-w-lg">
              {progress.current_video_title || currentClip?.title || 'Preparing next segment…'}
            </p>
          </div>
        </div>

        <span className="text-xs text-content-dim shrink-0 font-medium">
          30 FPS · CFR · AAC
        </span>
      </div>

      {/* Live Clip Checklist */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-content-dim">
          Clip Queue
        </h4>
        <div className="rounded-xl border border-stroke-subtle bg-theme-input divide-y divide-stroke-subtle max-h-56 overflow-y-auto">
          {selectedClips.map((clip, idx) => {
            const clipNum = idx + 1;
            const isDone = clipNum < currentIdx || progress.status === 'done';
            const isActive = clipNum === currentIdx && progress.status !== 'done';
            const isError = progress.status === 'error' && clipNum === currentIdx;

            return (
              <div
                key={clip.id || idx}
                className="flex items-center justify-between p-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-content-dim text-[11px] font-medium w-4 text-center">
                    {String(clipNum).padStart(2, '0')}
                  </span>
                  <span
                    className={`truncate font-medium ${
                      isActive ? 'text-content-primary font-semibold' : isDone ? 'text-content-secondary' : 'text-content-muted'
                    }`}
                  >
                    {clip.title}
                  </span>
                </div>

                {/* Right: Duration + Status Icon */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-content-muted text-xs">{clip.duration_formatted}</span>
                  <div
                    className="w-5 h-5 flex items-center justify-center"
                    title={isDone ? 'Completed' : isActive ? (isPaused ? 'Paused' : 'Active') : isError ? 'Failed' : 'Pending'}
                  >
                    {isDone && (
                      <CheckCircle2 className="w-4 h-4 text-brand-red stroke-[2.2]" />
                    )}
                    {isActive && (
                      isPaused ? (
                        <Pause className="w-3.5 h-3.5 text-brand-red fill-brand-red" />
                      ) : (
                        <Spinner size="xs" variant="red" />
                      )
                    )}
                    {isError && (
                      <XCircle className="w-4 h-4 text-brand-red stroke-[2.2]" />
                    )}
                    {!isDone && !isActive && !isError && (
                      <Circle className="w-3.5 h-3.5 text-content-dim stroke-[1.5]" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
