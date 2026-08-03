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
//
// Corregido: antes `RutaProtegida` solo exigía sesión activa, sin revisar
// el ROL — cualquier usuario autenticado (ej. un ADMIN) podía entrar a
// `/gestor-ambiental/dashboard` a mano o por el botón "atrás" del navegador
// (una URL vieja en el historial de la pestaña, de una sesión anterior con
// otro rol) y el panel del gestor se renderizaba igual, sin bloquear nada.
// Ahora cada ruta declara explícitamente qué roles puede ver.
function RutaConRol({ roles, children }: { roles: Array<'ADMIN' | 'GESTOR_AMBIENTAL' | 'VALIDADOR_AMBIENTAL'>; children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!role || !roles.includes(role)) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Sin permiso</h1>
        <p style={{ color: '#666', marginTop: 8 }}>No tenés acceso a esta pantalla con tu rol actual.</p>
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
        element={<RutaConRol roles={['GESTOR_AMBIENTAL']}><GestorAmbientalDashboard /></RutaConRol>}
      />
      <Route
        path="/gestor-ambiental/crear-actividad"
        element={<RutaConRol roles={['GESTOR_AMBIENTAL']}><CreateActivity /></RutaConRol>}
      />
      <Route
        path="/gestor-ambiental/editar-actividad/:id"
        element={<RutaConRol roles={['GESTOR_AMBIENTAL', 'VALIDADOR_AMBIENTAL', 'ADMIN']}><EditActivity /></RutaConRol>}
      />

      <Route
        path="/validador/dashboard"
        element={<RutaConRol roles={['VALIDADOR_AMBIENTAL']}><ValidadorDashboard /></RutaConRol>}
      />
      <Route
        path="/validador/residuos"
        element={<RutaConRol roles={['VALIDADOR_AMBIENTAL']}><ValidadorMapaDashboard /></RutaConRol>}
      />
      <Route
        path="/validador/actividad/:id"
        element={<RutaConRol roles={['VALIDADOR_AMBIENTAL']}><ValidadorActivityDetailPage /></RutaConRol>}
      />

      <Route
        path="/admin"
        element={<RutaConRol roles={['ADMIN']}><AdminDashboard /></RutaConRol>}
      />
      <Route
        path="/admin/actividad/:id"
        element={<RutaConRol roles={['ADMIN']}><AdminActivityDetailPage /></RutaConRol>}
      />
      <Route
        path="/admin/usuarios"
        element={<RutaConRol roles={['ADMIN']}><AdminUsersPage /></RutaConRol>}
      />

      <Route path="/public/actividad/:id" element={<PublicPuntoPage />} />
    </Routes>
  );
}

export default App;
