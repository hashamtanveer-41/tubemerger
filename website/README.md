# TubeMerger Web — Official Website & Landing Hub

> The official web presence, product showcase, and distribution hub for [TubeMerger](https://tubemerger.com) — Turn YouTube Playlists into One Video.

[![Live Site](https://img.shields.io/badge/Live-tubemerger.com-coral?style=for-the-badge&logo=google-chrome&logoColor=white)](https://tubemerger.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

---

## 🌟 Overview

This repository powers **[tubemerger.com](https://tubemerger.com)**, the primary landing page, documentation, and distribution hub for the **TubeMerger Mobile (Android APK)** and **Desktop Workstations** (Windows, macOS, and Linux).

### Features
- **Hero & Value Proposition**: High-impact introduction to playlist downloading and merging with animated wave canvas backdrop.
- **Mobile & Desktop Hub**: Download links for Android APK (VidMate/SnapTube open-source alternative) and desktop binaries.
- **Interactive Product Simulator**: Try out the real-time playlist probe, resolution switches, and merge pipeline simulation directly in the browser.
- **Feature Showcase**: Deep dive into automated chapter markers, 100% offline local SQLite WAL processing, and fast download speeds.
- **Competitive Matrix**: In-depth comparison comparing TubeMerger against VidMate, SnapTube, Premiere Pro, and cloud converters.
- **100% Free & Open Source**: MIT licensed with zero paywalls, no device restrictions, and no subscriptions.
- **FAQ Accordion**: Common questions answered regarding offline privacy, player compatibility, and community support.
- **Dedicated `/download` Hub**: OS auto-detection (Android, Windows, macOS, Linux), platform release specs, SHA-256 verification hashes, and installation guides.

---

## 🛠 Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tooling**: [Vite 8](https://vitejs.dev/) with TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **SEO & Structured Data**: Dynamic Open Graph, Twitter Cards, and Schema.org JSON-LD (SoftwareApplication, Organization, WebSite, FAQPage, BreadcrumbList)

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `pnpm`

### Installation

```bash
# Clone the repository
git clone https://github.com/hashamtanveer-41/tubemerger.git
cd tubemerger

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

### Building for Production

```bash
npm run build
```
The optimized production bundle will be generated in `dist/`.

---

## 🌐 Deployment

This project is configured for continuous deployment on [Vercel](https://vercel.com):
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Custom Domain**: `https://tubemerger.com`

---

## 📄 License & Copyright

Copyright © 2026 [TubeMerger](https://tubemerger.com). All rights reserved.
For support and inquiries, reach out to `support@tubemerger.com`.
