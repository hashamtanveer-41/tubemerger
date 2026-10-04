/**
 * Merge Engine Service Interface (SOLID - ISP & DIP)
 */

import { MergeJobPayload, ProgressEvent } from '../../shared/types/pipeline';

export interface ActiveMergeJob {
  jobId?: string;
  payload: MergeJobPayload;
  progress: ProgressEvent;
  playlistTitle?: string;
  totalClips?: number;
  startedAt?: number;
}

export interface IMergeService {
  startMerge(payload: MergeJobPayload): Promise<{ jobId: string }>;
  cancelMerge(jobId?: string): Promise<void>;
  pauseMerge?(jobId?: string): Promise<void>;
  resumeMerge?(jobId?: string): Promise<void>;
  subscribeProgress(onProgress: (event: ProgressEvent) => void): () => void;
  getActiveJob?(): ActiveMergeJob | null;
  setActiveJob?(job: ActiveMergeJob | null): void;
  subscribeActiveJob?(listener: (job: ActiveMergeJob | null) => void): () => void;
}
