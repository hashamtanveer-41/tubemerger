import React from "react"

interface SEOProps {
  title?: string
  description?: string
  canonicalUrl?: string
  ogImage?: string
  keywords?: string[]
}

export default function SEO({
  title = "TubeMerger — Merge YouTube Playlists Into One Video (Windows, Linux & Android APK)",
  description = "Combine YouTube playlists into a single MP4 video offline with chapter markers, or batch download full queues. Free, open source, no duration limits. Available for Windows, Linux, and Android APK.",
  canonicalUrl = "https://tubemerger.com/",
  ogImage = "https://tubemerger.com/og-image.png",
  keywords = [
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
    "local video merger",
    "free video merger",
    "offline playlist downloader",
  ],
}: SEOProps) {
  React.useEffect(() => {
    // Dynamically update document title
    if (document.title !== title) {
      document.title = title
    }

    // Helper to safely set meta tag
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name"
      let meta = document.querySelector(
        `meta[${attr}="${name}"]`,
      ) as HTMLMetaElement | null
      if (!meta) {
        meta = document.createElement("meta")
        meta.setAttribute(attr, name)
        document.head.appendChild(meta)
      }
      meta.content = content
    }

    setMeta("description", description)
    setMeta("keywords", keywords.join(", "))
    setMeta("og:title", title, true)
    setMeta("og:description", description, true)
    setMeta("og:url", canonicalUrl, true)
    setMeta("og:image", ogImage, true)
    setMeta("twitter:title", title)
    setMeta("twitter:description", description)
    setMeta("twitter:image", ogImage)

    // Ensure canonical link exists
    let canonical = document.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement("link")
      canonical.rel = "canonical"
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl
  }, [title, description, canonicalUrl, ogImage, keywords])

  return null
}
