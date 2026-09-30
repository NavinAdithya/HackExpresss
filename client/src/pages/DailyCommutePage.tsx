/**
 * Daily Commute — your recurring journeys, today's compatible commuters, and requests.
 *
 * The saved commute drives everything: route, time, days and community context feed the
 * same matching pipeline as on-demand search. Requests never auto-book — the other
 * commuter has to accept.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard, GlassButton } from '../glass';
import { PageTransition, FadeReveal } from '../animations';
import { CommuteWizard } from '../components/CommuteWizard';
import { CommuteMatchCard } from '../components/CommuteMatchCard';
import { fmtTime } from '../services/format';
import { TrustBadge, sectionLabel } from '../components/trust';
import { commuteAPI, matchAPI } from '../services/api';
import { theme } from '../theme';
import type { CommuteMatch, CommuteRequestItem, DailyCommute, TodayCommute } from '../types';

const errText = (err: any, fallback: string) =>
  err?.response?.data?.message || err?.response?.data?.error || fallback;

export function DailyCommutePage() {
  const navigate = useNavigate();
  const [commutes, setCommutes] = useState<DailyCommute[] | null>(null);
  const [today, setToday] = useState<TodayCommute[] | null>(null);
  const [requests, setRequests] = useState<CommuteRequestItem[]>([]);
  const [loadError, setLoadError] = useState('');
  const [wizard, setWizard] = useState<{ open: boolean; editing?: DailyCommute }>({ open: false });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, t, r] = await Promise.all([commuteAPI.list(), commuteAPI.today(), commuteAPI.requests()]);
      setCommutes(list.data.commutes);
      setToday(t.data.commutes);
      setRequests(r.data.requests);
      setLoadError('');
    } catch (err) {
      setLoadError(errText(err, 'Could not load your commutes.'));
    }
  }, []);

  useEffect(() => {
    load();
    // Re-check while the page is open so new commuters / replies show up without a manual refresh.
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const flash = (kind: 'ok' | 'err', text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const request = async (commuteId: string, m: CommuteMatch) => {
    setBusyKey(`req-${m.userId}`);
    try {
      await commuteAPI.request(commuteId, { targetKind: m.targetKind, targetId: m.targetId, targetUserId: m.userId, asRole: m.myRole });
      flash('ok', `Request sent to ${m.name}. Nothing is booked until they accept.`);
      await load();
    } catch (err) {
      flash('err', errText(err, 'Could not send the request.'));
    }
    setBusyKey(null);
  };

  const respond = async (matchId: string, accept: boolean) => {
    setBusyKey(`resp-${matchId}`);
    try {
      if (accept) await matchAPI.accept(matchId);
      else await matchAPI.decline(matchId);
      flash('ok', accept ? 'Shared journey confirmed.' : 'Request declined.');
      await load();
    } catch (err) {
      flash('err', errText(err, 'Could not update the request.'));
    }
    setBusyKey(null);
  };

  const toggle = async (c: DailyCommute, patch: Partial<DailyCommute>) => {
    setBusyKey(`c-${c._id}`);
    try {
      await commuteAPI.update(c._id, patch as Record<string, unknown>);
      await load();
    } catch (err) {
      flash('err', errText(err, 'Could not update the commute.'));
    }
    setBusyKey(null);
  };

  const remove = async (c: DailyCommute) => {
    if (!window.confirm(`Delete "${c.label || `${c.origin.address} → ${c.destination.address}`}"?`)) return;
    setBusyKey(`c-${c._id}`);
    try {
      await commuteAPI.remove(c._id);
      await load();
    } catch (err) {
      flash('err', errText(err, 'Could not delete the commute.'));
    }
    setBusyKey(null);
  };

  const savedPlaces = (commutes || []).flatMap((c) => [c.origin, c.destination])
    .filter((p, i, arr) => arr.findIndex((q) => q.address === p.address) === i);

  if (wizard.open) {
    return (
      <PageTransition>
        <div style={{ padding: '24px 16px 96px', maxWidth: '600px', margin: '0 auto' }}>
          <CommuteWizard
            initial={wizard.editing}
            savedPlaces={savedPlaces}
            onCancel={() => setWizard({ open: false })}
            onSaved={async () => { setWizard({ open: false }); await load(); flash('ok', 'Commute saved.'); }}
          />
        </div>
      </PageTransition>
    );
  }

  const loading = commutes === null && !loadError;

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px 96px', maxWidth: '600px', margin: '0 auto' }}>
        <FadeReveal>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h1 style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.02em', color: theme.cream, margin: 0 }}>Daily Commute</h1>
            {commutes && commutes.length > 0 && (
              <GlassButton size="sm" onClick={() => setWizard({ open: true })}>+ Add</GlassButton>
            )}
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

        {loading && <p style={{ color: theme.muted, fontSize: '0.85rem' }}>Loading your commute…</p>}

        {loadError && (
          <GlassCard style={{ textAlign: 'center' }} whileHover={undefined}>
            <p style={{ color: theme.danger, fontSize: '0.85rem', margin: '0 0 12px' }}>{loadError}</p>
            <GlassButton size="sm" onClick={load}>Try again</GlassButton>
          </GlassCard>
        )}

        {commutes && commutes.length === 0 && (
          <FadeReveal>
            <GlassCard style={{ textAlign: 'center', padding: '36px 20px' }} whileHover={undefined}>
              <p style={{ fontSize: '2.2rem', margin: '0 0 10px' }}>🔁</p>
              <p style={{ fontWeight: 700, color: theme.cream, margin: '0 0 6px' }}>Set up your regular commute</p>
              <p style={{ color: theme.muted, fontSize: '0.85rem', margin: '0 0 18px', lineHeight: 1.5 }}>
                Save the journey you make every week and we'll find people already going your way.
              </p>
              <GlassButton onClick={() => setWizard({ open: true })}>Get started</GlassButton>
            </GlassCard>
          </FadeReveal>
        )}

        {/* Requests waiting on you / on them */}
        {requests.length > 0 && (
          <FadeReveal>
            <h3 style={{ ...sectionLabel, margin: '8px 0 12px' }}>Requests</h3>
            {requests.map((r) => (
              <GlassCard key={r.matchId} style={{ padding: '14px 16px', marginBottom: '10px' }} whileHover={undefined}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: theme.cream }}>
                      {r.direction === 'INCOMING' ? `${r.user.name} wants to travel with you` : `Waiting for ${r.user.name}`}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: theme.muted, margin: '2px 0 6px' }}>
                      {r.from} → {r.to}{r.departure ? ` · ${fmtTime(r.departure)}` : ''} · {Math.round(r.routeCompatibility)}% route match
                    </div>
                    <TrustBadge trust={r.trust} onClick={() => navigate(`/u/${r.user._id}`)} />
                  </div>
                  {r.direction === 'INCOMING' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <GlassButton variant="ghost" size="sm" disabled={busyKey === `resp-${r.matchId}`} onClick={() => respond(r.matchId, false)}>Decline</GlassButton>
                      <GlassButton size="sm" loading={busyKey === `resp-${r.matchId}`} onClick={() => respond(r.matchId, true)}>Accept</GlassButton>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}
          </FadeReveal>
        )}

        {/* Today */}
        {today && today.length > 0 && (
          <FadeReveal>
            <h3 style={{ ...sectionLabel, margin: '16px 0 12px' }}>Today's commute</h3>
            {today.map((t) => (
              <div key={t.commute._id} style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontWeight: 800, color: theme.cream, fontSize: '1.05rem' }}>
                    {t.commute.origin.address} → {t.commute.destination.address}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: theme.muted }}>
                    Leaving around {fmtTime(t.departure)} · Your regular commute
                    {t.autoMatch ? ' · Auto-match ON' : ' · Auto-match OFF'}
                  </div>
                </div>

                {!t.autoMatch && (
                  <GlassCard style={{ padding: '14px 16px' }} whileHover={undefined}>
                    <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: theme.muted }}>
                      Auto-match is off for this commute.
                    </p>
                    <GlassButton size="sm" onClick={() => toggle(t.commute, { autoMatchEnabled: true })}>Turn on auto-match</GlassButton>
                  </GlassCard>
                )}

                {t.autoMatch && t.matches.length === 0 && (
                  <GlassCard style={{ padding: '14px 16px' }} whileHover={undefined}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: theme.muted, lineHeight: 1.5 }}>
                      No compatible commuters yet. We'll keep checking while this page is open — try joining a
                      <button type="button" onClick={() => navigate('/communities')} style={{ background: 'none', border: 'none', color: theme.primary, fontWeight: 700, cursor: 'pointer', padding: '0 4px' }}>community</button>
                      to widen your circle.
                    </p>
                  </GlassCard>
                )}

                {t.autoMatch && t.matches.length > 0 && (
                  <>
                    <p style={{ fontSize: '0.8125rem', color: theme.mutedLight, margin: '0 0 10px' }}>
                      {t.matches.length} compatible commuter{t.matches.length === 1 ? '' : 's'} found
                    </p>
                    {t.matches.map((m) => (
                      <CommuteMatchCard
                        key={m.userId}
                        match={m}
                        busy={busyKey === `req-${m.userId}` || (m.matchId ? busyKey === `resp-${m.matchId}` : false)}
                        onRequest={(mm) => request(t.commute._id, mm)}
                        onAccept={(id) => respond(id, true)}
                        onDecline={(id) => respond(id, false)}
                        onViewProfile={(id) => navigate(`/u/${id}`)}
                      />
                    ))}
                  </>
                )}
              </div>
            ))}
          </FadeReveal>
        )}

        {/* Saved commutes */}
        {commutes && commutes.length > 0 && (
          <FadeReveal>
            <h3 style={{ ...sectionLabel, margin: '16px 0 12px' }}>Your regular commutes</h3>
            {commutes.map((c) => (
              <GlassCard key={c._id} style={{ padding: '16px', marginBottom: '10px', opacity: c.active ? 1 : 0.6 }} whileHover={undefined}>
                <div style={{ fontWeight: 700, color: theme.cream }}>
                  {c.label ? `${c.label} · ` : ''}{c.origin.address} → {c.destination.address}
                </div>
                <div style={{ fontSize: '0.8125rem', color: theme.muted, margin: '4px 0 12px' }}>
                  {c.days.length === 7 ? 'Every day' : c.days.join(', ')} · around {c.departureTime}
                  {' · '}{c.role === 'PASSENGER' ? 'Looking for a ride' : c.role === 'TRAVELLER' ? `${c.availableSeats} seat${c.availableSeats === 1 ? '' : 's'} offered` : 'Ride or share'}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: theme.mutedLight, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={c.autoMatchEnabled}
                      disabled={busyKey === `c-${c._id}`}
                      onChange={(e) => toggle(c, { autoMatchEnabled: e.target.checked })}
                      style={{ accentColor: theme.primary }}
                    />
                    Auto-match {c.autoMatchEnabled ? 'ON' : 'OFF'}
                  </label>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    <GlassButton variant="ghost" size="sm" disabled={busyKey === `c-${c._id}`} onClick={() => toggle(c, { active: !c.active })}>
                      {c.active ? 'Pause' : 'Resume'}
                    </GlassButton>
                    <GlassButton variant="ghost" size="sm" onClick={() => setWizard({ open: true, editing: c })}>Edit</GlassButton>
                    <GlassButton variant="ghost" size="sm" disabled={busyKey === `c-${c._id}`} onClick={() => remove(c)}>Delete</GlassButton>
                  </div>
                </div>
              </GlassCard>
            ))}
          </FadeReveal>
        )}
      </div>
    </PageTransition>
  );
}
