/**
 * TubeMerger Mobile - Theme Colors
 * Single source of truth for all color tokens.
 * Strictly aligned with desktop theme tokens to preserve visual identity.
 */

export const colors = {
  theme: {
    base: '#0F0F0F',     // Core app background
    surface: '#161616',  // Secondary background / bottom sheets
    card: '#181818',     // Container / card surface
    panel: '#1C1C1C',    // Elevated panel / modal
    elevated: '#212121', // High-elevation surface
    hover: '#282828',    // Active / pressed state
    input: '#121212',    // Form inputs and search bar
  },
  stroke: {
    subtle: '#212121',
    card: '#282828',
    light: '#303030',
    hover: '#383838',
  },
  brand: {
    red: '#FF0000',       // Primary TubeMerger red
    redHover: '#CC0000',  // Pressed button state
    redDark: '#990000',   // Deep accent
    glow: 'rgba(255, 0, 0, 0.25)',
  },
  content: {
    primary: '#FFFFFF',   // Primary text & icons
    secondary: '#AAAAAA', // Subtitles & metadata
    muted: '#717171',     // Placeholders & inactive icons
    dim: '#555555',       // Very low emphasis
  },
  semantic: {
    success: '#22C55E',   // Successful merge / online status
    warning: '#F59E0B',   // Rate limits / slow connection
    error: '#EF4444',     // Failures / cancelled
    info: '#3B82F6',      // Info badges / tips
  },
  overlay: {
    dim: 'rgba(0, 0, 0, 0.65)',
    heavy: 'rgba(0, 0, 0, 0.88)',
  },
} as const;

export type Colors = typeof colors;
