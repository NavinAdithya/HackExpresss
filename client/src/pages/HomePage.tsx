/**
 * Home Page — PO → PO Commute Hub
 *
 * Implements:
 * - Traveller View: "Share My Commute" (Estimated travel expense, Available seats, Potential contribution, Effective personal expense)
 * - Passenger View: "Find a Ride" (Shared travel cost, Platform fee, Instant match search)
 * - 3D Ambient Mobility Scene in PO → PO orange/cream palette
 * - Active trip live banner
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from '../components/Logo';
import { GlassSurface, GlassCard, GlassButton, PlanBadge } from '../glass';
import { PageTransition, FadeReveal, PulseIndicator } from '../animations';
import { useAuthStore } from '../stores/authStore';
import { useTripStore } from '../stores/tripStore';
import { theme } from '../theme';

export function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { trips = [], fetchTrips } = useTripStore();
  const [role, setRole] = useState<'passenger' | 'traveller'>('passenger');

  useEffect(() => {
    fetchTrips({ limit: '5' });
  }, []);

  const safeTrips = Array.isArray(trips) ? trips : [];
  const activeTrip = safeTrips.find((t) => ['ACCEPTED', 'VERIFYING', 'READY_TO_START', 'IN_PROGRESS'].includes(t.status));

  if (!user) return null;

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px 80px 16px', maxWidth: '600px', margin: '0 auto' }}>
        {/* Header */}
        <FadeReveal>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <p style={{ color: theme.muted, fontSize: '0.8125rem', marginBottom: '2px' }}>Welcome back</p>
              <h1
                style={{
                  fontWeight: 800,
                  fontSize: '1.65rem',
                  letterSpacing: '-0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: theme.cream,
                }}
              >
                {user.name}
                <PlanBadge plan={user.plan} />
              </h1>
              <span style={{ fontSize: '0.75rem', color: theme.primary, fontWeight: 600 }}>
                ✓ PO → PO Member
              </span>
            </div>
            <Logo size="sm" />
          </div>
        </FadeReveal>


        {/* Active Trip Banner */}
        {activeTrip && (
          <FadeReveal delay={0.1}>
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() =>
                navigate(
                  activeTrip.status === 'IN_PROGRESS'
                    ? `/trip/${activeTrip._id}/active`
                    : `/matches/${activeTrip._id}`
                )
              }
            >
              <GlassSurface
                intensity="strong"
                glow
                style={{
                  padding: '20px',
                  marginBottom: '24px',
                  cursor: 'pointer',
                  borderColor: `${theme.primary}50`,
                  background: 'rgba(246, 59, 3, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <PulseIndicator color={theme.primary} />
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: theme.primary,
                    }}
                  >
                    {activeTrip.status === 'IN_PROGRESS' ? 'LIVE COMMUTE' : activeTrip.status.replace('_', ' ')}
                  </span>
                </div>
                <p style={{ fontWeight: 700, fontSize: '1.05rem', color: theme.cream }}>
                  {activeTrip.origin?.address} → {activeTrip.destination?.address}
                </p>
                <p style={{ color: theme.muted, fontSize: '0.8125rem', marginTop: '4px' }}>
                  Tap to {activeTrip.status === 'IN_PROGRESS' ? 'view live tracking map' : 'continue verification'}
                </p>
              </GlassSurface>
            </motion.div>
          </FadeReveal>
        )}

        {/* Role Toggle: Passenger ("Find a Ride") vs Traveller ("Share My Commute") */}
        <FadeReveal delay={0.15}>
          <GlassSurface
            style={{
              display: 'flex',
              padding: '4px',
              borderRadius: theme.radiusFull,
              marginBottom: '24px',
              background: 'rgba(255, 248, 229, 0.05)',
            }}
          >
            <motion.button
              onClick={() => setRole('passenger')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: theme.radiusFull,
                background: role === 'passenger' ? theme.gradientPrimary : 'transparent',
                color: role === 'passenger' ? '#FFF8E5' : theme.muted,
                fontWeight: role === 'passenger' ? 800 : 500,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              whileTap={{ scale: 0.97 }}
            >
              🚶 Find a Ride
            </motion.button>

            <motion.button
              onClick={() => setRole('traveller')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: theme.radiusFull,
                background: role === 'traveller' ? theme.gradientPrimary : 'transparent',
                color: role === 'traveller' ? '#FFF8E5' : theme.muted,
                fontWeight: role === 'traveller' ? 800 : 500,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              whileTap={{ scale: 0.97 }}
            >
              🏍️ Share My Commute
            </motion.button>
          </GlassSurface>
        </FadeReveal>

        {/* ROLE EXPERIENCE VIEW */}
        <FadeReveal delay={0.2}>
          {role === 'passenger' ? (
            /* PASSENGER EXPERIENCE */
            <GlassCard
              style={{
                padding: '24px',
                marginBottom: '24px',
                background: 'rgba(255, 248, 229, 0.04)',
                border: `1px solid ${theme.glassBorder}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.primary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Peer-to-Peer Commute
                </span>
                <span style={{ fontSize: '0.75rem', color: theme.muted }}>Velachery → Guindy (Sample)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                <span style={{ fontSize: '2.2rem' }}>🏍️</span>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.cream }}>Find someone going your way</h3>
                  <p style={{ color: theme.muted, fontSize: '0.8125rem' }}>Don't book a commercial cab. Share existing travel costs.</p>
                </div>
              </div>

              {/* Sample cost breakdown */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: theme.radiusMd,
                  background: 'rgba(10, 10, 10, 0.6)',
                  border: `1px solid ${theme.glassBorder}`,
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ color: theme.muted }}>Shared travel contribution:</span>
                  <span style={{ fontWeight: 700, color: theme.cream }}>₹50</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                  <span style={{ color: theme.muted }}>PO → PO platform fee:</span>
                  <span style={{ fontWeight: 700, color: theme.cream }}>₹3</span>
                </div>
                <div style={{ height: '1px', background: theme.glassBorder, margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                  <span style={{ fontWeight: 700, color: theme.cream }}>Total Passenger Cost:</span>
                  <span style={{ fontWeight: 800, color: theme.primary, fontSize: '1.1rem' }}>₹53</span>
                </div>
              </div>

              <GlassButton
                fullWidth
                size="lg"
                onClick={() => navigate('/trip/create', { state: { role: 'passenger' } })}
              >
                🔍 Find a Ride
              </GlassButton>
            </GlassCard>
          ) : (
            /* TRAVELLER EXPERIENCE */
            <GlassCard
              style={{
                padding: '24px',
                marginBottom: '24px',
                background: 'rgba(246, 59, 3, 0.04)',
                border: `1px solid rgba(246, 59, 3, 0.25)`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.primary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Today's Commute
                </span>
                <span style={{ fontSize: '0.75rem', color: theme.muted }}>Velachery → Guindy</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                <span style={{ fontSize: '2.2rem' }}>🏍️</span>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.cream }}>Share My Commute</h3>
                  <p style={{ color: theme.muted, fontSize: '0.8125rem' }}>You're going anyway. Offset your personal fuel expense.</p>
                </div>
              </div>

              {/* Traveller expense calculation card */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: theme.radiusMd,
                  background: 'rgba(10, 10, 10, 0.6)',
                  border: `1px solid ${theme.glassBorder}`,
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ color: theme.muted }}>Estimated fuel expense:</span>
                  <span style={{ fontWeight: 700, color: theme.cream }}>₹100</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ color: theme.muted }}>Available seats:</span>
                  <span style={{ fontWeight: 700, color: theme.cream }}>1 Seat</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                  <span style={{ color: theme.muted }}>Potential fuel contribution:</span>
                  <span style={{ fontWeight: 700, color: theme.primary }}>+₹50</span>
                </div>
                <div style={{ height: '1px', background: theme.glassBorder, margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                  <span style={{ fontWeight: 700, color: theme.cream }}>Effective Personal Expense:</span>
                  <span style={{ fontWeight: 800, color: theme.cream, fontSize: '1.1rem' }}>₹50</span>
                </div>
              </div>

              <GlassButton
                fullWidth
                size="lg"
                onClick={() => navigate('/trip/create', { state: { role: 'driver' } })}
              >
                🚀 Share My Commute
              </GlassButton>
            </GlassCard>
          )}
        </FadeReveal>
      </div>
    </PageTransition>
  );
}
