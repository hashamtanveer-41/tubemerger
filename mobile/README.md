# TubeMerger Mobile 📱

<p align="center">
  <img src="src/assets/logo.png" width="100" height="100" alt="TubeMerger Mobile Logo" />
</p>

<p align="center">
  <strong>The 100% Free, Open-Source & Ad-Free YouTube Playlist Downloader & Merger for Android</strong><br />
  <em>The modern, privacy-first alternative to VidMate, SnapTube, and TubeMate.</em>
</p>

<p align="center">
  <a href="https://tubemerger.com"><img src="https://img.shields.io/badge/Website-tubemerger.com-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Official Website" /></a>
  <a href="https://tubemerger.com/download"><img src="https://img.shields.io/badge/Download-Android%20APK-10b981?style=for-the-badge&logo=android&logoColor=white" alt="Download APK" /></a>
  <a href="https://github.com/hashamtanveer-41/tubemerger/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android%208.0+-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Android 8.0+" />
  <img src="https://img.shields.io/badge/React%20Native-0.87-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React Native 0.87" />
  <img src="https://img.shields.io/badge/Engine-yt--dlp%20%2B%20FFmpeg-FF0000?style=flat-square&logo=youtube&logoColor=white" alt="yt-dlp + FFmpeg" />
  <img src="https://img.shields.io/badge/Ads-0%25%20(Ad--Free)-brightgreen?style=flat-square" alt="100% Ad-Free" />
  <img src="https://img.shields.io/badge/Trackers-0%20(Zero)-brightgreen?style=flat-square" alt="Zero Trackers" />
</p>

---

## 🚀 Why TubeMerger Mobile?

For years, Android users searching for a reliable **YouTube downloader for mobile** have been forced to choose between bloated, adware-ridden utilities like **VidMate**, **SnapTube**, and **TubeMate**. These legacy apps are notorious for:
- ❌ Intrusive full-screen popups, push notification spam, and scammy ads
- ❌ Bundled adware, background battery drain, and privacy-invasive tracker SDKs
- ❌ Inability to concatenate or merge multiple playlist videos into a single uninterrupted file
- ❌ Capped download speeds or paywalled audio bitrates

**TubeMerger Mobile** fixes all of this. Built with **React Native** and powered by native on-device **yt-dlp** and **FFmpeg NDK** binaries, TubeMerger delivers a sleek, fast, and completely ad-free mobile workstation.

---

## ⚡ Feature Comparison: TubeMerger vs. VidMate vs. SnapTube vs. TubeMate

| Feature | TubeMerger Mobile | VidMate | SnapTube | TubeMate |
|:---|:---:|:---:|:---:|:---:|
| **License** | **100% Open Source (MIT)** | Closed Source | Closed Source | Closed Source |
| **Advertisements** | **Zero (100% Ad-Free)** | Heavy / Invasive | Heavy / Popups | Banner Ads |
| **Merge Playlist into Single Video** | **✅ Yes (with Chapter Bookmarks)** | ❌ No | ❌ No | ❌ No |
| **Granular Clip Cherry-Picking** | **✅ Yes (Interactive Selector)** | ❌ No | ❌ No | ❌ No |
| **Audiophile 320kbps MP3** | **✅ Yes (Unrestricted)** | ⚠️ Often capped / Paywalled | ⚠️ Paywalled | ⚠️ Up to 192kbps |
| **Android Foreground Service** | **✅ Yes (Resilient Background Task)** | ⚠️ Unreliable / Ad-gated | ⚠️ Unreliable | ⚠️ Basic |
| **Trackers & Telemetry SDKs** | **Zero (Local-Only)** | Multiple Adware Trackers | Multiple Adware Trackers | Multiple Trackers |
| **Theme Support** | **Light & AMOLED Dark (Auto-Sync)** | Limited | Limited | Limited |
| **App Launcher Icon** | **Clean White Adaptive Icon** | Standard | Standard | Standard |
| **Account Required** | **None** | Often prompted | Often prompted | None |

---

## 🌟 Key Capabilities

### 🎬 Playlist Merger & Chapter Generator
Paste any YouTube playlist URL, preview all videos with thumbnails, durations, and channels, and merge the entire series into a single `.mp4` file with embedded chapter marks. Perfect for full courses, music sets, tutorials, and conference talks.

### ✂️ Granular Clip Control
Never waste data on clips you don't need. TubeMerger lets you deselect specific intro/outro videos or unneeded lectures before the download begins, recalculating runtime and estimated file sizes in real time.

### 🎵 Audiophile MP3 Audio Studio
Extract audio from single videos or stitch full music playlists into continuous 320kbps, 256kbps, 192kbps, or 128kbps MP3 audiobooks and albums.

### ⚡ Resilient Android Foreground Service
Downloads and video encodings continue seamlessly in the background with persistent notification progress, even when your screen is locked or you switch to other apps.

### 🌓 Intelligent Theming & Persistence
- **First Launch Detection**: Automatically adapts to your Android system theme (Light or Dark) on first launch after fresh installation.
- **Persistent Storage**: When you toggle your theme or customize video quality, your preference is immediately saved to native `SharedPreferences` and restored with zero screen flicker on boot.

### 🎨 Clean White Launcher Icon
Designed with full Android Adaptive Icon support (`res/mipmap-anydpi-v26/`) and solid white legacy backdrops so the app icon always looks crisp and vibrant on any launcher (Pixel, Samsung One UI, Xiaomi HyperOS, Nova Launcher, etc.).

---

## 🛠️ Architecture & Tech Stack

- **UI Framework**: React Native `0.87.1` (Fabric & TurboModule architecture ready)
- **Styling**: NativeWind `4.2` / Tailwind CSS `3.4`
- **Navigation**: React Navigation `7.x` (Native Stack + Bottom Tabs)
- **Icons**: Lucide React Native
- **Native Bridge**: Kotlin `TubeMergerModule` interfacing with:
  - `youtubedl-android` (Embedded Python 3 + yt-dlp core)
  - `ffmpeg-kit` / Android NDK FFmpeg 7.1.1 for format & canvas normalization
  - Android `ForegroundService` with notification progress reporting
  - Android `SharedPreferences` for instant synchronous theme initialization

---

## 📲 Installation & Building from Source

### Prerequisites
- **Node.js**: `>= 22.11.0`
- **JDK**: OpenJDK 17
- **Android SDK**: API 34+ with Android NDK 26+

### 1. Install Dependencies
```bash
cd mobile
npm install
```

### 2. Run in Development Mode
Start the Metro bundler:
```bash
npm start
```

In a separate terminal, launch the app on your connected device or emulator:
```bash
npm run android
```

### 3. Build Production Release APK
To compile a standalone, optimized release APK:
```bash
cd android
./gradlew assembleRelease
```
The output APK will be generated at:
`mobile/android/app/build/outputs/apk/release/app-release.apk`

---

## 🔒 Privacy & Security

TubeMerger Mobile is built on a strict privacy-first foundation:
- **No Account Required**: No registration, no login, no emails collected.
- **Local Processing**: Video extraction and merging occur 100% locally on your device hardware.
- **Zero Cloud Proxies**: Your video URLs and downloaded media never pass through remote intermediary servers.

---

## 📄 License

TubeMerger Mobile is licensed under the **[MIT License](https://github.com/hashamtanveer-41/tubemerger/blob/main/LICENSE)**. Free for personal and commercial use with zero artificial limitations.
