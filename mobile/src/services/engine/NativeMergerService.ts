/**
 * Native Merge Engine Service Implementation
 * Coordinates download, normalization, and stitching jobs with the Android Foreground Service.
 */

import { NativeModules, DeviceEventEmitter, Platform } from 'react-native';
import { IMergeService, ActiveMergeJob } from './IMergeService';
import { MergeJobPayload, ProgressEvent } from '../../shared/types/pipeline';

const getModule = () => NativeModules.TubeMergerModule;

export class NativeMergerService implements IMergeService {
  private activeJob: ActiveMergeJob | null = null;
  private jobListeners: Set<(job: ActiveMergeJob | null) => void> = new Set();
  private isSubscribedToNative = false;

  constructor() {
    this.ensureNativeSubscription();
  }

  private ensureNativeSubscription() {
    if (this.isSubscribedToNative) return;
    this.isSubscribedToNative = true;
    DeviceEventEmitter.addListener('onMergeProgress', (event: ProgressEvent) => {
      if (this.activeJob) {
        this.activeJob.progress = event;
        if (event.status === 'done' || event.status === 'error' || event.status === 'cancelled') {
          setTimeout(() => {
            this.activeJob = null;
            this.notifyJobListeners();
          }, 3000);
        }
        this.notifyJobListeners();
      } else if (
        event.status === 'downloading' ||
        event.status === 'fetching' ||
        event.status === 'normalizing' ||
        event.status === 'stitching' ||
        event.status === 'embedding_chapters'
      ) {
        this.activeJob = {
          payload: { playlist_title: event.current_video_title },
          progress: event,
          playlistTitle: event.current_video_title || 'Active Download',
          totalClips: event.total_items || 1,
          startedAt: Date.now(),
        };
        this.notifyJobListeners();
      }
    });
  }

  getActiveJob(): ActiveMergeJob | null {
    return this.activeJob;
  }

  setActiveJob(job: ActiveMergeJob | null): void {
    this.activeJob = job;
    this.notifyJobListeners();
  }

  subscribeActiveJob(listener: (job: ActiveMergeJob | null) => void): () => void {
    this.jobListeners.add(listener);
    listener(this.activeJob ? { ...this.activeJob } : null);
    return () => {
      this.jobListeners.delete(listener);
    };
  }

  private notifyJobListeners() {
    for (const listener of this.jobListeners) {
      try {
        listener(this.activeJob ? { ...this.activeJob } : null);
      } catch {}
    }
  }

  async startMerge(payload: MergeJobPayload): Promise<{ jobId: string }> {
    const module = getModule();
    if (module?.startMerge) {
      try {
        const res = await module.startMerge(payload);
        const parsed = typeof res === 'string' ? JSON.parse(res) : res;
        const clipCount = payload.selected_indices?.length ?? payload.clips?.length ?? 1;

        this.activeJob = {
          jobId: parsed?.jobId,
          payload,
          progress: {
            status: 'downloading',
            current_item: 1,
            total_items: clipCount,
            current_video_title: payload.clips?.[0]?.title || 'Preparing download...',
            overall_percent: 0,
            message: 'Resolving stream formats and checking metadata...',
            sub_status: 'Resolving stream formats and checking metadata...',
          },
          playlistTitle: payload.playlist_title || 'Playlist Download',
          totalClips: clipCount,
          startedAt: Date.now(),
        };
        this.notifyJobListeners();

        return parsed;
      } catch (err: any) {
        this.activeJob = null;
        this.notifyJobListeners();
        throw new Error(err.message || 'Failed to start native merge pipeline.');
      }
    }

    throw new Error('TubeMerger native merge engine is not available on this platform.');
  }

  async cancelMerge(jobId?: string): Promise<void> {
    const module = getModule();
    if (module?.cancelMerge) {
      try {
        await module.cancelMerge(jobId);
        this.activeJob = null;
        this.notifyJobListeners();
        return;
      } catch (err: any) {
        this.activeJob = null;
        this.notifyJobListeners();
        throw new Error(err.message || 'Failed to cancel native merge.');
      }
    }
    this.activeJob = null;
    this.notifyJobListeners();
  }

  async pauseMerge(jobId?: string): Promise<void> {
    const module = getModule();
    if (module?.pauseMerge) {
      await module.pauseMerge(jobId);
    }
  }

  async resumeMerge(jobId?: string): Promise<void> {
    const module = getModule();
    if (module?.resumeMerge) {
      await module.resumeMerge(jobId);
    }
  }

  subscribeProgress(onProgress: (event: ProgressEvent) => void): () => void {
    const subscription = DeviceEventEmitter.addListener(
      'onMergeProgress',
      (event: ProgressEvent) => {
        onProgress(event);
      }
    );

    return () => {
      subscription.remove();
    };
  }
}

export const mergeService: IMergeService = new NativeMergerService();
