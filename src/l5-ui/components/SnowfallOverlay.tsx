import { useEffect, useRef } from 'react';

interface Snowflake {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
}

export function SnowfallOverlay({ enabled }: { readonly enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const flakes: Snowflake[] = Array.from({ length: 38 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.9 + Math.random() * 2.1,
      vx: 0.25 + Math.random() * 0.65,
      vy: 0.45 + Math.random() * 1.1,
      alpha: 0.12 + Math.random() * 0.28,
    }));

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (const f of flakes) {
        f.x += f.vx;
        f.y += f.vy;
        if (f.y > height + 5) {
          f.y = -5;
          f.x = Math.random() * width;
        }
        if (f.x > width + 5) {
          f.x = -5;
        }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 236, 245, ${f.alpha})`;
        ctx.fill();
      }
      animId = window.requestAnimationFrame(render);
    };

    animId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 opacity-75"
    />
  );
}
