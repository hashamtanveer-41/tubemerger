/**
 * Native Merge Engine Service Implementation
 * Coordinates download, normalization, and stitching jobs with the Android Foreground Service.
 */

import { NativeModules, DeviceEventEmitter, Platform } from 'react-native';
import { IMergeService } from './IMergeService';
import { MergeJobPayload, ProgressEvent } from '../../shared/types/pipeline';

const { TubeMergerModule } = NativeModules;

export class NativeMergerService implements IMergeService {
  async startMerge(payload: MergeJobPayload): Promise<{ jobId: string }> {
    if (Platform.OS === 'android' && TubeMergerModule?.startMerge) {
      try {
        const res = await TubeMergerModule.startMerge(payload);
        return typeof res === 'string' ? JSON.parse(res) : res;
      } catch (err: any) {
        throw new Error(err.message || 'Failed to start native merge pipeline.');
      }
    }

    throw new Error('TubeMerger native merge engine is not available on this platform.');
  }

  async cancelMerge(jobId?: string): Promise<void> {
    if (Platform.OS === 'android' && TubeMergerModule?.cancelMerge) {
      try {
        await TubeMergerModule.cancelMerge(jobId);
        return;
      } catch (err: any) {
        throw new Error(err.message || 'Failed to cancel native merge.');
      }
    }
  }

  async pauseMerge(jobId?: string): Promise<void> {
    if (Platform.OS === 'android' && TubeMergerModule?.pauseMerge) {
      await TubeMergerModule.pauseMerge(jobId);
    }
  }

  async resumeMerge(jobId?: string): Promise<void> {
    if (Platform.OS === 'android' && TubeMergerModule?.resumeMerge) {
      await TubeMergerModule.resumeMerge(jobId);
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
