/**
 * Community page — who is going my way with seats.
 * Stats, popular routes, seats available right now, and (if you have a commute today)
 * members ranked by route/time/trust compatibility.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GlassCard, GlassButton } from '../glass';
import { PageTransition, FadeReveal } from '../animations';
import { CommuteMatchCard } from '../components/CommuteMatchCard';
import { fmtTime } from '../services/format';
import { TrustBadge, sectionLabel } from '../components/trust';
import { communityAPI, commuteAPI } from '../services/api';
import { theme } from '../theme';
import type { CommunityDetail, CommuteMatch } from '../types';

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ flex: 1, minWidth: '80px', padding: '12px', borderRadius: theme.radiusMd, background: 'rgba(10,10,10,0.5)', textAlign: 'center' }}>
      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: theme.cream, fontFeatureSettings: "'tnum' on" }}>{value}</div>
      <div style={{ fontSize: '0.6875rem', color: theme.muted, marginTop: '2px' }}>{label}</div>
    </div>
  );
}

export function CommunityPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<CommunityDetail | null>(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!communityId) return;
    try {
      const res = await communityAPI.get(communityId);
      setDetail(res.data);
      setError('');
    } catch (err: any) {
      if (err.response?.status === 404) setNotFound(true);
      else setError(err.response?.data?.error || 'Could not load this community.');
    }
  }, [communityId]);

  useEffect(() => { load(); }, [load]);

  const flash = (kind: 'ok' | 'err', text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const toggleMembership = async () => {
    if (!detail || !communityId) return;
    setBusy(true);
    try {
      if (detail.community.isMember) await communityAPI.leave(communityId);
      else await communityAPI.join(communityId);
      await load();
    } catch (err: any) {
      flash('err', err.response?.data?.error || 'Could not update membership.');
    }
    setBusy(false);
  };

  const request = async (m: CommuteMatch) => {
    if (!m.commuteId) return;
    setBusyKey(`req-${m.userId}`);
    try {
      await commuteAPI.request(m.commuteId, { targetKind: m.targetKind, targetId: m.targetId, targetUserId: m.userId, asRole: m.myRole });
      flash('ok', `Request sent to ${m.name}. Nothing is booked until they accept.`);
      await load();
    } catch (err: any) {
      flash('err', err.response?.data?.message || err.response?.data?.error || 'Could not send the request.');
    }
    setBusyKey(null);
  };

  if (notFound) {
    return (
      <PageTransition>
        <div style={{ padding: '48px 16px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: theme.cream, fontWeight: 700 }}>Community not found</p>
          <GlassButton onClick={() => navigate('/communities')}>Back to communities</GlassButton>
        </div>
      </PageTransition>
    );
  }

  const c = detail?.community;
  const isMember = !!c?.isMember;
  const compatibleIds = new Set((detail?.compatible || []).map((m) => m.userId));
  const otherSeats = (detail?.seats || []).filter((s) => !compatibleIds.has(s.userId));

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px 96px', maxWidth: '600px', margin: '0 auto' }}>
        <button type="button" onClick={() => navigate('/communities')} style={{ background: 'none', border: 'none', color: theme.muted, cursor: 'pointer', fontSize: '0.8125rem', padding: 0, marginBottom: '12px' }}>
          ← Communities
        </button>

        {error && (
          <GlassCard style={{ textAlign: 'center', marginBottom: '16px' }} whileHover={undefined}>
            <p style={{ color: theme.danger, fontSize: '0.85rem', margin: '0 0 12px' }}>{error}</p>
            <GlassButton size="sm" onClick={load}>Try again</GlassButton>
          </GlassCard>
        )}
        {!detail && !error && <p style={{ color: theme.muted, fontSize: '0.85rem' }}>Loading community…</p>}

        {detail && c && (
          <>
            <FadeReveal>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h1 style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.02em', color: theme.cream, margin: 0 }}>{c.name}</h1>
                  <p style={{ color: theme.muted, fontSize: '0.8125rem', margin: '4px 0 0' }}>
                    {detail.stats.members} member{detail.stats.members === 1 ? '' : 's'}
                  </p>
                </div>
                <GlassButton size="sm" variant={isMember ? 'ghost' : 'primary'} loading={busy} onClick={toggleMembership}>
                  {isMember ? 'Leave' : 'Join'}
                </GlassButton>
              </div>
            </FadeReveal>

            {notice && (
              <div role="status" style={{
                marginBottom: '14px', padding: '10px 14px', borderRadius: theme.radiusMd, fontSize: '0.85rem',
                background: notice.kind === 'ok' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                border: `1px solid ${notice.kind === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: notice.kind === 'ok' ? theme.success : theme.danger,
              }}>
                {notice.text}
              </div>
            )}

            <FadeReveal>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <Stat value={detail.stats.regularCommuters} label="regular commuters" />
                <Stat value={detail.stats.travellingToday} label="travelling today" />
                <Stat value={detail.stats.availableSeats} label="seats available" />
                <Stat value={detail.stats.activeJourneys} label="journeys today" />
              </div>
            </FadeReveal>

            {detail.popularRoutes.length > 0 && (
              <FadeReveal>
                <GlassCard style={{ padding: '16px', marginBottom: '16px' }} whileHover={undefined}>
                  <h3 style={{ ...sectionLabel, margin: '0 0 10px' }}>Popular routes</h3>
                  {detail.popularRoutes.map((r) => (
                    <div key={r.route} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0', color: theme.cream }}>
                      <span>{r.route}</span>
                      <span style={{ color: theme.muted }}>{r.commuters} commuter{r.commuters === 1 ? '' : 's'}</span>
                    </div>
                  ))}
                </GlassCard>
              </FadeReveal>
            )}

            {detail.restricted ? (
              <GlassCard style={{ textAlign: 'center', padding: '28px 20px' }} whileHover={undefined}>
                <p style={{ color: theme.cream, fontWeight: 700, margin: '0 0 6px' }}>Join to see who has seats</p>
                <p style={{ color: theme.muted, fontSize: '0.85rem', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Commuters and their routes are visible to community members only.
                </p>
                <GlassButton loading={busy} onClick={toggleMembership}>Join {c.name}</GlassButton>
              </GlassCard>
            ) : (
              <>
                {detail.compatible.length > 0 && (
                  <FadeReveal>
                    <h3 style={{ ...sectionLabel, margin: '8px 0 4px' }}>Going your way</h3>
                    <p style={{ color: theme.muted, fontSize: '0.78rem', margin: '0 0 12px' }}>
                      Members compatible with your commute today, by route, time and trust.
                    </p>
                    {detail.compatible.map((m) => (
                      <CommuteMatchCard
                        key={m.userId}
                        match={m}
                        busy={busyKey === `req-${m.userId}`}
                        onRequest={request}
                        onViewProfile={(id) => navigate(`/u/${id}`)}
                      />
                    ))}
                  </FadeReveal>
                )}

                <FadeReveal>
                  <h3 style={{ ...sectionLabel, margin: '16px 0 12px' }}>Available seats</h3>
                  {detail.seats.length === 0 && (
                    <p style={{ color: theme.muted, fontSize: '0.85rem' }}>
                      No one in this community is offering seats right now.
                    </p>
                  )}
                  {(detail.compatible.length > 0 ? otherSeats : detail.seats).map((s) => (
                    <GlassCard key={`${s.userId}-${s.targetId}`} style={{ padding: '14px 16px', marginBottom: '10px' }} whileHover={undefined}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: theme.cream }}>{s.name}</div>
                          <div style={{ fontSize: '0.8125rem', color: theme.mutedLight, margin: '2px 0 6px' }}>
                            {s.from} → {s.to}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: theme.muted, marginBottom: '6px' }}>
                            {fmtTime(s.departure)} · {s.seatsAvailable} seat{s.seatsAvailable === 1 ? '' : 's'} available
                          </div>
                          <TrustBadge trust={s.trust} onClick={() => navigate(`/u/${s.userId}`)} />
                        </div>
                        <GlassButton variant="ghost" size="sm" onClick={() => navigate(`/u/${s.userId}`)}>Profile</GlassButton>
                      </div>
                    </GlassCard>
                  ))}
                  {detail.compatible.length === 0 && detail.seats.length > 0 && (
                    <p style={{ color: theme.muted, fontSize: '0.78rem', marginTop: '4px' }}>
                      Save a
                      <button type="button" onClick={() => navigate('/commute')} style={{ background: 'none', border: 'none', color: theme.primary, fontWeight: 700, cursor: 'pointer', padding: '0 4px' }}>Daily Commute</button>
                      to see which of these are on your route.
                    </p>
                  )}
                </FadeReveal>
              </>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
