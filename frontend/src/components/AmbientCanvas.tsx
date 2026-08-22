import React, { useEffect, useRef } from 'react';

// Capa de ambiente del panel de administración: puntos que derivan lento y se
// enlazan entre sí cuando quedan cerca — un eco de los marcadores del mapa que
// este panel supervisa. Vive detrás del contenido y nunca debajo del mapa real
// (ahí compite con la cartografía en vez de acompañarla).
//
// Se apaga sola cuando no corresponde animar: `prefers-reduced-motion`,
// pantallas chicas (el panel es de escritorio y en móvil solo gasta batería) y
// pestaña oculta. Todo el dibujo va en un canvas, así no hay ni un nodo del DOM
// por partícula.

type Particula = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radio: number;
  color: string;
  fase: number;
};

interface AmbientCanvasProps {
  /** Partículas a 1920×1080; se escala con el área real del contenedor. */
  densidad?: number;
  className?: string;
}

const COLORES = ['228, 3, 46', '22, 163, 74', '234, 179, 8'];
const DISTANCIA_ENLACE = 132;
const RADIO_MOUSE = 190;
const ANCHO_MINIMO = 1024;

export const AmbientCanvas: React.FC<AmbientCanvasProps> = ({ densidad = 64, className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || window.innerWidth < ANCHO_MINIMO) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let ancho = 0;
    let alto = 0;
    let particulas: Particula[] = [];
    let frame = 0;
    let corriendo = true;
    const mouse = { x: -9999, y: -9999, activo: false };

    const crear = (): Particula => ({
      x: Math.random() * ancho,
      y: Math.random() * alto,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      radio: 1.1 + Math.random() * 2.2,
      color: COLORES[Math.floor(Math.random() * COLORES.length)],
      fase: Math.random() * Math.PI * 2,
    });

    const medir = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = rect.width;
      alto = rect.height;
      canvas.width = Math.floor(ancho * dpr);
      canvas.height = Math.floor(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const objetivo = Math.round((densidad * ancho * alto) / (1920 * 1080));
      const total = Math.max(18, Math.min(objetivo, 110));
      if (particulas.length > total) particulas = particulas.slice(0, total);
      while (particulas.length < total) particulas.push(crear());
    };

    const dibujar = () => {
      if (!corriendo) return;
      frame += 1;
      ctx.clearRect(0, 0, ancho, alto);

      for (const p of particulas) {
        p.x += p.vx;
        p.y += p.vy;

        // El mouse empuja suave lo que tiene cerca y lo devuelve a su deriva.
        if (mouse.activo) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < RADIO_MOUSE && dist > 0.5) {
            const fuerza = (1 - dist / RADIO_MOUSE) * 0.35;
            p.x += (dx / dist) * fuerza;
            p.y += (dy / dist) * fuerza;
          }
        }

        if (p.x < -20) p.x = ancho + 20;
        if (p.x > ancho + 20) p.x = -20;
        if (p.y < -20) p.y = alto + 20;
        if (p.y > alto + 20) p.y = -20;

        const pulso = 0.55 + Math.sin(frame * 0.012 + p.fase) * 0.45;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radio, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${0.1 + pulso * 0.2})`;
        ctx.fill();
      }

      for (let i = 0; i < particulas.length; i++) {
        for (let j = i + 1; j < particulas.length; j++) {
          const a = particulas[i];
          const b = particulas[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist > DISTANCIA_ENLACE) continue;
          const cercaDelMouse =
            mouse.activo &&
            (Math.hypot(a.x - mouse.x, a.y - mouse.y) < RADIO_MOUSE ||
              Math.hypot(b.x - mouse.x, b.y - mouse.y) < RADIO_MOUSE);
          const alpha = (1 - dist / DISTANCIA_ENLACE) * (cercaDelMouse ? 0.3 : 0.14);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(113, 128, 150, ${alpha})`;
          ctx.lineWidth = cercaDelMouse ? 0.9 : 0.6;
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(dibujar);
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.activo = true;
    };
    const onMouseLeave = () => { mouse.activo = false; };

    const onVisibilidad = () => {
      const visible = !document.hidden;
      if (visible && !corriendo) {
        corriendo = true;
        raf = requestAnimationFrame(dibujar);
      } else if (!visible && corriendo) {
        corriendo = false;
        cancelAnimationFrame(raf);
      }
    };

    let raf = 0;
    medir();
    raf = requestAnimationFrame(dibujar);

    const observer = new ResizeObserver(medir);
    observer.observe(canvas);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseout', onMouseLeave);
    document.addEventListener('visibilitychange', onVisibilidad);

    return () => {
      corriendo = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseout', onMouseLeave);
      document.removeEventListener('visibilitychange', onVisibilidad);
    };
  }, [densidad]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? 'pointer-events-none absolute inset-0 h-full w-full'}
    />
  );
};
