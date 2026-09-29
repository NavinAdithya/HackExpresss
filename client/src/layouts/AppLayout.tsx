/**
 * App Layout — Floating glass navigation + page container
 * Mobile: bottom nav bar
 * Desktop: sidebar
 */

import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassNav } from '../glass';
import { POBackgroundShader } from '../shader';
import { theme } from '../theme';

const navItems = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/trips', label: 'Trips', icon: '🗺️' },
  { path: '/trip/create', label: '', icon: '➕', isCenter: true },
  { path: '/plans', label: 'Plans', icon: '⭐' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

function NavItem({ item, active, onClick }: {
  item: typeof navItems[0];
  active: boolean;
  onClick: () => void;
}) {
  if (item.isCenter) {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: theme.gradientPrimary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0, 212, 255, 0.3)',
          margin: '0 4px',
        }}
      >
        {item.icon}
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        padding: '8px 14px',
        borderRadius: '16px',
        background: active ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minWidth: '56px',
      }}
    >
      <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
      <span style={{
        fontSize: '0.5625rem',
        fontWeight: active ? 600 : 400,
        color: active ? theme.primary : theme.muted,
        letterSpacing: '0.02em',
        fontFamily: "'Inter', sans-serif",
      }}>
        {item.label}
      </span>
    </motion.button>
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide nav during active trip
  const hideNav = location.pathname.includes('/active');

  return (
    <div style={{ minHeight: '100vh', paddingBottom: hideNav ? 0 : '96px', position: 'relative' }}>
      <POBackgroundShader />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Outlet />
      </div>

      {!hideNav && (
        <GlassNav>
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              active={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            />
          ))}
        </GlassNav>
      )}
    </div>
  );
}
