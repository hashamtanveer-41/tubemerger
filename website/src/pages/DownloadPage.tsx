import React, { useState, useEffect } from "react"
import { useLatestRelease } from "@/hooks/useLatestRelease"

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

function ArrowLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13L5 8l5-5" />
    </svg>
  )
}

function StarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
    </svg>
  )
}

function GitHubIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  )
}

function WindowsIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 5.45l7.3-.99v7.09H3V5.45zm0 13.1l7.3 1v-7.1H3v6.1zm8.3 1.13L21 21v-8.46h-9.7v7.15zM21 3l-9.7 1.33v7.22H21V3z" />
    </svg>
  )
}

function AppleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.06 1.71-.93 2.73 1 .08 2.01-.48 2.63-1.23Z" />
    </svg>
  )
}

// Official Ubuntu Circle of Friends SVG
function UbuntuIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.61.455a3.41 3.41 0 0 0-3.41 3.41 3.41 3.41 0 0 0 3.41 3.41 3.41 3.41 0 0 0 3.41-3.41zM12.92.8C8.923.777 5.137 2.941 3.148 6.451a4.5 4.5 0 0 1 .26-.007 4.92 4.92 0 0 1 2.585.737A8.316 8.316 0 0 1 12.688 3.6 4.944 4.944 0 0 1 13.723.834 11.008 11.008 0 0 0 12.92.8zm9.226 4.994a4.915 4.915 0 0 1-1.918 2.246 8.36 8.36 0 0 1-.273 8.303 4.89 4.89 0 0 1 1.632 2.54 11.156 11.156 0 0 0 .559-13.089zM3.41 7.932A3.41 3.41 0 0 0 0 11.342a3.41 3.41 0 0 0 3.41 3.409 3.41 3.41 0 0 0 3.41-3.41 3.41 3.41 0 0 0-3.41-3.41zm2.027 7.866a4.908 4.908 0 0 1-2.915.358 11.1 11.1 0 0 0 7.991 6.698 11.234 11.234 0 0 0 2.422.249 4.879 4.879 0 0 1-.999-2.85 8.484 8.484 0 0 1-.836-.136 8.304 8.304 0 0 1-5.663-4.32zm11.405.928a3.41 3.41 0 0 0-3.41 3.41 3.41 3.41 0 0 0 3.41 3.41 3.41 3.41 0 0 0 3.41-3.41 3.41 3.41 0 0 0-3.41-3.41z" />
    </svg>
  )
}

function AndroidIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 0 0-.1521-.5676.416.416 0 0 0-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.082 12 8.082s-3.5902.3296-5.1368.8677L4.8409 5.4467a.4161.4161 0 0 0-.5677-.1521.4157.4157 0 0 0-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
    </svg>
  )
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 3v10m0 0l-4-4m4 4l4-4M3 17h14" />
    </svg>
  )
}

function TerminalIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m4 6 4 4-4 4M11 14h5" />
    </svg>
  )
}

function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M4 13V5a2 2 0 0 1 2-2h8" />
    </svg>
  )
}

type DetectedOS = "win" | "mac" | "linux" | "android"

function detectUserOS(): DetectedOS {
  if (typeof window === "undefined" || !navigator) return "win"
  const ua = (navigator.userAgent || "").toLowerCase()
  if (ua.includes("android")) return "android"
  if (ua.includes("win")) return "win"
  if (ua.includes("mac") || ua.includes("darwin")) return "mac"
  if (ua.includes("linux") || ua.includes("x11") || ua.includes("ubuntu")) return "linux"
  return "win"
}

interface DownloadPageProps {
  onNavigateHome: () => void
  onNavigateToCommunity?: () => void
}

interface DownloadedState {
  platformName: string
  filename: string
  url: string
}

export default function DownloadPage({
  onNavigateHome,
  onNavigateToCommunity,
}: DownloadPageProps) {
  const [downloadedState, setDownloadedState] =
    useState<DownloadedState | null>(null)
  const [redirectSeconds, setRedirectSeconds] = useState<number>(5)
  const [isRedirectPaused, setIsRedirectPaused] = useState<boolean>(false)
  const [detectedOS, setDetectedOS] = useState<DetectedOS>("win")
  const [copiedTerminal, setCopiedTerminal] = useState<boolean>(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)
  const { release } = useLatestRelease()

  useEffect(() => {
    window.scrollTo(0, 0)
    setDetectedOS(detectUserOS())
  }, [])

  // Auto-redirect to community section after download
  useEffect(() => {
    if (!downloadedState || isRedirectPaused) return

    if (redirectSeconds <= 0) {
      if (onNavigateToCommunity) {
        onNavigateToCommunity()
      } else {
        onNavigateHome()
      }
      return
    }

    const timer = setTimeout(() => {
      setRedirectSeconds((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [
    downloadedState,
    redirectSeconds,
    isRedirectPaused,
    onNavigateToCommunity,
    onNavigateHome,
  ])

  // Build platform data from live release (or static fallback)
  const platforms: Record<
    DetectedOS,
    {
      name: string
      heading: string
      versionInfo: string
      icon: React.ReactNode
      file: string
      url: string
    }
  > = {
    win: {
      name: release.platforms.win.name,
      heading: release.platforms.win.heading,
      versionInfo: release.platforms.win.versionInfo,
      icon: <WindowsIcon className="h-6 w-6 text-[#00adef]" />,
      file: release.platforms.win.file,
      url: release.platforms.win.url,
    },
    mac: {
      name: release.platforms.mac.name,
      heading: release.platforms.mac.heading,
      versionInfo: release.platforms.mac.versionInfo,
      icon: <AppleIcon className="h-6 w-6 text-white" />,
      file: release.platforms.mac.file,
      url: release.platforms.mac.url,
    },
    linux: {
      name: release.platforms.linux.name,
      heading: release.platforms.linux.heading,
      versionInfo: release.platforms.linux.versionInfo,
      icon: <UbuntuIcon className="h-6 w-6 text-[#E95420]" />,
      file: release.platforms.linux.file,
      url: release.platforms.linux.url,
    },
    android: {
      name: release.platforms.android.name,
      heading: release.platforms.android.heading,
      versionInfo: release.platforms.android.versionInfo,
      icon: <AndroidIcon className="h-6 w-6 text-[#3DDC84]" />,
      file: release.platforms.android.file,
      url: release.platforms.android.url,
    },
  }

  // Immediate browser download execution
  const triggerDownload = (
    platformName: string,
    filename: string,
    url: string,
  ) => {
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Switch to clean thank you view
    setDownloadedState({
      platformName,
      filename,
      url,
    })
    setRedirectSeconds(5)
    setIsRedirectPaused(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const terminalCommand =
    "git clone https://github.com/hashamtanveer-41/tubemerger.git && cd tubemerger && pip install -r requirements.txt && python3 main.py"

  const handleCopyTerminal = async () => {
    try {
      await navigator.clipboard.writeText(terminalCommand)
      setCopiedTerminal(true)
      setTimeout(() => setCopiedTerminal(false), 2000)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = terminalCommand
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopiedTerminal(true)
      setTimeout(() => setCopiedTerminal(false), 2000)
    }
  }

  // Consistent red outline for all download cards on hover, focus, and click
  const cardButtonClass =
    "flex items-center gap-4 p-5 rounded-2xl border border-white/[0.08] bg-[#12141D] hover:bg-[#171924] hover:border-coral/60 active:border-coral active:ring-1 active:ring-coral focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral active:scale-[0.99] transition-all cursor-pointer text-left group shadow-sm"

  const alternativeOSLabel =
    detectedOS === "linux"
      ? "Windows, macOS & Android"
      : detectedOS === "mac"
        ? "Windows, Linux & Android"
        : detectedOS === "android"
          ? "Windows, macOS & Linux"
          : "macOS, Linux & Android"

  return (
    <div className="min-h-screen bg-[#090A0F] text-white selection:bg-coral/30 selection:text-white flex flex-col font-sans">
      {/* ──────────────────────────────────────────────────────────────────────────
          CLEAN SOLID NAVBAR (Consistent Desktop + Mobile Hamburger Menu)
         ────────────────────────────────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.08] bg-[#0E1017] sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-6 sm:px-8">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 cursor-pointer text-left focus:outline-none"
            aria-label="TubeMerger Home"
          >
            <YouTubeIcon className="h-6 w-auto text-coral" />
            <span className="text-[20px] font-bold tracking-tight text-white">
              TubeMerger
            </span>
          </button>

          {/* Desktop Navigation Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[14px] text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer font-medium"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5 shrink-0" />
              <span>Back to Website</span>
            </button>
            <a
              href="https://github.com/hashamtanveer-41/tubemerger"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 justify-center rounded-full bg-white/10 hover:bg-white/20 text-white h-9 px-4 text-[13.5px] font-medium transition-all cursor-pointer border border-white/10"
            >
              <GitHubIcon className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="flex sm:hidden p-2 -mr-1 rounded-lg text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6"
              stroke="currentColor"
              strokeWidth="2"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/[0.08] bg-[#0E1017] px-6 py-4 space-y-3 animate-in fade-in duration-150 shadow-2xl">
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                onNavigateHome()
              }}
              className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-[14.5px] font-medium text-white/80 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
            >
              <ArrowLeftIcon className="h-4 w-4 text-coral shrink-0" />
              <span>Back to Website</span>
            </button>
            <div className="pt-2 border-t border-white/[0.06]">
              <a
                href="https://github.com/hashamtanveer-41/tubemerger"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] h-10 text-[14px] font-medium text-white/90 transition-all"
              >
                <GitHubIcon className="h-4 w-4" />
                <span>View on GitHub</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ──────────────────────────────────────────────────────────────────────────
          MAIN CONTENT
         ────────────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col justify-center py-12 sm:py-20 px-6 sm:px-8">
        {downloadedState ? (
          /* ───────────────────────────────────────────────────────────────────────
             MINIMAL THANK YOU VIEW
             ─────────────────────────────────────────────────────────────────────── */
          <div className="mx-auto max-w-[600px] w-full text-center space-y-6 animate-in fade-in duration-200">
            {/* Success Checkmark */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e]">
              <CheckIcon className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-[28px] sm:text-[34px] font-bold text-white tracking-tight">
                Thanks for downloading!
              </h1>
              <p className="text-[15px] text-white/70 max-w-[480px] mx-auto leading-relaxed">
                Your download of{" "}
                <strong className="text-white">
                  {downloadedState.filename}
                </strong>{" "}
                has started.
              </p>
            </div>

            {/* Manual Retry Link */}
            <p className="text-[13px] text-white/50">
              Didn't start?{" "}
              <a
                href={downloadedState.url}
                download={downloadedState.filename}
                className="text-coral underline font-medium hover:text-white transition-colors"
              >
                Click here to download directly
              </a>
            </p>

            {/* Actions Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#12141D] p-6 space-y-4 max-w-[480px] mx-auto text-center">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <a
                  href="https://github.com/hashamtanveer-41/tubemerger"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-coral hover:brightness-110 h-11 px-5 text-[14px] font-semibold text-white transition-all cursor-pointer shadow-md"
                >
                  <StarIcon className="h-4 w-4" />
                  <span>Star on GitHub</span>
                </a>

                <button
                  onClick={() => {
                    if (onNavigateToCommunity) {
                      onNavigateToCommunity()
                    } else {
                      onNavigateHome()
                    }
                  }}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] hover:bg-white/10 text-white h-11 px-5 text-[14px] font-medium transition-all cursor-pointer"
                >
                  <span>Community Section →</span>
                </button>
              </div>

              {!isRedirectPaused ? (
                <div className="text-[12.5px] text-white/40 pt-1">
                  Redirecting to community in {redirectSeconds}s •{" "}
                  <button
                    onClick={() => setIsRedirectPaused(true)}
                    className="text-coral hover:underline cursor-pointer"
                  >
                    Stay on page
                  </button>
                </div>
              ) : (
                <div className="text-[12.5px] text-white/30 pt-1">
                  Auto-redirect paused
                </div>
              )}

              <div className="pt-2 border-t border-white/[0.06]">
                <button
                  onClick={() => setDownloadedState(null)}
                  className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeftIcon className="h-3 w-3 shrink-0" />
                  <span>Download for another operating system</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ───────────────────────────────────────────────────────────────────────
             OPTIMIZED DOWNLOAD EXPERIENCE (OS Hero CTA + 3 Grid + Terminal)
             ─────────────────────────────────────────────────────────────────────── */
          <div className="mx-auto max-w-[1040px] w-full space-y-12">
            {/* 1. OS Auto-Detection Hero */}
            <div className="text-center max-w-[680px] mx-auto space-y-4">
              <h1 className="text-[34px] sm:text-[44px] font-bold text-white tracking-tight leading-tight">
                Download TubeMerger
              </h1>

              <p className="text-[15px] sm:text-[16px] text-white/65 max-w-[540px] mx-auto leading-relaxed">
                100% Free &amp; open-source app for Windows, macOS, Linux, and Android.
                Merge full YouTube playlists offline with zero cloud processing.
              </p>

              {/* Primary High-Contrast CTA for Detected OS */}
              <div className="pt-2 flex flex-col items-center">
                <button
                  onClick={() =>
                    triggerDownload(
                      platforms[detectedOS].name,
                      platforms[detectedOS].file,
                      platforms[detectedOS].url,
                    )
                  }
                  className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-coral hover:bg-[#ff4e44] text-white font-semibold text-[15.5px] sm:text-[16.5px] shadow-lg shadow-coral/25 active:scale-[0.99] transition-all cursor-pointer border border-white/10"
                >
                  <div className="flex items-center justify-center w-5 h-5 shrink-0 text-white [&>svg]:text-white [&>svg]:fill-white">
                    {platforms[detectedOS].icon}
                  </div>
                  <span>
                    Download TubeMerger for {platforms[detectedOS].name} (v{release.version})
                  </span>
                  <DownloadIcon className="h-5 w-5 shrink-0 opacity-80 group-hover:translate-y-0.5 transition-transform" />
                </button>

                <p className="text-[13px] text-white/45 mt-3">
                  Also available for {alternativeOSLabel} below
                </p>
              </div>
            </div>

            {/* 2. Platform Selector Grid (4 Manual Options) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between max-w-[1040px] mx-auto px-1">
                <span className="text-[13px] font-medium uppercase tracking-wider text-white/40">
                  All Platforms
                </span>
                <span className="text-[12.5px] text-white/40">
                  Standalone binaries • No installer required
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-[1040px] mx-auto w-full">
                {/* Windows Button */}
                <button
                  onClick={() =>
                    triggerDownload(
                      platforms.win.name,
                      platforms.win.file,
                      platforms.win.url,
                    )
                  }
                  className={cardButtonClass}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/40 border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                    {platforms.win.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[15px] font-bold text-white group-hover:text-coral transition-colors truncate">
                        {platforms.win.heading}
                      </div>
                      {detectedOS === "win" && (
                        <span className="text-[10.5px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-coral/15 text-coral border border-coral/30 shrink-0">
                          Detected
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-white/50 mt-0.5">
                      {platforms.win.versionInfo}
                    </div>
                  </div>
                </button>

                {/* macOS Button */}
                <button
                  onClick={() =>
                    triggerDownload(
                      platforms.mac.name,
                      platforms.mac.file,
                      platforms.mac.url,
                    )
                  }
                  className={cardButtonClass}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/40 border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                    {platforms.mac.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[15px] font-bold text-white group-hover:text-coral transition-colors truncate">
                        {platforms.mac.heading}
                      </div>
                      {detectedOS === "mac" && (
                        <span className="text-[10.5px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-coral/15 text-coral border border-coral/30 shrink-0">
                          Detected
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-white/50 mt-0.5">
                      {platforms.mac.versionInfo}
                    </div>
                  </div>
                </button>

                {/* Linux Button */}
                <button
                  onClick={() =>
                    triggerDownload(
                      platforms.linux.name,
                      platforms.linux.file,
                      platforms.linux.url,
                    )
                  }
                  className={cardButtonClass}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/40 border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                    {platforms.linux.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[15px] font-bold text-white group-hover:text-coral transition-colors truncate">
                        {platforms.linux.heading}
                      </div>
                      {detectedOS === "linux" && (
                        <span className="text-[10.5px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-coral/15 text-coral border border-coral/30 shrink-0">
                          Detected
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-white/50 mt-0.5">
                      {platforms.linux.versionInfo}
                    </div>
                  </div>
                </button>

                {/* Android Button */}
                <button
                  onClick={() =>
                    triggerDownload(
                      platforms.android.name,
                      platforms.android.file,
                      platforms.android.url,
                    )
                  }
                  className={cardButtonClass}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/40 border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                    {platforms.android.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[15px] font-bold text-white group-hover:text-coral transition-colors truncate">
                        {platforms.android.heading}
                      </div>
                      {detectedOS === "android" && (
                        <span className="text-[10.5px] font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-coral/15 text-coral border border-coral/30 shrink-0">
                          Detected
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-white/50 mt-0.5">
                      {platforms.android.versionInfo}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Power User Terminal Option */}
            <div className="max-w-[1040px] mx-auto w-full space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-[13.5px] font-medium text-white/70">
                  <TerminalIcon className="h-4 w-4 text-white/50" />
                  <span>Run from Source / CLI</span>
                </div>
                <span className="text-[12px] text-white/40">
                  Python 3.10+ • FFmpeg required
                </span>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-[#0E1017] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-[#12141D]">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                    <span className="text-[12px] text-white/40 font-mono ml-1.5">bash</span>
                  </div>

                  <button
                    onClick={handleCopyTerminal}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white transition-colors cursor-pointer border border-white/[0.08]"
                    aria-label="Copy terminal command"
                  >
                    {copiedTerminal ? (
                      <>
                        <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="h-3.5 w-3.5 text-white/60" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 overflow-x-auto select-all">
                  <code className="font-mono text-[13px] text-slate-300 whitespace-nowrap block">
                    <span className="text-coral select-none mr-2">$</span>
                    {terminalCommand}
                  </code>
                </div>
              </div>
            </div>

            {/* 4. Trust Signals & AlternativeTo (No Redundant Repetition) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 text-[13px] text-white/45">
              <span>100% Local Processing • Zero Cloud Uploads</span>
              <span className="hidden sm:inline text-white/20">•</span>
              <a 
                href="https://alternativeto.net/software/tubemerger/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-indigo-400 transition"
              >
                Find us on AlternativeTo
              </a>
            </div>
          </div>
        )}
      </main>

      {/* ──────────────────────────────────────────────────────────────────────────
          CLEAN MINIMAL FOOTER
         ────────────────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] bg-[#090A0F] py-6 px-6 sm:px-8">
        <div className="mx-auto max-w-[1120px] flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-white/40">
          <div className="flex items-center gap-2">
            <YouTubeIcon className="h-4 w-auto text-coral" />
            <span className="font-semibold text-white/70">TubeMerger</span>
            <span>•</span>
            <span>MIT License</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateHome}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Home
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

