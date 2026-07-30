import React from 'react';
import { EnvironmentalTab } from './tabs/EnvironmentalTab';
import { useAdminDashboard } from './hooks/useAdminDashboard';

// Shell de ADMIN de este repo: un solo tab (Sector Ambiental), a diferencia
// del AdminDashboard multi-dominio del hub (IVC/ESPACIO_PUBLICO/AMBIENTAL/
// PYBA/DEPORTES). Ver ESTADO-EXTRACCION.md.
export const AdminDashboard: React.FC = () => {
  const dash = useAdminDashboard();

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header portado del hub (AdminDashboard.tsx, SOLO LECTURA) — mismo
          degradado rojo institucional y mismo texto, sin el logo centrado
          "BogotaneidApp" (ese logo es del hub, no aplica a este subdominio). */}
      <header
        className="px-4 sm:px-6 md:px-8"
        style={{
          height: 60,
          background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 45%, #991b1b 100%)',
          boxShadow: '0 4px 20px rgba(153, 27, 27, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/images/alcaldialocalsantafe-sinfondo.png" alt="Alcaldía" className="h-[40px] sm:h-[50px] w-auto object-contain" />
          <div className="hidden sm:block w-[1px] h-[32px] bg-white/25" />
          <div className="hidden sm:block">
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Sistema de Seguimiento Territorial</div>
            <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 11 }}>Alcaldía Local de Santa Fe · Panel de Administración</div>
          </div>
        </div>
      </header>

      <main className="p-3">
        {dash.loading && <p className="text-sm text-neutral-500">Cargando puntos...</p>}
        {dash.error && <p className="text-sm text-red-600">{dash.error}</p>}
        {!dash.loading && !dash.error && (
          <EnvironmentalTab
            filteredMapActivities={dash.activities}
            getGlobalActivityIndex={dash.getGlobalActivityIndex}
            layerVisibility={dash.layerVisibility}
            setLayerVisibility={dash.setLayerVisibility}
            tipoResiduoFilter={dash.tipoResiduoFilter}
            setTipoResiduoFilter={dash.setTipoResiduoFilter}
            statusFilter={dash.statusFilter}
            setStatusFilter={dash.setStatusFilter}
            emergencyFilter={dash.emergencyFilter}
            setEmergencyFilter={dash.setEmergencyFilter}
            listSearchNumber={dash.listSearchNumber}
            setListSearchNumber={dash.setListSearchNumber}
            setPointsSidebarOpen={dash.setPointsSidebarOpen}
            ambientalInsightsData={dash.ambientalInsightsData}
            globalSubtipo=""
            setSelectedActivity={dash.setSelectedActivity}
            setShowDetailModal={dash.setShowDetailModal}
          />
        )}
      </main>
    </div>
  );
};
