/**
 * TubeMerger Mobile - Update Types
 * Architecture: SOLID principles - Interface Segregation
 */

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  isMajorUpdate: boolean;
  isForceUpdate: boolean;
  releaseNotes?: string;
  downloadUrl?: string;
  publishedAt?: string;
}

export interface IUpdateService {
  checkForUpdates(): Promise<UpdateInfo>;
  openDownloadPage(url?: string): Promise<void>;
  isUpdateDismissed(version: string): Promise<boolean>;
  markUpdateDismissed(version: string): Promise<void>;
  shouldPromptUpdate(info: UpdateInfo): Promise<boolean>;
}
