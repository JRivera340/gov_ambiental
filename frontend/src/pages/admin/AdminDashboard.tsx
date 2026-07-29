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
      <header className="bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-sm font-black text-institutional-black uppercase tracking-wide">
          Admin — Sector Ambiental
        </h1>
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
