/**
 * Trust UI — shared by Profile, public profiles, match cards and community lists.
 *
 * Two separate ideas, never merged:
 *   IDENTITY  → "Who is this person?"        (verification flags)
 *   TRUST     → "How have they behaved?"     (5 parameters rated 1–10 after journeys)
 */

import { theme } from '../theme';
import type { BehaviorTrust, IdentityFlags, TrustLite, TrustParam } from '../types';

export const TRUST_PARAM_ORDER: TrustParam[] = ['reliability', 'safety', 'respect', 'routeCommitment', 'communication'];

export const TRUST_PARAM_LABEL: Record<TrustParam, string> = {
  reliability: 'Reliability',
  safety: 'Safety',
  respect: 'Respect',
  routeCommitment: 'Route Commitment',
  communication: 'Communication',
};

export function trustColor(level?: string): string {
  switch (level) {
    case 'HIGH':
    case 'GOOD':
      return theme.success;
    case 'FAIR':
      return theme.warning;
    case 'LOW':
      return theme.danger;
    default:
      return theme.mutedLight;
  }
}

const sectionLabel: React.CSSProperties = {
  fontWeight: 700,
  fontSize: '0.75rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: theme.primary,
  margin: 0,
};

/** Compact one-line trust chip for match cards / lists. */
export function TrustBadge({ trust, onClick }: { trust?: TrustLite | BehaviorTrust | null; onClick?: () => void }) {
  const isNew = !trust || trust.count === 0 || trust.overall == null;
  const color = isNew ? theme.mutedLight : trustColor(trust!.level);
  const text = isNew ? 'New member' : `Trust ${trust!.overall!.toFixed(1)} / 10`;
  const sub = isNew ? null : trust!.limitedHistory ? 'limited history' : trust!.label;

  return (
    <span
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '2px 10px',
        borderRadius: theme.radiusFull,
        background: `${color}1F`,
        border: `1px solid ${color}55`,
        color,
        fontSize: '0.72rem',
        fontWeight: 700,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
      {sub && <span style={{ fontWeight: 600, opacity: 0.85 }}>· {sub}</span>}
    </span>
  );
}

function ParamRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ flex: '0 0 132px', fontSize: '0.8125rem', color: theme.mutedLight }}>{label}</span>
      <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(255,248,229,0.08)' }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, value * 10))}%`,
            height: '100%',
            borderRadius: '2px',
            background: theme.primary,
          }}
        />
      </div>
      <span style={{ flex: '0 0 32px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 700, color: theme.cream, fontFeatureSettings: "'tnum' on" }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

/**
 * The Trust block. Exactly five parameters; overall = their average.
 * New users see "New User" — never a made-up 10/10.
 */
export function TrustCard({ trust }: { trust: BehaviorTrust }) {
  const isNew = trust.count === 0 || trust.overall == null || !trust.parameters;

  if (isNew) {
    return (
      <div>
        <h3 style={sectionLabel}>Trust</h3>
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.cream }}>New User</div>
          <p style={{ fontSize: '0.8125rem', color: theme.muted, margin: '6px 0 0', lineHeight: 1.5 }}>
            Trust data will appear after completed shared journeys.
          </p>
        </div>
      </div>
    );
  }

  const color = trustColor(trust.level);
  const journeys = trust.count;

  return (
    <div>
      <h3 style={sectionLabel}>Trust</h3>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color: theme.cream, fontFeatureSettings: "'tnum' on", lineHeight: 1 }}>
          {trust.overall!.toFixed(1)}
        </span>
        <span style={{ fontSize: '0.9rem', color: theme.muted }}>/ 10</span>
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color,
            background: `${color}1F`,
            border: `1px solid ${color}55`,
            padding: '3px 10px',
            borderRadius: theme.radiusFull,
          }}
        >
          {trust.limitedHistory ? 'Limited history' : trust.label}
        </span>
      </div>

      <p style={{ fontSize: '0.75rem', color: theme.muted, margin: '6px 0 16px' }}>
        Based on {journeys} rated shared journey{journeys === 1 ? '' : 's'}
        {trust.limitedHistory && ' · a level is shown after 5'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {TRUST_PARAM_ORDER.map((p) => (
          <ParamRow key={p} label={TRUST_PARAM_LABEL[p]} value={trust.parameters![p]} />
        ))}
      </div>
    </div>
  );
}

/** Identity verification — separate from behavioural trust. Only shows what we actually verify. */
export function IdentityList({ identity }: { identity: IdentityFlags }) {
  const rows: { ok: boolean; label: string }[] = [
    { ok: identity.phone, label: 'Phone verified' },
    { ok: identity.identity, label: 'Identity verified' },
    { ok: identity.face, label: 'Face verified' },
    { ok: identity.traveller, label: 'Traveller approved' },
  ];
  return (
    <div>
      <h3 style={sectionLabel}>Identity</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginTop: '12px' }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: r.ok ? theme.cream : theme.muted }}>
            <span style={{ color: r.ok ? theme.success : theme.muted, fontWeight: 800 }}>{r.ok ? '✓' : '–'}</span>
            {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Match-card "why was this person recommended" list. */
export function ReasonList({ reasons }: { reasons: string[] }) {
  if (!reasons?.length) return null;
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {reasons.map((r) => (
        <li key={r} style={{ fontSize: '0.78rem', color: theme.mutedLight, display: 'flex', gap: '8px' }}>
          <span style={{ color: theme.primary }}>•</span>
          {r}
        </li>
      ))}
    </ul>
  );
}

export { sectionLabel };
