/**
 * Matches Page — Displays AI-ranked match results
 * Shows per-match breakdown: route overlap, time, budget, trust, Gemini explanation
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassSurface, GlassCard, GlassButton, GlassPill, PlanBadge } from '../glass';
import { PageTransition, FadeReveal, StaggerContainer, StaggerItem } from '../animations';
import { useTripStore } from '../stores/tripStore';
import { theme } from '../theme';
import type { MatchResult } from '../types';

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.6875rem', color: theme.muted }}>{label}</span>
        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color, fontFeatureSettings: "'tnum' on" }}>{value}%</span>
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

function MatchCard({ match, onAccept, accepting }: {
  match: MatchResult;
  onAccept: (id: string) => void;
  accepting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: theme.gradientPrimary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', fontWeight: 700,
          }}>
            {match.userName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>{match.userName}</span>
              {match.userVerified && <span title="Verified">🛡️</span>}
              <PlanBadge plan={match.userPlan as any} size="sm" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '0.75rem', color: theme.muted }}>
                Trust: {match.userTrustScore}%
              </span>
              <span style={{ fontSize: '0.75rem', color: theme.muted }}>
                {match.userGender === 'female' ? '♀️' : '♂️'}
              </span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            fontSize: '1.5rem', fontWeight: 700,
            background: theme.gradientPrimary,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFeatureSettings: "'tnum' on",
          }}>
            {Math.round(match.finalScore)}
          </span>
          <p style={{ fontSize: '0.5625rem', color: theme.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            MATCH
          </p>
        </div>
      </div>

      {/* Explanation */}
      {match.explanation && (
        <p style={{
          fontSize: '0.8125rem',
          color: theme.mutedLight,
          lineHeight: 1.5,
          marginBottom: '12px',
          padding: '12px',
          background: `${theme.primary}08`,
          borderRadius: theme.radiusSm,
          border: `1px solid ${theme.primary}15`,
        }}>
          ✨ {match.explanation}
        </p>
      )}

      {/* Score Breakdown (expandable) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: '12px', borderTop: `1px solid ${theme.glassBorder}` }}>
              <ScoreBar label="Route Overlap" value={match.routeScore} color={theme.primary} />
              <ScoreBar label="Time Match" value={match.timeScore} color={theme.secondary} />
              <ScoreBar label="Budget" value={match.budgetScore} color={theme.accent} />
              <ScoreBar label="Capacity" value={match.capacityScore} color={theme.warning} />

              {match.proBoost && match.proBoost > 0 && (
                <p style={{ fontSize: '0.6875rem', color: theme.planPro, marginTop: '8px' }}>
                  ⚡ PRO Priority: +{match.proBoost} boost
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action */}
      <div style={{ marginTop: '16px' }}>
        <GlassButton
          fullWidth
          loading={accepting}
          onClick={(e) => { e.stopPropagation(); match.matchId && onAccept(match.matchId); }}
        >
          Accept Match
        </GlassButton>
      </div>
    </GlassCard>
  );
}

export function MatchesPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { currentTrip, matches, matchLoading, findMatches, acceptMatch, fetchTrip } = useTripStore();
  const [accepting, setAccepting] = useState('');

  useEffect(() => {
    if (tripId) {
      fetchTrip(tripId);
      findMatches(tripId);
    }
  }, [tripId]);

  const handleAccept = async (matchId: string) => {
    setAccepting(matchId);
    try {
      await acceptMatch(matchId);
      navigate(`/trip/${tripId}/active`);
    } catch {
      setAccepting('');
    }
  };

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px', maxWidth: '600px', margin: '0 auto' }}>
        <FadeReveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <motion.button
              onClick={() => navigate(-1)}
              whileTap={{ scale: 0.9 }}
              style={{ fontSize: '1.25rem', color: theme.muted }}
            >
              ←
            </motion.button>
            <div>
              <h1 style={{ fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>Matches</h1>
              {currentTrip && (
                <p style={{ color: theme.muted, fontSize: '0.75rem', marginTop: '2px' }}>
                  {currentTrip.origin?.address} → {currentTrip.destination?.address}
                </p>
              )}
            </div>
          </div>
        </FadeReveal>

        {matchLoading ? (
          <FadeReveal>
            <GlassSurface style={{ padding: '48px', textAlign: 'center' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                style={{ fontSize: '2.5rem', display: 'inline-block', marginBottom: '16px' }}
              >
                🔍
              </motion.div>
              <p style={{ fontWeight: 600, marginBottom: '4px' }}>Searching for rides...</p>
              <p style={{ color: theme.muted, fontSize: '0.8125rem' }}>
                Running matching pipeline
              </p>
            </GlassSurface>
          </FadeReveal>
        ) : matches.length === 0 ? (
          <FadeReveal>
            <GlassSurface style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🌙</p>
              <p style={{ fontWeight: 600, marginBottom: '8px' }}>No matches found</p>
              <p style={{ color: theme.muted, fontSize: '0.8125rem' }}>
                Try expanding your time window or budget range
              </p>
              <GlassButton
                variant="secondary"
                onClick={() => tripId && findMatches(tripId)}
                style={{ marginTop: '20px' }}
              >
                Retry Search
              </GlassButton>
            </GlassSurface>
          </FadeReveal>
        ) : (
          <>
            <FadeReveal>
              <p style={{ color: theme.muted, fontSize: '0.8125rem', marginBottom: '16px' }}>
                {matches.length} ride{matches.length !== 1 ? 's' : ''} found — ranked by compatibility
              </p>
            </FadeReveal>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {matches.map((match) => (
                <StaggerItem key={match.matchId || match.tripId}>
                  <MatchCard
                    match={match}
                    onAccept={handleAccept}
                    accepting={accepting === match.matchId}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </>
        )}
      </div>
    </PageTransition>
  );
}
