import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { HistoryItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Clock,
  Play,
  FolderOpen,
  Trash2,
  RotateCw,
  Search,
  CheckCircle2,
  Film,
  HardDrive,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { SupportCard } from '@/components/common/SupportCard';

interface HistoryViewProps {
  onReMerge: (url: string) => void;
  onNavigateToMerge: () => void;
}

export function HistoryView({ onReMerge, onNavigateToMerge }: HistoryViewProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load merge history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      await api.deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete history item:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear your entire merge history? This cannot be undone.')) {
      return;
    }
    try {
      setClearing(true);
      await api.clearAllHistory();
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    } finally {
      setClearing(false);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      await api.openFile(filePath);
    } catch (err) {
      console.error('Failed to open video file:', err);
    }
  };

  const handleOpenFolder = async (filePath: string) => {
    try {
      await api.openFolder(filePath);
    } catch (err) {
      console.error('Failed to open video folder:', err);
    }
  };

  const filteredHistory = history.filter((item) =>
    item.playlist_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.channel_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalFiles = history.length;
  const totalSeconds = history.reduce((acc, item) => acc + (item.duration_seconds || 0), 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <Spinner size="lg" variant="red" />
        <p className="text-xs text-[#888888]">Loading SQLite merge history…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 select-none animate-in fade-in duration-200 pb-16">
      {/* Header & Metric Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#242424]">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-brand-red" />
            Merge History
          </h1>
          <p className="text-xs text-[#888888] mt-1">
            Persistent log of all completed and stitched YouTube playlists.
          </p>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              loading={clearing}
              icon={Trash2}
              className="text-xs border-[#333333] hover:border-red-500/50 hover:text-red-400"
            >
              Clear History
            </Button>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[#262626] bg-[#161616] p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#202020] flex items-center justify-center text-white shrink-0">
              <Film className="w-5 h-5 text-brand-red" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Completed Jobs</p>
              <p className="text-xl font-bold text-white mt-0.5">{totalFiles} Playlists</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#262626] bg-[#161616] p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#202020] flex items-center justify-center text-white shrink-0">
              <Clock className="w-5 h-5 text-brand-red" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Stitched Time</p>
              <p className="text-xl font-bold text-white mt-0.5">{totalHours} Hours</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#262626] bg-[#161616] p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#202020] flex items-center justify-center text-white shrink-0">
              <HardDrive className="w-5 h-5 text-brand-red" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Database Mode</p>
              <p className="text-xl font-bold text-white mt-0.5">SQLite WAL</p>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      {history.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-[#666666] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past merges by title or channel..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#161616] border border-[#262626] text-xs text-white placeholder-[#666666] focus:outline-none focus:border-brand-red transition-colors"
          />
        </div>
      )}

      {/* Empty State */}
      {history.length === 0 ? (
        <div className="rounded-3xl border border-[#282828] bg-[#141414] p-12 text-center space-y-4 max-w-xl mx-auto shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#1E1E1E] border border-[#303030] flex items-center justify-center text-[#888888] mx-auto">
            <Clock className="w-8 h-8 text-[#666666]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">No Merge History Yet</h3>
            <p className="text-xs text-[#888888]">
              Completed playlist merges will be recorded here with output links, file size, and chapter markers.
            </p>
          </div>
          <Button
            variant="default"
            size="default"
            onClick={onNavigateToMerge}
            icon={Play}
            className="h-10 px-6 font-semibold text-xs rounded-xl"
          >
            Start Your First Merge
          </Button>
        </div>
      ) : (
        /* History Item Cards */
        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[#262626] bg-[#161616] hover:bg-[#1A1A1A] p-4 sm:p-5 transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-xl bg-[#222222] border border-[#2E2E2E] flex flex-col items-center justify-center text-white shrink-0">
                  <Film className="w-5 h-5 text-brand-red" />
                  <span className="text-[9px] font-bold text-zinc-400 mt-0.5">{item.resolution}</span>
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">
                      {item.playlist_title}
                    </h3>
                    <span className="text-[10px] font-semibold text-brand-red bg-brand-red/10 border border-brand-red/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#888888]">
                    <span className="text-zinc-300 font-medium">{item.channel_name}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#666666]" />
                      {item.video_count} clips
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#666666]" />
                      {item.duration_formatted}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-[#666666]" />
                      {item.file_size_formatted}
                    </span>
                    <span>·</span>
                    <span className="text-[#666666]">{item.created_at}</span>
                  </div>

                  {item.output_path && (
                    <p className="text-[11px] font-mono text-[#666666] truncate max-w-xl">
                      {item.output_path}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                {item.file_exists && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleOpenFile(item.output_path)}
                    icon={Play}
                    className="h-9 px-3.5 text-xs font-semibold rounded-xl"
                  >
                    Play
                  </Button>
                )}

                {item.output_path && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenFolder(item.output_path)}
                    icon={FolderOpen}
                    className="h-9 px-3 text-xs border-[#333333] hover:border-white text-zinc-300 rounded-xl"
                    title="Show in Folder"
                  >
                    Folder
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReMerge(item.playlist_url)}
                  icon={RotateCw}
                  className="h-9 px-3 text-xs border-[#333333] hover:border-white text-zinc-300 rounded-xl"
                  title="Load into Merge Workspace"
                >
                  Re-merge
                </Button>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="w-9 h-9 rounded-xl border border-[#2E2E2E] hover:border-red-500/50 flex items-center justify-center text-[#666666] hover:text-red-400 transition-colors cursor-pointer"
                  title="Remove from history"
                >
                  {deletingId === item.id ? (
                    <Spinner size="sm" variant="red" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <SupportCard variant="compact" dismissible className="mt-6" />
      )}
    </div>
  );
}
