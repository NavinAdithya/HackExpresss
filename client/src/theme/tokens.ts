/**
 * PO → PO Design Tokens — Master Specification
 *
 * Official Palette (Section 56):
 * #F63B03 — Primary Orange
 * #F73C06 — Bright Orange
 * #FFF8E5 — Cream
 * #FBF6E2 — Light Cream
 * #FFFFFF — White
 * #E79E89 — Dust Pink
 * #0A0A0A — Black
 * #4F1409 — Dark Brown
 *
 * One permanent PO → PO theme. No light/dark mode toggle.
 * No unrelated blue/purple/cyan primary colors.
 */

export const theme = {
  // Base & Background
  background: '#0A0A0A',
  foreground: '#FFF8E5',
  backgroundAlt: '#140D0B',
  darkBrown: '#4F1409',
  cream: '#FFF8E5',
  lightCream: '#FBF6E2',
  white: '#FFFFFF',
  dustPink: '#E79E89',

  // Official Brand Primary & Accents
  primary: '#F63B03',        // Primary Orange
  primaryBright: '#F73C06',  // Bright Orange
  secondary: '#E79E89',      // Dust Pink
  accent: '#F63B03',
  brand: '#F63B03',

  // Glass System (Warm glass tint & highlight based on cream & orange)
  glassTint: 'rgba(255, 248, 229, 0.05)',
  glassBorder: 'rgba(255, 248, 229, 0.12)',
  glassHighlight: 'rgba(246, 59, 3, 0.25)',
  glassOverlay: 'rgba(10, 10, 10, 0.75)',

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  emergency: '#F63B03',
  muted: 'rgba(255, 248, 229, 0.50)',
  mutedLight: 'rgba(255, 248, 229, 0.75)',

  // Surfaces
  surface: 'rgba(255, 248, 229, 0.04)',
  surfaceElevated: 'rgba(255, 248, 229, 0.08)',
  surfaceHover: 'rgba(246, 59, 3, 0.12)',

  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #F63B03 0%, #F73C06 50%, #E79E89 100%)',
  gradientAccent: 'linear-gradient(135deg, #F63B03 0%, #4F1409 100%)',
  gradientSurface: 'linear-gradient(180deg, rgba(255, 248, 229, 0.08) 0%, rgba(255, 248, 229, 0.02) 100%)',
  gradientHero: 'linear-gradient(135deg, #F63B03 0%, #F73C06 40%, #E79E89 80%, #FFF8E5 100%)',

  // Plan Colors
  planFree: '#FFF8E5',
  planVerified: '#E79E89',
  planPro: '#F63B03',

  // Shadows
  shadowSm: '0 2px 8px rgba(0, 0, 0, 0.5)',
  shadowMd: '0 4px 16px rgba(0, 0, 0, 0.6)',
  shadowLg: '0 8px 32px rgba(0, 0, 0, 0.7)',
  shadowGlow: '0 0 24px rgba(246, 59, 3, 0.25)',
  shadowOrange: '0 8px 24px rgba(246, 59, 3, 0.35)',

  // Border Radius
  radiusSm: '8px',
  radiusMd: '12px',
  radiusLg: '20px',
  radiusXl: '28px',
  radiusFull: '9999px',

  // Spacing Scale
  space: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    xxxl: '64px',
  },

  // Z-Index Scale
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
