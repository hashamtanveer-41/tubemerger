/**
 * Merge Engine Service Interface (SOLID - ISP & DIP)
 */

import { MergeJobPayload, ProgressEvent } from '../../shared/types/pipeline';

export interface IMergeService {
  startMerge(payload: MergeJobPayload): Promise<{ jobId: string }>;
  cancelMerge(jobId?: string): Promise<void>;
  pauseMerge?(jobId?: string): Promise<void>;
  resumeMerge?(jobId?: string): Promise<void>;
  subscribeProgress(onProgress: (event: ProgressEvent) => void): () => void;
}
