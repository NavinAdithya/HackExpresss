/**
 * Communities — mobility groups: find people from communities you belong to
 * who are travelling your way and may have seats. Not a social feed.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard, GlassButton, GlassInput } from '../glass';
import { PageTransition, FadeReveal } from '../animations';
import { sectionLabel } from '../components/trust';
import { communityAPI } from '../services/api';
import { theme } from '../theme';
import type { Community, CommunityCategory } from '../types';

const CATEGORY_META: Record<CommunityCategory, { title: string; icon: string }> = {
  COLLEGE: { title: 'Colleges', icon: '🎓' },
  OFFICE: { title: 'Offices', icon: '🏢' },
  ROUTE: { title: 'Regular routes', icon: '🛣️' },
  ORGANIZATION: { title: 'Organizations', icon: '🤝' },
  OTHER: { title: 'Other', icon: '✨' },
};

const ORDER: CommunityCategory[] = ['COLLEGE', 'OFFICE', 'ROUTE', 'ORGANIZATION', 'OTHER'];

export function CommunitiesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<{ communities: Record<CommunityCategory, Community[]>; mine: Community[] } | null>(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState<CommunityCategory | 'ALL'>('ALL');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('COLLEGE');
  const [createError, setCreateError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await communityAPI.list();
      setData(res.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not load communities.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleMembership = async (c: Community) => {
    setBusyId(c._id);
    try {
      if (c.isMember) await communityAPI.leave(c._id);
      else await communityAPI.join(c._id);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not update membership.');
    }
    setBusyId(null);
  };

  const create = async () => {
    setCreateError('');
    try {
      const res = await communityAPI.create({ name: name.trim(), category });
      setCreating(false);
      setName('');
      navigate(`/communities/${res.data.community._id}`);
    } catch (err: any) {
      setCreateError(err.response?.data?.error || 'Could not create the community.');
    }
  };

  const visible = ORDER.filter((c) => active === 'ALL' || active === c);

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px 96px', maxWidth: '600px', margin: '0 auto' }}>
        <FadeReveal>
          <h1 style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.02em', color: theme.cream, margin: '0 0 4px' }}>Communities</h1>
          <p style={{ color: theme.muted, fontSize: '0.85rem', margin: '0 0 20px', lineHeight: 1.5 }}>
            Find people from your communities who are already going your way and have seats.
          </p>
        </FadeReveal>

        {error && (
          <GlassCard style={{ textAlign: 'center', marginBottom: '16px' }} whileHover={undefined}>
            <p style={{ color: theme.danger, fontSize: '0.85rem', margin: '0 0 12px' }}>{error}</p>
            <GlassButton size="sm" onClick={load}>Try again</GlassButton>
          </GlassCard>
        )}

        {!data && !error && <p style={{ color: theme.muted, fontSize: '0.85rem' }}>Loading communities…</p>}

        {data && (
          <>
            {data.mine.length > 0 && (
              <FadeReveal>
                <h3 style={{ ...sectionLabel, margin: '0 0 12px' }}>Your communities</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '22px' }}>
                  {data.mine.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => navigate(`/communities/${c._id}`)}
                      style={{ padding: '8px 14px', borderRadius: theme.radiusFull, background: 'rgba(246,59,3,0.14)', border: `1px solid ${theme.primary}`, color: theme.cream, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </FadeReveal>
            )}

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '16px' }}>
              {(['ALL', ...ORDER] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active === c}
                  onClick={() => setActive(c)}
                  style={{
                    flex: '0 0 auto', padding: '6px 14px', borderRadius: theme.radiusFull, cursor: 'pointer',
                    background: active === c ? theme.primary : 'rgba(255,248,229,0.05)',
                    border: `1px solid ${active === c ? theme.primary : theme.glassBorder}`,
                    color: active === c ? theme.cream : theme.mutedLight, fontSize: '0.78rem', fontWeight: 600,
                  }}
                >
                  {c === 'ALL' ? 'All' : CATEGORY_META[c].title}
                </button>
              ))}
            </div>

            {visible.map((cat) => {
              const list = data.communities[cat] || [];
              return (
                <FadeReveal key={cat}>
                  <h3 style={{ ...sectionLabel, margin: '8px 0 12px' }}>{CATEGORY_META[cat].icon} {CATEGORY_META[cat].title}</h3>
                  {list.length === 0 && (
                    <p style={{ color: theme.muted, fontSize: '0.8125rem', margin: '0 0 18px' }}>
                      No communities here yet — create the first one.
                    </p>
                  )}
                  {list.map((c) => (
                    <GlassCard
                      key={c._id}
                      style={{ padding: '14px 16px', marginBottom: '10px', cursor: 'pointer' }}
                      onClick={() => navigate(`/communities/${c._id}`)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: theme.cream }}>{c.name}</div>
                          <div style={{ fontSize: '0.78rem', color: theme.muted, marginTop: '2px' }}>
                            {c.memberCount} member{c.memberCount === 1 ? '' : 's'}
                          </div>
                        </div>
                        <GlassButton
                          size="sm"
                          variant={c.isMember ? 'ghost' : 'primary'}
                          loading={busyId === c._id}
                          onClick={(e) => { e.stopPropagation(); toggleMembership(c); }}
                        >
                          {c.isMember ? 'Joined ✓' : 'Join'}
                        </GlassButton>
                      </div>
                    </GlassCard>
                  ))}
                </FadeReveal>
              );
            })}

            <div style={{ marginTop: '20px' }}>
              {!creating ? (
                <GlassButton variant="ghost" fullWidth onClick={() => setCreating(true)}>+ Create a community</GlassButton>
              ) : (
                <GlassCard style={{ padding: '18px' }} whileHover={undefined}>
                  <h3 style={{ ...sectionLabel, margin: '0 0 12px' }}>New community</h3>
                  <GlassInput aria-label="Community name" placeholder="e.g. Tambaram → Ramapuram" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '12px 0' }}>
                    {ORDER.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={category === c}
                        onClick={() => setCategory(c)}
                        style={{
                          padding: '6px 12px', borderRadius: theme.radiusFull, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                          background: category === c ? theme.primary : 'rgba(255,248,229,0.05)',
                          border: `1px solid ${category === c ? theme.primary : theme.glassBorder}`,
                          color: category === c ? theme.cream : theme.mutedLight,
                        }}
                      >
                        {CATEGORY_META[c].title}
                      </button>
                    ))}
                  </div>
                  {createError && <p role="alert" style={{ color: theme.danger, fontSize: '0.8125rem', margin: '0 0 10px' }}>{createError}</p>}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <GlassButton variant="ghost" size="sm" onClick={() => { setCreating(false); setCreateError(''); }}>Cancel</GlassButton>
                    <GlassButton size="sm" disabled={name.trim().length < 3} onClick={create}>Create</GlassButton>
                  </div>
                </GlassCard>
              )}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
