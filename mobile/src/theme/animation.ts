/**
 * TubeMerger Mobile - Animation & Timing Constants
 */

export const animation = {
  durations: {
    instant: 100,
    fast: 180,
    normal: 250,
    slow: 400,
    pulse: 1500,
  },
  easing: {
    default: [0.4, 0, 0.2, 1] as const,
    linear: [0, 0, 1, 1] as const,
    easeIn: [0.4, 0, 1, 1] as const,
    easeOut: [0, 0, 0.2, 1] as const,
  },
} as const;

export type Animation = typeof animation;
