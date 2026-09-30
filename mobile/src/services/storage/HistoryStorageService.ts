/**
 * TubeMerger Mobile - HistoryStorageService
 * Implementation of IHistoryStorageService using native SharedPreferences persistence
 * Architecture: SOLID principles - Dependency Inversion & Single Responsibility
 */

import { NativeModules, Platform } from 'react-native';
import { HistoryRecord, IHistoryStorageService } from './types';

const { TubeMergerModule } = NativeModules;

class HistoryStorageService implements IHistoryStorageService {
  private inMemoryFallback: HistoryRecord[] = [];

  public async getHistory(): Promise<HistoryRecord[]> {
    if (Platform.OS === 'android' && TubeMergerModule?.getHistory) {
      try {
        const raw = await TubeMergerModule.getHistory();
        return JSON.parse(raw) as HistoryRecord[];
      } catch {
        return this.inMemoryFallback;
      }
    }
    return this.inMemoryFallback;
  }

  public async saveRecord(
    record: Omit<HistoryRecord, 'id' | 'timestamp' | 'dateFormatted'>
  ): Promise<HistoryRecord> {
    const now = new Date();
    const formattedDate = now.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const fullRecord: HistoryRecord = {
      ...record,
      id: `merge_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      dateFormatted: formattedDate,
    };

    if (Platform.OS === 'android' && TubeMergerModule?.saveHistoryItem) {
      try {
        await TubeMergerModule.saveHistoryItem(JSON.stringify(fullRecord));
      } catch {
        this.inMemoryFallback.unshift(fullRecord);
      }
    } else {
      this.inMemoryFallback.unshift(fullRecord);
    }

    return fullRecord;
  }

  public async deleteRecord(id: string): Promise<boolean> {
    if (Platform.OS === 'android' && TubeMergerModule?.deleteHistoryItem) {
      try {
        await TubeMergerModule.deleteHistoryItem(id);
        return true;
      } catch {
        this.inMemoryFallback = this.inMemoryFallback.filter((item) => item.id !== id);
        return true;
      }
    }
    this.inMemoryFallback = this.inMemoryFallback.filter((item) => item.id !== id);
    return true;
  }

  public async clearHistory(): Promise<boolean> {
    if (Platform.OS === 'android' && TubeMergerModule?.clearHistory) {
      try {
        await TubeMergerModule.clearHistory();
        this.inMemoryFallback = [];
        return true;
      } catch {
        this.inMemoryFallback = [];
        return true;
      }
    }
    this.inMemoryFallback = [];
    return true;
  }
}

export const historyStorageService = new HistoryStorageService();
