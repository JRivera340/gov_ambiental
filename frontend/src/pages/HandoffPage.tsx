import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { irAlLoginDelHub } from '../config/hub';
import type { User } from '../types';

// Ruta de aterrizaje por rol tras el handoff.
const RUTA_POR_ROL: Partial<Record<string, string>> = {
  GESTOR_AMBIENTAL: '/gestor-ambiental/dashboard',
  VALIDADOR_AMBIENTAL: '/validador/dashboard',
  ADMIN: '/admin',
};

// Pantalla de destino del handoff. Lee el JWT del fragmento de URL (nunca
// llega al servidor), lo decodifica (sin verificar firma: eso ya lo hizo el
// backend en POST /api/handoff antes de redirigir acá) y arranca la sesión.
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
  const navigate = useNavigate();
  const [status, setStatus] = useState<'procesando' | 'error' | 'sin-destino'>('procesando');
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
    // mínimo hasta que haya un endpoint propio para resolver identidad completa.
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

    // Limpia el fragmento de la URL — no debe quedar en el historial del navegador.
    history.replaceState(null, '', window.location.pathname);

    const destino = RUTA_POR_ROL[payload.role];
    if (destino) {
      navigate(destino, { replace: true });
      return;
    }

    // Rol sin pantalla propia todavía (ej. ADMIN) — se queda en esta
    // pantalla mínima con un mensaje que lo explique, en vez de navegar a
    // una ruta que no existe.
    setIdentity({ email: payload.email, role: payload.role });
    setStatus('sin-destino');
  }, [login, navigate]);

  if (status === 'procesando') {
    return <div style={{ padding: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>Procesando sesión...</div>;
  }

  if (status === 'error') {
    return (
      <div style={{ padding: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>No se pudo iniciar sesión</h1>
        <p style={{ color: '#666', marginTop: 8 }}>El enlace de acceso no es válido o expiró. Iniciá sesión de nuevo para entrar al módulo.</p>
        {/* Sin este botón la pantalla era un callejón sin salida: el usuario
            no tenía forma de llegar al login desde acá. */}
        <button
          onClick={irAlLoginDelHub}
          style={{
            marginTop: 20, padding: '10px 18px', background: '#dc2626', color: 'white',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Ir al inicio de sesión
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Sesión iniciada</h1>
      <p style={{ marginTop: 8 }}>Usuario: <strong>{identity?.email}</strong></p>
      <p>Rol: <strong>{identity?.role}</strong></p>
      <p style={{ color: '#666', marginTop: 16 }}>
        Este rol todavía no tiene un panel propio en el módulo ambiental — no
        hay ninguna pantalla a la que redirigir.
      </p>
    </div>
  );
};
