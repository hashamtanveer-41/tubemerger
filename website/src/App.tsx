import React, { useState, useEffect } from "react"
import SEO from "@/components/SEO"
import Navbar from "@/components/Navbar"
import Hero from "@/components/Hero"
import Showcase from "@/components/Showcase"
import FeatureCards from "@/components/FeatureCards"
import ComparisonTable from "@/components/ComparisonTable"
import PricingSection from "@/components/PricingSection"
import FaqSection from "@/components/FaqSection"
import Footer from "@/components/Footer"
import DownloadPage from "@/pages/DownloadPage"
import PlaylistToVideoPage from "@/pages/PlaylistToVideoPage"
import YouTubePlaylistDownloaderPage from "@/pages/YouTubePlaylistDownloaderPage"
import AndroidPage from "@/pages/AndroidPage"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"

export default function App() {
  // Handle client-side routing between Home, Download, Guides, and Android APK Page
  const [currentView, setCurrentView] = useState<
    "home" | "download" | "playlist-guide" | "playlist-downloader" | "android"
  >(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase()
      const hash = window.location.hash.toLowerCase()
      if (path === "/download" || hash === "#download" || hash === "#/download") {
        return "download"
      }
      if (path === "/playlist-to-single-video") {
        return "playlist-guide"
      }
      if (path === "/youtube-playlist-downloader") {
        return "playlist-downloader"
      }
      if (
        path === "/android" ||
        path === "/download-android" ||
        hash === "#android" ||
        hash === "#/android" ||
        hash === "#download-android"
      ) {
        return "android"
      }
    }
    return "home"
  })

  // Listen to browser navigation (Back / Forward) and hash changes
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase()
      const hash = window.location.hash.toLowerCase()
      if (path === "/download" || hash === "#download" || hash === "#/download") {
        setCurrentView("download")
      } else if (path === "/playlist-to-single-video") {
        setCurrentView("playlist-guide")
      } else if (path === "/youtube-playlist-downloader") {
        setCurrentView("playlist-downloader")
      } else if (
        path === "/android" ||
        path === "/download-android" ||
        hash === "#android" ||
        hash === "#/android" ||
        hash === "#download-android"
      ) {
        setCurrentView("android")
      } else {
        setCurrentView("home")
      }
    }

    window.addEventListener("popstate", handlePopState)
    window.addEventListener("hashchange", handlePopState)
    return () => {
      window.removeEventListener("popstate", handlePopState)
      window.removeEventListener("hashchange", handlePopState)
    }
  }, [])

  // Navigation handlers
  const navigateToDownload = () => {
    setCurrentView("download")
    try {
      if (window.location.pathname !== "/download") {
        window.history.pushState(null, "", "/download")
      }
    } catch {
      window.location.hash = "#download"
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const navigateToAndroid = () => {
    setCurrentView("android")
    try {
      if (window.location.pathname !== "/android") {
        window.history.pushState(null, "", "/android")
      }
    } catch {
      window.location.hash = "#android"
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const navigateToPlaylistGuide = () => {
    setCurrentView("playlist-guide")
    try {
      if (window.location.pathname !== "/playlist-to-single-video") {
        window.history.pushState(null, "", "/playlist-to-single-video")
      }
    } catch {
      window.location.hash = "#playlist-to-single-video"
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const navigateToYTDownloader = () => {
    setCurrentView("playlist-downloader")
    try {
      if (window.location.pathname !== "/youtube-playlist-downloader") {
        window.history.pushState(null, "", "/youtube-playlist-downloader")
      }
    } catch {
      window.location.hash = "#youtube-playlist-downloader"
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const navigateToHome = () => {
    setCurrentView("home")
    try {
      if (window.location.pathname !== "/") {
        window.history.pushState(null, "", "/")
      }
    } catch {
      window.location.hash = ""
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const navigateToCommunity = () => {
    setCurrentView("home")
    try {
      if (window.location.pathname !== "/") {
        window.history.pushState(null, "", "/#community")
      }
    } catch {
      window.location.hash = "#community"
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
    setTimeout(() => {
      const el = document.getElementById("community")
      if (el) {
        el.scrollIntoView({ behavior: "smooth" })
      }
    }, 120)
  }

  return (
    <>
      {currentView === "download" ? (
        <>
          {/* Download Page SEO */}
          <SEO
            title="Download TubeMerger — Free Video & Playlist Downloader (Windows, Linux & Android APK)"
            description="Download TubeMerger for Windows, Linux, macOS, and Android (APK). Combine YouTube playlists into a single MP4 video offline with chapter markers or batch download full queues. 100% free and open source."
            canonicalUrl="https://tubemerger.com/download"
            keywords={[
              "tubemerger download",
              "youtube playlist downloader apk",
              "youtube playlist merger download",
              "combine youtube playlist into one video",
              "youtube downloader apk",
              "download youtube playlist android",
              "tubemerger android apk",
              "tubemerger windows",
              "tubemerger linux",
            ]}
          />

          {/* Dedicated Download Page */}
          <DownloadPage
            onNavigateHome={navigateToHome}
            onNavigateToCommunity={navigateToCommunity}
          />
        </>
      ) : currentView === "playlist-guide" ? (
        <PlaylistToVideoPage
          onNavigateHome={navigateToHome}
          onNavigateDownload={navigateToDownload}
          onNavigateYTDownloader={navigateToYTDownloader}
        />
      ) : currentView === "playlist-downloader" ? (
        <YouTubePlaylistDownloaderPage
          onNavigateHome={navigateToHome}
          onNavigateDownload={navigateToDownload}
          onNavigatePlaylistGuide={navigateToPlaylistGuide}
        />
      ) : currentView === "android" ? (
        <AndroidPage
          onNavigateHome={navigateToHome}
          onNavigateDownload={navigateToDownload}
        />
      ) : (
        <div className="min-h-screen bg-canvas text-white selection:bg-coral/30 selection:text-white flex flex-col">
          {/* Home Page SEO */}
          <SEO
            title="TubeMerger — Merge YouTube Playlists Into One Video (Windows, Linux & Android APK)"
            description="Combine YouTube playlists into a single MP4 video offline with chapter markers, or batch download full queues. Free, open source, no duration limits. Available for Windows, Linux, and Android APK."
            canonicalUrl="https://tubemerger.com/"
            keywords={[
              "youtube playlist merger",
              "combine youtube playlist into one video",
              "youtube playlist downloader apk",
              "youtube downloader for mobile",
              "vidmate alternative",
              "snaptube alternative",
              "tubemate alternative",
              "merge youtube playlist",
              "youtube video downloader",
              "playlist downloader",
              "stitch videos offline",
              "video chapter generator",
            ]}
          />

          {/* Solid Global Header */}
          <Navbar
            onOpenDownload={navigateToDownload}
            onNavigateAndroid={navigateToAndroid}
          />

          {/* Main Content Sections */}
          <main id="main-content" role="main" className="flex-1">
            <Hero
              onOpenDownload={navigateToDownload}
              onNavigateAndroid={navigateToAndroid}
            />

            <Showcase />

            <FeatureCards />

            <ComparisonTable />

            <PricingSection onOpenDownload={navigateToDownload} />

            <FaqSection />
          </main>

          {/* Footer */}
          <Footer
            onNavigatePlaylistGuide={navigateToPlaylistGuide}
            onNavigateYTDownloader={navigateToYTDownloader}
            onNavigateAndroid={navigateToAndroid}
          />
        </div>
      )}

      {/* Vercel Web Analytics & Real User Monitoring */}
      <Analytics />
      <SpeedInsights />
    </>
  )
}
