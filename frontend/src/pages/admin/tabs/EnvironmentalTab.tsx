// EnvironmentalTab.tsx — Sección "Sector Ambiental" del AdminDashboard
import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { AsignacionPuntosPanel } from './environmental/AsignacionPuntosPanel';
import { IndicadoresAmbientalPanel } from './environmental/IndicadoresAmbientalPanel';
import { DesempenoGestoresPanel } from './environmental/DesempenoGestoresPanel';
import { ObjetivosDiariosTile } from './environmental/ObjetivosDiariosTile';
import type { LayerVisibility } from '../../../components/MapLayerControl';
import { MapLayerControl } from '../../../components/MapLayerControl';
import { BoundaryLayer } from '../../../components/BoundaryLayer';
import { BarriosLayer } from '../../../components/BarriosLayer';
import { ClickableMarker } from '../components/shared/ClickableMarker';
import { PieChart } from '../components/shared/PieChart';
import type { Activity } from '../../../types';
import { getCategoryIcon, getResiduos } from '../utils/adminHelpers';
import { INST_RED, AMB_GREEN, technicalResidueKeys, tipoResiduoColors, residuoLabels } from '../utils/adminConstants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyMapContainer = MapContainer as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyTileLayer = TileLayer as any;

// ── Tipos de props ─────────────────────────────────────────

export interface EnvironmentalTabProps {
  // Datos
  filteredMapActivities: Activity[];
  getGlobalActivityIndex: (id: string, obj?: Activity) => number | undefined;

  // Capas del mapa
  layerVisibility: LayerVisibility;
  setLayerVisibility: React.Dispatch<React.SetStateAction<LayerVisibility>>;

  // Filtros de mapa ambiental
  tipoResiduoFilter: string;
  setTipoResiduoFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  emergencyFilter: boolean;
  setEmergencyFilter: (v: boolean) => void;
  listSearchNumber: string;
  setListSearchNumber: (v: string) => void;

  // Sidebar de puntos (compartida con MapTab)
  setPointsSidebarOpen: (v: boolean) => void;

  // Insights del sector ambiental
  ambientalInsightsData: {
    totalIdentified: number;
    totalCollected: number;
    totalAct: number;
    totalPub: number;
    totalVal: number;
    totalRech: number;
    avgCollectionTimes: Record<string, number | undefined>;
    totalArea: Record<string, number>;
  };

  // Filtros globales de ambiental
  globalSubtipo: string;

  // Acciones
  setSelectedActivity: (a: Activity) => void;
  setShowDetailModal: (v: boolean) => void;
}

// ── Componente ─────────────────────────────────────────────

export const EnvironmentalTab: React.FC<EnvironmentalTabProps> = ({
  filteredMapActivities,
  getGlobalActivityIndex,
  layerVisibility,
  setLayerVisibility,
  tipoResiduoFilter,
  setTipoResiduoFilter,
  statusFilter,
  setStatusFilter,
  emergencyFilter,
  setEmergencyFilter,
  listSearchNumber,
  setListSearchNumber,
  setPointsSidebarOpen,
  ambientalInsightsData,
  globalSubtipo,
  setSelectedActivity,
  setShowDetailModal,
}) => {
  const handleLayerChange = (layer: keyof LayerVisibility, visible: boolean) =>
    setLayerVisibility(prev => ({ ...prev, [layer]: visible }));

  const handleToggleAllLayers = (visible: boolean) =>
    setLayerVisibility({
      barrios: visible, carrera7: visible, colegios: visible, cestas: visible,
      falloSanVictorino: visible, propiedadHorizontal: visible, upz: visible,
      cambuches: visible, bodegas: visible,
    });

  // Todo lo que llega a este repo YA es ambiental (mono-dominio) — filtrar
  // por operativoCategoria es un filtro del hub que acá siempre da falso
  // (el campo no existe en este backend) y dejaba esta lista vacía. Bug
  // real: todo el tab (paneles, KPIs, mapa) mostraba datos vacíos.
  const ambientalActivities = filteredMapActivities;

  const [showAsignacionPuntos, setShowAsignacionPuntos] = useState(false);
  const [showIndicadores, setShowIndicadores] = useState(false);
  const [showDesempeno, setShowDesempeno] = useState(false);

  return (
    <div className="flex flex-col gap-3 h-auto lg:h-[calc(100vh-100px)] overflow-y-auto lg:overflow-hidden overflow-x-hidden p-1 lg:p-0">

      {/* ── Barra de acciones ── */}
      <div className="flex justify-end gap-2 flex-shrink-0">
        <button
          onClick={() => setShowAsignacionPuntos(v => !v)}
          className="text-[9px] px-2 py-1 rounded border shadow-sm font-bold flex items-center gap-1 bg-white border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb]/5"
        >
          {showAsignacionPuntos ? 'Ocultar Asignación de Puntos' : 'Asignación de Puntos'}
        </button>
        <button
          onClick={() => setShowIndicadores(v => !v)}
          className="text-[9px] px-2 py-1 rounded border shadow-sm font-bold flex items-center gap-1 bg-white border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a]/5"
        >
          {showIndicadores ? 'Ocultar Indicadores' : 'Indicadores'}
        </button>
        <button
          onClick={() => setShowDesempeno(v => !v)}
          className="text-[9px] px-2 py-1 rounded border shadow-sm font-bold flex items-center gap-1 bg-white border-[#9333ea] text-[#9333ea] hover:bg-[#9333ea]/5"
        >
          {showDesempeno ? 'Ocultar Desempeño' : 'Desempeño'}
        </button>
      </div>

      {showAsignacionPuntos && (
        <div className="flex-shrink-0">
          <AsignacionPuntosPanel
            actividades={ambientalActivities.map(a => ({
              id: a.id,
              barrio: (a as any).barrio,
              pointNumber: getGlobalActivityIndex(a.id),
            }))}
          />
        </div>
      )}

      {showIndicadores && (
        <div className="flex-shrink-0">
          <IndicadoresAmbientalPanel actividades={ambientalActivities} />
        </div>
      )}

      {showDesempeno && (
        <div className="flex-shrink-0">
          <DesempenoGestoresPanel />
        </div>
      )}

      {/* ── Objetivos semanales (vista resumen, ver plan de la tarea) ── */}
      <div className="flex-shrink-0">
        <ObjetivosDiariosTile />
      </div>

      {/* ── TOP ROW: Métricas principales ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-shrink-0">

        {/* Panel de Control */}
        <div className="card p-3 border-l-4 border-l-primary shadow-sm bg-white flex flex-col justify-between min-h-[135px] lg:h-[135px] overflow-hidden">
          <div>
            <h3 className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-1 pb-1 border-b border-neutral-50">Panel de Control</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="flex flex-col">
                <span className="text-neutral-400 text-[8px] uppercase font-bold leading-none mb-1">Ident.</span>
                <span className="text-lg font-black text-neutral-800 leading-none">{ambientalInsightsData.totalIdentified.toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-400 text-[8px] uppercase font-bold leading-none mb-1 text-emerald-600">Recog.</span>
                <span className="text-lg font-black text-emerald-600 leading-none">{ambientalInsightsData.totalCollected.toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-400 text-[8px] uppercase font-bold leading-none mb-1 text-blue-600">Tasa</span>
                <span className="text-lg font-black text-blue-600 leading-none">
                  {ambientalInsightsData.totalIdentified > 0
                    ? Math.round((ambientalInsightsData.totalCollected / ambientalInsightsData.totalIdentified) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-400 text-[8px] uppercase font-bold leading-none mb-1 text-purple-600">Radio</span>
                <span className="text-lg font-black text-purple-600 leading-none">30m</span>
              </div>
            </div>
          </div>
          <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100 mt-2">
            <div className="flex justify-between items-center mb-1.5 px-0.5">
              <span className="text-[9px] font-bold text-neutral-400 uppercase leading-none">Actividades</span>
              <span className="text-sm font-black text-primary leading-none">{ambientalInsightsData.totalAct}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-100 pt-1.5 px-0.5">
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                <span className="text-[7px] text-neutral-500 uppercase font-bold">Pub: <span className="text-emerald-600">{ambientalInsightsData.totalPub}</span></span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                <span className="text-[7px] text-neutral-500 uppercase font-bold">Val: <span className="text-blue-600">{ambientalInsightsData.totalVal}</span></span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-red-500"></div>
                <span className="text-[7px] text-neutral-500 uppercase font-bold">Rech: <span className="text-red-600">{ambientalInsightsData.totalRech}</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Estado del Sistema */}
        <div className="card p-3 bg-white border-l-4 border-l-emerald-500 shadow-sm flex flex-col min-h-[135px] lg:h-[135px] overflow-hidden">
          <div className="flex items-center gap-2 mb-2 border-b border-neutral-50 pb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <h4 className="text-[9px] font-bold text-neutral-700 uppercase tracking-widest leading-none">Estado del Sistema</h4>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto">
            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-[10px] text-emerald-800 font-bold leading-tight">Monitoreo <span className="underline">Activo</span></p>
            </div>
            <p className="text-[10px] text-neutral-500 leading-snug">
              Se estan monitoreando <span className="font-bold text-neutral-800">{ambientalInsightsData.totalIdentified} puntos</span> con umbral de proximidad de <span className="font-bold text-primary">30 metros</span>.
            </p>
            <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100 italic text-center">
              <p className="text-[9px] text-neutral-400 font-medium">Sistema funcionando correctamente</p>
            </div>
          </div>
        </div>

        {/* Tiempo Promedio de Recolección */}
        <div className="card p-3 bg-white border-l-4 border-l-orange-500 shadow-sm flex flex-col min-h-[135px] lg:h-[135px] overflow-hidden">
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-neutral-50">
            <h3 className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Tiempo Recoleccion</h3>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
              <span className="text-[7px] text-neutral-400 font-bold uppercase">PROMEDIO DIAS</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 flex-1 items-center">
            {technicalResidueKeys.filter(k => k !== 'PLANTAS').slice(0, 4).map(key => {
              const time = ambientalInsightsData.avgCollectionTimes[key];
              const isHigh = time !== undefined && time > 5;
              const isMedium = time !== undefined && time > 2 && time <= 5;
              return (
                <div key={key} className="flex flex-col">
                  <div className="flex justify-between items-end mb-0.5">
                    <span className="text-[8px] text-neutral-500 font-bold truncate uppercase">{residuoLabels[key]}</span>
                    <span className={`text-[10px] font-black ${time === undefined ? 'text-neutral-300' : isHigh ? 'text-red-600' : isMedium ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {time !== undefined ? `${time}d` : '--'}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${time === undefined ? 'w-0' : isHigh ? 'bg-red-500' : isMedium ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: time !== undefined ? `${Math.min((time / 15) * 100, 100)}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW: Mapa y Estadísticas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">

        {/* Mapa Sector Ambiental (2/3) */}
        <div className="lg:col-span-2 card p-0 overflow-hidden flex flex-col shadow-sm relative min-h-[400px] lg:min-h-0">
          {/* Header mapa */}
          <div className="p-2 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white z-[1001]">
            <h3 className="text-[10px] font-bold text-neutral-800">Mapa de Puntos</h3>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button onClick={() => setPointsSidebarOpen(true)} className="text-[9px] px-2 py-1 rounded border shadow-sm font-bold flex items-center gap-1 bg-white border-primary text-primary hover:bg-primary/5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                Lista de Residuos
              </button>
              <button
                onClick={() => setEmergencyFilter(!emergencyFilter)}
                className={`text-[9px] px-2 py-1 rounded border shadow-sm font-bold flex items-center gap-1 transition-all ${emergencyFilter ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
              >
                <svg className="w-3 h-3 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 5.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.814-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                Puntos en Emergencia
              </button>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-[9px] p-1 border rounded bg-neutral-50 outline-none focus:ring-1 focus:ring-primary">
                <option value="">Todos los estados</option>
                <option value="ENVIADA">En Validacion</option>
                <option value="PUBLICADA">Publicadas</option>
                <option value="RECHAZADA">Rechazadas</option>
              </select>
              <select value={tipoResiduoFilter} onChange={e => setTipoResiduoFilter(e.target.value)} className="text-[9px] p-1 border rounded bg-neutral-50 outline-none focus:ring-1 focus:ring-primary">
                <option value="">Todos los residuos</option>
                <option value="RESIDUOS_ORDINARIOS">Ordinarios</option>
                <option value="RESIDUOS_VOLUMINOSOS">Voluminosos</option>
                <option value="ESCOMBROS">Escombros</option>
              </select>
            </div>
          </div>

          {/* Contenedor del mapa */}
          <div className="flex-1 relative" style={{ zIndex: 1 }}>
            <AnyMapContainer center={[4.6097, -74.0817]} zoom={14} style={{ height: '100%', width: '100%' }}>
              <AnyTileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapLayerControl layerVisibility={layerVisibility} onLayerVisibilityChange={handleLayerChange} onToggleAll={handleToggleAllLayers} position="topright" />
              <BoundaryLayer kmlPath="/boundaries/KMZ_Sectores_Catastrales_SF_2026.kmz" color={INST_RED} fillColor={INST_RED} fillOpacity={0.05} weight={2} />
              <BoundaryLayer kmlPath="/boundaries/KMZ_Sectores_Catastrales_SF_2026.kmz" color="#DC2626" fillColor="#DC2626" fillOpacity={0.1} weight={2.5} />
              <BoundaryLayer kmlPath="/boundaries/Carrera7.kmz" color="#0891b2" fillColor="#0891b2" fillOpacity={0.2} weight={3} visible={layerVisibility.carrera7} />
              <BoundaryLayer kmlPath="/boundaries/Capa_Colegios.kmz" color="#ca8a04" fillColor="#ca8a04" fillOpacity={0.2} weight={2} visible={layerVisibility.colegios} />
              <BoundaryLayer kmlPath="/boundaries/Cestas (1).kmz" color="#3b82f6" fillColor="#3b82f6" fillOpacity={0.2} weight={2} visible={layerVisibility.cestas} />
              <BoundaryLayer kmlPath="/boundaries/Vias_FalloSV_LaCapuchina.kmz" color="#f43f5e" fillColor="#f43f5e" fillOpacity={0.2} weight={2} visible={layerVisibility.falloSanVictorino} />
              <BoundaryLayer kmlPath="/boundaries/Vias_FalloSV_SantaInes.kmz" color="#f43f5e" fillColor="#f43f5e" fillOpacity={0.2} weight={2} visible={layerVisibility.falloSanVictorino} />
              <BoundaryLayer kmlPath="/boundaries/PropiedadHorizontal (1).kmz" color="#eab308" fillColor="#eab308" fillOpacity={0.2} weight={2} visible={layerVisibility.propiedadHorizontal} />
              <BoundaryLayer kmlPath="/boundaries/UPZ_SantaFe.kmz" color="#f97316" fillColor="#f97316" fillOpacity={0.2} weight={2} visible={layerVisibility.upz} />
              <BoundaryLayer kmlPath="/boundaries/Capa_Cambuches.kmz" color="#ef4444" fillColor="#ef4444" fillOpacity={0.4} weight={3} visible={layerVisibility.cambuches} />
              <BoundaryLayer kmlPath="/boundaries/Capa_Bodegas.kmz" color="#7c3aed" fillColor="#7c3aed" fillOpacity={0.2} weight={2} visible={layerVisibility.bodegas} />
              <BarriosLayer color="transparent" fillColor="transparent" fillOpacity={0} weight={0} visible={layerVisibility.barrios} />

              {ambientalActivities.map(a => {
                const displayIdx = getGlobalActivityIndex(a.id) || 0;
                if (listSearchNumber && displayIdx.toString() !== listSearchNumber.trim()) return null;
                return (
                  <ClickableMarker
                    key={a.id}
                    position={[a.lat, a.lng]}
                    icon={getCategoryIcon(a, tipoResiduoFilter, false, true, displayIdx)}
                    activity={a}
                    index={displayIdx}
                    onActivityClick={activity => window.open(`/public/actividad/${activity.id}`, '_blank')}
                  />
                );
              })}
            </AnyMapContainer>

            {/* Leyenda flotante */}
            <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 1000, background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(10px)', borderRadius: 12, padding: '10px 12px', boxShadow: '0 4px 16px rgba(0,0,0,.12)', border: '1px solid rgba(0,0,0,.06)' }}>
              <p style={{ fontSize: 8, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.7px', margin: '0 0 8px' }}>Leyenda</p>
              <div className="flex flex-col gap-1.5 mb-3">
                {[
                  { key: 'RESIDUOS_ORDINARIOS', label: 'Ordinarios' },
                  { key: 'RESIDUOS_VOLUMINOSOS', label: 'Voluminosos' },
                  { key: 'ESCOMBROS', label: 'Escombros' },
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: tipoResiduoColors[item.key] || AMB_GREEN }} />
                    <span style={{ fontSize: 10, color: '#374151', fontWeight: 500 }}>{item.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(0,0,0,.08)', paddingTop: 8 }}>
                <p style={{ fontSize: 7, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '.4px' }}>Estados de Alarma</p>
                <div className="flex flex-col gap-1.5 min-w-[130px]">
                  {[
                    { color: '#7c2d12', label: 'Inicial (1 dia)' },
                    { color: '#EAB308', label: 'Vencido (≥ 2 dias)' },
                    { color: '#DC2626', label: 'Importante (≥ 3 dias)', bold: true },
                  ].map(entry => (
                    <div key={entry.color} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: entry.color }} />
                      <span style={{ fontSize: 10, color: '#374151', fontWeight: entry.bold ? 600 : 400 }}>{entry.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas derechas (1/3) */}
        <div className="lg:col-span-1 flex flex-col gap-3 min-h-0">
          {/* Distribución por tipo */}
          <div className="card p-3 bg-white border-neutral-100 shadow-sm overflow-hidden h-[280px] flex flex-col">
            <h3 className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Unidades por Tipo</h3>
            <div className="flex-1 min-h-0 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <PieChart
                  data={Object.fromEntries(
                    (globalSubtipo === 'AMBIENTAL_PUNTOS_ACUMULACION' || globalSubtipo === ''
                      ? technicalResidueKeys.filter(k => k !== 'PLANTAS')
                      : ['PLANTAS']
                    ).map(key => [
                      key,
                      filteredMapActivities
                        .filter(a => getResiduos(a).some((r: any) => r.tipoResiduo === key))
                        .length
                    ]).filter(([, val]) => (val as number) > 0)
                  )}
                  size={110}
                />
              </div>
            </div>
          </div>

          {/* Ocupación en metros lineales */}
          <div className="card p-3 bg-white border-neutral-100 shadow-sm h-[280px] overflow-hidden flex flex-col">
            <header className="mb-2 flex-shrink-0">
              <h3 className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest leading-none">Ocupacion</h3>
              <p className="text-[7px] text-neutral-400 uppercase font-black mt-1">Metros Lineales</p>
            </header>
            <div className="flex-1 min-h-0 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <PieChart
                  data={Object.fromEntries(
                    technicalResidueKeys
                      .filter(k => k !== 'PLANTAS')
                      .map(key => [key, Math.round(ambientalInsightsData.totalArea[key] || 0)])
                      .filter(([, val]) => (val as number) > 0)
                  )}
                  size={110}
                  suffix="m"
                  hideLegend={false}
                  hideCenterText={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
