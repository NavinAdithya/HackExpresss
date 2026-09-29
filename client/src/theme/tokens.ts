/**
 * PO → PO Design Tokens
 * Central theme configuration — all visual systems derive from these tokens.
 * Single cohesive dark theme with electric cyan/violet accents.
 * NO LIGHT/DARK MODE TOGGLE.
 */

export const theme = {
  // Base
  background: '#06060C',
  foreground: '#FFFFFF',
  backgroundAlt: '#0C0C16',

  // Brand
  primary: '#00D4FF',       // Electric cyan
  secondary: '#7B61FF',     // Vivid violet
  accent: '#00FFA3',        // Iridescent green
  brand: '#00D4FF',

  // Glass
  glassTint: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  glassHighlight: 'rgba(255, 255, 255, 0.15)',
  glassOverlay: 'rgba(6, 6, 12, 0.6)',

  // Semantic
  success: '#00FFA3',
  warning: '#FFB800',
  danger: '#FF3B5C',
  emergency: '#FF0040',
  muted: 'rgba(255, 255, 255, 0.4)',
  mutedLight: 'rgba(255, 255, 255, 0.6)',

  // Surfaces
  surface: 'rgba(255, 255, 255, 0.03)',
  surfaceElevated: 'rgba(255, 255, 255, 0.06)',
  surfaceHover: 'rgba(255, 255, 255, 0.08)',

  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #00D4FF 0%, #7B61FF 100%)',
  gradientAccent: 'linear-gradient(135deg, #7B61FF 0%, #FF61D8 100%)',
  gradientSurface: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
  gradientHero: 'linear-gradient(135deg, #00D4FF 0%, #7B61FF 50%, #FF61D8 100%)',

  // Plan colors
  planFree: '#00D4FF',
  planVerified: '#7B61FF',
  planPro: '#FFB800',

  // Shadows
  shadowSm: '0 2px 8px rgba(0, 0, 0, 0.3)',
  shadowMd: '0 4px 16px rgba(0, 0, 0, 0.4)',
  shadowLg: '0 8px 32px rgba(0, 0, 0, 0.5)',
  shadowGlow: '0 0 20px rgba(0, 212, 255, 0.15)',

  // Border radius
  radiusSm: '8px',
  radiusMd: '12px',
  radiusLg: '20px',
  radiusXl: '28px',
  radiusFull: '9999px',

  // Spacing scale
  space: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    xxxl: '64px',
  },

  // Z-index scale
  z: {
    base: 0,
    content: 10,
    nav: 50,
    modal: 100,
    toast: 150,
    tooltip: 200,
  },
} as const;

export type Theme = typeof theme;
