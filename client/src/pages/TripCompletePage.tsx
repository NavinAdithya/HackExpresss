/**
 * Trip Complete Page — PO → PO Shared Commute Summary & Impact
 *
 * Implements:
 * - Transparent Shared Travel Expense breakdown
 * - Separate PO → PO Platform Fee
 * - Environmental impact estimates (potential trips avoided, estimated emissions impact)
 * - Trust rating (5 parameters, 1–10) for the other participant
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassSurface, GlassCard, GlassButton } from '../glass';
import { PageTransition, FadeReveal } from '../animations';
import { useTripStore } from '../stores/tripStore';
import { TrustRatingForm } from '../components/TrustRatingForm';
import { theme } from '../theme';

export function TripCompletePage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { currentTrip, fareBreakdown, fetchTrip } = useTripStore();

  useEffect(() => {
    if (tripId) fetchTrip(tripId);
  }, [tripId]);

  const sharedExpense = fareBreakdown?.poolFare || 50;
  const platformFee = 3.0;
  const totalCost = sharedExpense + platformFee;
  const distance = fareBreakdown?.distanceKm || 8.4;

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px 80px 16px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <FadeReveal>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10, delay: 0.15 }}
            style={{ fontSize: '3.5rem', marginBottom: '12px', marginTop: '16px' }}
          >
            🎉
          </motion.div>
          <h1
            style={{
              fontWeight: 800,
              fontSize: '1.8rem',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
              color: theme.cream,
            }}
          >
            Commute Complete!
          </h1>
          <p style={{ color: theme.muted, fontSize: '0.875rem', marginBottom: '28px' }}>
            {currentTrip?.origin?.address || 'Velachery'} → {currentTrip?.destination?.address || 'Guindy'}
          </p>
        </FadeReveal>

        {/* Transparent Cost Sharing Card */}
        <FadeReveal delay={0.2}>
          <GlassCard style={{ textAlign: 'left', marginBottom: '24px' }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: theme.primary,
                marginBottom: '16px',
              }}
            >
              P2P Shared Travel Expense
            </h3>

            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: theme.cream,
                marginBottom: '18px',
                fontFeatureSettings: "'tnum' on",
              }}
            >
              ₹{totalCost.toFixed(0)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: theme.muted }}>Route Distance:</span>
                <span style={{ fontWeight: 600, color: theme.cream }}>{distance} km</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: theme.muted }}>Total Vehicle Fuel Cost:</span>
                <span style={{ fontWeight: 600, color: theme.cream }}>₹{(distance * 8).toFixed(0)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: theme.muted }}>Shared Cost Per Person (÷ 2 occupants):</span>
                <span style={{ fontWeight: 700, color: theme.cream }}>₹{sharedExpense.toFixed(0)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: theme.muted }}>PO → PO Platform Service Fee:</span>
                <span style={{ fontWeight: 700, color: theme.primary }}>₹{platformFee.toFixed(0)}</span>
              </div>

              <div style={{ height: '1px', background: theme.glassBorder, margin: '6px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                <span style={{ fontWeight: 800, color: theme.cream }}>Total Contribution:</span>
                <span style={{ fontWeight: 800, color: theme.primary, fontSize: '1.2rem' }}>₹{totalCost.toFixed(0)}</span>
              </div>
            </div>
          </GlassCard>
        </FadeReveal>

        {/* Estimated Community Impact (Section 112) */}
        <FadeReveal delay={0.25}>
          <GlassCard style={{ textAlign: 'left', marginBottom: '24px', background: 'rgba(255, 248, 229, 0.03)' }}>
            <h4
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: theme.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '12px',
              }}
            >
              Estimated Commute Impact
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', borderRadius: theme.radiusMd, background: 'rgba(10, 10, 10, 0.5)' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.cream }}>1</span>
                <p style={{ fontSize: '0.75rem', color: theme.muted, marginTop: '2px' }}>
                  Potential separate trip avoided
                </p>
              </div>

              <div style={{ padding: '12px', borderRadius: theme.radiusMd, background: 'rgba(10, 10, 10, 0.5)' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.primary }}>
                  ~{(distance * 0.12).toFixed(1)} kg
                </span>
                <p style={{ fontSize: '0.75rem', color: theme.muted, marginTop: '2px' }}>
                  Estimated emissions reduction
                </p>
              </div>
            </div>
            <p style={{ fontSize: '0.6875rem', color: theme.muted, marginTop: '10px', fontStyle: 'italic' }}>
              *Environmental claims represent potential estimates based on shared occupancy.
            </p>
          </GlassCard>
        </FadeReveal>

        {/* Trust rating — five parameters (1–10); server verifies participation & completion */}
        {tripId && (
          <FadeReveal delay={0.3}>
            <TrustRatingForm tripId={tripId} />
          </FadeReveal>
        )}

        <GlassButton variant="ghost" fullWidth onClick={() => navigate('/')}>
          Return to Commute Hub →
        </GlassButton>
      </div>
    </PageTransition>
  );
}
