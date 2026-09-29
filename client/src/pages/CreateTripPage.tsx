/**
 * Create Trip Page — Trip posting form with location inputs
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassSurface, GlassButton, GlassInput } from '../glass';
import { PageTransition, FadeReveal } from '../animations';
import { useTripStore } from '../stores/tripStore';
import { useAuthStore } from '../stores/authStore';
import { MapView } from '../map';
import { theme } from '../theme';

// Chennai landmarks for quick selection
const LANDMARKS = [
  { name: 'Guindy', lat: 13.0067, lng: 80.2206 },
  { name: 'T. Nagar', lat: 13.0418, lng: 80.2341 },
  { name: 'Velachery', lat: 12.9815, lng: 80.2180 },
  { name: 'Adyar', lat: 13.0012, lng: 80.2565 },
  { name: 'Anna Nagar', lat: 13.0850, lng: 80.2101 },
  { name: 'OMR', lat: 12.9400, lng: 80.2340 },
  { name: 'Besant Nagar', lat: 13.0002, lng: 80.2668 },
  { name: 'Mylapore', lat: 13.0368, lng: 80.2676 },
  { name: 'Tambaram', lat: 12.9249, lng: 80.1000 },
  { name: 'Kodambakkam', lat: 13.0525, lng: 80.2248 },
];

export function CreateTripPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { createTrip, loading, error } = useTripStore();

  const [role, setRole] = useState<'passenger' | 'driver'>(
    (location.state as any)?.role || 'passenger'
  );
  const [origin, setOrigin] = useState('');
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [departureTime, setDepartureTime] = useState(
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [seats, setSeats] = useState(role === 'driver' ? 3 : 1);
  const [budgetMin, setBudgetMin] = useState(20);
  const [budgetMax, setBudgetMax] = useState(80);
  const [verifiedOnly, setVerifiedOnly] = useState(user?.verifiedOnly || false);
  const [womenOnly, setWomenOnly] = useState(user?.womenOnly || false);

  const selectLandmark = (type: 'origin' | 'dest', l: typeof LANDMARKS[0]) => {
    if (type === 'origin') {
      setOrigin(l.name);
      setOriginCoords([l.lng, l.lat]);
    } else {
      setDestination(l.name);
      setDestCoords([l.lng, l.lat]);
    }
  };

  const handleCreate = async () => {
    if (!originCoords || !destCoords) return;

    try {
      const trip = await createTrip({
        role,
        origin: { address: origin, coordinates: originCoords },
        destination: { address: destination, coordinates: destCoords },
        departureTime: new Date(departureTime).toISOString(),
        timeWindow: 30,
        seatCount: seats,
        budgetMin,
        budgetMax,
        verifiedOnly,
        womenOnly,
      });

      navigate(`/matches/${trip._id}`);
    } catch { /* error shown via store */ }
  };

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px 60px 16px', maxWidth: '600px', margin: '0 auto' }}>
        <FadeReveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <motion.button
              onClick={() => navigate(-1)}
              whileTap={{ scale: 0.9 }}
              style={{ fontSize: '1.25rem', color: theme.muted }}
            >
              ←
            </motion.button>
            <h1 style={{ fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
              {role === 'passenger' ? 'Find a Ride' : 'Post a Ride'}
            </h1>
          </div>
        </FadeReveal>

        {/* Role Selector */}
        <FadeReveal delay={0.05}>
          <GlassSurface style={{ display: 'flex', padding: '4px', borderRadius: theme.radiusFull, marginBottom: '24px' }}>
            {(['passenger', 'driver'] as const).map((r) => (
              <motion.button
                key={r}
                onClick={() => { setRole(r); setSeats(r === 'driver' ? 3 : 1); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: theme.radiusFull,
                  background: role === r ? theme.gradientPrimary : 'transparent',
                  color: role === r ? '#000' : theme.muted,
                  fontWeight: role === r ? 700 : 500, fontSize: '0.875rem',
                  border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}
                whileTap={{ scale: 0.97 }}
              >
                {r === 'passenger' ? '🚶 Passenger' : '🚗 Driver'}
              </motion.button>
            ))}
          </GlassSurface>
        </FadeReveal>

        {/* Origin */}
        <FadeReveal delay={0.1}>
          <GlassInput
            label="From"
            placeholder="Select origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            style={{ marginBottom: '8px' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
            {LANDMARKS.slice(0, 5).map((l) => (
              <motion.button
                key={l.name}
                onClick={() => selectLandmark('origin', l)}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '6px 12px', borderRadius: theme.radiusFull,
                  background: origin === l.name ? `${theme.primary}20` : theme.surface,
                  border: `1px solid ${origin === l.name ? theme.primary : theme.glassBorder}`,
                  color: origin === l.name ? theme.primary : theme.mutedLight,
                  fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                📍 {l.name}
              </motion.button>
            ))}
          </div>
        </FadeReveal>

        {/* Destination */}
        <FadeReveal delay={0.15}>
          <GlassInput
            label="To"
            placeholder="Select destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            style={{ marginBottom: '8px' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
            {LANDMARKS.slice(5).map((l) => (
              <motion.button
                key={l.name}
                onClick={() => selectLandmark('dest', l)}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '6px 12px', borderRadius: theme.radiusFull,
                  background: destination === l.name ? `${theme.secondary}20` : theme.surface,
                  border: `1px solid ${destination === l.name ? theme.secondary : theme.glassBorder}`,
                  color: destination === l.name ? theme.secondary : theme.mutedLight,
                  fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                🎯 {l.name}
              </motion.button>
            ))}
          </div>
        </FadeReveal>

        {/* Departure Time */}
        <FadeReveal delay={0.2}>
          <GlassInput
            label="Departure Time"
            type="datetime-local"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            style={{ marginBottom: '20px', colorScheme: 'dark' }}
          />
        </FadeReveal>

        {/* Seats & Budget */}
        <FadeReveal delay={0.25}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <GlassInput
              label={role === 'driver' ? 'Seats' : 'Needed'}
              type="number"
              min={1}
              max={role === 'driver' ? 4 : 3}
              value={seats}
              onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
            />
            <GlassInput
              label="Min ₹"
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(parseInt(e.target.value) || 0)}
            />
            <GlassInput
              label="Max ₹"
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(parseInt(e.target.value) || 100)}
            />
          </div>
        </FadeReveal>

        {/* Safety Filters */}
        <FadeReveal delay={0.3}>
          <GlassSurface style={{ padding: '16px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme.muted }}>
              Safety Filters
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                style={{ accentColor: theme.primary, width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '0.875rem', color: theme.foreground }}>
                🛡️ Verified riders only
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={womenOnly}
                onChange={(e) => setWomenOnly(e.target.checked)}
                style={{ accentColor: theme.secondary, width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '0.875rem', color: theme.foreground }}>
                👩 Women-only pool
              </span>
            </label>
          </GlassSurface>
        </FadeReveal>

        {/* Route Preview Map */}
        {originCoords && destCoords && (
          <FadeReveal delay={0.32}>
            <div style={{ height: '180px', marginBottom: '20px', borderRadius: theme.radiusLg, overflow: 'hidden' }}>
              <MapView
                origin={[originCoords[1], originCoords[0]]}
                destination={[destCoords[1], destCoords[0]]}
                interactive={false}
                height="100%"
              />
            </div>
          </FadeReveal>
        )}

        {error && (
          <div style={{
            padding: '12px 16px',
            borderRadius: theme.radiusMd,
            background: 'rgba(255, 59, 92, 0.12)',
            border: '1px solid rgba(255, 59, 92, 0.3)',
            color: '#ff6b81',
            fontSize: '0.8125rem',
            marginBottom: '16px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <FadeReveal delay={0.35}>
          <GlassButton
            onClick={handleCreate}
            loading={loading}
            disabled={!originCoords || !destCoords}
            fullWidth
            size="lg"
          >
            {role === 'passenger' ? '🔍 Find Rides' : '📢 Post Ride'}
          </GlassButton>
        </FadeReveal>
      </div>
    </PageTransition>
  );
}
