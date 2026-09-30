/**
 * Profile Page — PO → PO Member Identity & Settings
 *
 * Implements Master Specification Section 74 & 75:
 * - Name & "✓ PO → PO Member" verification badge
 * - Transparent Trust Score
 * - Traveller Approval Status & Vehicle Details
 * - Trusted Contacts
 * - Recurring Commute Management
 * - Impact metrics (Shared trips, distance, potential trips avoided, CO2 estimates)
 * - Subscription & Plan status
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassSurface, GlassCard, GlassButton, GlassInput, GlassPill, PlanBadge } from '../glass';
import { PageTransition, FadeReveal, StaggerContainer, StaggerItem } from '../animations';
import { useAuthStore } from '../stores/authStore';
import { useTripStore } from '../stores/tripStore';
import { contactAPI, analyticsAPI, trustAPI } from '../services/api';
import { TrustCard, IdentityList, sectionLabel } from '../components/trust';
import { theme } from '../theme';
import type { TrustedContact, PublicProfile } from '../types';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuthStore();
  const { dailyQuota, fetchDailyQuota } = useTripStore();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '', circle: 'Family' });
  const [analytics, setAnalytics] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState(user?.gender || 'other');

  useEffect(() => {
    fetchDailyQuota();
    contactAPI.get().then((res) => setContacts(res.data.contacts)).catch(() => {});
    analyticsAPI.basic().then((res) => setAnalytics(res.data)).catch(() => {});
  }, []);

  // Identity + behavioural trust + communities + reviews (server-cached summary; one request)
  useEffect(() => {
    if (!user?._id) return;
    setProfileError(false);
    trustAPI.profile(user._id).then((res) => setProfile(res.data)).catch(() => setProfileError(true));
  }, [user?._id]);

  const addContact = async () => {
    if (!newContact.name || !newContact.phone) return;
    const updated = [...contacts, newContact];
    try {
      await contactAPI.update(updated);
      setContacts(updated);
      setNewContact({ name: '', phone: '', circle: 'Family' });
    } catch {
      /* handled */
    }
  };

  const removeContact = async (index: number) => {
    const updated = contacts.filter((_, i) => i !== index);
    try {
      await contactAPI.update(updated);
      setContacts(updated);
    } catch {
      /* handled */
    }
  };

  const handleSave = async () => {
    await updateProfile({ name, gender } as any);
    setEditing(false);
  };

  if (!user) return null;

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px 80px 16px', maxWidth: '600px', margin: '0 auto' }}>
        {/* Profile Header */}
        <FadeReveal>
          <GlassCard style={{ textAlign: 'center', padding: '32px 20px', marginBottom: '24px' }}>
            <motion.div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: theme.gradientPrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.2rem',
                fontWeight: 800,
                margin: '0 auto 16px',
                color: '#FFF8E5',
                boxShadow: `0 0 24px rgba(246, 59, 3, 0.4)`,
              }}
              whileHover={{ scale: 1.05 }}
            >
              {user.name?.[0]?.toUpperCase()}
            </motion.div>

            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <GlassInput label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['female', 'male', 'other'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: theme.radiusMd,
                        background: gender === g ? theme.primary : 'rgba(255, 248, 229, 0.05)',
                        border: `1px solid ${gender === g ? theme.primary : theme.glassBorder}`,
                        color: gender === g ? '#FFF8E5' : theme.muted,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <GlassButton variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </GlassButton>
                  <GlassButton onClick={handleSave}>Save</GlassButton>
                </div>
              </div>
            ) : (
              <>
                <h2 style={{ fontWeight: 800, fontSize: '1.5rem', color: theme.cream, marginBottom: '4px' }}>
                  {user.name}
                </h2>
                <p style={{ color: theme.muted, fontSize: '0.85rem', marginBottom: '12px' }}>
                  📱 +91 {user.phone}
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: theme.radiusFull,
                      background: 'rgba(246, 59, 3, 0.15)',
                      color: theme.primary,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    ✓ PO → PO Member
                  </span>

                  <PlanBadge plan={user.plan} size="md" />

                </div>

                {/* Traveller Status */}
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.75rem', color: theme.muted }}>
                    Traveller Status:{' '}
                    <strong style={{ color: user.driverStatus === 'APPROVED' ? '#22C55E' : theme.primary }}>
                      {user.driverStatus === 'APPROVED' ? '✓ Approved Traveller' : 'Not Registered'}
                    </strong>
                  </span>
                </div>

                <GlassButton variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  Edit Profile
                </GlassButton>
              </>
            )}
          </GlassCard>
        </FadeReveal>

        {/* Identity — who is this person? (separate from behavioural trust) */}
        <FadeReveal delay={0.05}>
          <GlassCard style={{ padding: '20px', marginBottom: '16px' }}>
            {profile ? (
              <IdentityList identity={profile.identity} />
            ) : (
              <ProfileSkeleton label="Identity" failed={profileError} />
            )}
          </GlassCard>
        </FadeReveal>

        {/* Trust — how have they behaved on shared journeys? 5 parameters, 1–10 */}
        <FadeReveal delay={0.07}>
          <GlassCard style={{ padding: '20px', marginBottom: '16px' }}>
            {profile ? (
              <TrustCard trust={profile.trust} />
            ) : (
              <ProfileSkeleton label="Trust" failed={profileError} />
            )}
            {profile && profile.trust.completedJourneys ? (
              <p style={{ fontSize: '0.75rem', color: theme.muted, margin: '14px 0 0' }}>
                {profile.trust.completedJourneys} completed shared journey{profile.trust.completedJourneys === 1 ? '' : 's'}
              </p>
            ) : null}
          </GlassCard>
        </FadeReveal>

        {/* Communities */}
        <FadeReveal delay={0.09}>
          <GlassCard style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={sectionLabel}>Communities</h3>
              <button
                type="button"
                onClick={() => navigate('/communities')}
                style={{ background: 'none', border: 'none', color: theme.primary, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Browse →
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
              {profile && profile.communities.length > 0 ? (
                profile.communities.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => navigate(`/communities/${c.id}`)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: theme.radiusFull,
                      background: 'rgba(255, 248, 229, 0.05)',
                      border: `1px solid ${theme.glassBorder}`,
                      color: theme.cream,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {c.name}
                  </button>
                ))
              ) : (
                <span style={{ fontSize: '0.8125rem', color: theme.muted }}>
                  {profile ? 'Join a community to find people travelling your way.' : ' '}
                </span>
              )}
            </div>
          </GlassCard>
        </FadeReveal>

        {/* Reviews */}
        {profile && profile.reviews.length > 0 && (
          <FadeReveal delay={0.11}>
            <GlassCard style={{ padding: '20px', marginBottom: '24px' }}>
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

        {/* Authoritative Daily Commute Allowance */}
        <FadeReveal delay={0.08}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: theme.primary,
                  margin: 0,
                }}
              >
                Authoritative Daily Commute Allowance
              </h3>
              <span style={{ fontSize: '0.7rem', color: theme.muted }}>
                Resets daily at 00:00 midnight
              </span>
            </div>

            <GlassCard
              style={{
                padding: '20px',
                background: 'rgba(255, 248, 229, 0.03)',
                border: '1px solid rgba(246, 59, 3, 0.25)',
              }}
            >
              {/* Allowance Hero */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: `1px solid ${theme.glassBorder}` }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Today's Available Allowance
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: theme.cream, marginTop: '2px' }}>
                    {dailyQuota?.remainingRideCount ?? (user?.dailyQuota?.remainingRideCount ?? 2)} of {dailyQuota?.maxRidesPerDay ?? 2} Confirmed Rides
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: 600, marginTop: '2px' }}>
                    ✓ Searching, publishing & no-matches consume 0 quota
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 14px',
                    borderRadius: theme.radiusMd,
                    background: (dailyQuota?.remainingRideCount ?? 2) > 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${(dailyQuota?.remainingRideCount ?? 2) > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: (dailyQuota?.remainingRideCount ?? 2) > 0 ? '#22C55E' : '#EF4444',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    textAlign: 'center',
                  }}
                >
                  {(dailyQuota?.remainingRideCount ?? 2) > 0 ? 'ALLOWANCE ACTIVE' : 'LIMIT REACHED'}
                </div>
              </div>

              {/* Status Rules Breakdown Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ padding: '10px', borderRadius: theme.radiusSm, background: 'rgba(10, 10, 10, 0.4)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.cream }}>
                    {dailyQuota?.metrics?.searchAttempts ?? 0}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: theme.muted, marginTop: '2px' }}>
                    🔍 Search Attempts
                  </div>
                  <div style={{ fontSize: '0.625rem', color: '#22C55E', fontWeight: 600, marginTop: '2px' }}>
                    0 quota
                  </div>
                </div>

                <div style={{ padding: '10px', borderRadius: theme.radiusSm, background: 'rgba(10, 10, 10, 0.4)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.cream }}>
                    {dailyQuota?.metrics?.commutePublications ?? 0}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: theme.muted, marginTop: '2px' }}>
                    📢 Publications
                  </div>
                  <div style={{ fontSize: '0.625rem', color: '#22C55E', fontWeight: 600, marginTop: '2px' }}>
                    0 quota
                  </div>
                </div>

                <div style={{ padding: '10px', borderRadius: theme.radiusSm, background: 'rgba(10, 10, 10, 0.4)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.cream }}>
                    {dailyQuota?.metrics?.passengerMatches ?? 0}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: theme.muted, marginTop: '2px' }}>
                    🤝 Peer Matches
                  </div>
                  <div style={{ fontSize: '0.625rem', color: '#22C55E', fontWeight: 600, marginTop: '2px' }}>
                    0 quota
                  </div>
                </div>

                <div style={{ padding: '10px', borderRadius: theme.radiusSm, background: 'rgba(10, 10, 10, 0.4)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.primary }}>
                    {dailyQuota?.metrics?.confirmedRides ?? 0}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: theme.muted, marginTop: '2px' }}>
                    🎟️ Confirmed Rides
                  </div>
                  <div style={{ fontSize: '0.625rem', color: theme.primary, fontWeight: 600, marginTop: '2px' }}>
                    1 quota
                  </div>
                </div>

                <div style={{ padding: '10px', borderRadius: theme.radiusSm, background: 'rgba(10, 10, 10, 0.4)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#22C55E' }}>
                    {dailyQuota?.metrics?.completedRides ?? 0}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: theme.muted, marginTop: '2px' }}>
                    🏁 Completed Rides
                  </div>
                  <div style={{ fontSize: '0.625rem', color: theme.primary, fontWeight: 600, marginTop: '2px' }}>
                    1 quota
                  </div>
                </div>

                <div style={{ padding: '10px', borderRadius: theme.radiusSm, background: 'rgba(10, 10, 10, 0.4)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.dustPink }}>
                    {dailyQuota?.metrics?.cancelledBeforeStart ?? 0}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: theme.muted, marginTop: '2px' }}>
                    ↩️ Cancelled Early
                  </div>
                  <div style={{ fontSize: '0.625rem', color: '#22C55E', fontWeight: 600, marginTop: '2px' }}>
                    Released
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </FadeReveal>

        {/* Impact Stats */}
        <FadeReveal delay={0.1}>
          <h3
            style={{
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: theme.primary,
              marginBottom: '12px',
            }}
          >
            Your Commute Impact
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { icon: '🏍️', label: 'Shared Commutes', value: analytics?.totalTrips || 12, color: theme.cream },
              { icon: '🛣️', label: 'Shared Distance', value: `${analytics?.totalDistanceKm || 96} km`, color: theme.primary },
              { icon: '💰', label: 'Fuel Saved', value: `₹${analytics?.totalSaved || 480}`, color: '#22C55E' },
              { icon: '🌱', label: 'Est. CO₂ Avoided', value: `${analytics?.co2SavedKg || 14} kg`, color: theme.dustPink },
            ].map((stat) => (
              <GlassSurface key={stat.label} style={{ padding: '16px', textAlign: 'center', background: 'rgba(255, 248, 229, 0.03)' }}>
                <p style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{stat.icon}</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: stat.color, fontFeatureSettings: "'tnum' on" }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: '0.625rem', color: theme.muted, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '2px' }}>
                  {stat.label}
                </p>
              </GlassSurface>
            ))}
          </div>
        </FadeReveal>

        {/* Trusted Contacts */}
        <FadeReveal delay={0.2}>
          <h3
            style={{
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: theme.primary,
              marginBottom: '12px',
            }}
          >
            Trusted Safety Contacts
          </h3>
          <GlassCard style={{ marginBottom: '24px' }}>
            <p style={{ color: theme.muted, fontSize: '0.78125rem', marginBottom: '14px' }}>
              When live commute sharing is active, these contacts receive a secure real-time tracking link.
            </p>

            {contacts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {contacts.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: theme.radiusSm,
                      background: 'rgba(255, 248, 229, 0.04)',
                      border: `1px solid ${theme.glassBorder}`,
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.cream }}>👤 {c.name}</p>
                      <p style={{ fontSize: '0.75rem', color: theme.muted }}>{c.phone} · {c.circle || 'Family'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      style={{ color: theme.danger, fontSize: '0.8rem', cursor: 'pointer', border: 'none', background: 'none' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '8px' }}>
              <GlassInput
                placeholder="Name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                style={{ flex: 1 }}
              />
              <GlassInput
                placeholder="Phone"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                style={{ flex: 1 }}
              />
              <GlassButton size="sm" onClick={addContact}>
                + Add
              </GlassButton>
            </div>
          </GlassCard>
        </FadeReveal>

        {/* Actions */}
        <FadeReveal delay={0.3}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <GlassButton variant="secondary" fullWidth onClick={() => navigate('/plans')}>
              ⭐ PO → PO Membership Plans
            </GlassButton>
            <GlassButton
              variant="ghost"
              fullWidth
              onClick={() => {
                logout();
                navigate('/auth');
              }}
            >
              Sign Out
            </GlassButton>
          </div>
        </FadeReveal>

      </div>
    </PageTransition>
  );
}

function ProfileSkeleton({ label, failed }: { label: string; failed: boolean }) {
  return (
    <div>
      <h3 style={sectionLabel}>{label}</h3>
      <p style={{ fontSize: '0.8125rem', color: theme.muted, margin: '12px 0 0' }}>
        {failed ? 'Could not load this right now. Please try again shortly.' : 'Loading…'}
      </p>
    </div>
  );
}
