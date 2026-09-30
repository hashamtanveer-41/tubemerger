/**
 * TubeMerger Mobile - History Storage Types
 * Architecture: SOLID principles - Interface Segregation
 */

export interface HistoryRecord {
  id: string;
  title: string;
  fileName: string;
  filePath: string;
  timestamp: number;
  dateFormatted: string;
  clipCount: number;
  format: 'mp4' | 'mp3';
  fileSizeBytes?: number;
  fileSizeFormatted?: string;
  resolution?: string;
  thumbnail?: string;
}

export interface IHistoryStorageService {
  getHistory(): Promise<HistoryRecord[]>;
  saveRecord(record: Omit<HistoryRecord, 'id' | 'timestamp' | 'dateFormatted'>): Promise<HistoryRecord>;
  deleteRecord(id: string): Promise<boolean>;
  clearHistory(): Promise<boolean>;
}
