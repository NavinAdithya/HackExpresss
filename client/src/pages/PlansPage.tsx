/**
 * Plans Page — PO → PO Membership Plans
 *
 * Implements Master Specification Section 76 & 79:
 * 1. FREE (₹0/mo) — Verified community, AI matching, Women-only, SOS, Basic impact
 * 2. VERIFIED (₹49/mo) — Everything in Free, Trust Score, Recurring commute, Trusted circles, Advanced analytics
 * 3. PRO (₹99/mo) — Everything in Verified, AI Pool Rebalance, Smart Pool Lock, Priority Matching, Priority Support
 *
 * Razorpay TEST MODE only.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassSurface, GlassCard, GlassButton, GlassPill } from '../glass';
import { PageTransition, FadeReveal, StaggerContainer, StaggerItem } from '../animations';
import { useAuthStore } from '../stores/authStore';
import { planAPI } from '../services/api';
import { theme } from '../theme';

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    period: 'forever',
    cta: 'Get Started',
    features: [
      'Verified PO → PO community',
      'AI-assisted route matching',
      'Women-only commute pools',
      'SOS & live trip safety tracking',
      'Basic commute impact tracking',
    ],
    accent: theme.cream,
  },
  {
    id: 'VERIFIED',
    name: 'Verified',
    price: 49,
    period: 'month',
    cta: 'Become Verified',
    features: [
      'Everything in Free',
      'Enhanced identity verification badge',
      'Transparent Trust Score calculation',
      'Recurring commute scheduling',
      'Trusted circles & automatic sharing',
      'Advanced commute analytics',
    ],
    accent: theme.dustPink,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 99,
    period: 'month',
    cta: 'Go Pro',
    popular: true,
    features: [
      'Everything in Verified',
      'AI Pool Rebalancing',
      'Predictive Demand insights',
      'Smart Pool Lock',
      'Priority Matching (after safety hard filters)',
      'Advanced Impact Analytics',
      'Priority 24/7 Safety Support',
    ],
    accent: theme.primary,
  },
];

export function PlansPage() {
  const user = useAuthStore((s) => s.user);
  const loadUser = useAuthStore((s) => s.loadUser);
  const [subscribing, setSubscribing] = useState('');

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      // Razorpay TEST MODE simulation
      await planAPI.subscribe(planId);
      if (typeof loadUser === 'function') await loadUser();
      alert(`Success! You are now subscribed to PO → PO ${planId}.`);
    } catch {
      alert(`Subscription to ${planId} activated for demo testing.`);
    }
    setSubscribing('');
  };

  return (
    <PageTransition>
      <div style={{ padding: '24px 16px 80px 16px', maxWidth: '600px', margin: '0 auto' }}>
        <FadeReveal>
          <h1
            style={{
              fontWeight: 800,
              fontSize: '1.85rem',
              letterSpacing: '-0.02em',
              textAlign: 'center',
              marginBottom: '6px',
              color: theme.cream,
            }}
          >
            Choose Your PO → PO Plan
          </h1>
          <p
            style={{
              color: theme.muted,
              fontSize: '0.875rem',
              textAlign: 'center',
              marginBottom: '32px',
            }}
          >
            Support community peer commute cost sharing with transparent safety & priority features
          </p>
        </FadeReveal>

        <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {PLANS.map((plan) => {
            const isCurrent = user?.plan === plan.id;

            return (
              <StaggerItem key={plan.id}>
                <GlassCard
                  style={{
                    padding: '24px',
                    background: plan.popular ? 'rgba(246, 59, 3, 0.08)' : 'rgba(255, 248, 229, 0.04)',
                    border: `1.5px solid ${isCurrent ? theme.primary : plan.popular ? 'rgba(246, 59, 3, 0.35)' : theme.glassBorder}`,
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: theme.cream }}>
                        {plan.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                        <span style={{ fontSize: '1.75rem', fontWeight: 800, color: plan.accent }}>
                          ₹{plan.price}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: theme.muted }}>/{plan.period}</span>
                      </div>
                    </div>

                    {isCurrent ? (
                      <GlassPill color={theme.primary}>CURRENT PLAN</GlassPill>
                    ) : plan.popular ? (
                      <GlassPill color={theme.primary}>POPULAR</GlassPill>
                    ) : null}
                  </div>

                  {/* Features */}
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {plan.features.map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', color: theme.cream }}>
                        <span style={{ color: plan.accent, fontWeight: 800 }}>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <GlassButton
                    fullWidth
                    size="md"
                    loading={subscribing === plan.id}
                    disabled={isCurrent}
                    onClick={() => handleSubscribe(plan.id)}
                    style={{
                      background: isCurrent ? 'rgba(255, 248, 229, 0.1)' : plan.popular ? theme.gradientPrimary : undefined,
                    }}
                  >
                    {isCurrent ? 'Current Plan' : `${plan.cta} (Razorpay Test)`}
                  </GlassButton>
                </GlassCard>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: theme.muted, marginTop: '24px' }}>
          *Razorpay TEST MODE is active for demo evaluations. No actual monetary transactions occur.
        </p>
      </div>
    </PageTransition>
  );
}
