/**
 * Tracking Page — Public trip tracking via shared link (no auth required)
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassSurface, GlassPill } from '../glass';
import { PageTransition, FadeReveal, PulseIndicator } from '../animations';
import { Logo } from '../components/Logo';
import { trackingAPI } from '../services/api';
import { MapView } from '../map';
import { theme } from '../theme';

export function TrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [trip, setTrip] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetch = async () => {
      try {
        const res = await trackingAPI.get(token);
        setTrip(res.data.trip);
        setLocation(res.data.location);
      } catch {
        setError('Tracking link not found or expired.');
      }
      setLoading(false);
    };
    fetch();

    // Poll every 10 seconds
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <PageTransition>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <Logo size="md" showTagline />

        <div style={{ marginTop: '32px', width: '100%', maxWidth: '400px' }}>
          {loading ? (
            <GlassSurface style={{ padding: '32px', textAlign: 'center' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                style={{ fontSize: '2rem', display: 'inline-block', marginBottom: '16px' }}
              >
                📍
              </motion.div>
              <p>Loading trip...</p>
            </GlassSurface>
          ) : error ? (
            <GlassSurface style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: '2rem', marginBottom: '16px' }}>❌</p>
              <p style={{ color: theme.danger }}>{error}</p>
            </GlassSurface>
          ) : trip && (
            <FadeReveal>
              <GlassSurface style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <PulseIndicator color={trip.status === 'IN_PROGRESS' ? theme.success : theme.warning} />
                  <GlassPill color={trip.status === 'IN_PROGRESS' ? theme.success : theme.warning}>
                    {trip.status}
                  </GlassPill>
                </div>

                <h2 style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '8px' }}>
                  {trip.origin?.address} → {trip.destination?.address}
                </h2>

                <p style={{ color: theme.muted, fontSize: '0.8125rem', marginBottom: '16px' }}>
                  Departure: {new Date(trip.departureTime).toLocaleString()}
                </p>

                <div style={{ height: '240px', marginBottom: '16px' }}>
                  <MapView
                    origin={
                      trip.origin?.location?.coordinates
                        ? [trip.origin.location.coordinates[1], trip.origin.location.coordinates[0]]
                        : undefined
                    }
                    destination={
                      trip.destination?.location?.coordinates
                        ? [trip.destination.location.coordinates[1], trip.destination.location.coordinates[0]]
                        : undefined
                    }
                    routeGeoJSON={trip.route ? { type: 'Feature', geometry: trip.route } : undefined}
                    liveLocation={location ? [location.lat, location.lng] : null}
                    height="100%"
                  />
                </div>

                {location && (
                  <GlassSurface style={{ padding: '16px', marginTop: '12px', background: `${theme.success}08` }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.success, marginBottom: '4px' }}>
                      📍 Last Location Update
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: theme.mutedLight }}>
                      Lat: {location.lat?.toFixed(4)}, Lng: {location.lng?.toFixed(4)}
                    </p>
                    <p style={{ fontSize: '0.6875rem', color: theme.muted, marginTop: '4px' }}>
                      {new Date(location.timestamp).toLocaleTimeString()}
                    </p>
                  </GlassSurface>
                )}

                {trip.user && (
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: theme.gradientPrimary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700,
                    }}>
                      {trip.user.name?.[0]}
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{trip.user.name}</span>
                  </div>
                )}
              </GlassSurface>
            </FadeReveal>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
