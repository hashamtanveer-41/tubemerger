import React from "react"
import waveBg from "@/imports/image-2.png"

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

interface HeroProps {
  onOpenDownload: () => void
  onOpenCheckout?: (plan?: string) => void
}

export default function Hero({ onOpenDownload }: HeroProps) {
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
        {/* Figma YouTube Icon */}
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
          className="rise-in mx-auto mt-[26px] text-[16px] text-white/45"
          style={{ "--rise-delay": "260ms" } as React.CSSProperties}
        >
          One link in. One stitched master out.
        </p>

        {/* Action Buttons */}
        <div
          className="rise-in mt-10 flex flex-wrap items-center justify-center gap-3"
          style={{ "--rise-delay": "360ms" } as React.CSSProperties}
        >
          <button
            onClick={onOpenDownload}
            className="inline-flex items-center justify-center rounded-full bg-coral h-14 px-9 text-[16px] font-display font-semibold text-white shadow-[0_8px_24px_-8px_rgba(255,59,48,0.65)] hover:brightness-110 active:translate-y-0 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/60"
          >
            <span>Download Free App</span>
          </button>
        </div>

        {/* Subtitle Kicker */}
        <p
          className="rise-in mt-6 font-sans text-[14px] font-normal text-white/60 tracking-normal"
          style={{ "--rise-delay": "460ms" } as React.CSSProperties}
        >
          Built for Windows, macOS, Linux & Android • 100% Free & Open Source • Fully
          Offline
        </p>
      </div>
    </section>
  )
}
