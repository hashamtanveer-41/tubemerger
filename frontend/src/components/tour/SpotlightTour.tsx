import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, ArrowRight, ArrowLeft, X, Check } from 'lucide-react';

export interface TourStep {
  targetId: string;
  route: string;
  title: string;
  description: string;
  placement?: 'bottom' | 'top' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'search-bar-container',
    route: 'home',
    title: 'Smart Search & Error Diagnostics',
    description: 'Paste any YouTube playlist, album, video, or Shorts URL. Features one-click Clear, instant URL validation, and helpful error guidance for private or DRM-protected links.',
    placement: 'bottom',
  },
  {
    targetId: 'sidebar-nav',
    route: 'home',
    title: 'Workspaces & Navigation',
    description: 'Seamlessly switch between Home, Merge Playlists, Download Video, the dedicated Audio Studio (MP3), Sequential Queues, and History.',
    placement: 'right',
  },
  {
    targetId: 'single-video-download-card',
    route: 'single-video',
    title: 'High-Res Video Downloader',
    description: 'Download single videos in full resolution (up to 4K) with custom quality controls, or extract audio with selectable bitrate options.',
    placement: 'bottom',
  },
  {
    targetId: 'audio-studio-container',
    route: 'audio',
    title: 'Dedicated Audio Studio (MP3)',
    description: 'Extract individual pristine MP3 audio tracks (up to 320kbps) or merge complete playlist albums into a continuous single MP3 file.',
    placement: 'bottom',
  },
  {
    targetId: 'queues-view-container',
    route: 'queues',
    title: 'Sequential Queues & Pause / Resume',
    description: 'Automatic queue management prevents network congestion. Active downloads feature real-time speed monitoring and instant, seamless Pause & Resume controls.',
    placement: 'bottom',
  },
];

interface SpotlightTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  activeTab?: string;
}

function getCutoutPath(rect: DOMRect | null, vw: number, vh: number): string {
  const outer = `M 0 0 L ${vw} 0 L ${vw} ${vh} L 0 ${vh} Z`;
  if (!rect) return outer;

  const pad = 6;
  const r = 12;
  const x = Math.max(0, rect.left - pad);
  const y = Math.max(0, rect.top - pad);
  const w = rect.width + pad * 2;
  const h = rect.height + pad * 2;
  const right = x + w;
  const bottom = y + h;

  // Rounded rectangle cutout hole (counter-clockwise / evenodd punch)
  const inner = `
    M ${x + r} ${y}
    L ${right - r} ${y}
    A ${r} ${r} 0 0 1 ${right} ${y + r}
    L ${right} ${bottom - r}
    A ${r} ${r} 0 0 1 ${right - r} ${bottom}
    L ${x + r} ${bottom}
    A ${r} ${r} 0 0 1 ${x} ${bottom - r}
    L ${x} ${y + r}
    A ${r} ${r} 0 0 1 ${x + r} ${y}
    Z
  `;

  return `${outer} ${inner}`;
}

export function SpotlightTour({ isOpen, onClose, onNavigate, activeTab }: SpotlightTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const step = TOUR_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  // Reset to step 0 whenever tour opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  // Measure target bounding box
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !step) return;
    const el = document.getElementById(step.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
      }
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  // Route syncing and measurements
  useEffect(() => {
    if (!isOpen || !step) return;

    // Navigate to step's assigned route if needed
    if (step.route && onNavigate && step.route !== activeTab) {
      onNavigate(step.route);
    }

    // Immediately measure target element position
    updateTargetRect();

    // Repeatedly poll for target element to handle view mounting / animations smoothly
    let frameId: number;
    const startTime = Date.now();

    const checkTarget = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
          return;
        }
      }
      if (Date.now() - startTime < 800) {
        frameId = requestAnimationFrame(checkTarget);
      }
    };

    frameId = requestAnimationFrame(checkTarget);

    const t1 = setTimeout(updateTargetRect, 60);
    const t2 = setTimeout(updateTargetRect, 180);
    const t3 = setTimeout(updateTargetRect, 400);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, currentStepIndex, activeTab, step, onNavigate, updateTargetRect]);

  // Handle window resizing & scrolling
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      updateTargetRect();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [isOpen, updateTargetRect]);

  const handleFinish = useCallback(() => {
    try {
      localStorage.setItem('tubemerger_tour_v1', 'true');
      localStorage.setItem('tubemerger_tour_completed', 'true');
    } catch {
      // Storage access unavailable
    }
    if (onNavigate) {
      onNavigate('home');
    }
    setCurrentStepIndex(0);
    onClose();
  }, [onNavigate, onClose]);

  const handleNext = useCallback(() => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [isLast, handleFinish]);

  const handlePrev = useCallback(() => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [isFirst]);

  const handleSkip = useCallback(() => {
    handleFinish();
  }, [handleFinish]);

  // Global keyboard navigation: Enter -> Next/Finish, Escape -> Skip, Arrow Keys
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        handlePrev();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, handleNext, handlePrev, handleSkip]);

  if (!isOpen || !step) return null;

  // Tooltip positioning relative to target or centered
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 60,
  };

  if (targetRect) {
    const pad = 16;
    const cardWidth = 360;
    const cardHeight = 220;

    if (step.placement === 'bottom') {
      const top = Math.min(viewportSize.height - cardHeight - 20, targetRect.bottom + pad);
      const left = Math.max(
        20,
        Math.min(viewportSize.width - cardWidth - 20, targetRect.left + targetRect.width / 2 - cardWidth / 2)
      );
      tooltipStyle = {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 60,
      };
    } else if (step.placement === 'right') {
      const top = Math.max(20, Math.min(viewportSize.height - cardHeight - 20, targetRect.top + 20));
      const left = Math.min(viewportSize.width - cardWidth - 20, targetRect.right + pad);
      tooltipStyle = {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 60,
      };
    } else if (step.placement === 'top') {
      const bottom = Math.max(20, viewportSize.height - targetRect.top + pad);
      const left = Math.max(
        20,
        Math.min(viewportSize.width - cardWidth - 20, targetRect.left + targetRect.width / 2 - cardWidth / 2)
      );
      tooltipStyle = {
        position: 'fixed',
        bottom: `${bottom}px`,
        left: `${left}px`,
        zIndex: 60,
      };
    }
  }

  const pathData = getCutoutPath(targetRect, viewportSize.width, viewportSize.height);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-150">
      {/* Click outside backdrop layer to finish/skip */}
      <div
        className="fixed inset-0 z-40 bg-transparent cursor-default"
        onClick={handleSkip}
      />

      {/* SVG Shading Overlay with zero-blur transparent cutout hole */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none z-50"
        viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
      >
        <path
          d={pathData}
          fillRule="evenodd"
          fill="rgba(0, 0, 0, 0.76)"
        />
      </svg>

      {/* Glowing Coral/Red Ring around target element */}
      {targetRect && (
        <div
          className="fixed pointer-events-none rounded-2xl border-2 border-brand-red ring-4 ring-brand-red/30 shadow-[0_0_45px_rgba(255,59,48,0.5)] transition-all duration-200"
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            zIndex: 55,
          }}
        />
      )}

      {/* Floating Tour Card */}
      <div style={tooltipStyle} className="w-[360px] animate-in zoom-in-95 duration-150">
        <Card className="p-5 bg-[#161616] border border-[#2F2F2F] shadow-2xl rounded-2xl space-y-4 text-left">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-red uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step {currentStepIndex + 1} of {TOUR_STEPS.length}</span>
            </div>
            <button
              onClick={handleSkip}
              className="text-content-muted hover:text-content-primary p-1 rounded-lg transition-colors cursor-pointer"
              title="Skip Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-content-primary leading-tight">
              {step.title}
            </h3>
            <p className="text-xs text-content-secondary leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Step indicators & Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[#262626]">
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStepIndex
                      ? 'w-5 bg-brand-red'
                      : i < currentStepIndex
                      ? 'w-1.5 bg-red-950/80 border border-brand-red/50'
                      : 'w-1.5 bg-[#333333]'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  className="h-8 px-2.5 text-xs border-[#333333] hover:bg-[#222222] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Prev
                </Button>
              )}
              <Button
                id="tour-primary-btn"
                size="sm"
                onClick={isLast ? handleFinish : handleNext}
                className="h-8 px-4 text-xs font-semibold cursor-pointer shadow-md shadow-red-950/40"
              >
                <span>{isLast ? 'Finish' : 'Next (Enter)'}</span>
                {isLast ? (
                  <Check className="w-3.5 h-3.5 ml-1" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
