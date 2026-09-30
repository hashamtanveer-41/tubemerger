/**
 * TubeMerger Mobile - Typography Scale
 * Standardized font sizing, weights, and line heights.
 */

export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeights: {
    xs: 14,
    sm: 18,
    base: 20,
    md: 22,
    lg: 24,
    xl: 26,
    '2xl': 30,
    '3xl': 36,
    '4xl': 44,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
} as const;

export type Typography = typeof typography;
