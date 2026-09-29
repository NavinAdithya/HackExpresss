/**
 * PO → PO Logo Component
 * Centralized so the final logo can be replaced later without changing the application.
 * Uses typography + custom symbol.
 */

import { motion } from 'framer-motion';
import { theme } from '../theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const sizes = {
  sm: { font: '1.25rem', arrow: '0.75rem' },
  md: { font: '1.75rem', arrow: '1rem' },
  lg: { font: '2.5rem', arrow: '1.5rem' },
  xl: { font: '3.5rem', arrow: '2rem' },
};

export function Logo({ size = 'md', showTagline = false, className = '', style }: LogoProps) {
  const s = sizes[size];

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', ...style }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
        fontSize: s.font,
        letterSpacing: '-0.03em',
        color: theme.foreground,
      }}>
        <span>PO</span>
        <motion.span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1px',
            fontSize: s.arrow,
            background: theme.gradientPrimary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            padding: '0 4px',
          }}
          animate={{ x: [0, 3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          →
        </motion.span>
        <span>PO</span>
      </div>
      {showTagline && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            fontSize: '0.625rem',
            fontWeight: 500,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: theme.muted,
          }}
        >
          Move together
        </motion.span>
      )}
    </motion.div>
  );
}
