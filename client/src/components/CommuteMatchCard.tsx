/**
 * One compatible commuter — used by Daily Commute and Community pages.
 * Shows WHY they were recommended and never books anything by itself:
 * "Request" sends a request the other commuter must accept.
 */

import { useState } from 'react';
import { GlassCard, GlassButton } from '../glass';
import { TrustBadge, ReasonList } from './trust';
import { fmtTime } from '../services/format';
import { theme } from '../theme';
import type { CommuteMatch } from '../types';

export function CommuteMatchCard({
  match,
  busy,
  onRequest,
  onAccept,
  onDecline,
  onViewProfile,
}: {
  match: CommuteMatch;
  busy?: boolean;
  onRequest: (m: CommuteMatch) => void;
  onAccept?: (matchId: string) => void;
  onDecline?: (matchId: string) => void;
  onViewProfile: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const detour = match.detourMin > 0 ? `+${match.detourMin} min detour` : 'No extra detour';
  const seats = match.seatsAvailable
    ? `${match.seatsAvailable} seat${match.seatsAvailable === 1 ? '' : 's'} available`
    : match.seatsNeeded
    ? `Needs ${match.seatsNeeded} seat${match.seatsNeeded === 1 ? '' : 's'}`
    : null;

  return (
    <GlassCard style={{ padding: '16px', marginBottom: '12px' }} whileHover={undefined}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', minWidth: 0 }}>
          <div
            aria-hidden
            style={{
              flex: '0 0 40px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: theme.gradientPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: theme.cream,
            }}
          >
            {match.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: theme.cream, fontSize: '1rem' }}>{match.name}</div>
            <div style={{ marginTop: '4px' }}>
              <TrustBadge trust={match.trust} onClick={() => onViewProfile(match.userId)} />
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: theme.cream, fontFeatureSettings: "'tnum' on", lineHeight: 1 }}>
            {Math.round(match.routeCompatibility)}%
          </div>
          <div style={{ fontSize: '0.625rem', color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
            route match
          </div>
        </div>
      </div>

      <div style={{ marginTop: '12px', fontSize: '0.85rem', color: theme.cream }}>
        {match.from} → {match.to}
      </div>
      <div style={{ marginTop: '4px', fontSize: '0.8125rem', color: theme.mutedLight, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
        <span>{fmtTime(match.departure)}</span>
        <span>{detour}</span>
        {seats && <span>{seats}</span>}
        <span>{match.transportMode === 'BIKE' ? '🏍️ Bike' : '🚗 Car'}</span>
      </div>

      {match.sharedCommunities.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '0.78rem', color: theme.primary, fontWeight: 600 }}>
          Same community: {match.sharedCommunities.map((c) => c.name).join(', ')}
        </div>
      )}

      {open && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${theme.glassBorder}` }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme.muted, marginBottom: '6px' }}>
            Why this match
          </div>
          <ReasonList reasons={match.reasons} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <GlassButton variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide route compatibility' : 'View route compatibility'}
        </GlassButton>
        <GlassButton variant="ghost" size="sm" onClick={() => onViewProfile(match.userId)}>
          View profile
        </GlassButton>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {match.requestState === 'NONE' && (
            <GlassButton size="sm" loading={busy} onClick={() => onRequest(match)}>
              Request shared journey
            </GlassButton>
          )}
          {match.requestState === 'REQUESTED' && (
            <span style={{ fontSize: '0.8125rem', color: theme.mutedLight, fontWeight: 600 }}>Requested · waiting for {match.name.split(' ')[0]}</span>
          )}
          {match.requestState === 'INCOMING' && match.matchId && (
            <>
              <GlassButton variant="ghost" size="sm" disabled={busy} onClick={() => onDecline?.(match.matchId!)}>
                Decline
              </GlassButton>
              <GlassButton size="sm" loading={busy} onClick={() => onAccept?.(match.matchId!)}>
                Accept
              </GlassButton>
            </>
          )}
          {match.requestState === 'CONFIRMED' && (
            <span style={{ fontSize: '0.8125rem', color: theme.success, fontWeight: 700 }}>✓ Confirmed</span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
