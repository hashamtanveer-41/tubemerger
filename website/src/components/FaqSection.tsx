import React, { useState } from "react"

interface FaqItem {
  q: string
  a: string
}

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const faqs: FaqItem[] = [
    {
      q: "How do I combine a YouTube playlist into one video?",
      a: "Paste your playlist URL into TubeMerger, select your preferred video resolution (up to 4K), toggle off any unwanted clips, and choose Stitched mode. TubeMerger combines the YouTube playlist into one video offline and embeds seekable chapter markers automatically.",
    },
    {
      q: "What makes TubeMerger the best YouTube playlist merger?",
      a: "Unlike online converters with duration limits or ad-heavy tools, TubeMerger is a 100% free, open-source YouTube playlist merger running directly on your hardware via native yt-dlp and FFmpeg. It auto-normalizes frame rates, audio sample rates, and resolutions without cloud queues, watermarks, or quality loss.",
    },
    {
      q: "Is there a YouTube playlist downloader APK for Android?",
      a: "Yes! The TubeMerger YouTube playlist downloader APK is available for Android 8.0+. It features native foreground background downloads, full 4K and 320kbps MP3 support, dark/light dynamic theming, and zero ads or trackers—making it a privacy-first alternative to VidMate and SnapTube.",
    },
    {
      q: "Can TubeMerger merge videos with different resolutions or aspect ratios?",
      a: "Yes. TubeMerger runs a local normalization pass using FFmpeg to standardize frame rates, canvas padding, and audio sample rates (AAC 44.1kHz) across all clips before stitching, preventing audio desynchronization and aspect ratio distortion.",
    },
    {
      q: "Does TubeMerger upload my video files or playlist links to external servers?",
      a: "No. TubeMerger is 100% offline and local-first. All stream extraction and video processing are performed directly on your machine via yt-dlp and FFmpeg without any cloud queues or third-party tracking.",
    },
    {
      q: "Is TubeMerger free and open-source?",
      a: "Yes, TubeMerger is released under the MIT open-source license with no advertisements, subscription fees, or video duration caps. Pre-compiled binaries are available for Windows, Linux, macOS, and Android APK.",
    },
  ]

  return (
    <section
      id="faq"
      className="mx-auto max-w-[900px] px-6 py-24 sm:px-10 border-t border-white/[0.06]"
    >
      <div className="text-center max-w-[650px] mx-auto mb-12">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-coral">
          Questions & Answers
        </span>
        <h2 className="mt-3 font-display text-[32px] sm:text-[40px] font-extrabold tracking-[-0.03em] text-white">
          Frequently Asked Questions
        </h2>
        <p className="mt-2.5 text-[15px] sm:text-[16px] text-white/50 leading-relaxed">
          Everything you need to know about combining YouTube playlists into a single video offline.
        </p>
      </div>

      <div className="space-y-3.5">
        {faqs.map((faq, i) => {
          const isOpen = openIdx === i
          return (
            <div
              key={i}
              className={`rounded-[18px] border transition-colors overflow-hidden bg-[#121622] ${
                isOpen
                  ? "border-coral/40"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="flex w-full items-center justify-between p-5 text-left font-display text-[16px] sm:text-[17px] font-bold text-white transition-colors cursor-pointer"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${i}`}
              >
                <span className="pr-4">{faq.q}</span>
                <span
                  className={`ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[16px] transition-colors ${
                    isOpen
                      ? "bg-coral text-white border-coral"
                      : "border-slate-700 text-white/40"
                  }`}
                  aria-hidden="true"
                >
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && (
                <div
                  id={`faq-answer-${i}`}
                  className="px-5 pb-5 text-[14.5px] sm:text-[15px] leading-relaxed text-slate-300/80 border-t border-slate-800/80 pt-3"
                >
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
