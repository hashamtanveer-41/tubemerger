/**
 * TubeMerger Mobile - UpdateService
 * Implementation of IUpdateService checking for GitHub release updates
 * Architecture: SOLID principles - Single Responsibility & Dependency Inversion
 */

import { Linking } from 'react-native';
import { IUpdateService, UpdateInfo } from './types';
import { telemetryService } from '../analytics';

const CURRENT_VERSION = '0.0.1';
const REPO_RELEASES_API = 'https://api.github.com/repos/hashamtanveer/tubemerger/releases/latest';
const DEFAULT_DOWNLOAD_URL = 'https://github.com/hashamtanveer/tubemerger/releases';

class UpdateService implements IUpdateService {
  public async checkForUpdates(): Promise<UpdateInfo> {
    try {
      const response = await fetch(REPO_RELEASES_API, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': `TubeMerger-Android/${CURRENT_VERSION}`,
        },
      });

      if (!response.ok) {
        return {
          hasUpdate: false,
          currentVersion: CURRENT_VERSION,
          latestVersion: CURRENT_VERSION,
        };
      }

      const data = await response.json();
      const tagName = (data.tag_name || '').replace(/^v/, '');

      if (!tagName) {
        return {
          hasUpdate: false,
          currentVersion: CURRENT_VERSION,
          latestVersion: CURRENT_VERSION,
        };
      }

      const hasUpdate = this.isNewerVersion(tagName, CURRENT_VERSION);

      if (hasUpdate) {
        telemetryService.trackUpdateAvailable(tagName);
      }

      // Find direct .apk asset if available in release assets
      const apkAsset = data.assets?.find((a: any) => a.name?.endsWith('.apk'));
      const downloadUrl = apkAsset?.browser_download_url || data.html_url || DEFAULT_DOWNLOAD_URL;

      return {
        hasUpdate,
        currentVersion: CURRENT_VERSION,
        latestVersion: tagName,
        releaseNotes: data.body || 'New features and stability enhancements.',
        downloadUrl,
      };
    } catch {
      return {
        hasUpdate: false,
        currentVersion: CURRENT_VERSION,
        latestVersion: CURRENT_VERSION,
      };
    }
  }

  public async openDownloadPage(url?: string): Promise<void> {
    const target = url || DEFAULT_DOWNLOAD_URL;
    try {
      const supported = await Linking.canOpenURL(target);
      if (supported) {
        await Linking.openURL(target);
      }
    } catch {
      // Ignored
    }
  }

  private isNewerVersion(latest: string, current: string): boolean {
    const lParts = latest.split('.').map((p) => parseInt(p, 10) || 0);
    const cParts = current.split('.').map((p) => parseInt(p, 10) || 0);

    for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
      const l = lParts[i] || 0;
      const c = cParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  }
}

export const updateService = new UpdateService();
