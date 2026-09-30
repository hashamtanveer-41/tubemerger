/**
 * Merge Pipeline State Hook for TubeMerger Mobile
 * Manages pipeline execution, state machine transitions, and native progress events.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MergeJobPayload, ProgressEvent, PipelineStatus } from '../types';
import { IMergeService, mergeService } from '../../services/engine';
import { telemetryService } from '../../services/analytics';
import { PipelineStateMachine } from '../dsa/StateMachine';

export function useMergePipeline(service: IMergeService = mergeService) {
  const [progress, setProgress] = useState<ProgressEvent>({
    status: 'idle',
    current_item: 0,
    total_items: 0,
    current_video_title: '',
    overall_percent: 0,
    message: '',
  });

  const stateMachineRef = useRef(new PipelineStateMachine('idle'));
  const activeJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Subscribe to native onMergeProgress events
    const unsubscribe = service.subscribeProgress((event: ProgressEvent) => {
      stateMachineRef.current.transition(event.status);
      setProgress(event);

      if (event.status === 'done') {
        telemetryService.trackMergeCompleted(0, event.total_items);
      } else if (event.status === 'error') {
        telemetryService.trackMergeFailed(event.error || event.message, event.total_items);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [service]);

  const startPipeline = useCallback(
    async (payload: MergeJobPayload) => {
      const clipCount = payload.selected_indices?.length ?? payload.clips?.length ?? 1;
      stateMachineRef.current.transition('downloading');
      setProgress({
        status: 'downloading',
        current_item: 0,
        total_items: clipCount,
        current_video_title: 'Initializing...',
        overall_percent: 0,
        message: 'Starting merge job...',
      });

      telemetryService.trackMergeStarted(
        clipCount,
        payload.canvas_preset || '1080p',
        payload.estimated_size_mb
      );

      try {
        const res = await service.startMerge(payload);
        activeJobIdRef.current = res.jobId;
      } catch (err: any) {
        stateMachineRef.current.transition('error');
        const errorMsg = err.message || 'Failed to start merge pipeline.';
        setProgress((prev) => ({
          ...prev,
          status: 'error',
          error: errorMsg,
          message: errorMsg,
        }));
        telemetryService.trackMergeFailed(errorMsg, clipCount);
      }
    },
    [service]
  );

  const cancelPipeline = useCallback(async () => {
    telemetryService.trackMergeCancelled(progress.overall_percent, progress.total_items);
    await service.cancelMerge(activeJobIdRef.current || undefined);
    stateMachineRef.current.transition('cancelled');
    setProgress((prev) => ({
      ...prev,
      status: 'cancelled',
      message: 'Merge cancelled by user.',
    }));
  }, [service, progress.overall_percent, progress.total_items]);

  const resetPipeline = useCallback(() => {
    stateMachineRef.current.forceReset('idle');
    setProgress({
      status: 'idle',
      current_item: 0,
      total_items: 0,
      current_video_title: '',
      overall_percent: 0,
      message: '',
    });
    activeJobIdRef.current = null;
  }, []);

  return {
    progress,
    status: progress.status as PipelineStatus,
    startPipeline,
    cancelPipeline,
    resetPipeline,
  };
}
