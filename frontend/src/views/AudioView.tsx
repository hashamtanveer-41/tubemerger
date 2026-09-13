import React, { useState, useEffect } from 'react';
import { Playlist, VideoClip } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Music,
  Disc,
  Download,
  ArrowLeft,
  Clock,
  HardDrive,
  Headphones,
  CheckCircle2,
  ListMusic,
  CheckSquare,
  Square,
  Search,
  Clipboard,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { formatBytes, estimateVideoSizeBytes } from '@/lib/utils';

interface AudioViewProps {
  playlist: Playlist | null;
  onSearch: (url: string) => void;
  onDownloadSingleAudio: (quality?: string) => void;
  onMergeAudioPlaylist: (quality?: string) => void;
  loading: boolean;
  initialMode?: 'download' | 'merge';
  onBackToHome: () => void;
  selectedIndices: Set<number>;
  onToggleIndex: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function AudioView({
  playlist,
  onSearch,
  onDownloadSingleAudio,
  onMergeAudioPlaylist,
  loading,
  initialMode = 'download',
  onBackToHome,
  selectedIndices,
  onToggleIndex,
  onSelectAll,
  onDeselectAll,
}: AudioViewProps) {
  const [mode, setMode] = useState<'download' | 'merge'>(initialMode);
  const [urlInput, setUrlInput] = useState('');
  const [audioQuality, setAudioQuality] = useState('320k');

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim() && !loading) {
      onSearch(urlInput.trim());
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text.trim());
      }
    } catch {
      // Ignore
    }
  };

  const video: VideoClip | undefined = playlist?.entries?.[0];
  const isPlaylist = (playlist?.entries?.length ?? 0) > 1;

  // Single audio size estimate
  const singleAudioSize = video
    ? formatBytes(estimateVideoSizeBytes(video.duration_seconds || 0, audioQuality))
    : '0 MB';

  // Total selected playlist audio duration & size estimate
  const selectedEntries = (playlist?.entries || []).filter((_, i) => selectedIndices.has(i));
  const totalAudioSeconds = selectedEntries.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
  const playlistAudioSize = formatBytes(estimateVideoSizeBytes(totalAudioSeconds, audioQuality));

  return (
    <div id="audio-studio-container" className="max-w-4xl mx-auto space-y-6 py-6 px-4 select-none animate-in fade-in duration-200">
      {/* Header & Back Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-content-primary flex items-center gap-2">
            <Music className="w-5 h-5 text-brand-red" />
            <span>Audio Studio (320kbps MP3)</span>
          </h1>
          <p className="text-xs text-content-secondary mt-0.5">
            Extract individual audio tracks or merge entire YouTube playlist albums into continuous MP3 files.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onBackToHome}
          icon={ArrowLeft}
          className="text-xs border-[#333333] hover:bg-[#222222] cursor-pointer"
        >
          Back to Home
        </Button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex rounded-2xl bg-[#141414] border border-[#242424] p-1.5 gap-2">
        <button
          type="button"
          onClick={() => setMode('download')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mode === 'download'
              ? 'bg-brand-red text-white shadow-md shadow-red-950/50'
              : 'text-[#888888] hover:text-white hover:bg-[#1C1C1C]'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Download Single Audio</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('merge')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mode === 'merge'
              ? 'bg-brand-red text-white shadow-md shadow-red-950/50'
              : 'text-[#888888] hover:text-white hover:bg-[#1C1C1C]'
          }`}
        >
          <Disc className="w-4 h-4" />
          <span>Merge Audio Playlist</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <Card className="p-4 bg-[#161616] border border-[#2A2A2A]">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={
                mode === 'download'
                  ? 'Paste YouTube video, track, or Shorts link to extract MP3…'
                  : 'Paste YouTube playlist or album link to merge into continuous MP3…'
              }
              disabled={loading}
              className="w-full h-11 pl-4 pr-20 rounded-xl bg-[#0F0F0F] border border-[#2E2E2E] text-sm text-content-primary placeholder-content-muted focus:outline-none focus:border-brand-red"
            />
            {!urlInput && (
              <button
                type="button"
                onClick={handlePaste}
                className="absolute right-2 top-2 h-7 px-2.5 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] text-xs text-content-secondary hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Clipboard className="w-3 h-3" />
                <span>Paste</span>
              </button>
            )}
          </div>
          <Button
            type="submit"
            disabled={loading || !urlInput.trim()}
            icon={Search}
            className="h-11 px-5 rounded-xl text-xs font-semibold cursor-pointer"
          >
            {loading ? 'Fetching…' : 'Inspect Audio'}
          </Button>
        </form>
      </Card>

      {/* Content depending on selected mode */}
      {mode === 'download' ? (
        /* Single Audio Downloader Section */
        <Card className="p-6 bg-[#161616] border border-[#2A2A2A] space-y-6 shadow-xl">
          {video ? (
            <div className="flex flex-col md:flex-row gap-5 items-start">
              {/* Thumbnail with Vinyl/Audio badge */}
              <div className="w-full md:w-52 h-32 rounded-xl bg-black overflow-hidden shrink-0 relative border border-[#333333]">
                {video.thumbnail_url || video.thumbnail ? (
                  <img
                    src={video.thumbnail_url || video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-content-dim">
                    <Music className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-1.5 left-1.5 bg-black/85 text-brand-red p-1 rounded-md">
                  <Headphones className="w-3.5 h-3.5" />
                </div>
                <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-[11px] font-mono font-medium px-2 py-0.5 rounded text-white/90">
                  {video.duration_formatted}
                </span>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-brand-red/10 border border-brand-red/30 text-brand-red text-[10px] uppercase font-bold tracking-wider">
                    320kbps True MP3
                  </span>
                  <span className="text-xs text-[#666666]">LAME Audio Quality 0</span>
                </div>
                <h3 className="text-base font-bold text-content-primary leading-snug">
                  {video.title}
                </h3>
                <p className="text-xs text-content-secondary font-medium">
                  {playlist?.channel || 'YouTube Artist'}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-content-secondary">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-content-muted" />
                    {video.duration_formatted}
                  </span>
                  <span className="text-content-dim">·</span>
                  <span className="flex items-center gap-1 font-medium text-brand-red">
                    <HardDrive className="w-3.5 h-3.5" />
                    ~{singleAudioSize}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-xl bg-[#111111] border border-[#222222]">
              <div className="w-12 h-12 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0 border border-brand-red/20">
                <Music className="w-6 h-6" />
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-semibold text-content-primary">
                  Single Track Audio Extractor
                </h4>
                <p className="text-xs text-content-secondary">
                  Paste any YouTube song, talk, podcast, or Shorts URL above to download pure 320kbps MP3 audio with preserved metadata.
                </p>
              </div>
            </div>
          )}

          {/* Download Action Footer */}
          <div className="pt-4 border-t border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-content-secondary">Audio Quality:</span>
              <div className="relative">
                <select
                  value={audioQuality}
                  onChange={(e) => setAudioQuality(e.target.value)}
                  className="bg-[#202020] hover:bg-[#252525] border border-stroke-light text-white text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-brand-red cursor-pointer transition-colors appearance-none shadow-sm"
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
            <Button
              size="default"
              disabled={!video}
              onClick={() => onDownloadSingleAudio(audioQuality)}
              icon={Download}
              className="px-6 h-10 font-bold text-xs sm:text-sm cursor-pointer shadow-lg shadow-red-950/40 disabled:opacity-50"
            >
              Download MP3 ({audioQuality})
            </Button>
          </div>
        </Card>
      ) : (
        /* Playlist Audio Merger Section */
        <Card className="p-6 bg-[#161616] border border-[#2A2A2A] space-y-6 shadow-xl">
          {playlist && isPlaylist ? (
            <div className="space-y-5">
              {/* Summary Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#111111] border border-[#242424]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-brand-red/10 border border-brand-red/30 text-brand-red text-[10px] uppercase font-bold tracking-wider">
                      Continuous MP3 Album
                    </span>
                    <span className="text-xs text-[#888888]">{playlist.channel || 'YouTube Playlist'}</span>
                  </div>
                  <h3 className="text-base font-bold text-white leading-snug">
                    {playlist.title}
                  </h3>
                  <p className="text-xs text-[#888888]">
                    {selectedEntries.length} of {playlist.entries.length} tracks selected · Estimated merged size: <span className="text-brand-red font-medium">~{playlistAudioSize}</span>
                  </p>
                </div>

                {/* Batch selection buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSelectAll}
                    icon={CheckSquare}
                    className="text-xs h-8 border-[#333333] hover:bg-[#222222] cursor-pointer"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDeselectAll}
                    icon={Square}
                    className="text-xs h-8 border-[#333333] hover:bg-[#222222] cursor-pointer"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Playlist Tracks List */}
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {playlist.entries.map((entry, index) => {
                  const isSelected = selectedIndices.has(index);
                  return (
                    <div
                      key={index}
                      onClick={() => onToggleIndex(index)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#181818] border-brand-red/40 text-white'
                          : 'bg-[#121212] border-[#222222] text-[#666666] hover:text-[#AAAAAA]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono font-bold w-6 text-center shrink-0">
                          #{index + 1}
                        </span>
                        <p className="text-xs font-medium truncate">{entry.title}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-[11px] font-mono text-[#888888]">
                          {entry.duration_formatted}
                        </span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isSelected
                              ? 'bg-brand-red border-brand-red text-white'
                              : 'border-[#444444]'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Merge Action Footer */}
              <div className="pt-4 border-t border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-content-secondary">Audio Quality:</span>
                  <div className="relative">
                    <select
                      value={audioQuality}
                      onChange={(e) => setAudioQuality(e.target.value)}
                      className="bg-[#202020] hover:bg-[#252525] border border-stroke-light text-white text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-brand-red cursor-pointer transition-colors appearance-none shadow-sm"
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
                <Button
                  size="default"
                  disabled={selectedEntries.length === 0}
                  onClick={() => onMergeAudioPlaylist(audioQuality)}
                  icon={Disc}
                  className="px-6 h-10 font-bold text-xs sm:text-sm cursor-pointer shadow-lg shadow-red-950/40 disabled:opacity-50"
                >
                  Merge Audio Playlist ({selectedEntries.length} Tracks · {audioQuality})
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-xl bg-[#111111] border border-[#222222]">
              <div className="w-12 h-12 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0 border border-brand-red/20">
                <Disc className="w-6 h-6" />
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm font-semibold text-content-primary">
                  Continuous Audio Playlist Merger
                </h4>
                <p className="text-xs text-content-secondary">
                  Paste any YouTube playlist, music compilation, or album URL above to stitch all tracks into a single continuous MP3 file.
                </p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
