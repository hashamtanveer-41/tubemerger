/**
 * TubeMerger Mobile - Theme Index
 * Single entry point for styling tokens and themes.
 */

import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radii } from './radii';
import { shadows } from './shadows';
import { animation } from './animation';

export * from './ThemeContext';

export const theme = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  animation,
} as const;

export { colors, typography, spacing, radii, shadows, animation };
export type Theme = typeof theme;
