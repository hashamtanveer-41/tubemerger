/**
 * Hook managing the merge/download pipeline execution, SSE listener, and modal states.
 */

import { useState, useCallback } from 'react';
import { api } from '@/services/api';
import { FailureInfo, Playlist, ProgressEvent, VideoQuality } from '@/types';

export function useMergePipeline(
  showToast: (msg: string, type?: 'error' | 'success' | 'info', title?: string) => void,
  onMergeSuccess?: (outputFile: string) => void
) {
  const [isMerging, setIsMerging] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [outputFile, setOutputFile] = useState<string | null>(null);
  const [failureInfo, setFailureInfo] = useState<FailureInfo | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [mergeVideos, setMergeVideos] = useState<boolean>(true);
  const [quality, setQuality] = useState<VideoQuality>('1080p');
  const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');

  const pauseMerge = useCallback(async () => {
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
  }, [showToast]);

  const resumeMerge = useCallback(async () => {
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
  }, [showToast]);

  const cancelMerge = useCallback(async () => {
    await api.cancelMerge();
    setIsMerging(false);
    setIsPaused(false);
    setProgress(null);
    showToast('Download cancelled.', 'info');
  }, [showToast]);

  const dismissFailureModal = useCallback(() => {
    setFailureInfo(null);
  }, []);

  return {
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
  };
}
