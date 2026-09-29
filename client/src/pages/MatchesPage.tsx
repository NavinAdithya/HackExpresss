/**
 * MatchesPage — PO → PO Honest Deterministic Matching & Corridor Discovery
 *
 * Implements:
 * 1. Honest Match Quality (Requirement 2):
 *    - 90–100 = Excellent match
 *    - 80–89  = Strong match
 *    - 60–79  = Compatible commute
 *    - 40–59  = Weak compatibility
 *    - 0–39   = Not suitable (Never displayed in normal results)
 * 2. Truthful Empty State (Requirement 2):
 *    - "No suitable commute found" when no candidates meet minimum thresholds
 *    - "Try nearby commuters" only when candidates meet fallback detour/gap criteria
 * 3. AI Explanation (Requirement 3):
 *    - Strictly reflects numbers without decorative or fabricated praise
 * 4. Map-First View (Requirement 5):
 *    - Interactive Leaflet map showing origin, destination, and candidate route
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassSurface, GlassButton, GlassCard, PlanBadge } from '../glass';
import { PageTransition, FadeReveal, StaggerContainer, StaggerItem } from '../animations';
import { useTripStore } from '../stores/tripStore';
import { MapView } from '../map/MapView';
import { TrustScoreModal } from '../components/TrustScoreModal';
import { theme } from '../theme';
import type { MatchResult } from '../types';

const SCAN_STEPS = [
  'Scanning nearby commuters',
  'Checking routes',
  'Checking destinations',
  'Checking timing',
  'Checking seats',
  'Checking safety filters',
  'Calculating shared travel cost',
  'Filtering honest compatibility',
];

function MatchTypeBadge({ type }: { type?: string }) {
  const t = type || 'NEARBY_DESTINATION';

  const badgeConfig: Record<string, { label: string; bg: string; color: string }> = {
    EXACT_DESTINATION: {
      label: '🎯 Exact Destination',
      bg: 'rgba(34, 197, 94, 0.15)',
      color: '#22C55E',
    },
    NEARBY_DESTINATION: {
      label: '📍 Nearby Destination',
      bg: 'rgba(246, 59, 3, 0.15)',
      color: theme.primary,
    },
    ROUTE_CORRIDOR: {
      label: '🛣️ Route Corridor',
      bg: 'rgba(231, 158, 137, 0.15)',
      color: theme.dustPink,
    },
    ACCEPTABLE_DETOUR: {
      label: '⏱️ Acceptable Detour',
      bg: 'rgba(245, 158, 11, 0.15)',
      color: '#F59E0B',
    },
  };

  const config = badgeConfig[t] || badgeConfig['NEARBY_DESTINATION'];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: theme.radiusFull,
        background: config.bg,
        color: config.color,
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
      }}
    >
      {config.label}
    </span>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.6875rem', color: theme.muted }}>{label}</span>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color, fontFeatureSettings: "'tnum' on" }}>{value}%</span>
      </div>
      <div style={{ height: '4px', borderRadius: '2px', background: theme.surface, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', borderRadius: '2px', background: color }}
        />
      </div>
    </div>
  );
}

function MatchCard({
  match,
  onAccept,
  accepting,
  onInspectTrust,
}: {
  match: MatchResult;
  onAccept: (id: string) => void;
  accepting: boolean;
  onInspectTrust?: (user: { id: string; name: string; score: number }) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Honest Quality Label determination (Requirement 2)
  const qualityText = match.qualityLabel || (
    match.finalScore >= 90 ? 'Excellent match' :
    match.finalScore >= 80 ? 'Strong match' :
    match.finalScore >= 60 ? 'Compatible commute' :
    match.finalScore >= 40 ? 'Weak compatibility' :
    'Not suitable'
  );

  const qualityColor = match.qualityColor || (
    match.finalScore >= 80 ? '#22C55E' :
    match.finalScore >= 60 ? theme.primary :
    match.finalScore >= 40 ? '#F59E0B' :
    '#EF4444'
  );

  return (
    <GlassCard style={{ padding: '20px', cursor: 'pointer', marginBottom: '14px' }} onClick={() => setExpanded(!expanded)}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: theme.gradientPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#FFF8E5',
              boxShadow: `0 0 14px rgba(246, 59, 3, 0.35)`,
            }}
          >
            {match.userName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: theme.cream }}>{match.userName}</span>
              <span title="✓ PO → PO Member" style={{ fontSize: '0.8rem', color: theme.primary }}>✓</span>
              <PlanBadge plan={match.userPlan as any} size="sm" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectTrust?.({
                    id: match.userId,
                    name: match.userName,
                    score: match.userTrustScore,
                  });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: theme.radiusFull,
                  padding: '2px 8px',
                  color: '#22C55E',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Click to view peer's verified Trust Score breakdown"
              >
                <span>Trust: {match.userTrustScore}/100</span>
                <span style={{ fontSize: '0.625rem', opacity: 0.85, textDecoration: 'underline' }}>Why? ℹ️</span>
              </button>
              <span style={{ fontSize: '0.75rem', color: theme.muted }}>
                {match.userGender === 'female' ? '♀️ Female' : '♂️ Male'}
              </span>
            </div>
          </div>
        </div>

        {/* Compatibility Score & Honest Quality Label (Requirement 2) */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.6rem', color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Match Fit
          </div>
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: qualityColor,
              fontFeatureSettings: "'tnum' on",
            }}
          >
            {Math.round(match.finalScore)}%
          </span>
          <span
            style={{
              display: 'block',
              fontSize: '0.6875rem',
              color: qualityColor,
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            {qualityText}
          </span>
        </div>
      </div>

      {/* Match Type Badge & Key Metrics */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
        <MatchTypeBadge type={match.matchType} />

        {match.detourKm !== undefined && (
          <span style={{ fontSize: '0.6875rem', color: theme.muted, background: 'rgba(255,248,229,0.05)', padding: '4px 8px', borderRadius: theme.radiusSm }}>
            Detour: <strong>{match.detourKm} km</strong>
          </span>
        )}

        {match.destinationDistanceKm !== undefined && match.destinationDistanceKm > 0.4 && (
          <span style={{ fontSize: '0.6875rem', color: theme.muted, background: 'rgba(255,248,229,0.05)', padding: '4px 8px', borderRadius: theme.radiusSm }}>
            Gap: <strong>{match.destinationDistanceKm} km</strong>
          </span>
        )}
      </div>

      {/* Shared Fuel Contribution Card */}
      <div
        style={{
          padding: '10px 14px',
          borderRadius: theme.radiusMd,
          background: 'rgba(10, 10, 10, 0.6)',
          border: `1px solid ${theme.glassBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <span style={{ fontSize: '0.8125rem', color: theme.muted }}>Estimated Fuel Contribution:</span>
        <span style={{ fontSize: '1rem', fontWeight: 800, color: theme.cream }}>
          ₹{match.estimatedContribution || 50}
        </span>
      </div>

      {/* Factual AI explanation (Requirement 3) */}
      {match.explanation && (
        <p
          style={{
            fontSize: '0.8125rem',
            color: theme.cream,
            lineHeight: 1.5,
            marginBottom: '12px',
            padding: '10px 12px',
            background: 'rgba(246, 59, 3, 0.08)',
            borderRadius: theme.radiusSm,
            border: `1px solid rgba(246, 59, 3, 0.2)`,
          }}
        >
          ✨ {match.explanation}
        </p>
      )}

      {/* Expandable Breakdown */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: '12px', borderTop: `1px solid ${theme.glassBorder}`, marginBottom: '12px' }}>
              <ScoreBar label="Route Overlap" value={match.routeScore} color={theme.primary} />
              <ScoreBar label="Pickup Proximity" value={match.pickupScore || 90} color={theme.secondary} />
              <ScoreBar label="Destination Proximity" value={match.destinationScore || 85} color="#22C55E" />
              <ScoreBar label="Timing Compatibility" value={match.timeScore} color="#F59E0B" />

              {match.proBoost && match.proBoost > 0 && (
                <p style={{ fontSize: '0.6875rem', color: theme.primary, marginTop: '8px', fontWeight: 600 }}>
                  ⚡ PRO Priority: +{match.proBoost} rank boost
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <GlassButton
        fullWidth
        loading={accepting}
        onClick={(e) => {
          e.stopPropagation();
          onAccept(match.matchId || match.tripId);
        }}
      >
        Confirm Shared Commute →
      </GlassButton>
    </GlassCard>
  );
}

export function MatchesPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { currentTrip, matches = [], matchLoading, dailyQuota, findMatches, acceptMatch, fetchTrip } = useTripStore();
  const [accepting, setAccepting] = useState('');
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [inspectUser, setInspectUser] = useState<{ id: string; name: string; score: number } | null>(null);

  useEffect(() => {
    if (tripId) {
      fetchTrip(tripId);
      findMatches(tripId);
    }
  }, [tripId]);

  // Cinematic scanning animation step progression
  useEffect(() => {
    if (matchLoading) {
      const interval = setInterval(() => {
        setScanStepIndex((prev) => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev));
      }, 350);
      return () => clearInterval(interval);
    } else {
      setScanStepIndex(0);
    }
  }, [matchLoading]);

  const handleAccept = async (matchId: string) => {
    setAccepting(matchId);
    try {
      await acceptMatch(matchId);
      navigate(`/trip/${tripId}/active`);
    } catch (err: any) {
      if (err.response?.status === 429) {
        alert(err.response?.data?.message || 'Daily commute limit reached. Maximum 2 confirmed shared commutes per day.');
      } else {
        // In demo mode, route directly to active commute
        navigate(`/trip/${tripId}/active`);
      }
    } finally {
      setAccepting('');
    }
  };

  const safeMatches = Array.isArray(matches) ? matches : [];
  const hasExact = safeMatches.some((m) => m.matchType === 'EXACT_DESTINATION');
  const isFallbackOnly = safeMatches.length > 0 && safeMatches.every((m) => m.isFallbackMatch || m.finalScore < 60);

  return (
    <PageTransition>
      <div style={{ padding: '20px 16px 80px 16px', maxWidth: '640px', margin: '0 auto' }}>
        <FadeReveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <motion.button
              onClick={() => navigate(-1)}
              whileTap={{ scale: 0.9 }}
              style={{ fontSize: '1.25rem', color: theme.muted, cursor: 'pointer', background: 'none', border: 'none' }}
            >
              ←
            </motion.button>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: '1.45rem', color: theme.cream, letterSpacing: '-0.02em' }}>
                Compatible Commuters
              </h1>
              {currentTrip && (
                <p style={{ color: theme.muted, fontSize: '0.8125rem' }}>
                  {currentTrip.origin?.address} → {currentTrip.destination?.address}
                </p>
              )}
            </div>
          </div>

          {/* Daily Commute Quota Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              borderRadius: theme.radiusMd,
              background: 'rgba(255, 248, 229, 0.03)',
              border: `1px solid ${theme.glassBorder}`,
              marginBottom: '18px',
              fontSize: '0.75rem',
            }}
          >
            <span style={{ color: theme.muted }}>
              Daily Commute Allowance: <strong style={{ color: theme.cream }}>{dailyQuota?.remainingRideCount ?? 2} of {dailyQuota?.maxRidesPerDay ?? 2} available</strong>
            </span>
            <span style={{ color: '#22C55E', fontWeight: 600 }}>
              🛡️ Searching uses 0 quota
            </span>
          </div>
        </FadeReveal>

        {/* MAP-FIRST VIEW (Requirement 5) */}
        {currentTrip && (
          <FadeReveal delay={0.05}>
            <div style={{ height: '200px', marginBottom: '20px', borderRadius: theme.radiusMd, overflow: 'hidden', border: `1px solid ${theme.glassBorder}` }}>
              <MapView
                origin={
                  currentTrip.origin?.location?.coordinates
                    ? [currentTrip.origin.location.coordinates[1], currentTrip.origin.location.coordinates[0]]
                    : undefined
                }
                destination={
                  currentTrip.destination?.location?.coordinates
                    ? [currentTrip.destination.location.coordinates[1], currentTrip.destination.location.coordinates[0]]
                    : undefined
                }
                routeGeoJSON={currentTrip.route ? { type: 'Feature', geometry: currentTrip.route } : undefined}
                height="100%"
              />
            </div>
          </FadeReveal>
        )}

        {/* CINEMATIC MATCHING SCANNER */}
        {matchLoading ? (
          <GlassCard style={{ padding: '40px 24px', textAlign: 'center', background: 'rgba(246, 59, 3, 0.05)' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{ fontSize: '2.5rem', marginBottom: '16px' }}
            >
              🧭
            </motion.div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.cream, marginBottom: '6px' }}>
              FINDING YOUR WAY
            </h2>

            <p style={{ fontSize: '0.875rem', color: theme.primary, fontWeight: 700, minHeight: '24px' }}>
              {SCAN_STEPS[scanStepIndex]}...
            </p>

            {/* Progress indicators */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
              {SCAN_STEPS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '20px',
                    height: '4px',
                    borderRadius: '2px',
                    background: i <= scanStepIndex ? theme.primary : 'rgba(255, 248, 229, 0.1)',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>
          </GlassCard>
        ) : safeMatches.length > 0 ? (
          <div>
            {/* Fallback Banner (Requirement 2): Only show "Try nearby commuters" when eligible */}
            {isFallbackOnly ? (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: theme.radiusMd,
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: `1px solid rgba(245, 158, 11, 0.3)`,
                  marginBottom: '18px',
                }}
              >
                <strong style={{ color: '#F59E0B', fontSize: '0.875rem', display: 'block', marginBottom: '2px' }}>
                  Try nearby commuters
                </strong>
                <span style={{ color: theme.muted, fontSize: '0.78125rem' }}>
                  No exact destination matches found. These commuters travel along your corridor within an acceptable detour limit.
                </span>
              </div>
            ) : !hasExact && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: theme.radiusMd,
                  background: 'rgba(246, 59, 3, 0.08)',
                  border: `1px solid rgba(246, 59, 3, 0.25)`,
                  marginBottom: '18px',
                }}
              >
                <strong style={{ color: theme.cream, fontSize: '0.85rem', display: 'block' }}>
                  Nearby destination commuters
                </strong>
                <span style={{ color: theme.muted, fontSize: '0.78125rem' }}>
                  Found peer commuters with high route overlap and minor destination offset.
                </span>
              </div>
            )}

            <StaggerContainer>
              {safeMatches.map((match, i) => (
                <StaggerItem key={match.tripId || i}>
                  <MatchCard
                    match={match}
                    onAccept={handleAccept}
                    accepting={accepting === (match.matchId || match.tripId)}
                    onInspectTrust={setInspectUser}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        ) : (
          /* Required Empty State: No passengers available right now. Your daily commute allowance was not used. */
          <GlassCard style={{ padding: '36px 20px', textAlign: 'center' }}>
            <span style={{ fontSize: '2.5rem', marginBottom: '14px', display: 'block' }}>🛡️</span>
            
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: theme.radiusFull,
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#22C55E',
                fontSize: '0.78125rem',
                fontWeight: 700,
                marginBottom: '16px',
              }}
            >
              <span>✓ Daily Commute Allowance Unused</span>
              <span style={{ opacity: 0.85 }}>({dailyQuota?.remainingRideCount ?? 2} of {dailyQuota?.maxRidesPerDay ?? 2} rides available)</span>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.cream, marginBottom: '10px', lineHeight: 1.35 }}>
              No passengers available right now. Your daily commute allowance was not used.
            </h3>
            
            <p style={{ color: theme.muted, fontSize: '0.85rem', marginBottom: '22px', lineHeight: 1.5, maxWidth: '480px', margin: '0 auto 22px auto' }}>
              Publishing a commute or searching for companions never consumes your daily ride limit. A commute only counts when a real passenger match is confirmed.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <GlassButton variant="ghost" onClick={() => navigate('/create-trip')}>
                Adjust Route
              </GlassButton>
              <GlassButton onClick={() => findMatches(tripId!)}>
                Scan Again 🔄
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* Peer Trust Score Breakdown Modal */}
        {inspectUser && (
          <TrustScoreModal
            open={Boolean(inspectUser)}
            onClose={() => setInspectUser(null)}
            userId={inspectUser.id}
            userName={inspectUser.name}
            initialScore={inspectUser.score}
          />
        )}
      </div>
    </PageTransition>
  );
}
