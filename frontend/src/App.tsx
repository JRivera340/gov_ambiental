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
import { HUB_URL } from './config/hub';

// No hay página de login en este repo — la sesión llega desde bogotaneidapp
// vía /handoff. Sin sesión (logout, token vencido, entrada directa sin
// pasar por el hub) mandamos de vuelta al login real del hub — en local
// (sin VITE_AMBIENTAL_API_URL, o sea corriendo contra el proxy de Vite) no
// hay hub al que volver, así que ahí sí mostramos las instrucciones de dev.
const esEntornoDesplegado = Boolean(import.meta.env.VITE_AMBIENTAL_API_URL);

function RutaProtegida({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  React.useEffect(() => {
    if (!isAuthenticated && esEntornoDesplegado) {
      window.location.replace(`${HUB_URL}/login`);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    if (esEntornoDesplegado) return null; // redirigiendo al login del hub
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

      <Route path="/public/actividad/:id" element={<PublicPuntoPage />} />

      <Route path="/handoff" element={<HandoffPage />} />

      <Route
        path="/admin"
        element={<RutaProtegida><AdminDashboard /></RutaProtegida>}
      />

      {/* Cualquier ruta sin match (ej: un navigate() a una ruta que ya no
          existe, o un bundle viejo en cache del navegador apuntando a algo
          removido) manda al inicio en vez de dejar la pantalla en blanco. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
