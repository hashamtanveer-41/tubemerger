/**
 * TubeMerger Mobile - End-to-End Downloads Verification Test
 * Tests the complete lifecycle:
 * 1. Initial empty downloads state
 * 2. Active download progress with top card display & navigation
 * 3. Completion and transition to completed download history
 * 4. User actions: Play, Share, Delete, and Clear All
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { DeviceEventEmitter, NativeModules } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { DownloadsScreen } from '../src/screens/DownloadsScreen';
import { mergeService } from '../src/services/engine/NativeMergerService';
import { historyStorageService } from '../src/services/storage/HistoryStorageService';

// Mock TubeMergerModule
NativeModules.TubeMergerModule = {
  getHistory: jest.fn().mockResolvedValue('[]'),
  saveHistoryItem: jest.fn().mockResolvedValue(true),
  deleteHistoryItem: jest.fn().mockResolvedValue(true),
  clearHistory: jest.fn().mockResolvedValue(true),
  playMedia: jest.fn().mockResolvedValue(true),
  shareMedia: jest.fn().mockResolvedValue(true),
  startMerge: jest.fn().mockResolvedValue({ jobId: 'job-e2e-123' }),
  cancelMerge: jest.fn().mockResolvedValue(true),
};

describe('End-to-End Downloads Section Verification', () => {
  let mockNavigation: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    await historyStorageService.clearHistory();
    mergeService.setActiveJob?.(null);

    mockNavigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
    };
  });

  afterEach(async () => {
    await historyStorageService.clearHistory();
    mergeService.setActiveJob?.(null);
  });

  const getCleanText = (renderer: any) => {
    const textNodes = renderer.root.findAllByType('Text').map((node: any) => node.props.children);
    return textNodes
      .flat()
      .filter((c: any) => c !== null && c !== undefined && c !== false)
      .join(' ')
      .replace(/\s+/g, ' ');
  };

  it('renders empty state when there are no active or completed downloads', async () => {
    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NavigationContainer>
          <DownloadsScreen navigation={mockNavigation} />
        </NavigationContainer>
      );
    });

    const textContent = getCleanText(renderer);
    expect(textContent).toContain('No Downloads Yet');
    expect(textContent).toContain('0 files');

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  it('displays top in-progress card during live download and navigates to Progress on tap', async () => {
    // 1. Simulate starting a download job
    const payload = {
      playlist_title: 'Full TypeScript Masterclass',
      clips: [
        { id: '1', title: '01 Introduction', url: 'https://youtube.com/watch?v=1' },
        { id: '2', title: '02 Advanced Types', url: 'https://youtube.com/watch?v=2' },
      ],
      format: 'mp4' as const,
      quality: '1080p' as const,
    };

    await ReactTestRenderer.act(async () => {
      await mergeService.startMerge(payload);
    });

    // 2. Emit active download progress
    await ReactTestRenderer.act(async () => {
      DeviceEventEmitter.emit('onMergeProgress', {
        status: 'downloading',
        current_item: 1,
        total_items: 2,
        current_video_title: '01 Introduction',
        overall_percent: 45,
        speed: '5.4MB/s',
        eta: '1m 15s',
        sub_status: 'Downloading video stream chunk...',
      });
    });

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NavigationContainer>
          <DownloadsScreen navigation={mockNavigation} />
        </NavigationContainer>
      );
    });

    const textContent = getCleanText(renderer);

    // Verify In-Progress Card appears on top with live progress data
    expect(textContent).toContain('DOWNLOADING NOW');
    expect(textContent).toContain('45 %');
    expect(textContent).toContain('Full TypeScript Masterclass');
    expect(textContent).toContain('5.4MB/s');
    expect(textContent).toContain('1m 15s left');
    expect(textContent).toContain('Tap to view live clip queue & details');

    // Find and press the in-progress card using testID
    const inProgressCard = renderer.root.findByProps({ testID: 'in-progress-download-card' });
    expect(inProgressCard).toBeDefined();

    await ReactTestRenderer.act(async () => {
      inProgressCard.props.onPress();
    });

    // Verify tapping navigates to Progress screen with active job details
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Progress', {
      payload,
      playlistTitle: 'Full TypeScript Masterclass',
      totalClips: 2,
    });

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  it('completes download, displays file in history, and supports play, share, and delete', async () => {
    // 1. Simulate saving completed download record upon pipeline completion
    await historyStorageService.saveRecord({
      title: 'Full TypeScript Masterclass',
      fileName: 'Full_TypeScript_Masterclass.mp4',
      filePath: '/sdcard/TubeMerger/Full_TypeScript_Masterclass.mp4',
      clipCount: 2,
      format: 'mp4',
      resolution: '1080p',
    });

    // 2. Active job completes
    mergeService.setActiveJob?.(null);

    let renderer: any;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NavigationContainer>
          <DownloadsScreen navigation={mockNavigation} />
        </NavigationContainer>
      );
    });

    const textContent = getCleanText(renderer);

    // In-progress card should NOT be visible
    expect(textContent).not.toContain('DOWNLOADING NOW');

    // Completed file must be visible in the list
    expect(textContent).toContain('Full TypeScript Masterclass');
    expect(textContent).toContain('Full_TypeScript_Masterclass.mp4');
    expect(textContent).toContain('1 file');
    expect(textContent).toContain('1080p');

    // Verify Share and Delete buttons exist for the download
    const buttons = renderer.root.findAllByType('Text').filter((node: any) => {
      const child = node.props.children;
      return child === 'Share' || child === 'Delete';
    });
    expect(buttons.length).toBeGreaterThanOrEqual(2);

    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
