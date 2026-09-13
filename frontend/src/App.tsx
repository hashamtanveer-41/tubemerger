import React, { useState, useEffect, useCallback } from 'react';
import { useMergeApp } from '@/hooks/useMergeApp';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { HomeView } from '@/views/HomeView';
import { SingleVideoView } from '@/views/SingleVideoView';
import { AudioView } from '@/views/AudioView';
import { DiscoveryView } from '@/views/DiscoveryView';
import { EmptyStateView } from '@/views/EmptyStateView';
import { HistoryView } from '@/views/HistoryView';
import { QueuesView } from '@/views/QueuesView';
import { ProgressSpotlight } from '@/components/merge/ProgressSpotlight';
import { SuccessModal } from '@/components/merge/SuccessModal';
import { FloatingActionBar } from '@/components/merge/FloatingActionBar';
import { SpotlightTour } from '@/components/tour/SpotlightTour';
import { SupportModal } from '@/components/common/SupportModal';
import { Toast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';
import { NoInternetModal } from '@/components/updates/NoInternetModal';
import { ForceUpdateModal } from '@/components/updates/ForceUpdateModal';
import { UpdateBanner } from '@/components/updates/UpdateBanner';
import { api, checkForUpdates, UpdateCheckResult } from '@/services/api';
import { UpdateInfo } from '@/types';
import logoPng from '@/assets/logo.png';

// ---------------------------------------------------------------------------
// Startup check state machine
// ---------------------------------------------------------------------------
type StartupState =
  | 'checking'   // Running connectivity + update check
  | 'offline'    // No internet detected
  | 'update'     // Forced major update required
  | 'ready';     // All checks passed — show workspace

export function App() {
  const app = useMergeApp();

  const [startupState, setStartupState] = useState<StartupState>('checking');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // ── Run startup checks ─────────────────────────────────────────────────
  const runChecks = useCallback(async (): Promise<boolean> => {
    setStartupState('checking');

    // 1. If the operating system network adapter is offline, report offline immediately
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStartupState('offline');
      return false;
    }

    // 2. Query backend connectivity & update service
    const result: UpdateCheckResult = await checkForUpdates();

    // 3. If backend probe failed, verify whether browser itself can reach the web
    if (!result.online) {
      let browserOnline = false;
      try {
        await fetch('https://www.google.com/generate_204', {
          mode: 'no-cors',
          cache: 'no-store',
          signal: AbortSignal.timeout(2500),
        });
        browserOnline = true;
      } catch {
        // Probe failed, device is truly offline
      }

      if (!browserOnline) {
        setStartupState('offline');
        return false;
      }
    }

    const info = result.update_info;
    setUpdateInfo(info);

    if (info?.is_force_update) {
      setStartupState('update');
      return false;
    }

    setStartupState('ready');
    return true;
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  // Trigger the tour guide ONLY once on the very first installation/launch, and later by choice
  useEffect(() => {
    if (startupState !== 'ready') return;

    let cancelled = false;

    const checkAndTriggerTour = async () => {
      try {
        const localSeen =
          localStorage.getItem('tubemerger_tour_v1') === 'true' ||
          localStorage.getItem('tubemerger_tour_completed') === 'true';

        if (localSeen) return;

        // Check persistent settings on backend disk
        const remoteSettings = await api.getSettings();
        if (remoteSettings?.tour_completed) {
          localStorage.setItem('tubemerger_tour_v1', 'true');
          return;
        }

        if (cancelled) return;

        // Genuinely the first ever launch:
        // Immediately record completion to prevent repeated automatic triggers across launches/restarts
        localStorage.setItem('tubemerger_tour_v1', 'true');
        localStorage.setItem('tubemerger_tour_completed', 'true');
        api.saveSettings({ tour_completed: true });

        // Show the initial onboarding tour once
        setIsTourOpen(true);
      } catch {
        // Storage access blocked or network unavailable
      }
    };

    const timer = setTimeout(checkAndTriggerTour, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [startupState]);

  // Callback for the NoInternetModal "Try Again" button
  const handleRetry = useCallback(async (): Promise<boolean> => {
    return runChecks();
  }, [runChecks]);

  // ── Synchronize Dynamic SEO Tags & Document Titles for Active Features ──
  useEffect(() => {
    let pageTitle = 'TubeMerger – Free YouTube Playlist Merger & 4K Video Downloader (320kbps MP3 Studio)';
    let metaDesc = 'Merge YouTube playlists into seamless videos with chapters, download 4K Ultra HD videos, and extract high-fidelity 320kbps MP3 albums with TubeMerger.';

    switch (app.activeTab) {
      case 'merge':
        pageTitle = app.playlist?.title
          ? `${app.playlist.title} – Merge Playlists | TubeMerger`
          : 'Merge YouTube Playlists into One Video with Chapters – TubeMerger';
        metaDesc = 'Merge complete YouTube playlist videos into a single continuous master file with automated chapter markers and custom resolution choices.';
        break;
      case 'single-video':
        pageTitle = app.playlist?.title
          ? `${app.playlist.title} – Download 4K Video | TubeMerger`
          : 'Download 4K Ultra HD YouTube Videos & Shorts – TubeMerger';
        metaDesc = 'Download individual YouTube videos and Shorts in 4K Ultra HD (2160p), 1440p, or 1080p with live stream preview and bitrate estimation.';
        break;
      case 'audio':
      case 'audio-download':
      case 'audio-merge':
        pageTitle = app.playlist?.title
          ? `${app.playlist.title} – Audio Studio (320kbps MP3) | TubeMerger`
          : 'Audio Studio: Extract & Merge 320kbps MP3s – TubeMerger';
        metaDesc = 'Extract high-fidelity 320kbps, 256kbps, 192kbps, or 128kbps MP3 audio tracks or merge full YouTube playlist music albums into single MP3s.';
        break;
      case 'queues':
        pageTitle = 'Sequential Merge & Download Queues – TubeMerger';
        metaDesc = 'Manage multi-playlist batch processing with sequential background downloading to prevent ISP bandwidth throttling.';
        break;
      case 'history':
        pageTitle = 'Merge History & Video Library – TubeMerger';
        metaDesc = 'Access your persistent SQLite merge history of stitched YouTube playlists and 4K downloaded media.';
        break;
      default:
        pageTitle = 'TubeMerger – Free YouTube Playlist Merger & 4K Video Downloader (320kbps MP3 Studio)';
        metaDesc = 'Merge YouTube playlists into seamless videos with chapters, download 4K Ultra HD videos, and extract high-fidelity 320kbps MP3 albums with TubeMerger.';
        break;
    }

    document.title = pageTitle;

    // Update or insert meta description
    let metaDescriptionTag = document.querySelector('meta[name="description"]');
    if (!metaDescriptionTag) {
      metaDescriptionTag = document.createElement('meta');
      metaDescriptionTag.setAttribute('name', 'description');
      document.head.appendChild(metaDescriptionTag);
    }
    metaDescriptionTag.setAttribute('content', metaDesc);

    // Update OpenGraph
    const ogTitleTag = document.querySelector('meta[property="og:title"]');
    if (ogTitleTag) ogTitleTag.setAttribute('content', pageTitle);
    const ogDescTag = document.querySelector('meta[property="og:description"]');
    if (ogDescTag) ogDescTag.setAttribute('content', metaDesc);

    // Update Twitter Card
    const twitterTitleTag = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitleTag) twitterTitleTag.setAttribute('content', pageTitle);
    const twitterDescTag = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescTag) twitterDescTag.setAttribute('content', metaDesc);
  }, [app.activeTab, app.playlist?.title]);

  // ── Automatically open Support Modal once a merge/download finishes ──
  useEffect(() => {
    if (!app.isMerging && app.outputFile) {
      const timer = setTimeout(() => {
        setIsSupportModalOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [app.isMerging, app.outputFile]);

  // ── Startup screens ────────────────────────────────────────────────────
  if (startupState === 'checking') {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center gap-4">
        <img
          src={logoPng}
          alt="TubeMerger"
          className="w-12 h-12 object-contain opacity-90"
          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
        />
        <Spinner size="sm" variant="red" />
        <p className="text-[13px] text-[#444444]">Starting TubeMerger…</p>
      </div>
    );
  }

  if (startupState === 'offline') {
    return <NoInternetModal onRetry={handleRetry} />;
  }

  if (startupState === 'update' && updateInfo) {
    return <ForceUpdateModal updateInfo={updateInfo} />;
  }

  // ── Main workspace ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-theme-base text-content-primary font-sans">
      <Header
        onSearch={app.searchPlaylist}
        loading={app.fetching}
        searchQuery={app.searchQuery}
        onSearchQueryChange={app.setSearchQuery}
      />

      {/* Optional update banner for minor/patch updates */}
      {updateInfo?.update_available && !updateInfo.is_force_update && (
        <UpdateBanner updateInfo={updateInfo} />
      )}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={app.activeTab}
          onTabChange={app.setActiveTab}
          updateInfo={updateInfo}
          onStartTour={() => setIsTourOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
          {/* Prominent Global Fetching Spinner */}
          {app.fetching ? (
            <div className="flex flex-col items-center justify-center py-28 space-y-4 animate-in fade-in duration-150">
              <Spinner size="lg" variant="red" />
              <div className="text-center space-y-1.5">
                <p className="text-base font-bold text-content-primary">
                  Inspecting YouTube Stream & Playlist Data…
                </p>
                <p className="text-xs text-content-secondary max-w-md">
                  Fetching titles, chapter timestamps, audio tracks, and bitrate heuristics.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Home View */}
              {app.activeTab === 'home' && (
                <HomeView
                  onSearch={app.searchPlaylist}
                  loading={app.fetching}
                  onNavigate={app.setActiveTab}
                />
              )}

              {/* Single Video Downloader */}
              {app.activeTab === 'single-video' && (
                <SingleVideoView
                  playlist={app.playlist}
                  onSearch={app.searchPlaylist}
                  onDownload={(opts) => {
                    app.startMerge({
                      format: opts.format,
                      overrideFormat: opts.format,
                      overrideMergeVideos: false,
                      overrideQuality: opts.quality as any,
                    });
                  }}
                  onBackToHome={() => app.setActiveTab('home')}
                  loading={app.fetching}
                  quality={app.quality}
                  setQuality={app.setQuality}
                />
              )}

              {/* Dedicated Audio Section: Single Audio Download & Playlist Audio Merge */}
              {(app.activeTab === 'audio' || app.activeTab === 'audio-download' || app.activeTab === 'audio-merge') && (
                <AudioView
                  playlist={app.playlist}
                  onSearch={app.searchPlaylist}
                  onDownloadSingleAudio={(q) => {
                    app.setActiveTab('merge');
                    app.startMerge({
                      format: 'mp3',
                      overrideFormat: 'mp3',
                      overrideMergeVideos: false,
                      overrideQuality: q || '320k',
                    });
                  }}
                  onMergeAudioPlaylist={(q) => {
                    app.setActiveTab('merge');
                    app.setFormat('mp3');
                    app.startMerge({
                      format: 'mp3',
                      overrideFormat: 'mp3',
                      overrideMergeVideos: true,
                      overrideQuality: q || '320k',
                    });
                  }}
                  loading={app.fetching}
                  initialMode={app.activeTab === 'audio-merge' ? 'merge' : 'download'}
                  onBackToHome={() => app.setActiveTab('home')}
                  selectedIndices={app.selectedIndices}
                  onToggleIndex={app.toggleIndex}
                  onSelectAll={app.selectAll}
                  onDeselectAll={app.deselectAll}
                />
              )}

              {/* History */}
              {app.activeTab === 'history' && (
                <HistoryView
                  onReMerge={(url) => { app.searchPlaylist(url); app.setActiveTab('merge'); }}
                  onNavigateToMerge={() => app.setActiveTab('merge')}
                />
              )}

              {/* Queues */}
              {app.activeTab === 'queues' && (
                <QueuesView
                  onStartMergeUrl={(url) => {
                    if (app.isMerging) return;
                    app.searchPlaylist(url);
                    app.setActiveTab('merge');
                  }}
                  isMerging={app.isMerging}
                  activeUrl={app.playlist?.webpage_url}
                  onShowToast={app.showToast}
                />
              )}

              {/* Merge workspace */}
              {app.activeTab === 'merge' && (
                <>
                  {app.isMerging && (
                    app.progress ? (
                      <ProgressSpotlight
                        progress={app.progress}
                        selectedClips={app.selectedClips}
                        onCancel={app.cancelMerge}
                        isPaused={app.isPaused}
                        onPause={app.pauseMerge}
                        onResume={app.resumeMerge}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-96 space-y-4">
                        <Spinner size="lg" variant="red" />
                        <div className="text-center space-y-1">
                          <p className="text-base font-semibold text-content-primary">Starting Merge Pipeline…</p>
                          <p className="text-xs text-content-muted">Allocating encoder processes and preparing workspace.</p>
                        </div>
                      </div>
                    )
                  )}

                  {!app.isMerging && app.outputFile && (
                    <SuccessModal
                      outputFile={app.outputFile}
                      onReset={app.reset}
                      onOpenSupport={() => setIsSupportModalOpen(true)}
                    />
                  )}

                  {!app.isMerging && !app.outputFile && app.playlist && (
                    <DiscoveryView
                      playlist={app.playlist}
                      selectedIndices={app.selectedIndices}
                      onToggle={app.toggleIndex}
                      onSelectAll={app.selectAll}
                      onDeselectAll={app.deselectAll}
                      mergeVideos={app.mergeVideos}
                      onToggleMergeVideos={app.setMergeVideos}
                      quality={app.quality}
                      onQualityChange={app.setQuality}
                      format={app.format}
                      onFormatChange={app.setFormat}
                      onClearPlaylist={app.reset}
                      onBackToHome={() => app.setActiveTab('home')}
                    />
                  )}

                  {!app.isMerging && !app.outputFile && !app.playlist && (
                    <EmptyStateView />
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {app.showActionBar && !app.fetching && (
        <FloatingActionBar
          selectedCount={app.selectedIndices.size}
          onMerge={app.startMerge}
          onClear={app.deselectAll}
          loading={app.isMerging}
          mergeVideos={app.mergeVideos}
        />
      )}

      <Toast toast={app.toast} onDismiss={app.dismissToast} />

      {/* Interactive Spotlight Onboarding Tour */}
      <SpotlightTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigate={app.setActiveTab}
        activeTab={app.activeTab}
      />

      {/* Voluntary Developer Tipping Modal */}
      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />
    </div>
  );
}
