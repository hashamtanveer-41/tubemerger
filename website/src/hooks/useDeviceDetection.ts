import { useState, useEffect } from "react"

export type DetectedOS = "win" | "mac" | "linux" | "android" | "ios" | "other"

export interface DeviceInfo {
  isAndroid: boolean
  isIOS: boolean
  isMobile: boolean
  isDesktop: boolean
  isWindows: boolean
  isMac: boolean
  isLinux: boolean
  detectedOS: DetectedOS
}

export function detectDevice(): DeviceInfo {
  if (typeof window === "undefined" || !navigator?.userAgent) {
    return {
      isAndroid: false,
      isIOS: false,
      isMobile: false,
      isDesktop: true,
      isWindows: false,
      isMac: false,
      isLinux: false,
      detectedOS: "other",
    }
  }

  const ua = navigator.userAgent.toLowerCase()
  const isAndroid = ua.includes("android")
  const isIOS = /iphone|ipad|ipod/.test(ua)
  const isMobile = isAndroid || isIOS || /mobile|blackberry|iemobile|opera mini/.test(ua)
  const isDesktop = !isMobile

  const isWindows = ua.includes("win")
  const isMac = ua.includes("mac") && !isIOS
  const isLinux = ua.includes("linux") && !isAndroid

  let detectedOS: DetectedOS = "other"
  if (isAndroid) detectedOS = "android"
  else if (isIOS) detectedOS = "ios"
  else if (isWindows) detectedOS = "win"
  else if (isMac) detectedOS = "mac"
  else if (isLinux) detectedOS = "linux"

  return {
    isAndroid,
    isIOS,
    isMobile,
    isDesktop,
    isWindows,
    isMac,
    isLinux,
    detectedOS,
  }
}

export function useDeviceDetection(): DeviceInfo {
  const [device, setDevice] = useState<DeviceInfo>(detectDevice)

  useEffect(() => {
    setDevice(detectDevice())
  }, [])

  return device
}
