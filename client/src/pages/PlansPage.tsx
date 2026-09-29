/**
 * Plans Page — Subscription tiers with Razorpay or mock checkout
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassSurface, GlassCard, GlassButton, GlassPill } from '../glass';
import { PageTransition, FadeReveal, StaggerContainer, StaggerItem } from '../animations';
import { useAuthStore } from '../stores/authStore';
import { planAPI } from '../services/api';
import { theme } from '../theme';
import type { Plan } from '../types';

const planAccents: Record<string, { gradient: string; glow: string; accent: string }> = {
  FREE: {
    gradient: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(0,212,255,0.02))',
    glow: 'none',
    accent: theme.primary,
  },
  VERIFIED: {
    gradient: 'linear-gradient(135deg, rgba(123,97,255,0.1), rgba(123,97,255,0.03))',
    glow: `0 0 30px rgba(123,97,255,0.15)`,
    accent: theme.planVerified,
  },
  PRO: {
    gradient: 'linear-gradient(135deg, rgba(255,184,0,0.12), rgba(255,184,0,0.04))',
    glow: `0 0 30px rgba(255,184,0,0.2)`,
    accent: theme.planPro,
  },
};

export function PlansPage() {
  const user = useAuthStore((s) => s.user);
  const loadUser = useAuthStore((s) => s.loadUser);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscribing, setSubscribing] = useState('');

  useEffect(() => {
    planAPI.getAll().then((res) => setPlans(res.data.plans)).catch(() => {});
  }, []);

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      await planAPI.subscribe(planId);
      await loadUser();
    } catch { /* handled */ }
    setSubscribing('');
  };

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px', maxWidth: '600px', margin: '0 auto' }}>
        <FadeReveal>
          <h1 style={{
            fontWeight: 700,
            fontSize: '2rem',
            letterSpacing: '-0.03em',
            textAlign: 'center',
            marginBottom: '8px',
          }}>
            Choose Your Plan
          </h1>
          <p style={{
            color: theme.muted,
            fontSize: '0.875rem',
            textAlign: 'center',
            marginBottom: '32px',
          }}>
            Unlock premium safety features and priority matching
          </p>
        </FadeReveal>

        <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {plans.map((plan) => {
            const accent = planAccents[plan.id] || planAccents.FREE;
            const isCurrent = user?.plan === plan.id;

            return (
              <StaggerItem key={plan.id}>
                <GlassCard
                  style={{
                    padding: '28px',
                    background: accent.gradient,
                    boxShadow: accent.glow,
                    borderColor: isCurrent ? `${accent.accent}60` : undefined,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {isCurrent && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                    }}>
                      <GlassPill color={accent.accent}>CURRENT</GlassPill>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.5rem' }}>{plan.icon || '📱'}</span>
                    <h2 style={{ fontWeight: 700, fontSize: '1.25rem', color: accent.accent }}>
                      {plan.label}
                    </h2>
                  </div>

                  <p style={{ color: theme.mutedLight, fontSize: '0.875rem', marginBottom: '16px' }}>
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{
                      fontSize: '2.5rem',
                      fontWeight: 700,
                      color: accent.accent,
                      fontFeatureSettings: "'tnum' on",
                    }}>
                      {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                    </span>
                    {plan.interval && (
                      <span style={{ color: theme.muted, fontSize: '0.875rem' }}>/{plan.interval}</span>
                    )}
                  </div>

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                    {plan.features.map((feature, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: accent.accent, fontSize: '0.8125rem' }}>✓</span>
                        <span style={{ fontSize: '0.8125rem', color: theme.mutedLight }}>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {!isCurrent && plan.price > 0 && (
                    <GlassButton
                      fullWidth
                      loading={subscribing === plan.id}
                      onClick={() => handleSubscribe(plan.id)}
                      style={{
                        background: plan.id === 'PRO' ? `linear-gradient(135deg, ${theme.planPro}, #FF6B00)` : theme.gradientPrimary,
                      }}
                    >
                      {plan.cta}
                    </GlassButton>
                  )}

                  {isCurrent && (
                    <GlassButton variant="ghost" fullWidth disabled>
                      Current Plan
                    </GlassButton>
                  )}
                </GlassCard>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}
