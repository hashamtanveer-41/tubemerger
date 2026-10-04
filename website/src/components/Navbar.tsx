import React, { useState } from "react"
import { useDeviceDetection } from "@/hooks/useDeviceDetection"

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

interface NavbarProps {
  onOpenDownload: () => void
  onOpenCheckout?: (plan?: string) => void
  onNavigateAndroid?: () => void
}

export default function Navbar({ onOpenDownload, onNavigateAndroid }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isAndroid } = useDeviceDetection()

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Android APK", href: "/android", isAndroidLink: true },
    { label: "Open Source", href: "#community" },
    { label: "FAQ", href: "#faq" },
    {
      label: "Support",
      href: "https://github.com/hashamtanveer-41/tubemerger/issues",
      external: true,
    },
  ]

  return (
    <header
      role="banner"
      className="sticky top-0 z-40 border-b border-white/[0.08]"
      style={{ backgroundColor: "#090A0F" }}
    >
      <div className="mx-auto flex h-[76px] max-w-[1280px] items-center justify-between px-6 sm:px-10 gap-4">
        <div className="shrink-0">
          <Logo />
        </div>

        {/* Center Nav Links - flex layout with flex-1 prevents collision */}
        <nav
          role="navigation"
          aria-label="Main navigation"
          className="hidden lg:flex items-center justify-center gap-8 xl:gap-10 flex-1 px-4"
        >
          {navLinks.map((link) => {
            if (link.isAndroidLink) {
              return (
                <button
                  key={link.label}
                  onClick={onNavigateAndroid || onOpenDownload}
                  className="font-sans text-[14px] text-white/70 transition-colors hover:text-[#3DDC84] flex items-center gap-1.5 cursor-pointer"
                >
                  <AndroidIcon className="h-3.5 w-3.5 text-[#3DDC84]" />
                  <span>{link.label}</span>
                </button>
              )
            }
            return (
              <a
                key={link.label}
                href={link.href}
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="font-sans text-[14px] text-white/60 transition-colors hover:text-white whitespace-nowrap"
              >
                {link.label}
              </a>
            )
          })}
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <a
            href="https://github.com/hashamtanveer-41/tubemerger"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] h-10 px-4 text-[13.5px] font-sans font-medium text-white/80 hover:text-white hover:border-white/30 hover:bg-white/[0.06] transition-all whitespace-nowrap"
          >
            <GitHubIcon className="h-4 w-4" />
            <span>GitHub</span>
          </a>

          {isAndroid ? (
            <button
              onClick={onNavigateAndroid || onOpenDownload}
              className="inline-flex items-center gap-2 rounded-full bg-[#3DDC84] hover:bg-[#34c776] text-black h-10 px-5 text-[14px] font-display font-bold shadow-[0_4px_16px_rgba(61,220,132,0.3)] transition-all cursor-pointer whitespace-nowrap"
            >
              <AndroidIcon className="h-4 w-4 text-black" />
              <span>Download APK</span>
            </button>
          ) : (
            <button
              onClick={onOpenDownload}
              className="inline-flex items-center justify-center rounded-full bg-coral h-10 px-5 text-[14px] font-display font-semibold text-white shadow-[0_8px_24px_-8px_rgba(255,59,48,0.65)] hover:brightness-110 active:translate-y-0 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/60 whitespace-nowrap"
            >
              Download App
            </button>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          className="flex lg:hidden p-2 text-white/60 hover:text-white cursor-pointer"
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

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-white/[0.08] bg-[#090A0F] px-6 py-4 space-y-3">
          {navLinks.map((link) => {
            if (link.isAndroidLink) {
              return (
                <button
                  key={link.label}
                  onClick={() => {
                    setMobileMenuOpen(false)
                    if (onNavigateAndroid) onNavigateAndroid()
                    else onOpenDownload()
                  }}
                  className="flex items-center gap-2 py-1 text-[15px] text-[#3DDC84] font-medium w-full text-left"
                >
                  <AndroidIcon className="h-4 w-4" />
                  <span>{link.label}</span>
                </button>
              )
            }
            return (
              <a
                key={link.label}
                href={link.href}
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1 text-[15px] text-white/70 hover:text-white"
              >
                {link.label}
              </a>
            )
          })}
          <div className="pt-3 border-t border-white/[0.08] flex flex-col gap-2.5">
            <a
              href="https://github.com/hashamtanveer-41/tubemerger"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] h-10 text-[14px] font-medium text-white/80"
            >
              <GitHubIcon className="h-4 w-4" />
              <span>View on GitHub</span>
            </a>
            {isAndroid ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  if (onNavigateAndroid) onNavigateAndroid()
                  else onOpenDownload()
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#3DDC84] h-10 text-[14px] font-bold text-black cursor-pointer"
              >
                <AndroidIcon className="h-4 w-4" />
                <span>Download TubeMerger APK</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onOpenDownload()
                }}
                className="w-full inline-flex items-center justify-center rounded-full bg-coral h-10 text-[14px] font-semibold text-white cursor-pointer"
              >
                Download App
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
