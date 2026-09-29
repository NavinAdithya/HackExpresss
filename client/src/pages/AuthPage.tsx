/**
 * Auth Page — PO → PO 5-Step Account Registration & Phone OTP Flow
 *
 * Steps (Master Specification Section 12):
 *   Step 1: Phone number
 *   Step 2: Phone OTP verification
 *   Step 3: Basic Profile (Name, Date of Birth, Gender)
 *   Step 4: Biometric Face Reference capture (Reference identity established)
 *   Step 5: Role selection (PASSENGER or PASSENGER + TRAVELLER)
 *
 * Shows: "✓ PO → PO Member"
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../components/Logo';
import { GlassSurface, GlassButton, GlassInput, GlassCard } from '../glass';
import { PageTransition, FadeReveal } from '../animations';
import { useAuthStore } from '../stores/authStore';
import { theme } from '../theme';

type Step = 'phone' | 'otp' | 'profile' | 'face' | 'role' | 'complete';

export function AuthPage() {
  const navigate = useNavigate();
  const { user, sendOTP, login, quickLogin, updateProfile, loading, error } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState('');

  // Profile data
  const [name, setName] = useState('');
  const [dob, setDob] = useState('1998-05-15');
  const [gender, setGender] = useState<'female' | 'male' | 'other'>('female');
  const [rolePref, setRolePref] = useState<'PASSENGER' | 'BOTH'>('BOTH');
  const [referenceFaceCaptured, setReferenceFaceCaptured] = useState(false);
  const [faceData, setFaceData] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    if (user && step === 'phone') {
      navigate('/', { replace: true });
    }
  }, [user, navigate, step]);

  const handleSendOTP = async () => {
    if (phone.length < 10) return;
    const devOtp = await sendOTP(phone, name || undefined);
    setSentOtp(devOtp || '123456');
    setStep('otp');
  };

  const handleVerifyOTP = async () => {
    try {
      await login(phone, otp || '123456');
      setStep('profile');
    } catch {
      /* error shown via store */
    }
  };

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      // Fallback simulated capture for environments without camera
      setFaceData('data:image/jpeg;base64,registered_reference_face_sample');
      setReferenceFaceCaptured(true);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 320);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setFaceData(dataUrl);
      }
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach((t) => t.stop());
      setCameraActive(false);
    } else {
      setFaceData('data:image/jpeg;base64,registered_reference_face_sample');
    }
    setReferenceFaceCaptured(true);
  };

  const handleCompleteRegistration = async () => {
    try {
      await updateProfile({
        name: name || `Member ${phone.slice(-4)}`,
        gender,
        dateOfBirth: dob,
        faceReferencePhoto: faceData || 'data:image/jpeg;base64,registered_reference_face',
        rolePreference: rolePref,
      });
      setStep('complete');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1800);
    } catch {
      /* handled */
    }
  };

  const handleQuickLogin = async (demoPhone: string, demoName: string) => {
    try {
      setPhone(demoPhone);
      setName(demoName);
      await quickLogin(demoPhone, demoName);
      navigate('/', { replace: true });
    } catch {
      /* handled via store */
    }
  };

  return (
    <PageTransition>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: theme.background,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient radial glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(246,59,3,0.14) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(79,20,9,0.2) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
          <FadeReveal>
            <Logo size="lg" showTagline style={{ marginBottom: '36px' }} />
          </FadeReveal>

          <AnimatePresence mode="wait">
            {/* STEP 1: Phone */}
            {step === 'phone' && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassSurface style={{ padding: '32px', borderRadius: theme.radiusXl }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: theme.cream, marginBottom: '6px' }}>
                    Join the Community
                  </h2>
                  <p style={{ color: theme.muted, fontSize: '0.85rem', marginBottom: '24px' }}>
                    Enter your phone number to find or share an existing commute
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <GlassInput
                      label="Mobile Number"
                      placeholder="9876543210"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />

                    {error && <p style={{ color: theme.danger, fontSize: '0.8125rem' }}>{error}</p>}

                    <GlassButton onClick={handleSendOTP} loading={loading} disabled={phone.length < 10} fullWidth size="lg">
                      Send Verification OTP
                    </GlassButton>

                    {/* 1-Click Verified Demo Accounts */}
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${theme.glassBorder}` }}>
                      <p
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: theme.primary,
                          marginBottom: '10px',
                          textAlign: 'center',
                        }}
                      >
                        ⚡ 1-Click Verified Demo Accounts
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleQuickLogin('9876543210', 'Priya Sharma')}
                          style={{
                            padding: '10px 14px',
                            borderRadius: theme.radiusMd,
                            background: 'rgba(246, 59, 3, 0.08)',
                            border: '1px solid rgba(246, 59, 3, 0.25)',
                            color: theme.cream,
                            fontSize: '0.8125rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}
                        >
                          <span>🛡️ <strong>Priya Sharma</strong> (Passenger · Verified)</span>
                          <span style={{ color: theme.primary, fontSize: '0.75rem', fontWeight: 700 }}>Log In →</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickLogin('9876543211', 'Rahul Kumar')}
                          style={{
                            padding: '10px 14px',
                            borderRadius: theme.radiusMd,
                            background: 'rgba(246, 59, 3, 0.08)',
                            border: '1px solid rgba(246, 59, 3, 0.25)',
                            color: theme.cream,
                            fontSize: '0.8125rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                          }}
                        >
                          <span>🏍️ <strong>Rahul Kumar</strong> (Traveller · Approved)</span>
                          <span style={{ color: theme.primary, fontSize: '0.75rem', fontWeight: 700 }}>Log In →</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassSurface>
              </motion.div>
            )}

            {/* STEP 2: Phone OTP */}
            {step === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassSurface style={{ padding: '32px', borderRadius: theme.radiusXl }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.4rem', color: theme.cream, marginBottom: '6px' }}>
                    Enter Verification Code
                  </h2>
                  <p style={{ color: theme.muted, fontSize: '0.85rem', marginBottom: '24px' }}>
                    Sent to +91 {phone}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <GlassInput
                      label="6-Digit OTP"
                      placeholder="123456"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />

                    {sentOtp && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: theme.radiusMd,
                          background: 'rgba(246, 59, 3, 0.1)',
                          border: '1px solid rgba(246, 59, 3, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontSize: '0.8125rem', color: theme.cream }}>Demo OTP: <strong>{sentOtp}</strong></span>
                        <button
                          type="button"
                          onClick={() => setOtp(sentOtp)}
                          style={{ fontSize: '0.75rem', color: theme.primary, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Auto-fill
                        </button>
                      </div>
                    )}

                    {error && <p style={{ color: theme.danger, fontSize: '0.8125rem' }}>{error}</p>}

                    <GlassButton onClick={handleVerifyOTP} loading={loading} fullWidth size="lg">
                      Verify & Continue
                    </GlassButton>
                  </div>
                </GlassSurface>
              </motion.div>
            )}

            {/* STEP 3: Basic Profile */}
            {step === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassSurface style={{ padding: '32px', borderRadius: theme.radiusXl }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.35rem', color: theme.cream, marginBottom: '6px' }}>
                    Step 3: Basic Profile
                  </h2>
                  <p style={{ color: theme.muted, fontSize: '0.85rem', marginBottom: '20px' }}>
                    Used for community trust & passenger safety
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <GlassInput
                      label="Full Name"
                      placeholder="e.g. Priya Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />

                    <GlassInput
                      label="Date of Birth"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.muted, marginBottom: '6px', display: 'block' }}>
                        Gender
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {(['female', 'male', 'other'] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGender(g)}
                            style={{
                              flex: 1,
                              padding: '10px',
                              borderRadius: theme.radiusMd,
                              background: gender === g ? theme.primary : 'rgba(255, 248, 229, 0.05)',
                              color: gender === g ? '#FFF8E5' : theme.muted,
                              fontWeight: gender === g ? 700 : 500,
                              fontSize: '0.8125rem',
                              border: `1px solid ${gender === g ? theme.primary : theme.glassBorder}`,
                              cursor: 'pointer',
                              textTransform: 'capitalize',
                            }}
                          >
                            {g === 'female' ? '♀️ Female' : g === 'male' ? '♂️ Male' : 'Other'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <GlassButton
                      onClick={() => setStep('face')}
                      disabled={!name.trim()}
                      fullWidth
                      size="lg"
                    >
                      Next: Establish Face Identity →
                    </GlassButton>
                  </div>
                </GlassSurface>
              </motion.div>
            )}

            {/* STEP 4: Face Reference Capture */}
            {step === 'face' && (
              <motion.div
                key="face"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassSurface style={{ padding: '32px', borderRadius: theme.radiusXl }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.35rem', color: theme.cream, marginBottom: '6px' }}>
                    Step 4: Establish Reference Identity
                  </h2>
                  <p style={{ color: theme.muted, fontSize: '0.825rem', marginBottom: '20px' }}>
                    Prevents account substitution. Live pickup checks are verified against this reference.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '200px',
                        height: '200px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: `3px solid ${theme.primary}`,
                        boxShadow: `0 0 20px rgba(246, 59, 3, 0.3)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#140D0B',
                      }}
                    >
                      {cameraActive ? (
                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : referenceFaceCaptured ? (
                        <div style={{ textAlign: 'center', padding: '16px' }}>
                          <span style={{ fontSize: '3rem' }}>✓</span>
                          <p style={{ fontSize: '0.75rem', color: theme.cream, marginTop: '4px', fontWeight: 600 }}>Face Established</p>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px' }}>
                          <span style={{ fontSize: '3rem' }}>👤</span>
                          <p style={{ fontSize: '0.75rem', color: theme.muted, marginTop: '4px' }}>Camera Preview</p>
                        </div>
                      )}
                    </div>

                    {!cameraActive && !referenceFaceCaptured && (
                      <GlassButton onClick={startCamera} size="md">
                        📸 Open Camera
                      </GlassButton>
                    )}

                    {cameraActive && (
                      <GlassButton onClick={capturePhoto} size="md">
                        Capture Photo
                      </GlassButton>
                    )}

                    {referenceFaceCaptured && (
                      <GlassButton onClick={() => setStep('role')} fullWidth size="lg">
                        Confirm Identity & Continue →
                      </GlassButton>
                    )}
                  </div>
                </GlassSurface>
              </motion.div>
            )}

            {/* STEP 5: How will you use PO → PO? */}
            {step === 'role' && (
              <motion.div
                key="role"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassSurface style={{ padding: '32px', borderRadius: theme.radiusXl }}>
                  <h2 style={{ fontWeight: 800, fontSize: '1.35rem', color: theme.cream, marginBottom: '6px' }}>
                    Step 5: Your PO → PO Role
                  </h2>
                  <p style={{ color: theme.muted, fontSize: '0.85rem', marginBottom: '20px' }}>
                    How will you primarily use PO → PO? (You can change anytime)
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                    <div
                      onClick={() => setRolePref('PASSENGER')}
                      style={{
                        padding: '16px',
                        borderRadius: theme.radiusLg,
                        background: rolePref === 'PASSENGER' ? 'rgba(246, 59, 3, 0.12)' : 'rgba(255, 248, 229, 0.04)',
                        border: `1.5px solid ${rolePref === 'PASSENGER' ? theme.primary : theme.glassBorder}`,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>🚶</span>
                        <div>
                          <strong style={{ color: theme.cream, fontSize: '0.95rem' }}>Passenger</strong>
                          <p style={{ color: theme.muted, fontSize: '0.75rem', marginTop: '2px' }}>
                            Find someone already travelling your way & share fuel cost
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => setRolePref('BOTH')}
                      style={{
                        padding: '16px',
                        borderRadius: theme.radiusLg,
                        background: rolePref === 'BOTH' ? 'rgba(246, 59, 3, 0.12)' : 'rgba(255, 248, 229, 0.04)',
                        border: `1.5px solid ${rolePref === 'BOTH' ? theme.primary : theme.glassBorder}`,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>🏍️</span>
                        <div>
                          <strong style={{ color: theme.cream, fontSize: '0.95rem' }}>Passenger + Traveller</strong>
                          <p style={{ color: theme.muted, fontSize: '0.75rem', marginTop: '2px' }}>
                            Both find rides and share your existing commute
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <GlassButton onClick={handleCompleteRegistration} loading={loading} fullWidth size="lg">
                    Complete Registration
                  </GlassButton>
                </GlassSurface>
              </motion.div>
            )}

            {/* STEP: COMPLETE -> Show "✓ PO → PO Member" */}
            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: 'center' }}
              >
                <GlassCard style={{ padding: '40px 24px', background: 'rgba(246, 59, 3, 0.1)' }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                    style={{ fontSize: '3.5rem', marginBottom: '16px' }}
                  >
                    ✓
                  </motion.div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: theme.cream, marginBottom: '8px' }}>
                    ✓ PO → PO Member
                  </h2>
                  <p style={{ color: theme.muted, fontSize: '0.9rem' }}>
                    Baseline identity verified. Redirecting to your commute hub...
                  </p>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
}
