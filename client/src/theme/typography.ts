/**
 * Typography system — premium, clean, Apple-like direction.
 * Google Font: Inter
 */

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  monoFamily: "'JetBrains Mono', 'SF Mono', monospace",

  hero: {
    fontSize: 'clamp(2.5rem, 6vw, 4rem)',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
  },
  h1: {
    fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
  },
  h2: {
    fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
  },
  h3: {
    fontSize: '1.25rem',
    fontWeight: 600,
    letterSpacing: '-0.005em',
    lineHeight: 1.3,
  },
  body: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  bodySmall: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.4,
  },
  label: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    lineHeight: 1.2,
  },
  number: {
    fontFamily: "'Inter', monospace",
    fontWeight: 600,
    fontFeatureSettings: "'tnum' on, 'lnum' on",
  },
  price: {
    fontSize: 'clamp(2rem, 5vw, 3rem)',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
} as const;

export const breakpoints = {
  sm: '375px',
  md: '768px',
  lg: '1024px',
  xl: '1440px',
  xxl: '1920px',
} as const;

export const media = {
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
} as const;
