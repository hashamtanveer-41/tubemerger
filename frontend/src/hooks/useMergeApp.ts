import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Playlist, HealthStatus, ProgressEvent, UserProfile, LicenseInfo, UsageMetrics, ActiveDevice, AuthResponse, VideoQuality } from '@/types';
import { ToastData } from '@/components/ui/toast';

export function useMergeApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const [fetching, setFetching] = useState(false);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<ToastData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isMerging, setIsMerging] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [outputFile, setOutputFile] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [mergeVideos, setMergeVideos] = useState<boolean>(true);
  const [quality, setQuality] = useState<VideoQuality>('1080p');
  const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');

  // Auth & Cloud Workstations State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeDevices, setActiveDevices] = useState<ActiveDevice[]>([]);

  // Profile, License & Usage Telemetry State
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [license, setLicense] = useState<LicenseInfo>({
    status: 'unlicensed',
    plan_tier: 'FREE',
    license_key: null,
    expires_at: null,
    hardware_id: '',
    max_devices: 1,
    active_devices: 1,
  });

  const [usage, setUsage] = useState<UsageMetrics>({
    requests_today: 0,
    daily_quota: 3,
    total_lifetime_merges: 0,
    total_minutes_processed: 0,
    quota_reset_in_hours: 24,
  });

  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => {});

    // Check existing Supabase session first
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
      // Re-fetch usage and license with active auth headers
      api.getAccountUsage().then(setUsage).catch(() => {});
      api.getLicenseStatus().then(setLicense).catch(() => {});
    }).catch(() => {
      api.getAccountUsage().then(setUsage).catch(() => {});
      api.getLicenseStatus().then(setLicense).catch(() => {});
    });
  }, []);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error', title?: string) => {
    setToast({ message, type, title });
  };

  const dismissToast = () => {
    setToast(null);
  };

  const recordRequest = () => {
    setUsage((prev) => ({
      ...prev,
      requests_today: prev.requests_today + 1,
    }));
  };

  const isSingleVideoUrl = (u: string) => {
    const trimmed = (u || '').trim().toLowerCase();
    const isYtVideo = (trimmed.includes('watch?v=') || trimmed.includes('youtu.be/') || trimmed.includes('/shorts/'));
    const isPlaylist = trimmed.includes('list=');
    return isYtVideo && !isPlaylist;
  };

  const searchPlaylist = async (url: string) => {
    const clean = (url || '').trim();
    if (!clean) return;
    setSearchQuery(clean);

    const lower = clean.toLowerCase();
    if (lower.includes('spotify.com')) {
      showToast(
        'Spotify playlists and tracks cannot be downloaded directly because Spotify streams are protected by DRM encryption. Please search for the playlist or song title on YouTube and paste the YouTube link here.',
        'error',
        'Spotify Not Supported'
      );
      return;
    }
    if (lower.includes('music.apple.com') || lower.includes('itunes.apple.com')) {
      showToast(
        'Apple Music tracks and playlists are DRM-encrypted and cannot be extracted directly. Please paste a YouTube or YouTube Music playlist link instead.',
        'error',
        'Apple Music Not Supported'
      );
      return;
    }
    if (lower.includes('tidal.com') || lower.includes('deezer.com')) {
      showToast(
        'Commercial subscription streaming services use DRM encryption and cannot be downloaded. Please paste a YouTube or YouTube Music link instead.',
        'error',
        'Streaming Service Not Supported'
      );
      return;
    }
    const protocolMatches = clean.match(/https?:\/\//gi) || [];
    if (protocolMatches.length > 1 || /list=[^&]*https?:\/\//i.test(clean)) {
      showToast(
        'Multiple URLs were detected concatenated together in the search bar. Please click "Clear" and paste only a single clean YouTube link.',
        'error',
        'Multiple Links Detected'
      );
      return;
    }

    if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
      showToast(
        'Please enter a valid web URL starting with https:// (e.g. https://www.youtube.com/playlist?list=...)',
        'error',
        'Invalid URL Format'
      );
      return;
    }

    // If a merge/download is already running, notify and add to SQLite queue
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

      // Sanitize raw yt-dlp tags, exception wrappers, and extractor syntax
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
  };

  const toggleIndex = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    if (!playlist) return;
    setSelectedIndices(new Set(playlist.entries.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedIndices(new Set());
  };

  const checkAndRunNextQueue = async () => {
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
  };

  const startMerge = async (opts?: {
    overrideFormat?: 'mp4' | 'mp3';
    overrideMergeVideos?: boolean;
    overridePlaylist?: Playlist;
    overrideQuality?: string;
    format?: 'mp4' | 'mp3';
  }) => {
    const currentPl = opts?.overridePlaylist || playlist;
    if (!currentPl || selectedIndices.size === 0) return;

    const chosenFormat = opts?.overrideFormat || opts?.format || format;
    const shouldMerge = opts?.overrideMergeVideos !== undefined ? opts.overrideMergeVideos : mergeVideos;
    const chosenQuality = opts?.overrideQuality || (chosenFormat === 'mp3' && !['320k', '256k', '192k', '128k'].includes(quality) ? '320k' : quality);

    const sortedClips = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map((i) => currentPl.entries[i])
      .filter(Boolean);

    setIsMerging(true);
    setIsPaused(false);
    setToast(null);
    recordRequest();
    setProgress({
      status: 'downloading',
      current_item: 1,
      total_items: selectedIndices.size || currentPl.video_count,
      current_video_title: currentPl.entries[0]?.title || currentPl.title,
      overall_percent: 0,
      message: 'Initializing download pipeline…',
    });

    try {
      await api.startMerge({
        url: currentPl.webpage_url,
        selected_indices: Array.from(selectedIndices).sort((a, b) => a - b),
        merge_videos: shouldMerge,
        quality: chosenQuality,
        canvas_preset: chosenQuality,
        format: chosenFormat,
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
              api.getAccountUsage().then(setUsage).catch(() => {});
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
      showToast(err.message || 'Failed to start download pipeline.', 'error');
    }
  };

  const pauseMerge = async () => {
    setIsPaused(true);
    setProgress((prev) =>
      prev
        ? {
            ...prev,
            status: 'paused',
            message: 'Download paused. Click Resume to continue.',
            speed: undefined,
          }
        : null
    );
    try {
      const res = await api.pauseMerge();
      if (res.status === 'idle') {
        setIsPaused(false);
        showToast(res.message || 'No active download to pause.', 'info');
      }
    } catch (err: any) {
      setIsPaused(false);
      showToast(err.message || 'Failed to pause download.', 'error');
    }
  };

  const resumeMerge = async () => {
    setIsPaused(false);
    setProgress((prev) =>
      prev
        ? {
            ...prev,
            status: 'downloading',
            message: 'Resuming download…',
          }
        : null
    );
    try {
      const res = await api.resumeMerge();
      if (res.status === 'idle') {
        showToast(res.message || 'No active download to resume.', 'info');
      }
    } catch (err: any) {
      setIsPaused(true);
      showToast(err.message || 'Failed to resume download.', 'error');
    }
  };

  const cancelMerge = async () => {
    await api.cancelMerge();
    setIsMerging(false);
    setIsPaused(false);
    setProgress(null);
    showToast('Download cancelled.', 'info');
  };

  const reset = () => {
    setPlaylist(null);
    setSelectedIndices(new Set());
    setProgress(null);
    setIsPaused(false);
    setOutputFile(null);
    setToast(null);
    setSearchQuery('');
    setActiveTab('home');
  };

  const activateLicense = async (key: string): Promise<boolean> => {
    try {
      const updated = await api.activateLicense(key);
      setLicense(updated);
      const updatedUsage = await api.getAccountUsage();
      setUsage(updatedUsage);
      return true;
    } catch {
      return false;
    }
  };

  const deactivateLicense = async (): Promise<boolean> => {
    try {
      const updated = await api.deactivateLicense();
      setLicense(updated);
      const updatedUsage = await api.getAccountUsage();
      setUsage(updatedUsage);
      return true;
    } catch {
      return false;
    }
  };

  const onAuthSuccess = (authData: AuthResponse) => {
    setProfile(authData.user);
    setActiveDevices(authData.active_devices);
    setLicense((prev) => ({
      ...prev,
      status: 'active',
      plan_tier: (authData.plan_tier === 'CREATOR_PRO' ? 'PRO' : (authData.plan_tier as any)) || 'PRO',
      max_devices: authData.max_devices,
    }));
    api.getAccountUsage().then(setUsage).catch(() => {});
    api.getLicenseStatus().then(setLicense).catch(() => {});
    showToast(`Welcome, ${authData.user.full_name || authData.user.name}!`, 'success');
  };

  const handleLogout = async () => {
    await api.logout();
    setProfile(null);
    setActiveDevices([]);
    setLicense({
      status: 'unlicensed',
      plan_tier: 'FREE',
      license_key: null,
      expires_at: null,
      hardware_id: '',
      max_devices: 1,
      active_devices: 1,
    });
    setUsage({
      requests_today: 0,
      daily_quota: 3,
      total_lifetime_merges: 0,
      total_minutes_processed: 0,
      quota_reset_in_hours: 24,
    });
    api.getAccountUsage().then(setUsage).catch(() => {});
    api.getLicenseStatus().then(setLicense).catch(() => {});
    showToast('Signed out of Supabase cloud.', 'info');
  };

  const handleDeactivateDevice = async (hwid: string) => {
    try {
      const updated = await api.deactivateDevice(hwid);
      setActiveDevices(updated.active_devices);
      showToast('Workstation slot deactivated successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to deactivate workstation.', 'error');
    }
  };

  const selectedClips = playlist
    ? Array.from(selectedIndices)
        .sort((a, b) => a - b)
        .map((i) => playlist.entries[i])
        .filter(Boolean)
    : [];

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
  };
}
