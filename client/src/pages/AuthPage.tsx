/**
 * Auth Page — Phone + OTP login
 * Premium visual with glass surfaces and animated transitions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../components/Logo';
import { GlassSurface, GlassButton, GlassInput } from '../glass';
import { PageTransition, FadeReveal } from '../animations';
import { useAuthStore } from '../stores/authStore';
import { theme } from '../theme';

export function AuthPage() {
  const navigate = useNavigate();
  const { user, sendOTP, login, quickLogin, loading, error } = useAuthStore();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState('');

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSendOTP = async () => {
    if (phone.length < 10) return;
    const devOtp = await sendOTP(phone, name || undefined);
    setSentOtp(devOtp || '123456');
    setStep('otp');
  };

  const handleVerifyOTP = async () => {
    try {
      await login(phone, otp || '123456');
      navigate('/', { replace: true });
    } catch { /* error shown via store */ }
  };

  const handleQuickLogin = async (demoPhone: string, demoName: string) => {
    try {
      setPhone(demoPhone);
      setName(demoName);
      await quickLogin(demoPhone, demoName);
      navigate('/', { replace: true });
    } catch { /* handled via store */ }
  };

  return (
    <PageTransition>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: theme.background,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(123,97,255,0.06) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <FadeReveal>
            <Logo size="lg" showTagline style={{ marginBottom: '48px' }} />
          </FadeReveal>

          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <GlassSurface style={{ padding: '32px', borderRadius: theme.radiusXl }}>
                  <h2 style={{
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    letterSpacing: '-0.02em',
                    marginBottom: '8px',
                  }}>
                    Welcome
                  </h2>
                  <p style={{ color: theme.muted, fontSize: '0.875rem', marginBottom: '28px' }}>
                    Enter your phone number to get started
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <GlassInput
                      label="Name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <GlassInput
                      label="Phone Number"
                      placeholder="9876543210"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                    {error && (
                      <p style={{ color: theme.danger, fontSize: '0.8125rem' }}>{error}</p>
                    )}
                    <GlassButton
                      onClick={handleSendOTP}
                      loading={loading}
                      disabled={phone.length < 10}
                      fullWidth
                      size="lg"
                    >
                      Continue
                    </GlassButton>

                    {/* 1-Click Verified Demo Accounts */}
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${theme.glassBorder}` }}>
                      <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: theme.muted, marginBottom: '10px', textAlign: 'center' }}>
                        ⚡ 1-Click Verified Demo Accounts
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleQuickLogin('9876543210', 'Priya Sharma')}
                          style={{
                            padding: '10px 14px',
                            borderRadius: theme.radiusMd,
                            background: 'rgba(0, 212, 255, 0.08)',
                            border: '1px solid rgba(0, 212, 255, 0.25)',
                            color: theme.foreground,
                            fontSize: '0.8125rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}
                        >
                          <span>🛡️ <strong>Priya Sharma</strong> (Verified Passenger)</span>
                          <span style={{ color: theme.primary, fontSize: '0.75rem', fontWeight: 600 }}>Log In →</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickLogin('9876543211', 'Rahul Kumar')}
                          style={{
                            padding: '10px 14px',
                            borderRadius: theme.radiusMd,
                            background: 'rgba(123, 97, 255, 0.08)',
                            border: '1px solid rgba(123, 97, 255, 0.25)',
                            color: theme.foreground,
                            fontSize: '0.8125rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}
                        >
                          <span>⚡ <strong>Rahul Kumar</strong> (Verified Driver)</span>
                          <span style={{ color: theme.secondary, fontSize: '0.75rem', fontWeight: 600 }}>Log In →</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickLogin('9876543212', 'Ananya Iyer')}
                          style={{
                            padding: '10px 14px',
                            borderRadius: theme.radiusMd,
                            background: 'rgba(0, 255, 163, 0.08)',
                            border: '1px solid rgba(0, 255, 163, 0.25)',
                            color: theme.foreground,
                            fontSize: '0.8125rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}
                        >
                          <span>👩 <strong>Ananya Iyer</strong> (Women-Only Pool Preference)</span>
                          <span style={{ color: theme.accent, fontSize: '0.75rem', fontWeight: 600 }}>Log In →</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassSurface>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <GlassSurface style={{ padding: '32px', borderRadius: theme.radiusXl }}>
                  <h2 style={{
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    letterSpacing: '-0.02em',
                    marginBottom: '8px',
                  }}>
                    Verify OTP
                  </h2>
                  <p style={{ color: theme.muted, fontSize: '0.875rem', marginBottom: '8px' }}>
                    Enter the code sent to +91 {phone}
                  </p>
                  <p style={{
                    color: theme.warning,
                    fontSize: '0.75rem',
                    marginBottom: '20px',
                    padding: '8px 12px',
                    background: `${theme.warning}10`,
                    borderRadius: theme.radiusSm,
                    border: `1px solid ${theme.warning}30`,
                  }}>
                    🔐 Demo OTP: <strong>{sentOtp || '123456'}</strong> (or enter <strong>123456</strong>)
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <GlassInput
                      label="OTP Code"
                      placeholder="Enter 6-digit OTP"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      style={{
                        textAlign: 'center',
                        fontSize: '1.5rem',
                        letterSpacing: '0.3em',
                        fontWeight: 600,
                      }}
                    />
                    {error && (
                      <p style={{ color: theme.danger, fontSize: '0.8125rem' }}>{error}</p>
                    )}
                    <GlassButton
                      onClick={handleVerifyOTP}
                      loading={loading}
                      disabled={otp.length !== 6}
                      fullWidth
                      size="lg"
                    >
                      Verify & Login
                    </GlassButton>
                    <GlassButton
                      variant="ghost"
                      onClick={() => { setStep('phone'); setOtp(''); }}
                      fullWidth
                    >
                      Change number
                    </GlassButton>
                  </div>
                </GlassSurface>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}
