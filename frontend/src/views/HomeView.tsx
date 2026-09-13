import React, { useState } from 'react';
import { Search, Film, Music, Video, ArrowRight, Clipboard } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface HomeViewProps {
  onSearch: (url: string) => void;
  loading: boolean;
  onNavigate: (tab: string) => void;
}

export function HomeView({
  onSearch,
  loading,
  onNavigate,
}: HomeViewProps) {
  const [inputUrl, setInputUrl] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim() && !loading) {
      onSearch(inputUrl.trim());
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text.trim());
      }
    } catch {
      // Clipboard access denied
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-6 px-4 select-none animate-in fade-in duration-200">
      {/* Hero Banner */}
      <div className="text-center space-y-3 pt-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-content-primary">
          Merge Playlists into <span className="text-brand-red">Single Master Videos</span>
        </h1>
        <p className="text-sm sm:text-base text-content-secondary max-w-2xl mx-auto leading-relaxed">
          Combine YouTube courses, music playlists, or video series into continuous videos with automatic chapter markers, or extract real 320kbps MP3s.
        </p>
      </div>

      {/* Home Big Search Box */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="relative flex items-center shadow-xl rounded-full bg-[#161616] border border-[#2E2E2E] focus-within:border-brand-red transition-all">
            <div className="pl-5 text-content-muted">
              <Search className="w-5 h-5 text-content-secondary" />
            </div>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste YouTube Playlist or Video URL here…"
              disabled={loading}
              className="w-full h-14 pl-3 pr-32 bg-transparent text-sm sm:text-base text-content-primary placeholder-content-muted focus:outline-none disabled:opacity-50"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              {!inputUrl && (
                <button
                  type="button"
                  onClick={handlePaste}
                  className="hidden sm:flex items-center gap-1 text-xs text-content-secondary hover:text-content-primary bg-[#222222] hover:bg-[#2C2C2C] px-3 py-2 rounded-full transition-colors cursor-pointer"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
              )}
              <Button
                type="submit"
                disabled={loading || !inputUrl.trim()}
                className="h-10 px-5 rounded-full font-semibold text-xs sm:text-sm cursor-pointer shadow-md shadow-red-950/40"
              >
                {loading ? 'Searching…' : 'Inspect'}
              </Button>
            </div>
          </div>
        </form>
        <p className="text-center text-[11px] text-content-dim mt-2.5">
          Supports YouTube playlists, videos, albums, and shorts. Sequential processing prevents bandwidth choking.
        </p>
      </div>

      {/* 3 Action Workflow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        {/* Card 1: Merge Playlists */}
        <Card className="p-6 bg-[#161616] border border-[#262626] hover:border-[#383838] transition-all flex flex-col justify-between space-y-5 rounded-2xl shadow-md group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#161616] border border-[#2A2A2A] text-brand-red flex items-center justify-center">
              <Film className="w-6 h-6 text-brand-red" />
            </div>
            <h3 className="text-lg font-bold text-content-primary group-hover:text-white transition-colors">
              Merge Playlists
            </h3>
            <p className="text-xs text-content-secondary leading-relaxed">
              Concatenate all playlist videos into a single lossless MP4 file with precise embedded chapter navigation.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('merge')}
            className="w-full justify-between text-xs font-semibold h-9 border-[#333333] hover:bg-[#222222] cursor-pointer"
          >
            <span>Start Merging</span>
            <ArrowRight className="w-3.5 h-3.5 text-brand-red" />
          </Button>
        </Card>

        {/* Card 2: Extract MP3 Audio */}
        <Card className="p-6 bg-[#161616] border border-[#262626] hover:border-[#383838] transition-all flex flex-col justify-between space-y-5 rounded-2xl shadow-md group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#161616] border border-[#2A2A2A] text-brand-red flex items-center justify-center">
              <Music className="w-6 h-6 text-brand-red" />
            </div>
            <h3 className="text-lg font-bold text-content-primary group-hover:text-white transition-colors">
              Extract MP3 Audio
            </h3>
            <p className="text-xs text-content-secondary leading-relaxed">
              Convert videos or full playlists into true 320kbps MP3s. Download individually or stitch into 1 long audio track.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('audio')}
            className="w-full justify-between text-xs font-semibold h-9 border-[#333333] hover:bg-[#222222] cursor-pointer"
          >
            <span>Audio Studio (MP3)</span>
            <ArrowRight className="w-3.5 h-3.5 text-brand-red" />
          </Button>
        </Card>

        {/* Card 3: Download Single Video */}
        <Card className="p-6 bg-[#161616] border border-[#262626] hover:border-[#383838] transition-all flex flex-col justify-between space-y-5 rounded-2xl shadow-md group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#161616] border border-[#2A2A2A] text-brand-red flex items-center justify-center">
              <Video className="w-6 h-6 text-brand-red" />
            </div>
            <h3 className="text-lg font-bold text-content-primary group-hover:text-white transition-colors">
              Download Video
            </h3>
            <p className="text-xs text-content-secondary leading-relaxed">
              Grab individual videos or shorts directly in 1080p or crisp 4K 60FPS without encoding or watermarks.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('single-video')}
            className="w-full justify-between text-xs font-semibold h-9 border-[#333333] hover:bg-[#222222] cursor-pointer"
          >
            <span>Direct Downloader</span>
            <ArrowRight className="w-3.5 h-3.5 text-brand-red" />
          </Button>
        </Card>
      </div>
    </div>
  );
}
