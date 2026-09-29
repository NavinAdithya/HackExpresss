/**
 * Profile Page — User profile, trusted contacts, and settings
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassSurface, GlassCard, GlassButton, GlassInput, GlassPill, PlanBadge } from '../glass';
import { PageTransition, FadeReveal, StaggerContainer, StaggerItem } from '../animations';
import { useAuthStore } from '../stores/authStore';
import { contactAPI, analyticsAPI } from '../services/api';
import { theme } from '../theme';
import type { TrustedContact } from '../types';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuthStore();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [analytics, setAnalytics] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState(user?.gender || 'other');

  useEffect(() => {
    contactAPI.get().then((res) => setContacts(res.data.contacts)).catch(() => {});
    analyticsAPI.basic().then((res) => setAnalytics(res.data)).catch(() => {});
  }, []);

  const addContact = async () => {
    if (!newContact.name || !newContact.phone) return;
    const updated = [...contacts, newContact];
    try {
      await contactAPI.update(updated);
      setContacts(updated);
      setNewContact({ name: '', phone: '' });
    } catch { /* handled */ }
  };

  const removeContact = async (index: number) => {
    const updated = contacts.filter((_, i) => i !== index);
    try {
      await contactAPI.update(updated);
      setContacts(updated);
    } catch { /* handled */ }
  };

  const handleSave = async () => {
    await updateProfile({ name, gender } as any);
    setEditing(false);
  };

  if (!user) return null;

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px', maxWidth: '600px', margin: '0 auto' }}>
        {/* Profile Header */}
        <FadeReveal>
          <GlassCard style={{ textAlign: 'center', padding: '32px', marginBottom: '24px' }}>
            <motion.div
              style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: theme.gradientPrimary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', fontWeight: 700, margin: '0 auto 16px',
              }}
              whileHover={{ scale: 1.1 }}
            >
              {user.name[0]?.toUpperCase()}
            </motion.div>

            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <GlassInput
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <motion.button
                      key={g}
                      onClick={() => setGender(g)}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        flex: 1, padding: '8px', borderRadius: theme.radiusMd,
                        background: gender === g ? `${theme.primary}20` : theme.surface,
                        border: `1px solid ${gender === g ? theme.primary : theme.glassBorder}`,
                        color: gender === g ? theme.primary : theme.muted,
                        fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {g === 'male' ? '♂️' : g === 'female' ? '♀️' : '⚧'} {g}
                    </motion.button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <GlassButton variant="ghost" onClick={() => setEditing(false)}>Cancel</GlassButton>
                  <GlassButton onClick={handleSave}>Save</GlassButton>
                </div>
              </div>
            ) : (
              <>
                <h2 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '4px' }}>{user.name}</h2>
                <p style={{ color: theme.muted, fontSize: '0.875rem', marginBottom: '8px' }}>
                  📱 +91 {user.phone}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                  <PlanBadge plan={user.plan} size="md" />
                  {user.verified && <GlassPill color={theme.success}>✓ Verified</GlassPill>}
                </div>
                <GlassButton variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  Edit Profile
                </GlassButton>
              </>
            )}
          </GlassCard>
        </FadeReveal>

        {/* Impact Stats */}
        {analytics && (
          <FadeReveal delay={0.1}>
            <h3 style={{
              fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.06em',
              textTransform: 'uppercase', color: theme.muted, marginBottom: '12px',
            }}>
              Your Impact
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { icon: '🚗', label: 'Total Trips', value: analytics.totalTrips, color: theme.primary },
                { icon: '🛣️', label: 'Distance', value: `${analytics.totalDistanceKm} km`, color: theme.secondary },
                { icon: '💰', label: 'Saved', value: `₹${analytics.totalSaved}`, color: theme.accent },
                { icon: '🌱', label: 'CO₂ Saved', value: `${analytics.co2SavedKg} kg`, color: theme.success },
              ].map((stat) => (
                <GlassSurface key={stat.label} style={{ padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.875rem', marginBottom: '4px' }}>{stat.icon}</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: stat.color, fontFeatureSettings: "'tnum' on" }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: '0.5625rem', color: theme.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '2px' }}>
                    {stat.label}
                  </p>
                </GlassSurface>
              ))}
            </div>
          </FadeReveal>
        )}

        {/* Trusted Contacts */}
        <FadeReveal delay={0.2}>
          <h3 style={{
            fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.06em',
            textTransform: 'uppercase', color: theme.muted, marginBottom: '12px',
          }}>
            Trusted Contacts
          </h3>
          <GlassCard style={{ marginBottom: '24px' }}>
            {contacts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {contacts.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px', borderRadius: theme.radiusSm,
                    background: theme.surface,
                  }}>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>👤 {c.name}</p>
                      <p style={{ fontSize: '0.75rem', color: theme.muted }}>{c.phone}</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeContact(i)}
                      style={{ color: theme.danger, fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      ✕
                    </motion.button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: theme.muted, fontSize: '0.8125rem', marginBottom: '16px' }}>
                No trusted contacts yet. Add emergency contacts below.
              </p>
            )}

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
              <GlassButton size="sm" onClick={addContact}>+</GlassButton>
            </div>
          </GlassCard>
        </FadeReveal>

        {/* Actions */}
        <FadeReveal delay={0.3}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <GlassButton variant="secondary" fullWidth onClick={() => navigate('/plans')}>
              ⭐ Manage Plan
            </GlassButton>
            <GlassButton variant="ghost" fullWidth onClick={() => { logout(); navigate('/auth'); }}>
              Sign Out
            </GlassButton>
          </div>
        </FadeReveal>
      </div>
    </PageTransition>
  );
}
