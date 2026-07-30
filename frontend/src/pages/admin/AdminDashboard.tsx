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
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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
        <button
          onClick={() => dash.setSidebarOpen(!dash.sidebarOpen)}
          className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200"
          style={{ backdropFilter: 'blur(10px)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-[10px] font-medium">Filtros</span>
        </button>
      </header>

      {/* ── Overlay + Sidebar Filtros Globales (portado del hub, rama
          "sector_ambiental" — Estado/Tipo/Barrio/Mes/Desde-Hasta. Sin
          Categoría (aquí todo ya es ambiental) ni Gestor (no aplica al
          panel global). Turno no se porta: `isNightShift` no existe en
          `PuntoResiduo`, el formulario de creación de este repo nunca lo
          pregunta — no hay dato que filtrar. ── */}
      {dash.sidebarOpen && (
        <div
          onClick={() => dash.setSidebarOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 70, transition: 'opacity 0.3s ease-in-out' }}
        />
      )}
      <div
        style={{
          position: 'fixed', top: 60, right: dash.sidebarOpen ? 0 : '-400px', bottom: 0,
          width: '400px', maxWidth: '90vw', backgroundColor: 'white',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', zIndex: 1080,
          transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h3 className="text-lg font-semibold text-neutral-700">Filtros Globales</h3>
          <button onClick={() => dash.setSidebarOpen(false)} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors" aria-label="Cerrar sidebar">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Estado</label>
              <select value={dash.statusFilter} onChange={(e) => dash.setStatusFilter(e.target.value)} className="input-field w-full py-2">
                <option value="">Todos</option>
                <option value="ENVIADA">En Validación</option>
                <option value="PUBLICADA">Publicadas</option>
                <option value="RECHAZADA">Rechazadas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Tipo de Residuo</label>
              <select value={dash.tipoResiduoFilter} onChange={(e) => dash.setTipoResiduoFilter(e.target.value)} className="input-field w-full py-2">
                <option value="">Todos los residuos</option>
                <option value="RESIDUOS_ORDINARIOS">Ordinarios</option>
                <option value="RESIDUOS_VOLUMINOSOS">Voluminosos</option>
                <option value="ESCOMBROS">Escombros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Barrio</label>
              <select value={dash.barrioFilter} onChange={(e) => dash.setBarrioFilter(e.target.value)} className="input-field w-full py-2">
                <option value="">Todos</option>
                {dash.barriosUnicos.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Seleccionar Mes</label>
              <input
                type="month"
                value={dash.desdeFilter.substring(0, 7) || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month] = e.target.value.split('-');
                    const lastDay = new Date(parseInt(year), parseInt(month), 0);
                    dash.setDesdeFilter(`${year}-${month.padStart(2, '0')}-01`);
                    dash.setHastaFilter(`${year}-${month.padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`);
                  } else {
                    dash.setDesdeFilter('');
                    dash.setHastaFilter('');
                  }
                }}
                className="input-field w-full py-2 mb-2 bg-neutral-50"
              />
              <div className="flex gap-2 text-xs">
                <div className="flex-1">
                  <label className="block text-neutral-500 mb-1">Desde</label>
                  <input type="date" value={dash.desdeFilter} onChange={(e) => dash.setDesdeFilter(e.target.value)} className="input-field w-full py-1 text-xs" />
                </div>
                <div className="flex-1">
                  <label className="block text-neutral-500 mb-1">Hasta</label>
                  <input type="date" value={dash.hastaFilter} onChange={(e) => dash.setHastaFilter(e.target.value)} className="input-field w-full py-1 text-xs" />
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <button onClick={dash.clearFilters} className="w-full px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors text-sm font-medium">
                Limpiar Filtros
              </button>
              <button onClick={() => dash.setSidebarOpen(false)} className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-sm font-medium">
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      </div>

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
