/**
 * Trip Complete Page — Rating + fare breakdown + impact
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassSurface, GlassCard, GlassButton } from '../glass';
import { PageTransition, FadeReveal, ScaleReveal, AnimatedNumber } from '../animations';
import { useTripStore } from '../stores/tripStore';
import { ratingAPI } from '../services/api';
import { theme } from '../theme';

export function TripCompletePage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { currentTrip, fareBreakdown, fetchTrip } = useTripStore();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tripId) fetchTrip(tripId);
  }, [tripId]);

  const handleSubmitRating = async () => {
    if (!tripId || !rating) return;
    setLoading(true);
    try {
      await ratingAPI.submit(tripId, rating, comment);
      setSubmitted(true);
    } catch { /* handled */ }
    setLoading(false);
  };

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        {/* Celebration */}
        <FadeReveal>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10, delay: 0.2 }}
            style={{ fontSize: '4rem', marginBottom: '16px', marginTop: '24px' }}
          >
            🎉
          </motion.div>
          <h1 style={{
            fontWeight: 700,
            fontSize: '2rem',
            letterSpacing: '-0.02em',
            marginBottom: '8px',
          }}>
            Trip Complete!
          </h1>
          <p style={{ color: theme.muted, fontSize: '0.875rem', marginBottom: '32px' }}>
            {currentTrip?.origin?.address} → {currentTrip?.destination?.address}
          </p>
        </FadeReveal>

        {/* Fare Breakdown */}
        {fareBreakdown && (
          <FadeReveal delay={0.2}>
            <GlassCard style={{ textAlign: 'left', marginBottom: '24px' }}>
              <h3 style={{
                fontWeight: 600,
                fontSize: '0.6875rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: theme.muted,
                marginBottom: '16px',
              }}>
                Fare Breakdown
              </h3>

              <div style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                background: theme.gradientPrimary,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '20px',
                fontFeatureSettings: "'tnum' on",
              }}>
                ₹{fareBreakdown.poolFare.toFixed(0)}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Distance', value: `${fareBreakdown.distanceKm} km` },
                  { label: 'Fuel Cost', value: `₹${fareBreakdown.fuelCost}` },
                  { label: 'Tolls', value: `₹${fareBreakdown.tolls}` },
                  { label: 'Pool Split', value: `÷ ${fareBreakdown.totalOccupants} people` },
                  { label: 'Commission', value: `−₹${fareBreakdown.commission}`, color: theme.muted },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: theme.muted }}>{item.label}</span>
                    <span style={{ fontWeight: 600, color: item.color || theme.foreground, fontFeatureSettings: "'tnum' on" }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: `${theme.primary}08`,
                borderRadius: theme.radiusSm,
                border: `1px solid ${theme.primary}15`,
              }}>
                <p style={{ fontSize: '0.6875rem', color: theme.muted, fontFamily: 'monospace' }}>
                  {fareBreakdown.formula}
                </p>
              </div>
            </GlassCard>
          </FadeReveal>
        )}

        {/* Impact */}
        <FadeReveal delay={0.3}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <GlassSurface style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: theme.success }}>
                🌱 {((currentTrip?.routeDistance || 0) / 1000 * 0.06).toFixed(1)} kg
              </p>
              <p style={{ fontSize: '0.625rem', color: theme.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '4px' }}>
                CO₂ saved
              </p>
            </GlassSurface>
            <GlassSurface style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: theme.primary }}>
                💰 ₹{(fareBreakdown?.fuelCost || 0 - (fareBreakdown?.poolFare || 0)).toFixed(0)}
              </p>
              <p style={{ fontSize: '0.625rem', color: theme.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '4px' }}>
                Amount saved
              </p>
            </GlassSurface>
          </div>
        </FadeReveal>

        {/* Rating */}
        <FadeReveal delay={0.4}>
          {!submitted ? (
            <GlassCard style={{ textAlign: 'center' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '16px' }}>
                Rate your experience
              </h3>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    onClick={() => setRating(star)}
                    whileTap={{ scale: 0.8 }}
                    whileHover={{ scale: 1.2 }}
                    style={{
                      fontSize: '2rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      filter: star <= rating ? 'none' : 'grayscale(1) opacity(0.3)',
                      transition: 'all 0.2s',
                    }}
                  >
                    ⭐
                  </motion.button>
                ))}
              </div>

              <textarea
                placeholder="Share your experience (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: theme.radiusMd,
                  background: theme.surface,
                  border: `1px solid ${theme.glassBorder}`,
                  color: theme.foreground,
                  fontSize: '0.875rem',
                  fontFamily: "'Inter', sans-serif",
                  resize: 'none',
                  outline: 'none',
                  marginBottom: '16px',
                }}
              />

              <GlassButton
                fullWidth
                onClick={handleSubmitRating}
                loading={loading}
                disabled={!rating}
              >
                Submit Rating
              </GlassButton>
            </GlassCard>
          ) : (
            <ScaleReveal>
              <GlassSurface style={{ padding: '32px', textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', marginBottom: '8px' }}>💚</p>
                <p style={{ fontWeight: 600 }}>Thanks for rating!</p>
              </GlassSurface>
            </ScaleReveal>
          )}
        </FadeReveal>

        <FadeReveal delay={0.5}>
          <GlassButton
            variant="ghost"
            fullWidth
            onClick={() => navigate('/')}
            style={{ marginTop: '24px' }}
          >
            Back to Home
          </GlassButton>
        </FadeReveal>
      </div>
    </PageTransition>
  );
}
