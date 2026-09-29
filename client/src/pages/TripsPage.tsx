/**
 * Trips Page — Trip history list
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassSurface, GlassButton, GlassPill } from '../glass';
import { PageTransition, FadeReveal, StaggerContainer, StaggerItem } from '../animations';
import { useTripStore } from '../stores/tripStore';
import { theme } from '../theme';

const statusColors: Record<string, string> = {
  POSTED: theme.primary,
  MATCHED: theme.secondary,
  ACCEPTED: theme.accent,
  VERIFYING: theme.warning,
  IN_PROGRESS: theme.success,
  COMPLETED: theme.success,
  CANCELLED: theme.danger,
  NO_SHOW: theme.danger,
};

export function TripsPage() {
  const navigate = useNavigate();
  const { trips, fetchTrips, loading } = useTripStore();

  useEffect(() => {
    fetchTrips({ limit: '50' });
  }, []);

  const safeTrips = Array.isArray(trips) ? trips : [];

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px', maxWidth: '600px', margin: '0 auto' }}>
        <FadeReveal>
          <h1 style={{
            fontWeight: 700,
            fontSize: '1.5rem',
            letterSpacing: '-0.02em',
            marginBottom: '24px',
          }}>
            My Trips
          </h1>
        </FadeReveal>

        {safeTrips.length === 0 && !loading ? (
          <FadeReveal>
            <GlassSurface style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🛣️</p>
              <p style={{ fontWeight: 600, marginBottom: '8px' }}>No trips yet</p>
              <p style={{ color: theme.muted, fontSize: '0.8125rem', marginBottom: '20px' }}>
                Start your first ride to see it here
              </p>
              <GlassButton onClick={() => navigate('/trip/create')}>
                Create Trip
              </GlassButton>
            </GlassSurface>
          </FadeReveal>
        ) : (
          <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {safeTrips.map((trip) => (
              <StaggerItem key={trip._id}>
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (trip.status === 'POSTED') navigate(`/matches/${trip._id}`);
                    else if (['ACCEPTED', 'VERIFYING', 'IN_PROGRESS'].includes(trip.status)) navigate(`/trip/${trip._id}/active`);
                    else if (trip.status === 'COMPLETED') navigate(`/trip/${trip._id}/complete`);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <GlassSurface style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <GlassPill color={statusColors[trip.status] || theme.muted}>
                          {trip.status}
                        </GlassPill>
                        <GlassPill color={trip.role === 'driver' ? theme.primary : theme.secondary}>
                          {trip.role}
                        </GlassPill>
                      </div>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: '8px' }}>
                        {trip.origin?.address} → {trip.destination?.address}
                      </p>
                      <p style={{ color: theme.muted, fontSize: '0.75rem', marginTop: '4px' }}>
                        {new Date(trip.departureTime).toLocaleDateString('en', {
                          weekday: 'short', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {trip.fare && (
                      <span style={{
                        fontWeight: 700,
                        fontSize: '1.125rem',
                        color: theme.primary,
                        fontFeatureSettings: "'tnum' on",
                      }}>
                        ₹{trip.fare}
                      </span>
                    )}
                  </GlassSurface>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </PageTransition>
  );
}
