/**
 * Static base release metadata for TubeMerger packages.
 * Used as fallback when the GitHub API is unavailable.
 */

export interface PlatformRelease {
  name: string;
  heading: string;
  versionInfo: string;
  file: string;
  url: string;
}

export interface ReleaseData {
  version: string;
  publishedAt: string | null;
  platforms: {
    win: PlatformRelease;
    mac: PlatformRelease;
    linux: PlatformRelease;
  };
}

const BASE_URL =
  'https://github.com/hashamtanveer-41/tubemerger/releases/latest/download';

export const STATIC_RELEASE: ReleaseData = {
  version: '1.1.4',
  publishedAt: null,

  platforms: {
    win: {
      name: 'Windows',
      heading: 'Download for Windows',
      versionInfo: 'Windows 10 / 11 • 64-bit',
      file: 'TubeMerge-Setup.exe',
      url: `${BASE_URL}/TubeMerge-Setup.exe`,
    },

    mac: {
      name: 'macOS',
      heading: 'Download for macOS',
      versionInfo: 'Apple Silicon & Intel • 64-bit',
      file: 'TubeMerge-macOS-x64.zip',
      url: `${BASE_URL}/TubeMerge-macOS-x64.zip`,
    },
    linux: {
      name: 'Linux',
      heading: 'Download for Linux',
      versionInfo: 'Ubuntu / Debian / Fedora • 64-bit',
      file: 'TubeMerge-Linux-x64.tar.gz',
      url: `${BASE_URL}/TubeMerge-Linux-x64.tar.gz`,
    },
  },
};
