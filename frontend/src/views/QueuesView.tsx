import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { QueueItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  ListVideo,
  Play,
  Trash2,
  Plus,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface QueuesViewProps {
  onStartMergeUrl: (url: string) => void;
  isMerging?: boolean;
  activeUrl?: string;
  onShowToast?: (message: string, type?: 'error' | 'success' | 'info', title?: string) => void;
}

export function QueuesView({ onStartMergeUrl, isMerging = false, activeUrl, onShowToast }: QueuesViewProps) {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      const data = await api.getQueues();
      setQueues(data);
    } catch (err) {
      console.error('Failed to load merge queues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, [isMerging]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = newUrl.trim();
    if (!cleanUrl || adding) return;

    const lower = cleanUrl.toLowerCase();
    if (lower.includes('spotify.com')) {
      onShowToast?.(
        'Spotify playlists cannot be queued because Spotify streams are protected by DRM encryption. Please queue YouTube links.',
        'error',
        'Spotify Not Supported'
      );
      return;
    }
    if (lower.includes('music.apple.com') || lower.includes('itunes.apple.com')) {
      onShowToast?.(
        'Apple Music playlists cannot be queued because streams are DRM-protected. Please queue YouTube links.',
        'error',
        'Apple Music Not Supported'
      );
      return;
    }

    try {
      setAdding(true);
      const item = await api.enqueuePlaylist({
        playlist_url: cleanUrl,
        playlist_title: 'Queued Playlist',
      });
      setQueues((prev) => [...prev, item as QueueItem]);
      setNewUrl('');
      onShowToast?.('Playlist added to batch queue.', 'success', 'Added to Queue');
    } catch (err: any) {
      console.error('Failed to add to queue:', err);
      onShowToast?.(err.message || 'Failed to add playlist to queue.', 'error', err.title || 'Queue Error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      await api.deleteQueueItem(id);
      setQueues((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete queue item:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div id="queues-view-container" className="max-w-5xl mx-auto space-y-6 select-none animate-in fade-in duration-200 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#242424]">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ListVideo className="w-6 h-6 text-brand-red" />
            Merge Queues
          </h1>
          <p className="text-xs text-[#888888] mt-1">
            Queue multiple playlists for automated batch processing.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-3">
          <Spinner size="lg" variant="red" />
          <p className="text-xs text-[#888888]">Loading SQLite merge queues…</p>
        </div>
      ) : (
        <>

      {/* Active Merge in Progress Notification Banner */}
      {isMerging && (
        <div className="p-3.5 rounded-xl border border-brand-red/40 bg-theme-base text-xs flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-brand-red shrink-0 animate-pulse" />
          <span className="text-white font-medium">
            A playlist is currently downloading and merging. Start Merge is temporarily disabled until the active download completes.
          </span>
        </div>
      )}

      {/* Quick Enqueue Bar */}
      <form onSubmit={handleAdd} className="flex gap-3">
        <input
          type="text"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Paste YouTube playlist URL to queue for batch merging..."
          className="flex-1 h-11 px-4 rounded-xl bg-[#161616] border border-[#262626] text-xs text-white placeholder-[#666666] focus:outline-none focus:border-brand-red transition-colors"
        />
        <Button
          type="submit"
          variant="default"
          size="default"
          loading={adding}
          disabled={!newUrl.trim()}
          icon={Plus}
          className="h-11 px-5 font-semibold text-xs rounded-xl shrink-0"
        >
          Add to Queue
        </Button>
      </form>

      {/* Empty State */}
      {queues.length === 0 ? (
        <div className="rounded-3xl border border-[#282828] bg-[#141414] p-12 text-center space-y-4 max-w-xl mx-auto shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#1E1E1E] border border-[#303030] flex items-center justify-center text-[#888888] mx-auto">
            <ListVideo className="w-8 h-8 text-[#666666]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">No Playlists in Queue</h3>
            <p className="text-xs text-[#888888]">
              Add playlists above to queue them for continuous merging.
            </p>
          </div>
        </div>
      ) : (
        /* Queue Item Cards */
        <div className="space-y-3">
          {queues.map((item, index) => {
            const isThisItemMerging = isMerging && activeUrl === item.playlist_url;
            const isAnyMerging = Boolean(isMerging);

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-[#262626] bg-[#161616] hover:bg-[#1A1A1A] p-4 sm:p-5 transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-[#222222] border border-[#2E2E2E] flex items-center justify-center text-white font-bold text-xs shrink-0">
                    #{index + 1}
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-white truncate">
                        {item.playlist_title}
                      </h3>
                      {isThisItemMerging ? (
                        <span className="text-[10px] font-semibold text-blue-400 bg-blue-950/50 border border-blue-800/60 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <Clock className="w-3 h-3" />
                          DOWNLOADING
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.status.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#888888] font-mono truncate max-w-xl">
                      {item.playlist_url}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onStartMergeUrl(item.playlist_url)}
                    disabled={isAnyMerging}
                    loading={isThisItemMerging}
                    icon={isThisItemMerging ? undefined : Play}
                    className="h-9 px-4 text-xs font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isAnyMerging ? 'Disabled while another playlist is being downloaded or merged' : 'Start merge for this playlist'}
                  >
                    {isThisItemMerging
                      ? 'Downloading…'
                      : isAnyMerging
                      ? 'Download in Progress…'
                      : 'Start Merge'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id || isThisItemMerging}
                    className="w-9 h-9 rounded-xl border border-[#2E2E2E] hover:border-red-500/50 flex items-center justify-center text-[#666666] hover:text-red-400 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    title="Remove from queue"
                  >
                    {deletingId === item.id ? (
                      <Spinner size="sm" variant="red" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}
    </div>
  );
}
