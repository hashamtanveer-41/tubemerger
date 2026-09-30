/**
 * Playlist Selection Hook for TubeMerger Mobile
 * Manages search query state, URL validation, and O(1) clip index selections.
 */

import { useState, useMemo, useCallback } from 'react';
import { Playlist, VideoClip } from '../types';
import { IPlaylistService, playlistService } from '../../services/engine';
import { telemetryService } from '../../services/analytics';

export function usePlaylistSelection(
  service: IPlaylistService = playlistService,
  onError?: (msg: string, title?: string) => void
) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fetching, setFetching] = useState<boolean>(false);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const isSingleVideoUrl = useCallback((u: string) => {
    const trimmed = (u || '').trim().toLowerCase();
    const isYtVideo =
      trimmed.includes('watch?v=') || trimmed.includes('youtu.be/') || trimmed.includes('/shorts/');
    const isPlaylist = trimmed.includes('list=');
    return isYtVideo && !isPlaylist;
  }, []);

  const validateUrl = useCallback(
    (url: string): boolean => {
      const clean = (url || '').trim();
      if (!clean) return false;

      const lower = clean.toLowerCase();
      if (lower.includes('spotify.com')) {
        onError?.(
          'Spotify tracks and playlists cannot be downloaded because streams are protected by DRM encryption. Please paste a YouTube link instead.',
          'Spotify Not Supported'
        );
        return false;
      }
      if (lower.includes('music.apple.com') || lower.includes('itunes.apple.com')) {
        onError?.(
          'Apple Music tracks and playlists are DRM-encrypted. Please paste a YouTube link instead.',
          'Apple Music Not Supported'
        );
        return false;
      }
      if (lower.includes('tidal.com') || lower.includes('deezer.com')) {
        onError?.(
          'Commercial subscription streaming services use DRM encryption. Please paste a YouTube link instead.',
          'Streaming Service Not Supported'
        );
        return false;
      }
      const protocolMatches = clean.match(/https?:\/\//gi) || [];
      if (protocolMatches.length > 1 || /list=[^&]*https?:\/\//i.test(clean)) {
        onError?.(
          'Multiple URLs were detected concatenated together. Please clear and paste only a single clean YouTube link.',
          'Multiple Links Detected'
        );
        return false;
      }
      if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
        onError?.(
          'Please enter a valid web URL starting with https://',
          'Invalid URL Format'
        );
        return false;
      }
      return true;
    },
    [onError]
  );

  const fetchPlaylistData = useCallback(
    async (url: string) => {
      if (!validateUrl(url)) return;

      setFetching(true);
      try {
        const data = await service.fetchPlaylist(url);
        setPlaylist(data);
        // Select all by default
        setSelectedIndices(new Set(data.entries.map((_, i) => i)));
        telemetryService.trackPlaylistInspected(data.video_count, data.estimated_size_mb);
      } catch (err: any) {
        onError?.(err.message || 'Failed to inspect playlist.', 'Inspection Failed');
      } finally {
        setFetching(false);
      }
    },
    [service, validateUrl, onError]
  );

  const toggleIndex = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!playlist) return;
    setSelectedIndices(new Set(playlist.entries.map((_, i) => i)));
  }, [playlist]);

  const deselectAll = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  const selectedClips: VideoClip[] = useMemo(() => {
    if (!playlist) return [];
    return Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map((i) => playlist.entries[i])
      .filter(Boolean);
  }, [playlist, selectedIndices]);

  return {
    searchQuery,
    setSearchQuery,
    fetching,
    playlist,
    selectedIndices,
    selectedClips,
    isSingleVideoUrl,
    validateUrl,
    fetchPlaylistData,
    toggleIndex,
    selectAll,
    deselectAll,
  };
}
