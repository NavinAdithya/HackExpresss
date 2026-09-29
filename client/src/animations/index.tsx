/**
 * Framer Motion animation primitives
 */

import { motion, AnimatePresence, type Variants, type Transition } from 'framer-motion';
import React from 'react';

// ──────────────────────────────────────────────────
// Shared transitions
// ──────────────────────────────────────────────────

export const springTransition: Transition = {
  type: 'spring',
  damping: 25,
  stiffness: 300,
};

export const smoothTransition: Transition = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1],
};

// ──────────────────────────────────────────────────
// PageTransition — cinematic page wrapper
// ──────────────────────────────────────────────────

const pageVariants: Variants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  enter: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { ...smoothTransition, duration: 0.4 } },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.3 } },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      style={{ width: '100%', minHeight: '100vh' }}
    >
      {children}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────
// FadeReveal — opacity + y reveal
// ──────────────────────────────────────────────────

interface FadeRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down';
  className?: string;
  style?: React.CSSProperties;
}

export function FadeReveal({ children, delay = 0, direction = 'up', className, style }: FadeRevealProps) {
  const y = direction === 'up' ? 20 : -20;
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...smoothTransition, delay }}
    >
      {children}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────
// ScaleReveal
// ──────────────────────────────────────────────────

export function ScaleReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...springTransition, delay }}
    >
      {children}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────
// StaggerContainer — staggers children
// ──────────────────────────────────────────────────

const staggerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: smoothTransition },
};

export function StaggerContainer({ children, className, style }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={staggerVariants}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, style }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div className={className} style={style} variants={staggerItemVariants}>
      {children}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────
// PulseIndicator — pulsing dot for live status
// ──────────────────────────────────────────────────

export function PulseIndicator({ color = '#00FFA3', size = 8 }: { color?: string; size?: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
      <motion.span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: color,
        }}
        animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        background: color,
      }} />
    </span>
  );
}

// ──────────────────────────────────────────────────
// FloatingElement — gentle float animation
// ──────────────────────────────────────────────────

export function FloatingElement({ children, range = 8 }: { children: React.ReactNode; range?: number }) {
  return (
    <motion.div
      animate={{ y: [-range, range, -range] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────
// AnimatedNumber — counting animation for numbers
// ──────────────────────────────────────────────────

export function AnimatedNumber({ value, prefix = '', suffix = '' }: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={smoothTransition}
      style={{ fontFeatureSettings: "'tnum' on, 'lnum' on" }}
    >
      {prefix}{value}{suffix}
    </motion.span>
  );
}

export { AnimatePresence };
