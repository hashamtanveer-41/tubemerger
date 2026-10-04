import React, { useEffect } from "react"

interface ToastProps {
  message: string
  subMessage?: string
  visible: boolean
  onClose: () => void
  duration?: number
}

export default function Toast({
  message,
  subMessage,
  visible,
  onClose,
  duration = 3500,
}: ToastProps) {
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [visible, onClose, duration])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-[#0E131F]/95 px-5 py-3.5 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-[90vw] sm:max-w-md"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-5 w-5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 10.5l4 4L16 6" />
        </svg>
      </div>
      <div className="flex-1 text-left">
        <p className="text-[14px] font-semibold text-white">{message}</p>
        {subMessage && (
          <p className="text-[12px] text-white/60 leading-tight mt-0.5">
            {subMessage}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        className="ml-1 text-white/40 hover:text-white transition-colors cursor-pointer p-1"
        aria-label="Close notification"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="h-4 w-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  )
}
