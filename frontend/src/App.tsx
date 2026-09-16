import React, { useState, useEffect } from 'react';
import { useMergeApp } from '@/hooks/useMergeApp';
import { useStartupCheck } from '@/hooks/useStartupCheck';
import { useTourManager } from '@/hooks/useTourManager';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
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
import { ReportIssueModal } from '@/components/common/ReportIssueModal';
import { Toast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';
import { NoInternetModal } from '@/components/updates/NoInternetModal';
import { ForceUpdateModal } from '@/components/updates/ForceUpdateModal';
import { UpdateBanner } from '@/components/updates/UpdateBanner';
import logoPng from '@/assets/logo.png';

export function App() {
  const app = useMergeApp();

  const { startupState, updateInfo, handleRetry } = useStartupCheck();
  const { isTourOpen, setIsTourOpen } = useTourManager(startupState);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // Synchronize Dynamic SEO Tags & Document Titles for Active Features
  useDocumentMeta(app.activeTab, app.playlist);

  // Automatically open Support Modal once a merge/download finishes
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
                    app.setActiveTab('merge');
                    app.startMerge({
                      format: opts.format,
                      overrideFormat: opts.format,
                      overrideMergeVideos: false,
                      overrideQuality: opts.quality as any,
                    });
                  }}
                  onBackToHome={() => app.setActiveTab('home')}
                  loading={app.fetching || app.isMerging}
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
                  loading={app.fetching || app.isMerging}
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

      {/* Download / Merge Completion Modal */}
      {!app.isMerging && app.outputFile && (
        <SuccessModal
          outputFile={app.outputFile}
          onReset={app.reset}
          onOpenSupport={() => setIsSupportModalOpen(true)}
        />
      )}

      {/* Voluntary Developer Tipping Modal */}
      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />

      {/* Failure Diagnostic & Issue Submission Modal */}
      <ReportIssueModal
        failureInfo={app.failureInfo}
        onClose={app.dismissFailureModal}
        onRetry={app.retryMerge}
      />
    </div>
  );
}
