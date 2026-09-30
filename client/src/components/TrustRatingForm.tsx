/**
 * "How was your experience?" — five parameters, each 1–10, plus optional feedback.
 * Only rendered for participants of a completed shared journey (server re-checks everything).
 */

import { useEffect, useState } from 'react';
import { GlassCard, GlassButton } from '../glass';
import { ratingAPI, type TrustScores } from '../services/api';
import { TRUST_PARAM_ORDER, TRUST_PARAM_LABEL } from './trust';
import { theme } from '../theme';

type State =
  | { kind: 'loading' }
  | { kind: 'ineligible'; reason: string; code?: string }
  | { kind: 'ready'; ratedName: string }
  | { kind: 'done'; tripRating: number; ratedName: string };

const DEFAULTS: TrustScores = { reliability: 8, safety: 8, respect: 8, routeCommitment: 8, communication: 8 };

export function TrustRatingForm({ tripId }: { tripId: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [scores, setScores] = useState<TrustScores>(DEFAULTS);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    ratingAPI.eligibility(tripId)
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        setState(d.eligible
          ? { kind: 'ready', ratedName: d.ratedUser.name }
          : { kind: 'ineligible', reason: d.reason, code: d.code });
      })
      .catch(() => !cancelled && setState({ kind: 'ineligible', reason: 'Could not check rating eligibility. Please try again later.' }));
    return () => { cancelled = true; };
  }, [tripId]);

  const overall = TRUST_PARAM_ORDER.reduce((sum, p) => sum + scores[p], 0) / TRUST_PARAM_ORDER.length;

  const submit = async () => {
    if (state.kind !== 'ready') return;
    setSubmitting(true);
    setError('');
    try {
      const res = await ratingAPI.submit(tripId, scores, comment.trim() || undefined);
      setState({ kind: 'done', tripRating: res.data.tripRating, ratedName: state.ratedName });
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'ALREADY_RATED') {
        setState({ kind: 'ineligible', reason: 'You have already rated this journey.', code });
      } else {
        setError(err.response?.data?.error || 'Could not submit your rating. Please try again.');
      }
    }
    setSubmitting(false);
  };

  if (state.kind === 'loading') {
    return (
      <GlassCard style={{ marginBottom: '24px', textAlign: 'center', color: theme.muted, fontSize: '0.85rem' }}>
        Checking rating eligibility…
      </GlassCard>
    );
  }

  if (state.kind === 'ineligible') {
    return (
      <GlassCard style={{ marginBottom: '24px', textAlign: 'center' }}>
        <p style={{ color: theme.muted, fontSize: '0.85rem', margin: 0 }}>{state.reason}</p>
      </GlassCard>
    );
  }

  if (state.kind === 'done') {
    return (
      <GlassCard style={{ marginBottom: '24px', textAlign: 'center' }}>
        <div style={{ color: theme.success, fontWeight: 800, marginBottom: '4px' }}>✓ Rating submitted</div>
        <p style={{ color: theme.muted, fontSize: '0.85rem', margin: 0 }}>
          Your trip rating for {state.ratedName}: <strong style={{ color: theme.cream }}>{state.tripRating.toFixed(1)} / 10</strong>
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={{ padding: '24px', marginBottom: '24px', textAlign: 'left' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.cream, margin: '0 0 4px' }}>
        How was your experience with {state.ratedName}?
      </h3>
      <p style={{ color: theme.muted, fontSize: '0.8125rem', margin: '0 0 20px' }}>
        Rate each from 1 to 10. This builds their trust for future journeys.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '20px' }}>
        {TRUST_PARAM_ORDER.map((p) => (
          <div key={p}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label htmlFor={`rate-${p}`} style={{ fontSize: '0.875rem', color: theme.cream, fontWeight: 600 }}>
                {TRUST_PARAM_LABEL[p]}
              </label>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: theme.primary, fontFeatureSettings: "'tnum' on" }}>
                {scores[p]}
              </span>
            </div>
            <input
              id={`rate-${p}`}
              type="range"
              min={1}
              max={10}
              step={1}
              value={scores[p]}
              onChange={(e) => setScores((s) => ({ ...s, [p]: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: theme.primary }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 14px', borderRadius: theme.radiusMd, background: 'rgba(10,10,10,0.5)', marginBottom: '16px' }}>
        <span style={{ fontSize: '0.8125rem', color: theme.muted }}>Trip rating</span>
        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: theme.cream }}>{overall.toFixed(1)} / 10</span>
      </div>

      <textarea
        aria-label="Optional written feedback"
        placeholder="Optional: a short note about the journey"
        maxLength={500}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        style={{
          width: '100%',
          height: '72px',
          padding: '12px',
          borderRadius: theme.radiusMd,
          background: 'rgba(255, 248, 229, 0.05)',
          border: `1px solid ${theme.glassBorder}`,
          color: theme.cream,
          fontSize: '0.85rem',
          outline: 'none',
          resize: 'none',
          marginBottom: '14px',
        }}
      />

      {error && <p role="alert" style={{ color: theme.danger, fontSize: '0.8125rem', margin: '0 0 12px' }}>{error}</p>}

      <GlassButton fullWidth size="lg" loading={submitting} onClick={submit}>
        Submit rating
      </GlassButton>
    </GlassCard>
  );
}
