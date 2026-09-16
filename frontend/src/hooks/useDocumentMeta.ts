/**
 * Dynamic SEO document title and meta description synchronization hook.
 */

import { useEffect } from 'react';
import { Playlist } from '@/types';

export function useDocumentMeta(activeTab: string, playlist: Playlist | null) {
  useEffect(() => {
    let pageTitle = 'TubeMerger – Free YouTube Playlist Merger & 4K Video Downloader (320kbps MP3 Studio)';
    let metaDesc =
      'Merge YouTube playlists into seamless videos with chapters, download 4K Ultra HD videos, and extract high-fidelity 320kbps MP3 albums with TubeMerger.';

    switch (activeTab) {
      case 'merge':
        pageTitle = playlist?.title
          ? `${playlist.title} – Merge Playlists | TubeMerger`
          : 'Merge YouTube Playlists into One Video with Chapters – TubeMerger';
        metaDesc =
          'Merge complete YouTube playlist videos into a single continuous master file with automated chapter markers and custom resolution choices.';
        break;
      case 'single-video':
        pageTitle = playlist?.title
          ? `${playlist.title} – Download 4K Video | TubeMerger`
          : 'Download 4K Ultra HD YouTube Videos & Shorts – TubeMerger';
        metaDesc =
          'Download individual YouTube videos and Shorts in 4K Ultra HD (2160p), 1440p, or 1080p with live stream preview and bitrate estimation.';
        break;
      case 'audio':
      case 'audio-download':
      case 'audio-merge':
        pageTitle = playlist?.title
          ? `${playlist.title} – Audio Studio (320kbps MP3) | TubeMerger`
          : 'Audio Studio: Extract & Merge 320kbps MP3s – TubeMerger';
        metaDesc =
          'Extract high-fidelity 320kbps, 256kbps, 192kbps, or 128kbps MP3 audio tracks or merge full YouTube playlist music albums into single MP3s.';
        break;
      case 'queues':
        pageTitle = 'Sequential Merge & Download Queues – TubeMerger';
        metaDesc =
          'Manage multi-playlist batch processing with sequential background downloading to prevent ISP bandwidth throttling.';
        break;
      case 'history':
        pageTitle = 'Merge History & Video Library – TubeMerger';
        metaDesc =
          'Access your persistent SQLite merge history of stitched YouTube playlists and 4K downloaded media.';
        break;
      default:
        pageTitle = 'TubeMerger – Free YouTube Playlist Merger & 4K Video Downloader (320kbps MP3 Studio)';
        metaDesc =
          'Merge YouTube playlists into seamless videos with chapters, download 4K Ultra HD videos, and extract high-fidelity 320kbps MP3 albums with TubeMerger.';
        break;
    }

    document.title = pageTitle;

    // Update or insert meta description
    let metaDescriptionTag = document.querySelector('meta[name="description"]');
    if (!metaDescriptionTag) {
      metaDescriptionTag = document.createElement('meta');
      metaDescriptionTag.setAttribute('name', 'description');
      document.head.appendChild(metaDescriptionTag);
    }
    metaDescriptionTag.setAttribute('content', metaDesc);

    // Update OpenGraph
    const ogTitleTag = document.querySelector('meta[property="og:title"]');
    if (ogTitleTag) ogTitleTag.setAttribute('content', pageTitle);
    const ogDescTag = document.querySelector('meta[property="og:description"]');
    if (ogDescTag) ogDescTag.setAttribute('content', metaDesc);

    // Update Twitter Card
    const twitterTitleTag = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitleTag) twitterTitleTag.setAttribute('content', pageTitle);
    const twitterDescTag = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescTag) twitterDescTag.setAttribute('content', metaDesc);
  }, [activeTab, playlist?.title]);
}
