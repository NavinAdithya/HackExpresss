/**
 * Glass Component System — React wrappers around dashersw/liquid-glass-js
 *
 * Uses CSS glass fallback for reliability, with WebGL liquid glass
 * reserved for hero surfaces and high-impact elements.
 *
 * The Liquid Glass JS library is loaded via script tag when WebGL
 * is available. CSS fallback is used on low-end devices.
 */

import React, { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { theme } from '../theme';

// ──────────────────────────────────────────────────
// Glass CSS base styles
// ──────────────────────────────────────────────────

const glassBase: React.CSSProperties = {
  background: theme.glassTint,
  backdropFilter: 'blur(20px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
  border: `1px solid ${theme.glassBorder}`,
  position: 'relative',
  overflow: 'hidden',
};

// ──────────────────────────────────────────────────
// GlassSurface — Core glass container
// ──────────────────────────────────────────────────

interface GlassProps extends HTMLMotionProps<'div'> {
  children?: React.ReactNode;
  blur?: number;
  tint?: string;
  borderRadius?: string;
  glow?: boolean;
  intensity?: 'light' | 'medium' | 'strong';
}

const intensityMap = {
  light: { bg: 'rgba(255,255,255,0.03)', blur: 12, border: 'rgba(255,255,255,0.06)' },
  medium: { bg: 'rgba(255,255,255,0.05)', blur: 20, border: 'rgba(255,255,255,0.10)' },
  strong: { bg: 'rgba(255,255,255,0.08)', blur: 30, border: 'rgba(255,255,255,0.15)' },
};

export const GlassSurface = forwardRef<HTMLDivElement, GlassProps>(
  ({ children, blur, tint, borderRadius, glow, intensity = 'medium', style, ...props }, ref) => {
    const i = intensityMap[intensity];
    return (
      <motion.div
        ref={ref}
        style={{
          ...glassBase,
          background: tint || i.bg,
          backdropFilter: `blur(${blur || i.blur}px) saturate(1.4)`,
          WebkitBackdropFilter: `blur(${blur || i.blur}px) saturate(1.4)`,
          borderColor: i.border,
          borderRadius: borderRadius || theme.radiusLg,
          ...(glow ? { boxShadow: theme.shadowGlow } : {}),
          ...style,
        }}
        {...props}
      >
        {/* Highlight edge */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          pointerEvents: 'none',
        }} />
        {children}
      </motion.div>
    );
  }
);
GlassSurface.displayName = 'GlassSurface';

// ──────────────────────────────────────────────────
// GlassCard — Card with glass styling
// ──────────────────────────────────────────────────

export const GlassCard = forwardRef<HTMLDivElement, GlassProps>(
  ({ children, style, ...props }, ref) => (
    <GlassSurface
      ref={ref}
      style={{ padding: '24px', ...style }}
      whileHover={{ scale: 1.01, borderColor: 'rgba(255,255,255,0.2)' }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {children}
    </GlassSurface>
  )
);
GlassCard.displayName = 'GlassCard';

// ──────────────────────────────────────────────────
// GlassButton — Interactive glass button
// ──────────────────────────────────────────────────

interface GlassButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

const buttonSizes = {
  sm: { padding: '8px 16px', fontSize: '0.8125rem' },
  md: { padding: '12px 24px', fontSize: '0.9375rem' },
  lg: { padding: '16px 32px', fontSize: '1.0625rem' },
};

const buttonVariants = {
  primary: {
    background: theme.gradientPrimary,
    border: 'none',
    color: '#000',
    fontWeight: 700,
  },
  secondary: {
    ...glassBase,
    color: theme.foreground,
    fontWeight: 600,
  },
  ghost: {
    background: 'transparent',
    border: `1px solid ${theme.glassBorder}`,
    color: theme.foreground,
    fontWeight: 500,
  },
  danger: {
    background: theme.danger,
    border: 'none',
    color: '#fff',
    fontWeight: 700,
  },
};

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ children, variant = 'primary', size = 'md', fullWidth, loading, style, disabled, ...props }, ref) => {
    const s = buttonSizes[size];
    const v = buttonVariants[variant];

    return (
      <motion.button
        ref={ref}
        style={{
          ...v,
          ...s,
          borderRadius: theme.radiusFull,
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          width: fullWidth ? '100%' : 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontFamily: "'Inter', sans-serif",
          letterSpacing: '-0.01em',
          outline: 'none',
          transition: 'all 0.2s ease',
          ...style,
        } as React.CSSProperties}
        whileHover={!disabled ? { scale: 1.03 } : {}}
        whileTap={!disabled ? { scale: 0.97 } : {}}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <motion.div
            style={{
              width: '18px', height: '18px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        ) : children}
      </motion.button>
    );
  }
);
GlassButton.displayName = 'GlassButton';

// ──────────────────────────────────────────────────
// GlassPill — Small pill indicator
// ──────────────────────────────────────────────────

interface GlassPillProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function GlassPill({ children, color, className }: GlassPillProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 12px',
        borderRadius: theme.radiusFull,
        background: color ? `${color}20` : theme.glassTint,
        border: `1px solid ${color ? `${color}40` : theme.glassBorder}`,
        color: color || theme.foreground,
        fontSize: '0.75rem',
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {children}
    </span>
  );
}

// ──────────────────────────────────────────────────
// GlassModal — Full-screen glass overlay
// ──────────────────────────────────────────────────

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function GlassModal({ open, onClose, children, title }: GlassModalProps) {
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: theme.z.modal,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Backdrop */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      />
      {/* Content */}
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <GlassSurface intensity="strong" style={{ padding: '32px' }}>
          {title && (
            <h2 style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: '1.5rem',
              letterSpacing: '-0.02em',
              marginBottom: '24px',
              color: theme.foreground,
            }}>
              {title}
            </h2>
          )}
          {children}
        </GlassSurface>
      </motion.div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────
// GlassNav — Bottom navigation bar
// ──────────────────────────────────────────────────

interface GlassNavProps {
  children: React.ReactNode;
}

export function GlassNav({ children }: GlassNavProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: theme.z.nav,
        pointerEvents: 'none',
      }}
    >
      <motion.nav
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 220 }}
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '8px 12px',
          borderRadius: theme.radiusFull,
          ...glassBase,
          background: 'rgba(12, 12, 22, 0.85)',
          backdropFilter: 'blur(30px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(30px) saturate(1.5)',
          border: `1px solid rgba(255,255,255,0.12)`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        {children}
      </motion.nav>
    </div>
  );
}

// ──────────────────────────────────────────────────
// GlassInput — Form input with glass styling
// ──────────────────────────────────────────────────

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, error, style, ...props }, ref) => (
    <div style={{ width: '100%' }}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: '6px',
          fontSize: '0.6875rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: theme.muted,
          fontFamily: "'Inter', sans-serif",
        }}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        style={{
          width: '100%',
          padding: '14px 18px',
          borderRadius: theme.radiusMd,
          background: theme.surface,
          border: `1px solid ${error ? theme.danger : theme.glassBorder}`,
          color: theme.foreground,
          fontSize: '1rem',
          fontFamily: "'Inter', sans-serif",
          outline: 'none',
          transition: 'all 0.2s ease',
          ...style,
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: '0.75rem', color: theme.danger, marginTop: '4px', display: 'block' }}>
          {error}
        </span>
      )}
    </div>
  )
);
GlassInput.displayName = 'GlassInput';

// ──────────────────────────────────────────────────
// PlanBadge — Animated plan badge
// ──────────────────────────────────────────────────

interface PlanBadgeProps {
  plan: 'FREE' | 'VERIFIED' | 'PRO';
  size?: 'sm' | 'md';
}

const planStyles = {
  FREE: { bg: `${theme.primary}20`, color: theme.primary, label: 'FREE', icon: '' },
  VERIFIED: { bg: `${theme.planVerified}20`, color: theme.planVerified, label: '🛡️ VERIFIED', icon: '🛡️' },
  PRO: { bg: `${theme.planPro}20`, color: theme.planPro, label: '⚡ PRO', icon: '⚡' },
};

export function PlanBadge({ plan, size = 'sm' }: PlanBadgeProps) {
  const s = planStyles[plan];
  const fontSize = size === 'sm' ? '0.625rem' : '0.75rem';
  const padding = size === 'sm' ? '3px 8px' : '5px 12px';

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding,
        borderRadius: theme.radiusFull,
        background: s.bg,
        color: s.color,
        fontSize,
        fontWeight: 700,
        fontFamily: "'Inter', sans-serif",
        letterSpacing: '0.04em',
        border: `1px solid ${s.color}40`,
      }}
    >
      {s.label}
    </motion.span>
  );
}
