/**
 * Hook managing playlist URL search, validation, and video selection.
 */

import { useState, useMemo, useCallback } from 'react';
import { api } from '@/services/api';
import { Playlist, VideoClip } from '@/types';

export function usePlaylistSelection(
  showToast: (msg: string, type?: 'error' | 'success' | 'info', title?: string) => void
) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fetching, setFetching] = useState(false);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const isSingleVideoUrl = useCallback((u: string) => {
    const trimmed = (u || '').trim().toLowerCase();
    const isYtVideo =
      trimmed.includes('watch?v=') || trimmed.includes('youtu.be/') || trimmed.includes('/shorts/');
    const isPlaylist = trimmed.includes('list=');
    return isYtVideo && !isPlaylist;
  }, []);

  const validateUrl = useCallback((url: string): boolean => {
    const clean = (url || '').trim();
    if (!clean) return false;

    const lower = clean.toLowerCase();
    if (lower.includes('spotify.com')) {
      showToast(
        'Spotify playlists and tracks cannot be downloaded directly because Spotify streams are protected by DRM encryption. Please search for the playlist or song title on YouTube and paste the YouTube link here.',
        'error',
        'Spotify Not Supported'
      );
      return false;
    }
    if (lower.includes('music.apple.com') || lower.includes('itunes.apple.com')) {
      showToast(
        'Apple Music tracks and playlists are DRM-encrypted and cannot be extracted directly. Please paste a YouTube or YouTube Music playlist link instead.',
        'error',
        'Apple Music Not Supported'
      );
      return false;
    }
    if (lower.includes('tidal.com') || lower.includes('deezer.com')) {
      showToast(
        'Commercial subscription streaming services use DRM encryption and cannot be downloaded. Please paste a YouTube or YouTube Music link instead.',
        'error',
        'Streaming Service Not Supported'
      );
      return false;
    }
    const protocolMatches = clean.match(/https?:\/\//gi) || [];
    if (protocolMatches.length > 1 || /list=[^&]*https?:\/\//i.test(clean)) {
      showToast(
        'Multiple URLs were detected concatenated together in the search bar. Please click "Clear" and paste only a single clean YouTube link.',
        'error',
        'Multiple Links Detected'
      );
      return false;
    }
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
      showToast(
        'Please enter a valid web URL starting with https:// (e.g. https://www.youtube.com/playlist?list=...)',
        'error',
        'Invalid URL Format'
      );
      return false;
    }
    return true;
  }, [showToast]);

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
    setFetching,
    playlist,
    setPlaylist,
    selectedIndices,
    setSelectedIndices,
    selectedClips,
    isSingleVideoUrl,
    validateUrl,
    toggleIndex,
    selectAll,
    deselectAll,
  };
}
