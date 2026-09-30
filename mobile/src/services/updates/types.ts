/**
 * TubeMerger Mobile - Update Types
 * Architecture: SOLID principles - Interface Segregation
 */

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
  downloadUrl?: string;
}

export interface IUpdateService {
  checkForUpdates(): Promise<UpdateInfo>;
  openDownloadPage(url?: string): Promise<void>;
}
