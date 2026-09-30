/**
 * GitHub Releases API service for the marketing website.
 * Fetches the latest release and maps it to ReleaseData.
 * Uses sessionStorage to cache for 15 minutes to avoid rate limits.
 */

import { STATIC_RELEASE, ReleaseData } from '@/data/release';

const GITHUB_API =
  'https://api.github.com/repos/hashamtanveer-41/tubemerger/releases/latest';
const CACHE_KEY = 'tubemerger_release_cache';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const BASE_URL =
  'https://github.com/hashamtanveer-41/tubemerger/releases/latest/download';

interface CacheEntry {
  data: ReleaseData;
  ts: number;
}

function readCache(): ReleaseData | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(data: ReleaseData): void {
  try {
    const entry: CacheEntry = { data, ts: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // SessionStorage may be unavailable in some sandboxed contexts
  }
}

function bytesToMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAssetSize(assets: any[], filename: string): string | null {
  const asset = assets.find((a: any) =>
    (a.name as string).toLowerCase() === filename.toLowerCase()
  );
  return asset ? bytesToMB(asset.size) : null;
}

export async function fetchLatestRelease(): Promise<ReleaseData> {
  // Try cache first
  const cached = readCache();
  if (cached) return cached;

  try {
    const res = await fetch(GITHUB_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return STATIC_RELEASE;

    const json = await res.json();
    const tag: string = (json.tag_name as string).replace(/^v/i, '');
    const assets: any[] = json.assets ?? [];
    const publishedAt: string | null = json.published_at ?? null;

    const winSize = formatAssetSize(assets, 'TubeMerge-Setup.exe');
    const macSize = formatAssetSize(assets, 'TubeMerge-macOS-x64.zip');
    const linuxSize = formatAssetSize(assets, 'TubeMerge-Linux-x64.tar.gz');
    const androidSize = formatAssetSize(assets, 'TubeMerger.apk');

    const data: ReleaseData = {
      version: tag,
      publishedAt,
      platforms: {
        win: {
          name: 'Windows',
          heading: 'Download for Windows',
          versionInfo: `v${tag} • Windows 10 / 11 • 64-bit${winSize ? ` • ${winSize}` : ''}`,
          file: 'TubeMerge-Setup.exe',
          url: `${BASE_URL}/TubeMerge-Setup.exe`,
        },
        mac: {
          name: 'macOS',
          heading: 'Download for macOS',
          versionInfo: `v${tag} • Apple Silicon & Intel${macSize ? ` • ${macSize}` : ''}`,
          file: 'TubeMerge-macOS-x64.zip',
          url: `${BASE_URL}/TubeMerge-macOS-x64.zip`,
        },
        linux: {
          name: 'Linux',
          heading: 'Download for Linux',
          versionInfo: `v${tag} • Ubuntu / Debian / Fedora${linuxSize ? ` • ${linuxSize}` : ''}`,
          file: 'TubeMerge-Linux-x64.tar.gz',
          url: `${BASE_URL}/TubeMerge-Linux-x64.tar.gz`,
        },
        android: {
          name: 'Android',
          heading: 'Download for Android',
          versionInfo: `v${tag} • Android 8.0+ (APK)${androidSize ? ` • ${androidSize}` : ''}`,
          file: 'TubeMerger.apk',
          url: `${BASE_URL}/TubeMerger.apk`,
        },
      },
    };

    writeCache(data);
    return data;
  } catch {
    return STATIC_RELEASE;
  }
}
