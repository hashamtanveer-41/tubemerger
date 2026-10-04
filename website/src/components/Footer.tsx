import React from "react"

function YouTubeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 20"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M27.4 3.12A3.52 3.52 0 0 0 24.93.63C22.75 0 14 0 14 0S5.25 0 3.07.63A3.52 3.52 0 0 0 .6 3.12 36.9 36.9 0 0 0 0 10a36.9 36.9 0 0 0 .6 6.88 3.52 3.52 0 0 0 2.47 2.49C5.25 20 14 20 14 20s8.75 0 10.93-.63a3.52 3.52 0 0 0 2.47-2.49A36.9 36.9 0 0 0 28 10a36.9 36.9 0 0 0-.6-6.88Z"
        fill="currentColor"
      />
      <path d="M11.2 14.29 18.51 10 11.2 5.71v8.58Z" fill="#fff" />
    </svg>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <YouTubeIcon className="h-6 w-auto text-coral drop-shadow-[0_0_10px_rgba(255,59,48,0.5)]" />
      <span className="font-display text-[19px] font-bold tracking-[-0.02em] text-white">
        TubeMerger
      </span>
    </div>
  )
}

export default function Footer({
  onNavigatePlaylistGuide,
  onNavigateYTDownloader,
  onNavigateAndroid,
}: {
  onNavigatePlaylistGuide?: () => void
  onNavigateYTDownloader?: () => void
  onNavigateAndroid?: () => void
}) {
  return (
    <footer
      id="docs"
      role="contentinfo"
      className="border-t border-white/[0.06] px-6 py-12 sm:px-10 bg-[#090A0F]"
    >
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <nav
          className="flex flex-wrap items-center gap-x-8 gap-y-3"
          aria-label="Footer links"
        >
          <a
            href="#features"
            className="font-sans text-[14px] text-white/50 transition-colors hover:text-white"
          >
            Features
          </a>
          <a
            href="#community"
            className="font-sans text-[14px] text-white/50 transition-colors hover:text-white"
          >
            Open Source
          </a>
          <a
            href="#faq"
            className="font-sans text-[14px] text-white/50 transition-colors hover:text-white"
          >
            FAQ
          </a>
          {onNavigatePlaylistGuide && (
            <button
              onClick={onNavigatePlaylistGuide}
              className="font-sans text-[14px] text-white/50 transition-colors hover:text-white cursor-pointer"
            >
              Merge Guide
            </button>
          )}
          {onNavigateYTDownloader && (
            <button
              onClick={onNavigateYTDownloader}
              className="font-sans text-[14px] text-white/50 transition-colors hover:text-white cursor-pointer"
            >
              Playlist Downloader
            </button>
          )}
          {onNavigateAndroid && (
            <button
              onClick={onNavigateAndroid}
              className="font-sans text-[14px] text-white/50 transition-colors hover:text-[#3DDC84] cursor-pointer"
            >
              Android APK
            </button>
          )}
          <a
            href="https://github.com/hashamtanveer-41/tubemerger"
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-[14px] text-white/50 transition-colors hover:text-white"
          >
            GitHub
          </a>
          <a
            href="https://github.com/hashamtanveer-41/tubemerger/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-[14px] text-white/50 transition-colors hover:text-white"
          >
            Support
          </a>
        </nav>
      </div>
      <div className="mx-auto mt-10 flex max-w-[1280px] flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.06] pt-6">
        <span className="text-[13px] text-white/35">© 2026 tubemerger.com</span>
        <a 
          href="https://alternativeto.net/software/tubemerger/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-indigo-400 transition"
        >
          Find us on AlternativeTo
        </a>
        <span className="text-[13px] text-white/35">
          Made for people who hate re-uploading.
        </span>
      </div>

      {/* SEO content island — visible to search crawlers and screen readers, not to sighted users */}
      <p className="sr-only">
        TubeMerger is a free, open-source desktop application for Windows, macOS, and Linux
        that lets you download YouTube playlists offline and merge them into a single seamless
        video. Key features include Granular Playlist Control to skip or exclude specific videos
        before downloading, a choice between Stitched mode (one master video with auto-generated
        chapter bookmarks) or Separate Downloads mode (each clip saved individually),
        Multi-Quality Selection from 360p to 4K Ultra HD, and a Real-Time Metrics Dashboard
        showing live download speed, total playlist duration, and estimated output file size.
        Powered by yt-dlp and FFmpeg running entirely on your local machine — no ads, no accounts,
        no subscriptions, and no cloud uploads. 100% free and open source under the MIT license.
      </p>
    </footer>
  )
}
