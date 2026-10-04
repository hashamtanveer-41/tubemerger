/**
 * TubeMerger Mobile - UpdateService
 * Implementation of IUpdateService checking for GitHub release updates
 * Architecture: SOLID principles - Single Responsibility & Dependency Inversion
 */

import { Linking, NativeModules, Platform } from 'react-native';
import { IUpdateService, UpdateInfo } from './types';
import { telemetryService } from '../analytics';

const { TubeMergerModule } = NativeModules;
const CURRENT_VERSION = '0.0.1';
const REPO_RELEASES_API = 'https://api.github.com/repos/hashamtanveer/tubemerger/releases/latest';
const DEFAULT_DOWNLOAD_URL = 'https://github.com/hashamtanveer/tubemerger/releases';
const DISMISSED_VERSION_KEY = 'dismissed_update_version';

class UpdateService implements IUpdateService {
  private inMemoryDismissedVersion: string = '';

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
          isMajorUpdate: false,
          isForceUpdate: false,
        };
      }

      const data = await response.json();
      const tagName = (data.tag_name || '').replace(/^v/, '');

      if (!tagName) {
        return {
          hasUpdate: false,
          currentVersion: CURRENT_VERSION,
          latestVersion: CURRENT_VERSION,
          isMajorUpdate: false,
          isForceUpdate: false,
        };
      }

      const hasUpdate = this.isNewerVersion(tagName, CURRENT_VERSION);
      const isMajorUpdate = this.checkIsMajor(tagName, CURRENT_VERSION);

      // Check for forced update tags in release description or release title
      const notes = data.body || '';
      const releaseName = data.name || '';
      const hasForcedTag = /\[(force_update|mandatory|critical|breaking)\]/i.test(`${releaseName}\n${notes}`);
      const isForceUpdate = hasUpdate && (isMajorUpdate || hasForcedTag);

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
        isMajorUpdate,
        isForceUpdate,
        releaseNotes: notes || 'New features, stability enhancements, and stream engine updates.',
        downloadUrl,
        publishedAt: data.published_at,
      };
    } catch {
      return {
        hasUpdate: false,
        currentVersion: CURRENT_VERSION,
        latestVersion: CURRENT_VERSION,
        isMajorUpdate: false,
        isForceUpdate: false,
      };
    }
  }

  public async isUpdateDismissed(version: string): Promise<boolean> {
    try {
      if (TubeMergerModule?.getSetting) {
        const dismissed = await TubeMergerModule.getSetting(DISMISSED_VERSION_KEY, '');
        if (dismissed) {
          return dismissed === version;
        }
      }
      return this.inMemoryDismissedVersion === version;
    } catch {
      return this.inMemoryDismissedVersion === version;
    }
  }

  public async markUpdateDismissed(version: string): Promise<void> {
    this.inMemoryDismissedVersion = version;
    try {
      if (TubeMergerModule?.saveSetting) {
        await TubeMergerModule.saveSetting(DISMISSED_VERSION_KEY, version);
      }
    } catch {
      // Ignored
    }
  }

  public async shouldPromptUpdate(info: UpdateInfo): Promise<boolean> {
    if (!info.hasUpdate) return false;
    // Major or forced updates are strictly required and cannot be permanently dismissed
    if (info.isForceUpdate) return true;
    // Minor / patch update: show popup once per release version
    const dismissed = await this.isUpdateDismissed(info.latestVersion);
    return !dismissed;
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

  private checkIsMajor(latest: string, current: string): boolean {
    const lParts = latest.split('.').map((p) => parseInt(p, 10) || 0);
    const cParts = current.split('.').map((p) => parseInt(p, 10) || 0);
    const lMajor = lParts[0] ?? 0;
    const cMajor = cParts[0] ?? 0;
    return lMajor > cMajor;
  }
}

export const updateService = new UpdateService();
