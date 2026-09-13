import React from 'react';
import { Playlist } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Film, Clock, HardDrive, ArrowLeft, Trash2 } from 'lucide-react';
import { formatBytes, estimateVideoSizeBytes } from '@/lib/utils';

interface PlaylistCardProps {
  playlist: Playlist;
  selectedCount: number;
  totalCount: number;
  selectedIndices?: Set<number>;
  quality?: string;
  format?: 'mp4' | 'mp3';
  onClearPlaylist?: () => void;
  onBackToHome?: () => void;
}

export function PlaylistCard({
  playlist,
  selectedCount,
  totalCount,
  selectedIndices,
  quality,
  format,
  onClearPlaylist,
  onBackToHome,
}: PlaylistCardProps) {
  const thumbUrl = playlist.thumbnail || (playlist.entries[0] && (playlist.entries[0].thumbnail_url || playlist.entries[0].thumbnail)) || '';

  // Calculate dynamic size of selected clips (or all clips)
  const selectedClips = selectedIndices && selectedIndices.size > 0
    ? playlist.entries.filter((_, idx) => selectedIndices.has(idx))
    : playlist.entries;

  const totalSelectedBytes = selectedClips.reduce(
    (acc, v) => acc + estimateVideoSizeBytes(v.duration_seconds || 0, quality || v.resolution_label),
    0
  );
  const formattedSize = formatBytes(totalSelectedBytes);

  return (
    <Card className="p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between border-stroke-card bg-theme-surface shadow-md">
      <div className="flex gap-4 items-center min-w-0">
        {/* Cover Art Thumbnail */}
        <div className="w-32 h-20 rounded-xl bg-theme-card overflow-hidden shrink-0 relative border border-stroke-light shadow-sm">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={playlist.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-content-dim">
              <Film className="w-7 h-7" />
            </div>
          )}
          <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] font-medium px-1.5 py-0.5 rounded text-white/90">
            {playlist.video_count} videos
          </span>
        </div>

        {/* Title & Clean Metadata Row with Dynamic Size */}
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-base font-semibold text-content-primary truncate leading-tight" title={playlist.title}>
            {playlist.title}
          </h2>

          <div className="text-xs text-content-secondary flex flex-wrap items-center gap-2 font-normal">
            <span className="text-content-primary font-medium">{playlist.channel}</span>
            <span className="text-content-dim">·</span>
            <span>{playlist.video_count} videos</span>
            <span className="text-content-dim">·</span>
            <span className="flex items-center gap-1 text-content-secondary">
              <Clock className="w-3.5 h-3.5 text-content-muted" />
              {playlist.total_duration_formatted}
            </span>
            <span className="text-content-dim">·</span>
            <span className="flex items-center gap-1 text-content-primary font-medium">
              <HardDrive className="w-3.5 h-3.5 text-brand-red" />
              <span>~{formattedSize}</span>
            </span>
            <span className="text-content-dim">·</span>
            <span>
              {selectedCount} of {totalCount} selected
            </span>
          </div>
        </div>
      </div>

      {/* Action Controls: Clear Playlist and Back to Home */}
      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
        {onClearPlaylist && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearPlaylist}
            icon={Trash2}
            className="text-xs h-8 px-3 border-stroke-light text-content-secondary hover:text-red-400 hover:bg-theme-elevated hover:border-red-900/50 focus:outline-none focus:ring-0 active:scale-100 cursor-pointer"
          >
            Clear Playlist
          </Button>
        )}
        {onBackToHome && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToHome}
            icon={ArrowLeft}
            className="text-xs h-8 px-3 border-stroke-light text-content-secondary hover:text-content-primary hover:bg-theme-elevated hover:border-stroke-light focus:outline-none focus:ring-0 active:scale-100 cursor-pointer"
          >
            Back to Home
          </Button>
        )}
      </div>
    </Card>
  );
}
