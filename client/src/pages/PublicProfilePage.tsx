/**
 * Public profile — identity verification, behavioural trust, communities, reviews.
 * Shows only what other commuters are meant to see (no phone number).
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GlassCard, GlassButton } from '../glass';
import { PageTransition, FadeReveal } from '../animations';
import { TrustCard, IdentityList, sectionLabel } from '../components/trust';
import { trustAPI } from '../services/api';
import { theme } from '../theme';
import type { PublicProfile } from '../types';

export function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');

  useEffect(() => {
    if (!userId) return;
    setState('loading');
    trustAPI.profile(userId)
      .then((res) => { setProfile(res.data); setState('ok'); })
      .catch((err) => setState(err.response?.status === 404 ? 'missing' : 'error'));
  }, [userId]);

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px 96px', maxWidth: '600px', margin: '0 auto' }}>
        <button type="button" onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: theme.muted, cursor: 'pointer', fontSize: '0.8125rem', padding: 0, marginBottom: '12px' }}>
          ← Back
        </button>

        {state === 'loading' && <p style={{ color: theme.muted, fontSize: '0.85rem' }}>Loading profile…</p>}
        {state === 'missing' && <p style={{ color: theme.cream, fontWeight: 700 }}>This profile doesn't exist.</p>}
        {state === 'error' && (
          <GlassCard style={{ textAlign: 'center' }} whileHover={undefined}>
            <p style={{ color: theme.danger, fontSize: '0.85rem', margin: '0 0 12px' }}>Could not load this profile.</p>
            <GlassButton size="sm" onClick={() => window.location.reload()}>Try again</GlassButton>
          </GlassCard>
        )}

        {state === 'ok' && profile && (
          <>
            <FadeReveal>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div
                  aria-hidden
                  style={{
                    width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 12px', background: theme.gradientPrimary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.9rem', fontWeight: 800, color: theme.cream,
                  }}
                >
                  {profile.user.name?.[0]?.toUpperCase()}
                </div>
                <h1 style={{ fontWeight: 800, fontSize: '1.4rem', color: theme.cream, margin: 0 }}>{profile.user.name}</h1>
              </div>
            </FadeReveal>

            <FadeReveal delay={0.04}>
              <GlassCard style={{ padding: '20px', marginBottom: '16px' }} whileHover={undefined}>
                <IdentityList identity={profile.identity} />
              </GlassCard>
            </FadeReveal>

            <FadeReveal delay={0.07}>
              <GlassCard style={{ padding: '20px', marginBottom: '16px' }} whileHover={undefined}>
                <TrustCard trust={profile.trust} />
                {profile.trust.completedJourneys ? (
                  <p style={{ fontSize: '0.75rem', color: theme.muted, margin: '14px 0 0' }}>
                    {profile.trust.completedJourneys} completed shared journey{profile.trust.completedJourneys === 1 ? '' : 's'}
                  </p>
                ) : null}
              </GlassCard>
            </FadeReveal>

            {profile.communities.length > 0 && (
              <FadeReveal delay={0.1}>
                <GlassCard style={{ padding: '20px', marginBottom: '16px' }} whileHover={undefined}>
                  <h3 style={sectionLabel}>Community</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                    {profile.communities.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => navigate(`/communities/${c.id}`)}
                        style={{ padding: '4px 12px', borderRadius: theme.radiusFull, background: 'rgba(255,248,229,0.05)', border: `1px solid ${theme.glassBorder}`, color: theme.cream, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </GlassCard>
              </FadeReveal>
            )}

            {profile.reviews.length > 0 && (
              <FadeReveal delay={0.13}>
                <GlassCard style={{ padding: '20px' }} whileHover={undefined}>
                  <h3 style={sectionLabel}>Reviews</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    {profile.reviews.map((r, i) => (
                      <blockquote key={i} style={{ margin: 0, fontSize: '0.85rem', color: theme.cream, lineHeight: 1.5 }}>
                        “{r.comment}”
                        <footer style={{ fontSize: '0.72rem', color: theme.muted, marginTop: '2px' }}>— {r.rater}</footer>
                      </blockquote>
                    ))}
                  </div>
                </GlassCard>
              </FadeReveal>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
