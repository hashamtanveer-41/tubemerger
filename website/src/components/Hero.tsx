import React, { useState } from "react"
import waveBg from "@/imports/image-2.png"
import { useDeviceDetection } from "@/hooks/useDeviceDetection"
import { useLatestRelease } from "@/hooks/useLatestRelease"
import Toast from "@/components/Toast"

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

function AndroidIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.125 12 8.125s-3.5902.2866-5.1368.8247L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.343 14.6589 0 18.761h24c-.343-4.1021-2.6889-7.5743-6.1185-9.4396" />
    </svg>
  )
}

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

interface HeroProps {
  onOpenDownload: () => void
  onOpenCheckout?: (plan?: string) => void
  onNavigateAndroid?: () => void
}

export default function Hero({ onOpenDownload, onNavigateAndroid }: HeroProps) {
  const { isAndroid, isMobile } = useDeviceDetection()
  const { release } = useLatestRelease()
  const [toastVisible, setToastVisible] = useState(false)

  const apkUrl = release.platforms.android?.url || "https://github.com/hashamtanveer-41/tubemerger/releases/latest/download/TubeMerger.apk"

  const handleCopyPCLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText("https://tubemerger.com/download").then(() => {
        setToastVisible(true)
      }).catch(() => {
        setToastVisible(true)
      })
    } else {
      setToastVisible(true)
    }
  }

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden px-6 pt-28 pb-32 sm:px-10 sm:pt-36 sm:pb-36"
    >
      {/* Wave Backdrop */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[760px] overflow-hidden"
        aria-hidden="true"
      >
        <img
          src={waveBg}
          alt=""
          fetchPriority="high"
          loading="eager"
          decoding="async"
          width="1600"
          height="1024"
          className="absolute left-1/2 top-[-140px] w-[1600px] max-w-none -translate-x-1/2 opacity-35 mix-blend-screen"
          style={{ animation: "waveDrift 20s ease-in-out infinite" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-canvas" />
      </div>

      <div className="relative z-10 mx-auto max-w-[760px] text-center">
        {/* Top Icon */}
        <div
          className="rise-in mb-7 flex justify-center"
          style={{ "--rise-delay": "40ms" } as React.CSSProperties}
        >
          <YouTubeIcon className="h-9 w-auto text-coral drop-shadow-[0_0_18px_rgba(255,59,48,0.55)]" />
        </div>

        {/* Main Headline */}
        <h1
          id="hero-heading"
          className="rise-in font-display text-[48px] font-extrabold leading-[1.0] tracking-[-0.035em] sm:text-[64px] lg:text-[72px]"
          style={{ "--rise-delay": "140ms" } as React.CSSProperties}
        >
          Turn Video Playlists into
          <br />
          <span className="text-coral">Seamless Masters.</span>
        </h1>

        {/* Subtitle */}
        <p
          className="rise-in mx-auto mt-[26px] max-w-[640px] text-[16px] leading-relaxed text-white/60"
          style={{ "--rise-delay": "260ms" } as React.CSSProperties}
        >
          The ultimate <span className="text-white font-medium">YouTube playlist merger</span> to <span className="text-white font-medium">combine YouTube playlist into one video</span> offline with automatic chapters, or grab the <span className="text-white font-medium">YouTube playlist downloader APK</span> for Android.
        </p>

        {/* Dynamic Device-Aware Action Buttons */}
        <div
          className="rise-in mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
          style={{ "--rise-delay": "360ms" } as React.CSSProperties}
        >
          {isAndroid ? (
            /* Android Device View */
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <a
                href={apkUrl}
                download
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full bg-[#3DDC84] hover:bg-[#34c776] text-black h-14 px-8 text-[16px] font-display font-bold shadow-[0_8px_24px_-8px_rgba(61,220,132,0.6)] active:translate-y-0 transition-all duration-200 cursor-pointer"
              >
                <AndroidIcon className="h-5 w-5 text-black" />
                <span>Download TubeMerger APK</span>
              </a>

              <button
                onClick={handleCopyPCLink}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] h-14 px-6 text-[14.5px] font-sans font-medium text-white/80 transition-all cursor-pointer"
              >
                <CopyIcon className="h-4 w-4 text-white/60" />
                <span>Copy PC download link</span>
              </button>
            </div>
          ) : (
            /* Desktop / Non-Android View */
            <>
              <button
                onClick={onOpenDownload}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-coral h-14 px-9 text-[16px] font-display font-semibold text-white shadow-[0_8px_24px_-8px_rgba(255,59,48,0.65)] hover:brightness-110 active:translate-y-0 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/60"
              >
                <DownloadIcon className="h-5 w-5" />
                <span>Download Free App</span>
              </button>

              {/* Secondary Android Pill Badge */}
              <button
                onClick={onNavigateAndroid || onOpenDownload}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-[#3DDC84]/50 h-14 px-6 text-[14px] font-medium text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <AndroidIcon className="h-4 w-4 text-[#3DDC84]" />
                <span>Also available on Android (APK)</span>
                <span className="text-[#3DDC84] font-semibold">→</span>
              </button>

              {/* If Mobile (e.g., iOS) browsing for PC */}
              {isMobile && (
                <button
                  onClick={handleCopyPCLink}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] h-14 px-5 text-[14px] font-medium text-white/70 transition-colors cursor-pointer"
                >
                  <CopyIcon className="h-4 w-4 text-white/50" />
                  <span>Copy PC download link</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Dynamic Subtitle Kicker */}
        <p
          className="rise-in mt-6 font-sans text-[14px] font-normal text-white/60 tracking-normal"
          style={{ "--rise-delay": "460ms" } as React.CSSProperties}
        >
          {isAndroid
            ? "Free & Open Source • Requires Android 8.0+ • Sideload APK"
            : "Built for Windows, macOS, Linux & Android • 100% Free & Open Source • Fully Offline"}
        </p>
      </div>

      {/* Copy Link Toast */}
      <Toast
        visible={toastVisible}
        message="PC download link copied to clipboard!"
        subMessage="Paste or email it to your computer to download the Windows, Linux, or macOS app."
        onClose={() => setToastVisible(false)}
      />
    </section>
  )
}
