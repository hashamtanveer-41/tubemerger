import { DeviceEventEmitter } from 'react-native';

describe('Downloads & In-Progress Pipeline Subscription', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('tracks active job and notifies subscribers when native progress events occur', () => {
    const { mergeService } = require('../src/services/engine/NativeMergerService');

    let currentJob: any = null;
    const unsub = mergeService.subscribeActiveJob((job: any) => {
      currentJob = job;
    });

    expect(currentJob).toBeNull();

    // Simulate native progress event during downloading
    DeviceEventEmitter.emit('onMergeProgress', {
      status: 'downloading',
      current_item: 2,
      total_items: 5,
      current_video_title: 'Clip 2 - Amazing Video',
      overall_percent: 40,
      speed: '4.2MB/s',
      eta: '1m 20s',
      message: 'Downloading clip 2...',
      sub_status: 'Fetching video stream...',
    });

    expect(currentJob).not.toBeNull();
    expect(currentJob.progress.overall_percent).toBe(40);
    expect(currentJob.progress.current_item).toBe(2);
    expect(currentJob.progress.speed).toBe('4.2MB/s');

    unsub();
  });
});
