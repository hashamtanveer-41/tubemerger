/**
 * Top-level application coordinator hook.
 *
 * Composes domain-specific hooks (Toast, Auth, License, Playlist, Pipeline)
 * into a single unified state interface for the application views.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { HealthStatus, Playlist, AuthResponse } from '@/types';
import { useToast } from './useToast';
import { useAuth } from './useAuth';
import { useLicense } from './useLicense';
import { usePlaylistSelection } from './usePlaylistSelection';
import { useMergePipeline } from './useMergePipeline';

export function useMergeApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // 1. Toast subsystem
  const { toast, setToast, showToast, dismissToast } = useToast();

  // 2. Auth subsystem
  const {
    profile,
    setProfile,
    activeDevices,
    setActiveDevices,
    isAuthModalOpen,
    setIsAuthModalOpen,
    onAuthSuccess: onAuthSuccessBase,
    handleLogout: handleLogoutBase,
    handleDeactivateDevice,
  } = useAuth(showToast);

  // 3. License & Quota subsystem
  const {
    license,
    setLicense,
    usage,
    setUsage,
    recordRequest,
    refreshUsage,
    refreshLicense,
    activateLicense,
    deactivateLicense,
    DEFAULT_LICENSE,
    DEFAULT_USAGE,
  } = useLicense();

  // 4. Playlist Selection subsystem
  const {
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
  } = usePlaylistSelection(showToast);

  // 5. Merge Pipeline subsystem
  const {
    isMerging,
    setIsMerging,
    progress,
    setProgress,
    outputFile,
    setOutputFile,
    failureInfo,
    setFailureInfo,
    isPaused,
    setIsPaused,
    mergeVideos,
    setMergeVideos,
    quality,
    setQuality,
    format,
    setFormat,
    pauseMerge,
    resumeMerge,
    cancelMerge,
    dismissFailureModal,
  } = useMergePipeline(showToast);

  // Bootstrapping session & health
  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => {});

    api.getAuthMe().then((authData) => {
      if (authData) {
        setProfile(authData.user);
        setActiveDevices(authData.active_devices);
        setLicense((prev) => ({
          ...prev,
          status: 'active',
          plan_tier: (authData.plan_tier === 'CREATOR_PRO' ? 'PRO' : (authData.plan_tier as any)) || 'PRO',
          max_devices: authData.max_devices,
        }));
      }
      refreshUsage();
      refreshLicense();
    }).catch(() => {
      refreshUsage();
      refreshLicense();
    });
  }, [refreshUsage, refreshLicense, setProfile, setActiveDevices, setLicense]);

  const onAuthSuccess = useCallback((authData: AuthResponse) => {
    onAuthSuccessBase(authData);
    setLicense((prev) => ({
      ...prev,
      status: 'active',
      plan_tier: (authData.plan_tier === 'CREATOR_PRO' ? 'PRO' : (authData.plan_tier as any)) || 'PRO',
      max_devices: authData.max_devices,
    }));
    refreshUsage();
    refreshLicense();
  }, [onAuthSuccessBase, setLicense, refreshUsage, refreshLicense]);

  const handleLogout = useCallback(async () => {
    await handleLogoutBase();
    setLicense(DEFAULT_LICENSE);
    setUsage(DEFAULT_USAGE);
    refreshUsage();
    refreshLicense();
  }, [handleLogoutBase, setLicense, setUsage, DEFAULT_LICENSE, DEFAULT_USAGE, refreshUsage, refreshLicense]);

  // Queue runner
  const checkAndRunNextQueue = useCallback(async () => {
    try {
      const queues = await api.getQueues();
      const pending = queues.filter((q) => q.status === 'pending');
      if (pending.length > 0) {
        const nextJob = pending[0];
        showToast(`Starting next queued job: ${nextJob.playlist_title}`, 'info');
        await api.deleteQueueItem(nextJob.id);
        const nextPl = await api.fetchPlaylist(nextJob.playlist_url);
        setPlaylist(nextPl);
        setSelectedIndices(new Set(nextPl.entries.map((_, i) => i)));
        setActiveTab(nextPl.entries.length === 1 ? 'single-video' : 'merge');
        setTimeout(() => {
          startMerge({
            format: format,
            overridePlaylist: nextPl,
          });
        }, 1200);
      }
    } catch {
      // Ignored
    }
  }, [showToast, setPlaylist, setSelectedIndices, setActiveTab, format]);

  // Search playlist
  const searchPlaylist = useCallback(async (url: string) => {
    const clean = (url || '').trim();
    if (!clean) return;
    setSearchQuery(clean);

    if (!validateUrl(clean)) return;

    if (isMerging) {
      try {
        setFetching(true);
        const data = await api.fetchPlaylist(clean);
        await api.enqueuePlaylist({
          playlist_url: data.webpage_url || clean,
          playlist_title: data.title,
          channel_name: data.channel,
          video_count: data.entries.length,
          canvas_preset: quality,
        });
        showToast('Download in progress! Added to merge queue.', 'info');
      } catch (err: any) {
        showToast(err.message || 'Failed to enqueue playlist.', 'error', err.title || 'Queue Notice');
      } finally {
        setFetching(false);
      }
      return;
    }

    setFetching(true);
    setToast(null);
    setOutputFile(null);
    setProgress(null);
    recordRequest();

    try {
      const data = await api.fetchPlaylist(clean);
      setPlaylist(data);
      setSelectedIndices(new Set(data.entries.map((_, i) => i)));

      if (isSingleVideoUrl(clean) || data.entries.length === 1) {
        setActiveTab('single-video');
      } else {
        setActiveTab('merge');
      }
    } catch (err: any) {
      let errTitle = err?.title || 'Invalid Link';
      let rawMsg = err?.message || 'Could not fetch metadata for this link.';
      let cleanMsg = rawMsg.replace(/^(Failed to fetch playlist:\s*)+/i, '').trim();

      cleanMsg = cleanMsg.replace(/^ERROR:\s*/i, '');
      cleanMsg = cleanMsg.replace(/\[[a-zA-Z0-9_:.\-]+\]\s*/g, '');
      cleanMsg = cleanMsg.replace(/^[a-zA-Z0-9_\-:]+::\s*/g, '');
      cleanMsg = cleanMsg.replace(/\(caused by <[^>]+>\)/g, '');
      cleanMsg = cleanMsg.replace(/\(caused by [^)]+\)/g, '');
      cleanMsg = cleanMsg.replace(/:\s*:/g, ':').trim();

      if (/400|bad request|unable to download api page/i.test(cleanMsg)) {
        errTitle = 'Invalid Link Parameter';
        cleanMsg = 'YouTube rejected this link (Bad Request 400). The playlist ID or video parameter appears to be corrupted or invalid. Please check the URL.';
      } else if (/403|forbidden/i.test(cleanMsg)) {
        errTitle = 'Access Restricted';
        cleanMsg = 'YouTube restricted access to this content (HTTP 403 Forbidden). The video may be private, age-restricted, or blocked.';
      } else if (/404|not found/i.test(cleanMsg)) {
        errTitle = 'Content Not Found';
        cleanMsg = 'This playlist or video could not be found on YouTube (404 Not Found). Please verify the link.';
      }

      showToast(cleanMsg, 'error', errTitle);
    } finally {
      setFetching(false);
    }
  }, [
    isMerging,
    quality,
    recordRequest,
    setFetching,
    setOutputFile,
    setPlaylist,
    setProgress,
    setSearchQuery,
    setSelectedIndices,
    setToast,
    showToast,
    validateUrl,
    isSingleVideoUrl,
  ]);

  // Start merge pipeline
  const startMerge = useCallback(async (opts?: {
    overrideFormat?: 'mp4' | 'mp3';
    overrideMergeVideos?: boolean;
    overridePlaylist?: Playlist;
    overrideQuality?: string;
    format?: 'mp4' | 'mp3';
  }) => {
    const currentPl = opts?.overridePlaylist || playlist;
    if (!currentPl) return;

    let targetIndices = selectedIndices;
    if (targetIndices.size === 0 && currentPl.entries.length > 0) {
      targetIndices = new Set([0]);
      setSelectedIndices(targetIndices);
    }
    if (targetIndices.size === 0) {
      showToast('No videos selected to download.', 'info');
      return;
    }

    const chosenFormat = opts?.overrideFormat || opts?.format || format;
    const shouldMerge = opts?.overrideMergeVideos !== undefined ? opts.overrideMergeVideos : mergeVideos;
    const chosenQuality =
      opts?.overrideQuality ||
      (chosenFormat === 'mp3' && !['320k', '256k', '192k', '128k'].includes(quality) ? '320k' : quality);

    setActiveTab('merge');
    setIsMerging(true);
    setIsPaused(false);
    setToast(null);
    setFailureInfo(null);
    recordRequest();
    setProgress({
      status: 'downloading',
      current_item: 1,
      total_items: targetIndices.size || currentPl.video_count,
      current_video_title: currentPl.entries[0]?.title || currentPl.title,
      overall_percent: 0,
      message: 'Initializing download pipeline…',
    });

    try {
      await api.startMerge({
        url: currentPl.webpage_url,
        selected_indices: Array.from(targetIndices).sort((a, b) => a - b),
        merge_videos: shouldMerge,
        quality: chosenQuality,
        canvas_preset: chosenQuality,
        format: chosenFormat,
        estimated_size_mb: currentPl.estimated_size_mb,
      });

      const disconnect = api.connectProgress(
        (event) => {
          setProgress(event);
          if (event.status === 'paused') {
            setIsPaused(true);
          } else if (event.status === 'downloading' || event.status === 'normalizing' || event.status === 'stitching') {
            setIsPaused(false);
          } else if (event.status === 'done') {
            setIsMerging(false);
            setIsPaused(false);
            if (event.output_file) {
              setOutputFile(event.output_file);
              refreshUsage();
              showToast(
                shouldMerge
                  ? `${chosenFormat.toUpperCase()} merge completed successfully!`
                  : 'Files downloaded to folder!',
                'success'
              );
            }
            disconnect();
            checkAndRunNextQueue();
          } else if (event.status === 'error' || event.status === 'cancelled') {
            setIsMerging(false);
            setIsPaused(false);
            if (event.status === 'error') {
              const isResolvable = event.is_resolvable ?? false;
              const errorSubtype = event.error_subtype || 'ytdlp_generic';
              setFailureInfo({
                error: event.error || 'Download pipeline encountered an error.',
                errorSubtype,
                isResolvable,
                clipCount: selectedIndices.size || currentPl.video_count,
                preset: chosenQuality,
                playlistSize: currentPl.estimated_size_formatted,
                playlistUrl: currentPl.webpage_url,
                playlistTitle: currentPl.title,
              });
            }
            if (event.error) {
              showToast(event.error, 'error');
            }
            disconnect();
          }
        },
        () => setIsMerging(false)
      );
    } catch (err: any) {
      setIsMerging(false);
      setIsPaused(false);
      setFailureInfo({
        error: err.message || 'Failed to start download pipeline.',
        errorSubtype: 'pipeline_init_failure',
        isResolvable: true,
        clipCount: selectedIndices.size || currentPl.video_count,
        preset: chosenQuality,
        playlistSize: currentPl.estimated_size_formatted,
        playlistUrl: currentPl.webpage_url,
        playlistTitle: currentPl.title,
      });
      showToast(err.message || 'Failed to start download pipeline.', 'error');
    }
  }, [
    playlist,
    selectedIndices,
    format,
    mergeVideos,
    quality,
    recordRequest,
    setIsMerging,
    setIsPaused,
    setToast,
    setFailureInfo,
    setProgress,
    setOutputFile,
    refreshUsage,
    showToast,
    checkAndRunNextQueue,
  ]);

  const retryMerge = useCallback(() => {
    setFailureInfo(null);
    startMerge();
  }, [setFailureInfo, startMerge]);

  const reset = useCallback(() => {
    setPlaylist(null);
    setSelectedIndices(new Set());
    setProgress(null);
    setIsPaused(false);
    setOutputFile(null);
    setToast(null);
    setSearchQuery('');
    setActiveTab('home');
  }, [setPlaylist, setSelectedIndices, setProgress, setIsPaused, setOutputFile, setToast, setSearchQuery, setActiveTab]);

  const showActionBar = !isMerging && !outputFile && Boolean(playlist) && activeTab === 'merge';
  const effectiveIsPaused = isPaused || progress?.status === 'paused';

  return {
    activeTab,
    setActiveTab,
    health,
    fetching,
    playlist,
    selectedIndices,
    toast,
    showToast,
    dismissToast,
    isMerging,
    isPaused: effectiveIsPaused,
    pauseMerge,
    resumeMerge,
    progress,
    outputFile,
    selectedClips,
    showActionBar,
    profile,
    license,
    usage,
    activeDevices,
    isAuthModalOpen,
    setIsAuthModalOpen,
    onAuthSuccess,
    handleLogout,
    handleDeactivateDevice,
    activateLicense,
    deactivateLicense,
    searchPlaylist,
    toggleIndex,
    selectAll,
    deselectAll,
    startMerge,
    cancelMerge,
    reset,
    mergeVideos,
    setMergeVideos,
    quality,
    setQuality,
    format,
    setFormat,
    searchQuery,
    setSearchQuery,
    failureInfo,
    setFailureInfo,
    dismissFailureModal,
    retryMerge,
  };
}
