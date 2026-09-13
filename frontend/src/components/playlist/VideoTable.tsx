import React from 'react';
import { VideoClip } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Youtube, CheckSquare, Square } from 'lucide-react';
import { VIDEO_CARD_GRADIENTS } from '@/data/gradients';
import { formatBytes, estimateVideoSizeBytes } from '@/lib/utils';

interface VideoTableProps {
  videos: VideoClip[];
  selectedIndices: Set<number>;
  onToggle: (index: number) => void;
  quality?: string;
  format?: 'mp4' | 'mp3';
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export function VideoTable({
  videos,
  selectedIndices,
  onToggle,
  quality,
  format,
  onSelectAll,
  onDeselectAll,
}: VideoTableProps) {
  const isAudio = format === 'mp3' || (quality && ['320k', '256k', '192k', '128k', 'mp3'].includes(quality.toLowerCase()));
  const audioBitrateLabel = quality && ['320k', '256k', '192k', '128k'].includes(quality.toLowerCase())
    ? `${quality.toLowerCase().replace('k', '')}kbps`
    : '320kbps';
  return (
    <div className="space-y-3 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-red">
            Videos in Playlist
          </h3>
          <p className="text-xs text-content-muted">
            Select the video clips you want to include in the output.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onSelectAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              icon={CheckSquare}
              className="text-xs h-8 px-3 border-stroke-light text-content-secondary hover:text-content-primary hover:bg-theme-elevated hover:border-stroke-light focus:outline-none focus:ring-0 active:scale-100 cursor-pointer"
            >
              Select All
            </Button>
          )}
          {onDeselectAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDeselectAll}
              icon={Square}
              className="text-xs h-8 px-3 border-stroke-light text-content-secondary hover:text-content-primary hover:bg-theme-elevated hover:border-stroke-light focus:outline-none focus:ring-0 active:scale-100 cursor-pointer"
            >
              Clear Selection
            </Button>
          )}
          <span className="text-xs font-medium text-content-dim ml-1">
            {selectedIndices.size} / {videos.length} selected
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-stroke-card bg-theme-surface divide-y divide-stroke-subtle overflow-hidden shadow-lg">
        {videos.map((video, idx) => {
          const isSelected = selectedIndices.has(idx);
          const gradient = VIDEO_CARD_GRADIENTS[idx % VIDEO_CARD_GRADIENTS.length];
          const thumbUrl = video.thumbnail_url || video.thumbnail || '';
          const estimatedSize = formatBytes(estimateVideoSizeBytes(video.duration_seconds || 0, quality || video.resolution_label));

          return (
            <div
              key={video.id || idx}
              onClick={() => onToggle(idx)}
              className="flex items-center gap-3.5 p-3.5 hover:bg-theme-hover transition-colors cursor-pointer group"
            >
              {/* Checkbox */}
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggle(idx)}
                />
              </div>

              {/* Thumbnail with Resolution Badge */}
              <div
                className="w-16 h-10 rounded-lg flex items-center justify-center text-[10px] shrink-0 relative overflow-hidden border border-stroke-light"
                style={{ background: gradient }}
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt=""
                    className="w-full h-full object-cover absolute inset-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : null}
                <Badge variant="overlay" className="relative z-10 text-[9px] font-semibold tracking-wide">
                  {isAudio ? `MP3 ${quality && ['320k', '256k', '192k', '128k'].includes(quality.toLowerCase()) ? quality.toUpperCase() : '320K'}` : (video.resolution_label || '1080p')}
                </Badge>
              </div>

              {/* Info with Duration and Estimated File Size */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-content-primary font-medium truncate leading-tight group-hover:text-red-100 transition-colors">
                  {video.title}
                </p>
                <p className="text-xs mt-0.5 text-content-secondary flex items-center gap-1.5 font-normal">
                  <span>{video.duration_formatted}</span>
                  <span className="text-content-dim">·</span>
                  <span className="text-zinc-300 font-medium">~{estimatedSize}</span>
                  <span className="text-content-dim">·</span>
                  <span>{isAudio ? `MP3 ${audioBitrateLabel}` : 'AAC 192kbps'}</span>
                </p>
              </div>

              {/* Right: Index & YouTube red icon */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-medium text-content-dim">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <Youtube className="w-4 h-4 text-brand-red opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
