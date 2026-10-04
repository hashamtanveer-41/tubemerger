import React, { useState } from "react"
import SEO from "@/components/SEO"
import { useLatestRelease } from "@/hooks/useLatestRelease"
import Toast from "@/components/Toast"

function AndroidIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.125 12 8.125s-3.5902.2866-5.1368.8247L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.343 14.6589 0 18.761h24c-.343-4.1021-2.6889-7.5743-6.1185-9.4396" />
    </svg>
  )
}

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function YouTubeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" className={className} fill="none" aria-hidden="true">
      <path
        d="M27.4 3.12A3.52 3.52 0 0 0 24.93.63C22.75 0 14 0 14 0S5.25 0 3.07.63A3.52 3.52 0 0 0 .6 3.12 36.9 36.9 0 0 0 0 10a36.9 36.9 0 0 0 .6 6.88 3.52 3.52 0 0 0 2.47 2.49C5.25 20 14 20 14 20s8.75 0 10.93-.63a3.52 3.52 0 0 0 2.47-2.49A36.9 36.9 0 0 0 28 10a36.9 36.9 0 0 0-.6-6.88Z"
        fill="currentColor"
      />
      <path d="M11.2 14.29 18.51 10 11.2 5.71v8.58Z" fill="#fff" />
    </svg>
  )
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#3DDC84" fillOpacity="0.15" />
      <path
        d="M6 10.5l2.5 2.5 5-5"
        stroke="#3DDC84"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CrossIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.06)" />
      <path
        d="M7 7l6 6M13 7l-6 6"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

interface AndroidPageProps {
  onNavigateHome: () => void
  onNavigateDownload: () => void
}

export default function AndroidPage({
  onNavigateHome,
  onNavigateDownload,
}: AndroidPageProps) {
  const { release } = useLatestRelease()
  const [toastVisible, setToastVisible] = useState(false)
  const [activeFaq, setActiveFaq] = useState<number | null>(0)

  const androidPlatform = release.platforms.android
  const apkUrl = androidPlatform?.url || "https://github.com/hashamtanveer-41/tubemerger/releases/latest/download/TubeMerger.apk"
  const apkVersion = release.version ? `v${release.version}` : "v1.2.0"
  const apkInfo = androidPlatform?.versionInfo || "Android 8.0+ • APK • ~48 MB"

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

  const sideloadSteps = [
    {
      step: "01",
      title: "Download APK File",
      description: "Tap the direct download button to save the official TubeMerger.apk package to your Android device.",
      tip: "Direct from GitHub Releases • 100% Virus & Tracker Free",
    },
    {
      step: "02",
      title: "Allow Sideloading (Install Anyway)",
      description: "If Chrome or Google Play Protect flags the unlisted package, tap 'Settings' -> 'Allow from this source' or tap 'Install anyway'.",
      tip: "Google restricts third-party downloaders from Play Store; sideloading guarantees your freedom.",
    },
    {
      step: "03",
      title: "Grant Permission & Paste Playlist",
      description: "Launch TubeMerger and allow foreground service notifications. This keeps downloads alive even when your screen locks or turns off.",
      tip: "Paste any YouTube playlist link and enjoy lossless video or 320kbps MP3 extraction!",
    },
  ]

  const featureCards = [
    {
      title: "Foreground Service Background Processing",
      badge: "Non-Stop Downloads",
      description:
        "Unlike browser downloads that freeze when you turn off your phone or switch apps, TubeMerger's resilient Android Foreground Service continues downloading and merging in the background with a persistent progress notification.",
    },
    {
      title: "Lossless MP4 Concat or Batch Download",
      badge: "Stitched or Separate",
      description:
        "Choose between combining entire playlists into one master video file with clickable chapter markers, or batch download full queues into individual MP4 or MKV clips with custom quality control.",
    },
    {
      title: "Zero Ads, Zero Tracking, Completely Local",
      badge: "100% Privacy",
      description:
        "Tired of ad-infested apps like VidMate and SnapTube? TubeMerger is released under the MIT open-source license with zero advertisements, zero analytics trackers, and zero telemetry. Everything runs locally on your device.",
    },
    {
      title: "Audiophile 320kbps MP3 Audio Extraction",
      badge: "High Fidelity",
      description:
        "Extract audio streams from music playlists into pristine 320kbps MP3s. Download entire albums in one click or merge a full mix into a single uninterrupted audio track.",
    },
  ]

  const comparisonRows = [
    {
      feature: "100% Ad-Free Experience",
      tubemerger: true,
      vidmate: false,
      snaptube: false,
      detail: "No intrusive popups, banners, or video interstitials.",
    },
    {
      feature: "Zero Trackers & Zero Telemetry",
      tubemerger: true,
      vidmate: false,
      snaptube: false,
      detail: "No location tracking, device fingerprinting, or data sales.",
    },
    {
      feature: "Merge Entire Playlists Into 1 Video",
      tubemerger: true,
      vidmate: false,
      snaptube: false,
      detail: "Automatic video concatenation with seekable chapter markers.",
    },
    {
      feature: "Resilient Foreground Background Worker",
      tubemerger: true,
      vidmate: "Unreliable",
      snaptube: "Unreliable",
      detail: "Downloads never crash or abort when your phone screen turns off.",
    },
    {
      feature: "Open Source (MIT Licensed)",
      tubemerger: true,
      vidmate: false,
      snaptube: false,
      detail: "Full public source code audit on GitHub.",
    },
    {
      feature: "Dynamic Dark & Light Themes",
      tubemerger: true,
      vidmate: false,
      snaptube: "Ad-Locked",
      detail: "True AMOLED dark mode with system theme auto-sync.",
    },
  ]

  const faqs = [
    {
      q: "Is the TubeMerger Android APK safe to install?",
      a: "Yes, 100%. TubeMerger is fully open-source under the MIT license, meaning all code is completely transparent and inspectable on GitHub. There are zero trackers, zero backdoors, and no ads. Play Protect shows a prompt simply because the APK is distributed directly via GitHub instead of the Play Store.",
    },
    {
      q: "Why isn't TubeMerger on the Google Play Store?",
      a: "Google's Play Store Developer Policy strictly forbids apps that download or merge video content from YouTube. Open-source tools like TubeMerger, NewPipe, and Seal are distributed via APK sideloading to preserve user privacy and freedom without censorship.",
    },
    {
      q: "Will downloads stop when my phone screen turns off?",
      a: "No! TubeMerger runs using an Android Foreground Service. As long as you keep the notification active, your phone's power manager will not terminate the download or video stitching queue while your screen is locked.",
    },
    {
      q: "Can I also use TubeMerger on my PC?",
      a: "Yes! TubeMerger is available as a native desktop application for Windows (Setup.exe), Linux (.tar.gz), and macOS. You can download the desktop versions directly from our main download page.",
    },
  ]

  return (
    <div className="min-h-screen bg-canvas text-white selection:bg-coral/30 selection:text-white flex flex-col">
      <SEO
        title="Download TubeMerger APK for Android — YouTube Playlist Merger & Downloader"
        description="Download TubeMerger APK for Android. Merge YouTube playlists into one video offline with chapter markers or batch download queues. Free, open-source, no ads."
        canonicalUrl="https://tubemerger.com/android"
        keywords={[
          "tubemerger android",
          "youtube playlist downloader apk",
          "youtube playlist merger apk",
          "combine youtube playlist into one video apk",
          "vidmate alternative",
          "snaptube alternative",
          "tubemate alternative",
          "android foreground downloader",
          "download youtube playlist android",
        ]}
      />

      {/* Header */}
      <header
        role="banner"
        className="sticky top-0 z-40 border-b border-white/[0.08]"
        style={{ backgroundColor: "#090A0F" }}
      >
        <div className="mx-auto flex h-[76px] max-w-[1280px] items-center justify-between px-6 sm:px-10 gap-4">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 cursor-pointer bg-transparent border-none text-left"
          >
            <YouTubeIcon className="h-6 w-auto text-coral drop-shadow-[0_0_10px_rgba(255,59,48,0.5)]" />
            <span className="font-display text-[19px] font-bold tracking-[-0.02em] text-white">
              TubeMerger
            </span>
          </button>

          <nav className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={onNavigateHome}
              className="text-[14px] text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={onNavigateDownload}
              className="text-[14px] text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              All Platforms
            </button>
            <a
              href="https://github.com/hashamtanveer-41/tubemerger"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex text-[14px] text-white/60 hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a
              href={apkUrl}
              download
              className="inline-flex items-center gap-2 rounded-full bg-[#3DDC84] hover:bg-[#34c776] text-black font-semibold text-[13.5px] px-4 py-2 transition-all shadow-[0_4px_16px_rgba(61,220,132,0.3)] cursor-pointer"
            >
              <AndroidIcon className="h-4 w-4" />
              <span>Download APK</span>
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative px-6 pt-16 pb-24 sm:px-10 sm:pt-20 sm:pb-28 overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#3DDC84]/10 blur-[130px] rounded-full"
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-[840px] text-center">
            {/* Android OS Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#3DDC84]/30 bg-[#3DDC84]/10 px-4 py-1.5 text-[13px] font-mono font-medium text-[#3DDC84] mb-8">
              <AndroidIcon className="h-4 w-4" />
              <span>Official Android Release • Universal APK</span>
            </div>

            {/* H1 */}
            <h1 className="font-display text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[60px] lg:text-[68px] text-white">
              TubeMerger for <span className="text-[#3DDC84]">Android</span>
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-6 max-w-[660px] text-[16px] sm:text-[18px] leading-relaxed text-white/70">
              The 100% Free & Open-Source alternative to VidMate and SnapTube. Combine YouTube playlists into one seamless video with chapters, or batch download full queues directly on your phone.
            </p>

            {/* Primary Action Card */}
            <div className="mt-10 mx-auto max-w-[560px] rounded-2xl border border-white/[0.1] bg-[#12141F]/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
              <a
                href={apkUrl}
                download
                className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-[#3DDC84] hover:bg-[#34c776] text-black font-display font-bold text-[18px] px-8 py-4 transition-all duration-200 shadow-[0_8px_30px_rgba(61,220,132,0.4)] active:scale-[0.99] cursor-pointer"
              >
                <DownloadIcon className="h-6 w-6 text-black" />
                <span>Download TubeMerger APK</span>
              </a>

              <p className="mt-3.5 text-[13.5px] font-medium text-white/60">
                {apkVersion} • {apkInfo}
              </p>

              <div className="mt-5 pt-5 border-t border-white/[0.08] flex flex-wrap items-center justify-center gap-4 text-[13px] text-white/50">
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4" /> Zero Ads & Zero Tracking
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4" /> Background Downloads
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4" /> Android 8.0+ Ready
                </span>
              </div>
            </div>

            {/* Secondary PC CTA */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleCopyPCLink}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] px-5 py-2.5 text-[14px] font-sans font-medium text-white/80 transition-colors cursor-pointer"
              >
                <CopyIcon className="h-4 w-4 text-white/60" />
                <span>Copy PC download link</span>
              </button>
              <button
                onClick={onNavigateDownload}
                className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-4 py-2.5 text-[14px] text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <span>View Windows, Linux & Mac</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>

        {/* 3-Step Sideload Guide */}
        <section className="px-6 py-20 sm:px-10 border-t border-white/[0.06] bg-[#0C0E16]">
          <div className="mx-auto max-w-[1100px]">
            <div className="text-center max-w-[650px] mx-auto mb-14">
              <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.2em] text-[#3DDC84]">
                Easy Installation
              </span>
              <h2 className="mt-3 font-display text-[32px] sm:text-[40px] font-extrabold tracking-[-0.03em] text-white">
                How to Install the APK on Android
              </h2>
              <p className="mt-2 text-[15px] text-white/60">
                Follow these 3 quick steps to sideload TubeMerger onto any Android smartphone or tablet.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {sideloadSteps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-white/[0.08] bg-[#131622] p-6 sm:p-7 flex flex-col justify-between"
                >
                  <div>
                    <span className="font-mono text-[36px] font-black text-[#3DDC84]/30 leading-none">
                      {item.step}
                    </span>
                    <h3 className="mt-4 font-display text-[20px] font-bold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-[14.5px] leading-relaxed text-white/65">
                      {item.description}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/[0.06] text-[12.5px] font-mono text-[#3DDC84]">
                    {item.tip}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core Feature Highlights */}
        <section className="px-6 py-24 sm:px-10 border-t border-white/[0.06]">
          <div className="mx-auto max-w-[1160px]">
            <div className="text-center max-w-[680px] mx-auto mb-16">
              <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.2em] text-coral">
                Native Capabilities
              </span>
              <h2 className="mt-3 font-display text-[32px] sm:text-[42px] font-extrabold tracking-[-0.03em] text-white">
                Engineered for Mobile Performance
              </h2>
              <p className="mt-3 text-[15px] sm:text-[16px] text-white/60">
                Full-featured local media processing with zero cloud reliance and zero battery bloat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featureCards.map((feat) => (
                <div
                  key={feat.title}
                  className="rounded-2xl border border-white/[0.08] bg-[#12141F] p-8 hover:border-white/20 transition-colors"
                >
                  <span className="inline-block rounded-full bg-white/[0.06] border border-white/[0.1] px-3 py-1 text-[12px] font-mono font-medium text-coral mb-4">
                    {feat.badge}
                  </span>
                  <h3 className="font-display text-[22px] font-bold text-white leading-snug">
                    {feat.title}
                  </h3>
                  <p className="mt-3.5 text-[15px] leading-relaxed text-white/65">
                    {feat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison vs VidMate / SnapTube */}
        <section className="px-6 py-20 sm:px-10 border-t border-white/[0.06] bg-[#0A0C14]">
          <div className="mx-auto max-w-[1100px]">
            <div className="text-center max-w-[700px] mx-auto mb-14">
              <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.2em] text-[#3DDC84]">
                Clean & Open Source
              </span>
              <h2 className="mt-3 font-display text-[32px] sm:text-[40px] font-extrabold tracking-[-0.03em] text-white">
                TubeMerger vs. VidMate & SnapTube
              </h2>
              <p className="mt-2 text-[15px] text-white/60">
                Why privacy-conscious Android power users are switching to TubeMerger.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#12141F] shadow-2xl">
              <table className="w-full min-w-[620px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#08090E]">
                    <th className="p-4 sm:p-5 font-display font-semibold text-white/60">Feature</th>
                    <th className="p-4 sm:p-5 font-display font-bold text-[#3DDC84] text-[16px] bg-[#3DDC84]/[0.08] border-x border-[#3DDC84]/20">
                      TubeMerger APK
                    </th>
                    <th className="p-4 sm:p-5 font-display font-semibold text-white/50">VidMate</th>
                    <th className="p-4 sm:p-5 font-display font-semibold text-white/50">SnapTube</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {comparisonRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="p-4 sm:p-5">
                        <div className="font-semibold text-white">{row.feature}</div>
                        <div className="text-[12px] text-white/40 mt-0.5">{row.detail}</div>
                      </td>
                      <td className="p-4 sm:p-5 bg-[#3DDC84]/[0.04] border-x border-[#3DDC84]/20">
                        <div className="flex items-center gap-2 text-[#3DDC84] font-semibold">
                          <CheckIcon className="h-4 w-4" /> Yes (100% Free)
                        </div>
                      </td>
                      <td className="p-4 sm:p-5 text-white/50">
                        {typeof row.vidmate === "boolean" ? (
                          row.vidmate ? <CheckIcon className="h-4 w-4" /> : <CrossIcon className="h-4 w-4" />
                        ) : (
                          <span>{row.vidmate}</span>
                        )}
                      </td>
                      <td className="p-4 sm:p-5 text-white/50">
                        {typeof row.snaptube === "boolean" ? (
                          row.snaptube ? <CheckIcon className="h-4 w-4" /> : <CrossIcon className="h-4 w-4" />
                        ) : (
                          <span>{row.snaptube}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Technical Specs Pill Card */}
        <section className="px-6 py-16 sm:px-10 border-t border-white/[0.06]">
          <div className="mx-auto max-w-[800px] rounded-2xl border border-white/[0.08] bg-[#12141F] p-6 sm:p-8">
            <h3 className="font-display text-[20px] font-bold text-white mb-5">
              Android Technical Specifications
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14px]">
              <div>
                <dt className="text-white/40 font-mono text-[12px]">MINIMUM ANDROID VERSION</dt>
                <dd className="text-white font-semibold mt-1">Android 8.0 (Oreo, API 26) or higher</dd>
              </div>
              <div>
                <dt className="text-white/40 font-mono text-[12px]">TARGET ARCHITECTURE</dt>
                <dd className="text-white font-semibold mt-1">Universal APK (ARM64-v8a & ARMv7)</dd>
              </div>
              <div>
                <dt className="text-white/40 font-mono text-[12px]">PROCESSING PIPELINE</dt>
                <dd className="text-white font-semibold mt-1">yt-dlp engine + FFmpeg 6.0 native core</dd>
              </div>
              <div>
                <dt className="text-white/40 font-mono text-[12px]">APP PERMISSIONS</dt>
                <dd className="text-white font-semibold mt-1">POST_NOTIFICATIONS, FOREGROUND_SERVICE</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-6 py-20 sm:px-10 border-t border-white/[0.06] bg-[#0A0C14]">
          <div className="mx-auto max-w-[840px]">
            <div className="text-center max-w-[600px] mx-auto mb-12">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3DDC84]">
                Common Questions
              </span>
              <h2 className="mt-2 font-display text-[30px] sm:text-[38px] font-extrabold text-white">
                Android APK FAQ
              </h2>
            </div>

            <div className="space-y-3.5">
              {faqs.map((faq, idx) => {
                const isOpen = activeFaq === idx
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-colors overflow-hidden bg-[#121520] ${
                      isOpen ? "border-[#3DDC84]/40" : "border-white/[0.08]"
                    }`}
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between p-5 text-left font-display text-[16px] sm:text-[17px] font-bold text-white cursor-pointer"
                    >
                      <span className="pr-4">{faq.q}</span>
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[16px] transition-colors ${
                          isOpen
                            ? "bg-[#3DDC84] text-black border-[#3DDC84]"
                            : "border-white/20 text-white/50"
                        }`}
                      >
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-[14.5px] leading-relaxed text-white/70 border-t border-white/[0.06] pt-3">
                        <p>{faq.a}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Final CTA Strip */}
        <section className="px-6 py-20 sm:px-10 border-t border-white/[0.06] text-center">
          <div className="mx-auto max-w-[700px]">
            <h2 className="font-display text-[32px] sm:text-[40px] font-bold text-white">
              Ready to merge YouTube playlists on mobile?
            </h2>
            <p className="mt-3 text-[16px] text-white/60">
              Download the official TubeMerger APK today. 100% free, no subscriptions, no ads.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href={apkUrl}
                download
                className="inline-flex items-center gap-2.5 rounded-full bg-[#3DDC84] hover:bg-[#34c776] text-black font-display font-bold text-[16px] px-8 py-3.5 shadow-[0_4px_20px_rgba(61,220,132,0.4)] cursor-pointer transition-all"
              >
                <DownloadIcon className="h-5 w-5 text-black" />
                <span>Download APK ({apkVersion})</span>
              </a>
              <button
                onClick={onNavigateDownload}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 text-[15px] font-medium text-white/80 hover:text-white cursor-pointer"
              >
                <span>Browse All Downloads</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#07080C] px-6 py-10 sm:px-10 text-center text-[13.5px] text-white/40">
        <div className="mx-auto max-w-[1100px] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 TubeMerger. Open source under the MIT License.</p>
          <div className="flex items-center gap-6">
            <button onClick={onNavigateHome} className="hover:text-white transition-colors cursor-pointer">
              Home
            </button>
            <button onClick={onNavigateDownload} className="hover:text-white transition-colors cursor-pointer">
              Desktop Download
            </button>
            <a
              href="https://github.com/hashamtanveer-41/tubemerger"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {/* Copy Toast */}
      <Toast
        visible={toastVisible}
        message="PC download link copied to clipboard!"
        subMessage="Share or email this link to your desktop to install TubeMerger for Windows, Linux, or macOS."
        onClose={() => setToastVisible(false)}
      />
    </div>
  )
}
