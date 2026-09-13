import React from 'react';
import { Playlist, VideoQuality } from '@/types';
import { ChevronDown, Film, Music } from 'lucide-react';
import { PlaylistCard } from '@/components/playlist/PlaylistCard';
import { VideoTable } from '@/components/playlist/VideoTable';
import { Checkbox } from '@/components/ui/checkbox';

interface DiscoveryViewProps {
  playlist: Playlist;
  selectedIndices: Set<number>;
  onToggle: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  mergeVideos?: boolean;
  onToggleMergeVideos?: (checked: boolean) => void;
  quality?: VideoQuality;
  onQualityChange?: (quality: VideoQuality) => void;
  format?: 'mp4' | 'mp3';
  onFormatChange?: (format: 'mp4' | 'mp3') => void;
  onClearPlaylist?: () => void;
  onBackToHome?: () => void;
}

export function DiscoveryView({
  playlist,
  selectedIndices,
  onToggle,
  onSelectAll,
  onDeselectAll,
  mergeVideos = true,
  onToggleMergeVideos,
  quality = '1080p',
  onQualityChange,
  format = 'mp4',
  onFormatChange,
  onClearPlaylist,
  onBackToHome,
}: DiscoveryViewProps) {
  const isSingleVideo = selectedIndices.size <= 1;
  const isAudio = format === 'mp3';
  const isAudioQuality = ['320k', '256k', '192k', '128k'].includes(quality);
  const currentAudioQuality = isAudioQuality ? quality : '320k';
  const effectiveQuality = isAudio ? currentAudioQuality : quality;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      <PlaylistCard
        playlist={playlist}
        selectedCount={selectedIndices.size}
        totalCount={playlist.entries.length}
        selectedIndices={selectedIndices}
        quality={effectiveQuality}
        format={format}
        onClearPlaylist={onClearPlaylist}
        onBackToHome={onBackToHome}
      />

      {/* Download Mode, Format & Resolution Quality Bar */}
      <div className="p-4 rounded-2xl border border-stroke-card bg-[#161616] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Merge vs Separate Checkbox */}
        {onToggleMergeVideos && (
          <div
            onClick={() => {
              if (!isSingleVideo) onToggleMergeVideos(!mergeVideos);
            }}
            className={`flex items-center gap-3.5 select-none ${
              isSingleVideo ? 'opacity-70 cursor-default' : 'cursor-pointer group flex-1'
            }`}
          >
            <Checkbox
              checked={isSingleVideo ? false : mergeVideos}
              onCheckedChange={(val) => {
                if (!isSingleVideo) onToggleMergeVideos(val);
              }}
              disabled={isSingleVideo}
            />
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-content-primary group-hover:text-white transition-colors block">
                {isSingleVideo
                  ? `Direct ${isAudio ? 'MP3' : 'video'} download`
                  : isAudio
                  ? 'Merge into single continuous MP3 track'
                  : 'Merge into single master video'}
              </span>
              <p className="text-xs text-content-muted">
                {isSingleVideo
                  ? `Only 1 item selected — will be saved directly to Downloads as ${isAudio ? '.mp3' : '.mp4'}`
                  : mergeVideos
                  ? isAudio
                    ? 'Stitches all selected tracks into 1 continuous seamless MP3 file'
                    : 'Stitches all selected clips into a single continuous video with chapter markers'
                  : `Downloads each ${isAudio ? 'audio track as .mp3' : 'video clip as .mp4'} into a dedicated folder`}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#262626]">
          {/* Format Selector: MP4 vs MP3 */}
          {onFormatChange && (
            <div className="flex items-center gap-1.5 bg-[#1F1F1F] p-1 rounded-xl border border-[#2B2B2B]" id="format-toggle-control">
              <button
                type="button"
                onClick={() => {
                  onFormatChange('mp4');
                  if (isAudioQuality && onQualityChange) {
                    onQualityChange('1080p');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  !isAudio
                    ? 'bg-brand-red text-white shadow-sm'
                    : 'text-content-secondary hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>MP4 Video</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onFormatChange('mp3');
                  if (!isAudioQuality && onQualityChange) {
                    onQualityChange('320k' as any);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isAudio
                    ? 'bg-brand-red text-white shadow-sm'
                    : 'text-content-secondary hover:text-white'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>MP3 Audio</span>
              </button>
            </div>
          )}

          {/* Quality Selector (when MP4 Video) */}
          {!isAudio && onQualityChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-content-secondary">Quality:</span>
              <div className="relative">
                <select
                  value={quality}
                  onChange={(e) => onQualityChange(e.target.value as VideoQuality)}
                  className="bg-[#202020] hover:bg-[#252525] border border-stroke-light hover:border-[#444] text-white text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-brand-red cursor-pointer transition-colors appearance-none shadow-sm"
                  style={{ backgroundColor: '#202020', color: '#FFFFFF' }}
                >
                  <option value="1080p" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>1080p Full HD</option>
                  <option value="720p" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>720p HD</option>
                  <option value="4k" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>4K Ultra HD</option>
                  <option value="480p" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>480p SD</option>
                  <option value="360p" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>360p Low</option>
                  <option value="auto" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>Auto</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-content-secondary pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Audio Quality Selector (when MP3 Audio) */}
          {isAudio && onQualityChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-content-secondary">Audio Quality:</span>
              <div className="relative">
                <select
                  value={currentAudioQuality}
                  onChange={(e) => onQualityChange(e.target.value as any)}
                  className="bg-[#202020] hover:bg-[#252525] border border-stroke-light hover:border-[#444] text-white text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-brand-red cursor-pointer transition-colors appearance-none shadow-sm"
                  style={{ backgroundColor: '#202020', color: '#FFFFFF' }}
                >
                  <option value="320k" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>320 kbps (Extreme HQ)</option>
                  <option value="256k" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>256 kbps (High Quality)</option>
                  <option value="192k" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>192 kbps (Standard)</option>
                  <option value="128k" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>128 kbps (Compact)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-content-secondary pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}
        </div>
      </div>

      <VideoTable
        videos={playlist.entries}
        selectedIndices={selectedIndices}
        onToggle={onToggle}
        quality={effectiveQuality}
        format={format}
        onSelectAll={onSelectAll}
        onDeselectAll={onDeselectAll}
      />
    </div>
  );
}
