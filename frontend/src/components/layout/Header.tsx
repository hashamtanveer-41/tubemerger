import React, { useState, useEffect } from 'react';
import { Search, Github, Heart } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';
import { SUPPORT_URL } from '@/components/common/SupportModal';
import logoPng from '@/assets/logo.png';

const GITHUB_URL = 'https://github.com/hashamtanveer-41/tubemerger';

interface HeaderProps {
  onSearch: (url: string) => void;
  loading: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

export function Header({
  onSearch,
  loading,
  searchQuery = '',
  onSearchQueryChange,
}: HeaderProps) {
  const [url, setUrl] = useState(searchQuery);

  useEffect(() => {
    setUrl(searchQuery);
  }, [searchQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    onSearchQueryChange?.(val);
  };

  const handleClear = () => {
    setUrl('');
    onSearchQueryChange?.('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !loading) {
      onSearch(url.trim());
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (pasted.startsWith('http://') || pasted.startsWith('https://')) {
      e.preventDefault();
      setUrl(pasted);
      onSearchQueryChange?.(pasted);
    }
  };

  const [githubClicked, setGithubClicked] = useState(false);

  return (
    <header className="h-16 bg-theme-base border-b border-stroke-subtle px-6 flex items-center justify-between shrink-0 select-none">
      {/* Brand */}
      <div className="flex items-center space-x-3 w-64 shrink-0">
        <img
          src={logoPng}
          alt="TubeMerger"
          className="w-8 h-8 object-contain shrink-0"
          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
        />
        <div>
          <h1 className="text-lg font-black tracking-tight leading-none text-content-primary">
            <span className="text-brand-red">T</span>ubeMerger
          </h1>
          <p className="text-[9px] uppercase tracking-widest text-content-secondary mt-0.5 font-medium">
            Free & Open Source
          </p>
        </div>
      </div>

      {/* URL Input */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-2xl px-4" id="search-bar-container">
        <div className="relative flex items-center w-full">
          <input
            type="text"
            value={url}
            onChange={handleChange}
            onPaste={handlePaste}
            disabled={loading}
            placeholder="Paste YouTube Playlist or Video URL…"
            className="w-full h-11 pl-5 pr-32 rounded-full bg-theme-input border border-stroke-light text-sm text-content-primary placeholder-content-muted focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all disabled:opacity-50"
          />
          <div className="absolute right-1.5 flex items-center gap-1.5">
            {url.length > 0 && !loading && (
              <button
                type="button"
                onClick={handleClear}
                className="h-8 px-3 rounded-full bg-[#242424] hover:bg-[#303030] text-xs text-content-secondary hover:text-white transition-colors cursor-pointer font-medium"
                title="Clear input"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="h-8 w-10 bg-theme-elevated hover:bg-theme-hover active:bg-theme-panel rounded-full flex items-center justify-center text-content-secondary hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              title="Search"
            >
              {loading ? <Spinner size="sm" variant="red" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </form>

      {/* Utility Actions: Support Developer & GitHub Star */}
      <div className="flex items-center justify-end w-72 shrink-0 gap-2.5">
        <button
          type="button"
          onClick={() => {
            api.openUrl(SUPPORT_URL).catch(() => window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer'));
          }}
          className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-[#1A1A1A] hover:bg-[#252525] border border-[#333333] hover:border-pink-500/40 text-xs font-semibold text-[#CCCCCC] hover:text-white transition-all group active:border-brand-red cursor-pointer"
          title="Support the Developer"
        >
          <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500/20 group-hover:fill-pink-500 transition-all" />
          <span>Support</span>
        </button>

        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setGithubClicked(true)}
          className={cn(
            "flex items-center gap-2 h-9 px-3.5 rounded-full bg-[#1A1A1A] hover:bg-[#252525] border border-[#333333] hover:border-[#555555] text-xs font-semibold transition-all group active:border-brand-red cursor-pointer",
            githubClicked ? "text-white border-brand-red/50" : "text-[#AAAAAA] hover:text-white"
          )}
        >
          <Github
            className={cn(
              "w-3.5 h-3.5 transition-colors",
              githubClicked ? "text-brand-red" : "text-white group-hover:text-white group-active:text-brand-red"
            )}
          />
          <span>Star on GitHub</span>
        </a>
      </div>
    </header>
  );
}
