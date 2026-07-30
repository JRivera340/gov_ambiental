import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { GestorAmbientalDashboard } from './pages/gestor-ambiental/GestorAmbientalDashboard';
import { CreateActivity } from './pages/CreateActivity';
import { EditActivity } from './pages/EditActivity';
import { ValidadorMapaDashboard } from './pages/validador/ValidadorMapaDashboard';
import PublicPuntoPage from './pages/public/PublicPuntoPage';
import { HandoffPage } from './pages/HandoffPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminActivityDetailPage } from './pages/admin/AdminActivityDetailPage';

// No hay página de login en este repo — la sesión llega desde bogotaneidapp
// vía /handoff (PLAN-MAESTRO.md HITO 0). Para probar sin pasar por el hub,
// generá un token con `npm run token:test` en el backend y guardalo
// manualmente: sessionStorage.setItem('gov_auth_token', '<token>').
function RutaProtegida({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>No hay sesión activa</h1>
        <p style={{ color: '#666', marginTop: 8 }}>
          Este módulo todavía no tiene su propio login — la sesión se comparte desde bogotaneidapp.
          Para desarrollo local, generá un token con <code>npm run token:test</code> en el backend
          y guardalo en <code>sessionStorage</code> con la clave <code>gov_auth_token</code>.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

function RutaAdmin({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  if (!isAuthenticated) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>No hay sesión activa</h1>
        <p style={{ color: '#666', marginTop: 8 }}>
          Este módulo todavía no tiene su propio login — la sesión se comparte desde bogotaneidapp.
        </p>
      </div>
    );
  }
  if (role !== 'ADMIN') {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Sin permiso</h1>
        <p style={{ color: '#666', marginTop: 8 }}>Esta vista es solo para el rol ADMIN.</p>
      </div>
    );
  }
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/gestor-ambiental/dashboard" replace />} />

      <Route
        path="/gestor-ambiental/dashboard"
        element={<RutaProtegida><GestorAmbientalDashboard /></RutaProtegida>}
      />
      <Route
        path="/gestor-ambiental/crear-actividad"
        element={<RutaProtegida><CreateActivity /></RutaProtegida>}
      />
      <Route
        path="/gestor-ambiental/editar-actividad/:id"
        element={<RutaProtegida><EditActivity /></RutaProtegida>}
      />

      <Route
        path="/validador/dashboard"
        element={<Navigate to="/validador/residuos" replace />}
      />
      <Route
        path="/validador/residuos"
        element={<RutaProtegida><ValidadorMapaDashboard /></RutaProtegida>}
      />

      <Route
        path="/admin"
        element={<RutaAdmin><AdminDashboard /></RutaAdmin>}
      />
      <Route
        path="/admin/actividad/:id"
        element={<RutaAdmin><AdminActivityDetailPage /></RutaAdmin>}
      />

      <Route path="/handoff" element={<HandoffPage />} />

      <Route path="/public/actividad/:id" element={<PublicPuntoPage />} />
    </Routes>
  );
}

export default App;
