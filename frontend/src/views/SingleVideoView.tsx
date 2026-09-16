import React, { useState } from 'react';
import { VideoClip, Playlist, VideoQuality } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Music, HardDrive, Clock, ArrowLeft, Download, Film, Search, Clipboard, ChevronDown } from 'lucide-react';
import { formatBytes, estimateVideoSizeBytes } from '@/lib/utils';

interface SingleVideoViewProps {
  playlist: Playlist | null;
  onSearch: (url: string) => void;
  onDownload: (options: { format: 'mp4' | 'mp3'; quality: VideoQuality }) => void;
  onBackToHome: () => void;
  loading: boolean;
  quality: VideoQuality;
  setQuality: (q: VideoQuality) => void;
}

export function SingleVideoView({
  playlist,
  onSearch,
  onDownload,
  onBackToHome,
  loading,
  quality,
  setQuality,
}: SingleVideoViewProps) {
  const [urlInput, setUrlInput] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'mp4' | 'mp3'>('mp4');
  const [audioQuality, setAudioQuality] = useState('320k');

  const video: VideoClip | undefined = playlist?.entries?.[0];

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

  const isAudio = selectedFormat === 'mp3';
  const effectiveQuality = isAudio ? audioQuality : quality;

  const estimatedSize = video
    ? formatBytes(estimateVideoSizeBytes(video.duration_seconds || 0, effectiveQuality))
    : '0 MB';

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 px-4 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-content-primary flex items-center gap-2">
            <Video className="w-5 h-5 text-brand-red" />
            <span>Download Single Video</span>
          </h1>
          <p className="text-xs text-content-secondary mt-0.5">
            Download individual YouTube videos or audio in original high quality.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onBackToHome}
          icon={ArrowLeft}
          className="text-xs border-stroke-light hover:bg-theme-elevated cursor-pointer"
        >
          Back to Home
        </Button>
      </div>

      {/* URL search if not loaded or switching */}
      <Card className="p-4 bg-[#161616] border border-[#2A2A2A]">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste YouTube video or Shorts URL…"
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
            {loading ? 'Fetching…' : 'Inspect Video'}
          </Button>
        </form>
      </Card>

      {/* Download Configuration & Inspector Card */}
      <Card id="single-video-download-card" className="p-6 bg-[#161616] border border-[#2A2A2A] space-y-6 shadow-xl">
        {video ? (
          <div className="flex flex-col md:flex-row gap-5 items-start">
            {/* Thumbnail */}
            <div className="w-full md:w-56 h-32 rounded-xl bg-black overflow-hidden shrink-0 relative border border-[#333333]">
              {video.thumbnail_url || video.thumbnail ? (
                <img
                  src={video.thumbnail_url || video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-content-dim">
                  <Film className="w-8 h-8" />
                </div>
              )}
              <span className="absolute bottom-1.5 right-1.5 bg-black/85 text-[11px] font-mono font-medium px-2 py-0.5 rounded text-white/90">
                {video.duration_formatted}
              </span>
            </div>

            {/* Video Details */}
            <div className="flex-1 min-w-0 space-y-2">
              <h3 className="text-base font-bold text-content-primary leading-snug">
                {video.title}
              </h3>
              <p className="text-xs text-content-secondary font-medium">
                {playlist?.channel || 'YouTube Creator'}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-content-secondary">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-content-muted" />
                  {video.duration_formatted}
                </span>
                <span className="text-content-dim">·</span>
                <span className="flex items-center gap-1 font-medium text-brand-red">
                  <HardDrive className="w-3.5 h-3.5" />
                  ~{estimatedSize}
                </span>
                <span className="text-content-dim">·</span>
                <span className="px-2 py-0.5 rounded bg-[#222222] text-[10px] uppercase font-bold text-[#AAAAAA]">
                  {selectedFormat === 'mp3' ? `MP3 ${audioQuality.replace('k', '')}kbps` : 'Video + Audio'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-[#111111] border border-[#222222]">
            <div className="w-12 h-12 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0 border border-brand-red/20">
              <Download className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-semibold text-content-primary">
                Direct Video Downloader
              </h4>
            </div>
          </div>
        )}

        {/* Download Config Bar with Format & Quality */}
        <div className="pt-4 border-t border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Format selection */}
          <div className="flex items-center gap-2" id="format-toggle-control">
            <span className="text-xs font-semibold text-content-muted uppercase tracking-wider mr-1">
              Format:
            </span>
            <button
              type="button"
              onClick={() => setSelectedFormat('mp4')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedFormat === 'mp4'
                  ? 'bg-brand-red text-white shadow-md shadow-red-950/40'
                  : 'bg-[#222222] text-content-secondary hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>MP4 Video</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormat('mp3')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedFormat === 'mp3'
                  ? 'bg-brand-red text-white shadow-md shadow-red-950/40'
                  : 'bg-[#222222] text-content-secondary hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>MP3 Audio</span>
            </button>
          </div>

          {/* Video Quality selection (if MP4) */}
          {selectedFormat === 'mp4' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
                Quality:
              </span>
              <div className="relative flex items-center">
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as VideoQuality)}
                  className="appearance-none bg-[#202020] hover:bg-[#262626] border border-[#333333] text-white text-xs font-semibold rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-brand-red cursor-pointer shadow-sm transition-colors"
                  style={{ backgroundColor: '#202020', color: '#FFFFFF' }}
                >
                  <option value="4k" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>4K (2160p)</option>
                  <option value="1080p" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>1080p (FHD)</option>
                  <option value="720p" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>720p (HD)</option>
                  <option value="480p" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>480p (SD)</option>
                  <option value="360p" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>360p (Low)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#888888] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Audio Quality selection (if MP3) */}
          {selectedFormat === 'mp3' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
                Audio Quality:
              </span>
              <div className="relative flex items-center">
                <select
                  value={audioQuality}
                  onChange={(e) => setAudioQuality(e.target.value)}
                  className="appearance-none bg-[#202020] hover:bg-[#262626] border border-[#333333] text-white text-xs font-semibold rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-brand-red cursor-pointer shadow-sm transition-colors"
                  style={{ backgroundColor: '#202020', color: '#FFFFFF' }}
                >
                  <option value="320k" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>320 kbps (Extreme HQ)</option>
                  <option value="256k" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>256 kbps (High Quality)</option>
                  <option value="192k" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>192 kbps (Standard)</option>
                  <option value="128k" style={{ backgroundColor: '#202020', color: '#FFFFFF' }}>128 kbps (Compact)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#888888] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Action CTA */}
          <Button
            id="single-video-download-btn"
            size="default"
            disabled={!video || loading}
            loading={loading}
            onClick={() => onDownload({ format: selectedFormat, quality: (selectedFormat === 'mp3' ? audioQuality : quality) as any })}
            icon={Download}
            className="px-6 h-10 font-bold text-xs sm:text-sm cursor-pointer shadow-lg shadow-red-950/30 disabled:opacity-50"
            title={video ? (loading ? 'Starting download…' : 'Start download') : 'Enter a video URL above first'}
          >
            {loading
              ? 'Starting Download…'
              : video
                ? selectedFormat === 'mp3' ? `Download MP3 (${audioQuality})` : `Download (${quality})`
                : selectedFormat === 'mp3' ? 'Download MP3' : 'Download Video'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
