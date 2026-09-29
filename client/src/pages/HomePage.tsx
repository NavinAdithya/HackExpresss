/**
 * Home Page — Personalized for passenger/driver role
 * Shows primary CTA, upcoming trip, and relevant content
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from '../components/Logo';
import { GlassSurface, GlassCard, GlassButton, GlassPill, PlanBadge } from '../glass';
import { PageTransition, FadeReveal, StaggerContainer, StaggerItem, PulseIndicator } from '../animations';
import { useAuthStore } from '../stores/authStore';
import { useTripStore } from '../stores/tripStore';
import { POHeroScene } from '../3d';
import { theme } from '../theme';
import type { Trip } from '../types';

export function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { trips = [], fetchTrips } = useTripStore();
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');

  useEffect(() => {
    fetchTrips({ limit: '5' });
  }, []);

  const safeTrips = Array.isArray(trips) ? trips : [];
  const activeTrip = safeTrips.find((t) => ['ACCEPTED', 'VERIFYING', 'IN_PROGRESS'].includes(t.status));
  const upcomingTrips = safeTrips.filter((t) => t.status === 'POSTED').slice(0, 3);

  if (!user) return null;

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px', maxWidth: '600px', margin: '0 auto' }}>
        {/* Header */}
        <FadeReveal>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
            <div>
              <p style={{ color: theme.muted, fontSize: '0.8125rem', marginBottom: '4px' }}>Welcome back</p>
              <h1 style={{
                fontWeight: 700,
                fontSize: '1.75rem',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                {user.name}
                <PlanBadge plan={user.plan} />
              </h1>
            </div>
            <Logo size="sm" />
          </div>
        </FadeReveal>

        {/* 3D Dynamic Mobility Scene */}
        <FadeReveal delay={0.08}>
          <div style={{ marginBottom: '24px' }}>
            <POHeroScene height="180px" />
          </div>
        </FadeReveal>

        {/* Active Trip Banner */}
        {activeTrip && (
          <FadeReveal delay={0.1}>
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(
                activeTrip.status === 'IN_PROGRESS'
                  ? `/trip/${activeTrip._id}/active`
                  : `/matches/${activeTrip._id}`
              )}
            >
              <GlassSurface
                intensity="strong"
                glow
                style={{
                  padding: '20px',
                  marginBottom: '24px',
                  cursor: 'pointer',
                  borderColor: `${theme.primary}40`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <PulseIndicator color={theme.success} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme.success }}>
                    {activeTrip.status === 'IN_PROGRESS' ? 'LIVE TRIP' : activeTrip.status}
                  </span>
                </div>
                <p style={{ fontWeight: 600, fontSize: '1rem' }}>
                  {activeTrip.origin?.address} → {activeTrip.destination?.address}
                </p>
                <p style={{ color: theme.muted, fontSize: '0.8125rem', marginTop: '4px' }}>
                  Tap to {activeTrip.status === 'IN_PROGRESS' ? 'view live map' : 'continue'}
                </p>
              </GlassSurface>
            </motion.div>
          </FadeReveal>
        )}

        {/* Role Toggle */}
        <FadeReveal delay={0.15}>
          <GlassSurface style={{
            display: 'flex',
            padding: '4px',
            borderRadius: theme.radiusFull,
            marginBottom: '28px',
          }}>
            {(['passenger', 'driver'] as const).map((r) => (
              <motion.button
                key={r}
                onClick={() => setRole(r)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: theme.radiusFull,
                  background: role === r ? theme.gradientPrimary : 'transparent',
                  color: role === r ? '#000' : theme.muted,
                  fontWeight: role === r ? 700 : 500,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'all 0.2s',
                }}
                whileTap={{ scale: 0.97 }}
              >
                {r === 'passenger' ? '🚶 Passenger' : '🚗 Driver'}
              </motion.button>
            ))}
          </GlassSurface>
        </FadeReveal>

        {/* Primary CTA */}
        <FadeReveal delay={0.2}>
          <GlassCard
            style={{
              textAlign: 'center',
              padding: '40px 24px',
              marginBottom: '28px',
              background: `linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(123,97,255,0.06) 100%)`,
            }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              style={{ fontSize: '3rem', marginBottom: '16px' }}
            >
              {role === 'passenger' ? '🎯' : '🛣️'}
            </motion.div>
            <h2 style={{
              fontWeight: 700,
              fontSize: '1.5rem',
              letterSpacing: '-0.02em',
              marginBottom: '8px',
            }}>
              {role === 'passenger' ? 'Find a Ride' : 'Offer a Ride'}
            </h2>
            <p style={{ color: theme.muted, fontSize: '0.875rem', marginBottom: '24px' }}>
              {role === 'passenger'
                ? 'Search for drivers along your route'
                : 'Share your ride and split costs'}
            </p>
            <GlassButton
              size="lg"
              onClick={() => navigate('/trip/create', { state: { role } })}
              style={{ minWidth: '200px' }}
            >
              {role === 'passenger' ? 'Search Rides' : 'Post Ride'}
            </GlassButton>
          </GlassCard>
        </FadeReveal>

        {/* Quick Stats */}
        <FadeReveal delay={0.25}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
            {[
              { label: 'Trust', value: user.trustScore, suffix: '%', color: theme.success },
              { label: 'Rides', value: trips.filter(t => t.status === 'COMPLETED').length, color: theme.primary },
              { label: 'Saved', value: `₹${trips.filter(t => t.fare).reduce((s, t) => s + (t.fare || 0), 0).toFixed(0)}`, color: theme.accent },
            ].map((stat) => (
              <GlassSurface
                key={stat.label}
                style={{ padding: '16px', textAlign: 'center', borderRadius: theme.radiusMd }}
              >
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: stat.color,
                  fontFeatureSettings: "'tnum' on",
                }}>
                  {stat.value}{stat.suffix || ''}
                </p>
                <p style={{ fontSize: '0.625rem', color: theme.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '4px' }}>
                  {stat.label}
                </p>
              </GlassSurface>
            ))}
          </div>
        </FadeReveal>

        {/* Recent/Upcoming Trips */}
        {upcomingTrips.length > 0 && (
          <FadeReveal delay={0.3}>
            <h3 style={{ fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: theme.muted, marginBottom: '12px' }}>
              Upcoming
            </h3>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingTrips.map((trip) => (
                <StaggerItem key={trip._id}>
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/matches/${trip._id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <GlassSurface style={{
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {trip.origin?.address} → {trip.destination?.address}
                        </p>
                        <p style={{ color: theme.muted, fontSize: '0.75rem', marginTop: '4px' }}>
                          {new Date(trip.departureTime).toLocaleDateString('en', {
                            weekday: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <GlassPill color={trip.role === 'driver' ? theme.primary : theme.secondary}>
                        {trip.role}
                      </GlassPill>
                    </GlassSurface>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </FadeReveal>
        )}
      </div>
    </PageTransition>
  );
}
