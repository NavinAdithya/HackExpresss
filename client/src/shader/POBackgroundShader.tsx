/**
 * POBackgroundShader — Ambient Fluid Shader for PO → PO
 *
 * Full-screen ambient background using the official PO → PO palette:
 * - Base: #0A0A0A (Black) with #4F1409 (Dark Brown) depth
 * - Orb 1: #F63B03 (Primary Orange)
 * - Orb 2: #E79E89 (Dust Pink)
 * - Orb 3: #FFF8E5 (Warm Cream center glow)
 *
 * Respects prefers-reduced-motion and provides an efficient canvas fallback.
 */

import { useEffect, useRef, useState } from 'react';

export function POBackgroundShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let time = 0;

    const render = () => {
      time += 0.0035;
      ctx.clearRect(0, 0, width, height);

      // Deep base layer #0A0A0A
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(0, 0, width, height);

      // Gradient Orb 1: Primary Orange (#F63B03) Top-Left
      const x1 = width * 0.28 + Math.sin(time * 0.8) * (width * 0.12);
      const y1 = height * 0.22 + Math.cos(time * 0.6) * (height * 0.12);
      const r1 = Math.max(width, height) * 0.45;
      const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
      grad1.addColorStop(0, 'rgba(246, 59, 3, 0.16)');
      grad1.addColorStop(0.5, 'rgba(247, 60, 6, 0.07)');
      grad1.addColorStop(1, 'rgba(10, 10, 10, 0)');

      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      // Gradient Orb 2: Dust Pink (#E79E89) Bottom-Right
      const x2 = width * 0.76 + Math.cos(time * 0.7) * (width * 0.12);
      const y2 = height * 0.72 + Math.sin(time * 0.9) * (height * 0.12);
      const r2 = Math.max(width, height) * 0.5;
      const grad2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
      grad2.addColorStop(0, 'rgba(231, 158, 137, 0.12)');
      grad2.addColorStop(0.6, 'rgba(79, 20, 9, 0.10)');
      grad2.addColorStop(1, 'rgba(10, 10, 10, 0)');

      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Gradient Orb 3: Dark Brown & Warm Cream (#4F1409 & #FFF8E5) Center Glow
      const pulse = 1 + Math.sin(time * 1.1) * 0.08;
      const x3 = width * 0.5;
      const y3 = height * 0.48;
      const r3 = Math.max(width, height) * 0.32 * pulse;
      const grad3 = ctx.createRadialGradient(x3, y3, 0, x3, y3, r3);
      grad3.addColorStop(0, 'rgba(246, 59, 3, 0.08)');
      grad3.addColorStop(0.7, 'rgba(79, 20, 9, 0.04)');
      grad3.addColorStop(1, 'rgba(10, 10, 10, 0)');

      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [reducedMotion]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: '#0A0A0A',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      {/* Subtle warm mesh grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(255, 248, 229, 0.03) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          opacity: 0.7,
        }}
      />
    </div>
  );
}
