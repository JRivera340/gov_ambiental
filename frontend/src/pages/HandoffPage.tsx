import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

// PLAN-MAESTRO.md HITO 0 — pantalla mínima de destino del handoff. Lee el
// JWT del fragmento de URL (nunca llega al servidor), lo decodifica (sin
// verificar firma: eso ya lo hizo el backend en POST /api/handoff antes de
// redirigir acá) y muestra identidad + rol. "Nada más" — no redirige a otras
// vistas todavía, eso es HITO 2.
function decodeJwtPayload(token: string): { sub: string; email: string; role: string } | null {
  try {
    const [, payloadB64] = token.split('.');
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const HandoffPage: React.FC = () => {
  const login = useAuthStore((s) => s.login);
  const [status, setStatus] = useState<'procesando' | 'error' | 'listo'>('procesando');
  const [identity, setIdentity] = useState<{ email: string; role: string } | null>(null);
  // React.StrictMode invoca los efectos dos veces en desarrollo. La primera
  // corrida procesa el token y limpia el hash con replaceState; sin este
  // guard, la segunda corrida ya no encuentra hash y pisa el estado con error.
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      setStatus('error');
      return;
    }

    const hash = window.location.hash;
    const match = hash.match(/token=([^&]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;

    if (!token) {
      setStatus('error');
      return;
    }

    const payload = decodeJwtPayload(token);
    if (!payload) {
      setStatus('error');
      return;
    }

    // El JWT del hub no trae name/lastname (solo sub/email/role) — placeholder
    // mínimo hasta que HITO 2 resuelva la identidad completa contra el hub.
    const user: User = {
      id: payload.sub,
      name: payload.email,
      lastname: '',
      email: payload.email,
      role: payload.role as User['role'],
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    login(token, user);
    setIdentity({ email: payload.email, role: payload.role });
    setStatus('listo');

    // Limpia el fragmento de la URL — no debe quedar en el historial del navegador.
    history.replaceState(null, '', window.location.pathname);
  }, [login]);

  if (status === 'procesando') {
    return <div style={{ padding: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>Procesando sesión...</div>;
  }

  if (status === 'error') {
    return (
      <div style={{ padding: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>No se pudo iniciar sesión</h1>
        <p style={{ color: '#666', marginTop: 8 }}>El enlace de acceso no es válido o expiró. Volvé a intentar desde el panel de administración del hub.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Sesión iniciada</h1>
      <p style={{ marginTop: 8 }}>Usuario: <strong>{identity?.email}</strong></p>
      <p>Rol: <strong>{identity?.role}</strong></p>
    </div>
  );
};
