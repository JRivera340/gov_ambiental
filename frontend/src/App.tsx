import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { GestorAmbientalDashboard } from './pages/gestor-ambiental/GestorAmbientalDashboard';
import { CreateActivity } from './pages/CreateActivity';
import { EditActivity } from './pages/EditActivity';
import { ValidadorDashboard } from './pages/validador/ValidadorDashboard';
import { ValidadorMapaDashboard } from './pages/validador/ValidadorMapaDashboard';
import { ValidadorActivityDetailPage } from './pages/validador/ValidadorActivityDetailPage';
import PublicPuntoPage from './pages/public/PublicPuntoPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminActivityDetailPage } from './pages/admin/AdminActivityDetailPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';

// Login propio (rama de donación / entregable UAESP) — el módulo se
// autentica con su propia tabla de usuarios (POST /auth/login), sin
// depender de ningún otro sistema. Reemplaza el mecanismo de /handoff.
function RutaProtegida({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RutaAdmin({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
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

function RaizInicial() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const destino = role === 'ADMIN' ? '/admin'
    : role === 'VALIDADOR_AMBIENTAL' ? '/validador/residuos'
    : '/gestor-ambiental/dashboard';
  return <Navigate to={destino} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RaizInicial />} />

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
        element={<RutaProtegida><ValidadorDashboard /></RutaProtegida>}
      />
      <Route
        path="/validador/residuos"
        element={<RutaProtegida><ValidadorMapaDashboard /></RutaProtegida>}
      />
      <Route
        path="/validador/actividad/:id"
        element={<RutaProtegida><ValidadorActivityDetailPage /></RutaProtegida>}
      />

      <Route
        path="/admin"
        element={<RutaAdmin><AdminDashboard /></RutaAdmin>}
      />
      <Route
        path="/admin/actividad/:id"
        element={<RutaAdmin><AdminActivityDetailPage /></RutaAdmin>}
      />
      <Route
        path="/admin/usuarios"
        element={<RutaAdmin><AdminUsersPage /></RutaAdmin>}
      />

      <Route path="/public/actividad/:id" element={<PublicPuntoPage />} />
    </Routes>
  );
}

export default App;
