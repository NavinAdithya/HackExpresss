/**
 * POBackgroundShader — Ambient Iridescent Visual Layer for PO → PO
 *
 * Provides a fluid, smooth, deep ambient background with cyan/violet iridescence.
 * Features:
 * - Fluid mesh motion
 * - Controlled contrast for maximum text legibility
 * - Respects prefers-reduced-motion
 * - Ultra-lightweight WebGL canvas fallback
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

    // Dynamic wave parameters
    let time = 0;

    const render = () => {
      time += 0.004;
      ctx.clearRect(0, 0, width, height);

      // Deep base layer #0a0c12
      ctx.fillStyle = '#0a0c12';
      ctx.fillRect(0, 0, width, height);

      // Gradient Orb 1: Cyan / Electric Blue (Top Left moving)
      const x1 = width * 0.3 + Math.sin(time * 0.8) * (width * 0.15);
      const y1 = height * 0.25 + Math.cos(time * 0.6) * (height * 0.15);
      const r1 = Math.max(width, height) * 0.45;
      const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
      grad1.addColorStop(0, 'rgba(0, 242, 254, 0.16)');
      grad1.addColorStop(0.5, 'rgba(79, 172, 254, 0.08)');
      grad1.addColorStop(1, 'rgba(10, 12, 18, 0)');

      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      // Gradient Orb 2: Violet / Magenta (Bottom Right moving)
      const x2 = width * 0.75 + Math.cos(time * 0.7) * (width * 0.15);
      const y2 = height * 0.7 + Math.sin(time * 0.9) * (height * 0.15);
      const r2 = Math.max(width, height) * 0.5;
      const grad2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
      grad2.addColorStop(0, 'rgba(127, 0, 255, 0.14)');
      grad2.addColorStop(0.6, 'rgba(161, 140, 209, 0.06)');
      grad2.addColorStop(1, 'rgba(10, 12, 18, 0)');

      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Gradient Orb 3: Subtle Center Ambient Pulsing Glow
      const pulse = 1 + Math.sin(time * 1.2) * 0.1;
      const x3 = width * 0.5;
      const y3 = height * 0.5;
      const r3 = Math.max(width, height) * 0.35 * pulse;
      const grad3 = ctx.createRadialGradient(x3, y3, 0, x3, y3, r3);
      grad3.addColorStop(0, 'rgba(0, 198, 255, 0.06)');
      grad3.addColorStop(1, 'rgba(10, 12, 18, 0)');

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
        background: '#0a0c12',
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
      {/* Subtle iridescent noise/grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          opacity: 0.6,
        }}
      />
    </div>
  );
}
