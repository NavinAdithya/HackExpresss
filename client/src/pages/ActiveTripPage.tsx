/**
 * Active Trip Page — Live tracking with map, SOS button, face verification
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassSurface, GlassButton, GlassPill } from '../glass';
import { PageTransition, FadeReveal, PulseIndicator } from '../animations';
import { useTripStore } from '../stores/tripStore';
import { useAuthStore } from '../stores/authStore';
import { joinTrip, leaveTrip, emitLocation, onLocationUpdate, emitSOSActivate } from '../services/socket';
import { sosAPI, contactAPI } from '../services/api';
import { MapView } from '../map';
import { theme } from '../theme';

export function ActiveTripPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { currentTrip, fetchTrip, updateTripStatus, verifyFace } = useTripStore();
  const [peerLocation, setPeerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [faceStatus, setFaceStatus] = useState<'pending' | 'verifying' | 'verified' | 'both'>('pending');
  const [step, setStep] = useState<'verify' | 'tracking'>('verify');
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (tripId) fetchTrip(tripId);
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;

    joinTrip(tripId);
    const unsub = onLocationUpdate((data) => {
      if (data.userId !== user?._id) {
        setPeerLocation({ lat: data.lat, lng: data.lng });
      }
    });

    return () => {
      leaveTrip(tripId);
      unsub();
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [tripId, user]);

  useEffect(() => {
    if (currentTrip?.status === 'IN_PROGRESS' || currentTrip?.status === 'ACCEPTED') {
      setStep(currentTrip.faceVerificationStatus === 'VERIFIED' ? 'tracking' : 'verify');
    }
    if (currentTrip?.status === 'COMPLETED') {
      navigate(`/trip/${tripId}/complete`, { replace: true });
    }
  }, [currentTrip]);

  const handleFaceVerify = async () => {
    if (!tripId) return;
    setFaceStatus('verifying');
    try {
      const result = await verifyFace(tripId);
      setFaceStatus(result.bothVerified ? 'both' : 'verified');
      if (result.bothVerified) {
        await startTrip();
      }
    } catch {
      setFaceStatus('pending');
    }
  };

  const startTrip = async () => {
    if (!tripId) return;
    try {
      await updateTripStatus(tripId, 'IN_PROGRESS');
      setStep('tracking');
      startLocationTracking();
    } catch { /* handled by store */ }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation || !tripId) return;

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        emitLocation(tripId, pos.coords.latitude, pos.coords.longitude);
      },
      (err) => console.warn('[GEO] Error:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  const handleSOS = async () => {
    if (!tripId) return;
    setSosActive(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await sosAPI.activate(tripId, pos.coords.latitude, pos.coords.longitude);
          emitSOSActivate(tripId, pos.coords.latitude, pos.coords.longitude);
        } catch { /* SOS endpoint failed, but local SOS is active */ }
      },
      () => {
        sosAPI.activate(tripId, 0, 0);
      }
    );
  };

  const handleComplete = async () => {
    if (!tripId) return;
    try {
      await updateTripStatus(tripId, 'COMPLETED');
      navigate(`/trip/${tripId}/complete`, { replace: true });
    } catch { /* handled by store */ }
  };

  const handleShare = async () => {
    if (!tripId) return;
    try {
      const res = await contactAPI.share(tripId);
      alert(`Tracking link shared!\n${res.data.trackingUrl}`);
    } catch { /* handled */ }
  };

  return (
    <PageTransition>
      <div style={{ minHeight: '100vh', position: 'relative' }}>
        {/* Real Leaflet Map with Dark CartoDB Tiles */}
        <div style={{
          height: '60vh',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <MapView
            origin={
              currentTrip?.origin?.location?.coordinates
                ? [currentTrip.origin.location.coordinates[1], currentTrip.origin.location.coordinates[0]]
                : undefined
            }
            destination={
              currentTrip?.destination?.location?.coordinates
                ? [currentTrip.destination.location.coordinates[1], currentTrip.destination.location.coordinates[0]]
                : undefined
            }
            routeGeoJSON={currentTrip?.route ? { type: 'Feature', geometry: currentTrip.route } : undefined}
            liveLocation={peerLocation ? [peerLocation.lat, peerLocation.lng] : null}
            height="100%"
          />

          {/* Live indicator */}
          {step === 'tracking' && (
            <motion.div
              style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)' }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <GlassSurface style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: theme.radiusFull }}>
                <PulseIndicator color={theme.success} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.success }}>LIVE</span>
              </GlassSurface>
            </motion.div>
          )}

          {/* Trip info */}
          {currentTrip && (
            <motion.div
              style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <GlassSurface intensity="strong" style={{ padding: '16px', borderRadius: theme.radiusMd }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {currentTrip.origin?.address} → {currentTrip.destination?.address}
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: theme.muted }}>
                    🛣️ {((currentTrip.routeDistance || 0) / 1000).toFixed(1)} km
                  </span>
                  <span style={{ fontSize: '0.75rem', color: theme.muted }}>
                    ⏱️ {Math.round((currentTrip.routeDuration || 0) / 60)} min
                  </span>
                </div>
              </GlassSurface>
            </motion.div>
          )}
        </div>

        {/* Bottom Panel */}
        <div style={{ padding: '24px 16px' }}>
          <AnimatePresence mode="wait">
            {step === 'verify' ? (
              <motion.div
                key="verify"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <FadeReveal>
                  <GlassSurface style={{ padding: '32px', textAlign: 'center' }}>
                    <p style={{ fontSize: '3rem', marginBottom: '16px' }}>🤳</p>
                    <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '8px' }}>
                      Face Verification
                    </h2>
                    <p style={{ color: theme.muted, fontSize: '0.8125rem', marginBottom: '24px' }}>
                      Both parties must verify before starting the trip
                    </p>

                    {faceStatus === 'verified' && (
                      <GlassPill color={theme.success} className="" >
                        ✓ Your face verified — waiting for partner
                      </GlassPill>
                    )}

                    <GlassButton
                      fullWidth
                      size="lg"
                      loading={faceStatus === 'verifying'}
                      disabled={faceStatus === 'verified' || faceStatus === 'both'}
                      onClick={handleFaceVerify}
                      style={{ marginTop: '16px' }}
                    >
                      {faceStatus === 'pending' ? '📸 Verify My Face' :
                       faceStatus === 'verifying' ? 'Verifying...' :
                       '✓ Verified'}
                    </GlassButton>

                    {/* MOCKED label */}
                    <p style={{ fontSize: '0.625rem', color: theme.muted, marginTop: '12px' }}>
                      MOCKED FOR DEMO: Tap to simulate verification
                    </p>
                  </GlassSurface>
                </FadeReveal>
              </motion.div>
            ) : (
              <motion.div
                key="tracking"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                {/* Share button */}
                <GlassButton variant="secondary" fullWidth onClick={handleShare}>
                  📍 Share Trip with Contacts
                </GlassButton>

                {/* Complete button */}
                <GlassButton fullWidth size="lg" onClick={handleComplete}>
                  ✓ Complete Trip
                </GlassButton>

                {/* SOS */}
                <motion.div style={{ marginTop: '8px' }}>
                  <GlassButton
                    variant="danger"
                    fullWidth
                    size="lg"
                    onClick={handleSOS}
                    disabled={sosActive}
                    style={{
                      background: sosActive ? '#660020' : theme.danger,
                      boxShadow: sosActive ? `0 0 30px ${theme.danger}60` : 'none',
                    }}
                  >
                    {sosActive ? '🚨 SOS ACTIVE — Help is on the way' : '🆘 Emergency SOS'}
                  </GlassButton>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}
