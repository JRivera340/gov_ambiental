// EnvironmentalTab.tsx — vista "Operación" del panel de administración.
// Cifras del sector, alertas que exigen decisión, y el mapa de puntos.
// La franja del ciclo y la navegación entre vistas viven en AdminDashboard.
import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
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

  // Lo que exige una decisión hoy — reemplaza a la tarjeta "Estado del
  // Sistema", que mostraba un texto fijo y un radio de 30m sin lógica detrás.
  alertas: {
    emergencias: number;
    /** null mientras no llegaron las asignaciones. */
    sinGestor: number | null;
    porValidar: number;
  };

  // Filtros globales de ambiental
  globalSubtipo: string;

  // Acciones
  setSelectedActivity: (a: Activity) => void;
  setShowDetailModal: (v: boolean) => void;
}

// ── Piezas de la vista ─────────────────────────────────────

const StatTile: React.FC<{
  etiqueta: string;
  valor: string;
  detalle?: string;
  color: string;
  delay: number;
}> = ({ etiqueta, valor, detalle, color, delay }) => (
  <div
    className="glass-panel admin-lift admin-rise rounded-2xl px-4 py-3 relative overflow-hidden"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full" style={{ background: color }} />
    <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">{etiqueta}</p>
    <p className="tabular text-[28px] font-extrabold leading-none mt-1.5" style={{ color }}>{valor}</p>
    {detalle && <p className="text-[11px] text-neutral-500 mt-1.5 truncate">{detalle}</p>}
  </div>
);

const AlertaFila: React.FC<{
  etiqueta: string;
  valor: number | null;
  color: string;
  nota: string;
}> = ({ etiqueta, valor, color, nota }) => (
  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/60 border border-white/70">
    <span
      className="w-2 h-2 rounded-full shrink-0"
      style={{ background: color, boxShadow: `0 0 0 4px ${color}22` }}
    />
    <div className="min-w-0 flex-1">
      <p className="text-[12px] font-bold text-neutral-800 leading-tight">{etiqueta}</p>
      <p className="text-[10px] text-neutral-500 leading-tight truncate">{nota}</p>
    </div>
    <span className="tabular text-xl font-extrabold shrink-0" style={{ color: valor && valor > 0 ? color : '#a0aec0' }}>
      {valor ?? '—'}
    </span>
  </div>
);

type PanelDerecho = 'tipos' | 'ocupacion' | 'tiempos';

const PANELES: { key: PanelDerecho; label: string }[] = [
  { key: 'tipos', label: 'Tipos' },
  { key: 'ocupacion', label: 'Ocupación' },
  { key: 'tiempos', label: 'Tiempos' },
];

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
  alertas,
  globalSubtipo,
}) => {
  const [panelDerecho, setPanelDerecho] = useState<PanelDerecho>('tipos');
  const [listaAbierta, setListaAbierta] = useState(false);

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
  // (el campo no existe en este backend) y dejaba esta lista vacía.
  const ambientalActivities = filteredMapActivities;

  const tasa = ambientalInsightsData.totalIdentified > 0
    ? Math.round((ambientalInsightsData.totalCollected / ambientalInsightsData.totalIdentified) * 100)
    : 0;

  // Mismos puntos que muestra el mapa, con su número y sus pendientes.
  const puntosListados = ambientalActivities
    .map(actividad => ({
      actividad,
      idx: getGlobalActivityIndex(actividad.id) || 0,
      pendientes: getResiduos(actividad).filter((r: any) => !r.recogido).length,
    }))
    .filter(({ idx }) => !listSearchNumber || idx.toString() === listSearchNumber.trim())
    .sort((a, b) => b.idx - a.idx);

  const tiempos = technicalResidueKeys
    .filter(k => k !== 'PLANTAS')
    .map(key => ({ key, dias: ambientalInsightsData.avgCollectionTimes[key] }));

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto lg:overflow-hidden pr-0.5">

      {/* ── Cifras del sector ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
        <StatTile
          etiqueta="Residuos identificados"
          valor={ambientalInsightsData.totalIdentified.toLocaleString('es-CO')}
          detalle={`En ${ambientalInsightsData.totalAct.toLocaleString('es-CO')} puntos registrados`}
          color="#1a202c"
          delay={0}
        />
        <StatTile
          etiqueta="Recogidos"
          valor={ambientalInsightsData.totalCollected.toLocaleString('es-CO')}
          detalle={`${(ambientalInsightsData.totalIdentified - ambientalInsightsData.totalCollected).toLocaleString('es-CO')} siguen pendientes`}
          color="#16a34a"
          delay={60}
        />
        <StatTile
          etiqueta="Tasa de recolección"
          valor={`${tasa}%`}
          detalle="Del total de residuos identificados"
          color="#2563eb"
          delay={120}
        />
        <StatTile
          etiqueta="Puntos en emergencia"
          valor={alertas.emergencias.toLocaleString('es-CO')}
          detalle="Con residuos de 4 días o más"
          color={alertas.emergencias > 0 ? '#e4032e' : '#718096'}
          delay={180}
        />
      </div>

      {/* ── Mapa + columna de análisis ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 flex-1 min-h-0">

        {/* Mapa (2/3) */}
        <div className="xl:col-span-2 glass-panel-solid rounded-2xl overflow-hidden flex flex-col relative min-h-[420px] xl:min-h-0">
          <div className="p-2.5 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white/80 z-[1001]">
            <h3 className="font-display text-[12px] font-bold text-neutral-800 tracking-wide">Mapa de puntos</h3>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={() => { setListaAbierta(v => !v); setPointsSidebarOpen(true); }}
                aria-pressed={listaAbierta}
                className="text-[11px] px-2.5 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 bg-white border-primary/40 text-primary hover:bg-primary/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                Lista de residuos
              </button>
              <button
                onClick={() => setEmergencyFilter(!emergencyFilter)}
                aria-pressed={emergencyFilter}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${emergencyFilter ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
              >
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 5.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.814-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                En emergencia
              </button>
              <input
                value={listSearchNumber}
                onChange={e => setListSearchNumber(e.target.value)}
                placeholder="N° punto"
                className="tabular text-[11px] px-2 py-1.5 border border-neutral-200 rounded-lg bg-white w-24 outline-none focus:ring-2 focus:ring-primary/20"
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-[11px] px-2 py-1.5 border border-neutral-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todos los estados</option>
                <option value="ENVIADA">En validación</option>
                <option value="PUBLICADA">Publicados</option>
                <option value="RECHAZADA">Rechazados</option>
              </select>
              <select
                value={tipoResiduoFilter}
                onChange={e => setTipoResiduoFilter(e.target.value)}
                className="text-[11px] px-2 py-1.5 border border-neutral-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todos los residuos</option>
                <option value="RESIDUOS_ORDINARIOS">Ordinarios</option>
                <option value="RESIDUOS_VOLUMINOSOS">Voluminosos</option>
                <option value="ESCOMBROS">Escombros</option>
              </select>
            </div>
          </div>

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
                    // El admin necesita ver info real y poder aprobar/rechazar
                    // si el punto está pendiente — la consulta pública
                    // (/public/actividad) es de solo lectura para ciudadanos.
                    onActivityClick={activity => window.open(`/validador/actividad/${activity.id}`, '_blank')}
                  />
                );
              })}
            </AnyMapContainer>

            {/* Lista de puntos — el botón de arriba antes no abría nada. */}
            {listaAbierta && (
              <div className="glass-panel-solid absolute top-0 right-0 bottom-0 z-[1002] w-full sm:w-80 flex flex-col rounded-l-2xl overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3.5 py-3 border-b border-neutral-100">
                  <div>
                    <h4 className="font-display text-[12px] font-bold text-neutral-800">Puntos en el mapa</h4>
                    <p className="text-[10px] text-neutral-500 tabular">{puntosListados.length} con los filtros actuales</p>
                  </div>
                  <button
                    onClick={() => setListaAbierta(false)}
                    aria-label="Cerrar lista"
                    className="text-neutral-400 hover:text-neutral-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
                  {puntosListados.length === 0 && (
                    <p className="p-4 text-[11px] text-neutral-500">Ningún punto coincide con los filtros.</p>
                  )}
                  {puntosListados.map(({ actividad, pendientes, idx }) => (
                    <button
                      key={actividad.id}
                      onClick={() => window.open(`/validador/actividad/${actividad.id}`, '_blank')}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-primary/5 transition-colors flex items-center gap-3 focus:outline-none focus-visible:bg-primary/5"
                    >
                      <span className="tabular text-[11px] font-extrabold text-primary w-9 shrink-0">#{idx || '—'}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12px] font-semibold text-neutral-800 truncate">{actividad.barrio || 'Sin barrio'}</span>
                        <span className="block text-[10px] text-neutral-500 tabular">
                          {pendientes > 0 ? `${pendientes} residuo${pendientes === 1 ? '' : 's'} pendiente${pendientes === 1 ? '' : 's'}` : 'Todo recogido'}
                        </span>
                      </span>
                      <span
                        className="text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg shrink-0"
                        style={{
                          background: actividad.status === 'PUBLICADA' ? '#f0fff4' : actividad.status === 'ENVIADA' ? '#eff6ff' : '#FEF2F2',
                          color: actividad.status === 'PUBLICADA' ? '#276749' : actividad.status === 'ENVIADA' ? '#2563eb' : '#b80225',
                        }}
                      >
                        {actividad.status === 'PUBLICADA' ? 'Publicado' : actividad.status === 'ENVIADA' ? 'En validación' : 'Rechazado'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Leyenda flotante */}
            <div className="glass-panel absolute bottom-3 left-3 z-[1000] rounded-xl px-3 py-2.5">
              <p className="font-display text-[9px] font-bold text-neutral-400 uppercase tracking-[0.16em] mb-2">Leyenda</p>
              <div className="flex flex-col gap-1.5 mb-2.5">
                {[
                  { key: 'RESIDUOS_ORDINARIOS', label: 'Ordinarios' },
                  { key: 'RESIDUOS_VOLUMINOSOS', label: 'Voluminosos' },
                  { key: 'ESCOMBROS', label: 'Escombros' },
                ].map(item => (
                  <div key={item.key} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: tipoResiduoColors[item.key] || AMB_GREEN }} />
                    <span className="text-[11px] text-neutral-700 font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-neutral-200/70 pt-2">
                <p className="font-display text-[9px] font-bold text-neutral-400 uppercase tracking-[0.16em] mb-1.5">Días sin recoger</p>
                <div className="flex flex-col gap-1.5 min-w-[136px]">
                  {[
                    { color: '#7c2d12', label: 'Reciente (1 día)' },
                    { color: '#EAB308', label: 'Vencido (2 días o más)' },
                    { color: '#DC2626', label: 'Crítico (3 días o más)' },
                  ].map(entry => (
                    <div key={entry.color} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                      <span className="text-[11px] text-neutral-700">{entry.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna de análisis (1/3) */}
        <div className="xl:col-span-1 flex flex-col gap-3 min-h-0">

          {/* Alertas — lo que hay que resolver */}
          <div className="glass-panel rounded-2xl p-3.5 shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">Requiere atención</h3>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex flex-col gap-2">
              <AlertaFila
                etiqueta="Puntos en emergencia"
                valor={alertas.emergencias}
                color="#e4032e"
                nota="Residuos sin recoger hace 4 días o más"
              />
              <AlertaFila
                etiqueta="Puntos sin gestor"
                valor={alertas.sinGestor}
                color="#EAB308"
                nota="Nadie los tiene en su ruta"
              />
              <AlertaFila
                etiqueta="Esperando validación"
                valor={alertas.porValidar}
                color="#2563eb"
                nota="Enviados por gestores, sin revisar"
              />
            </div>
          </div>

          {/* Análisis: un panel por vez, en vez de tres tarjetas apiladas */}
          <div className="glass-panel rounded-2xl p-3.5 flex-1 min-h-[300px] flex flex-col">
            <div className="flex items-center gap-1 mb-3 shrink-0">
              {PANELES.map(p => {
                const activo = p.key === panelDerecho;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPanelDerecho(p.key)}
                    aria-pressed={activo}
                    className={`px-3 py-1.5 rounded-lg font-display text-[11px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                      activo ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-white/70'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 min-h-0 relative">
              {panelDerecho === 'tipos' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <PieChart
                    data={Object.fromEntries(
                      (globalSubtipo === 'AMBIENTAL_PUNTOS_ACUMULACION' || globalSubtipo === ''
                        ? technicalResidueKeys.filter(k => k !== 'PLANTAS')
                        : ['PLANTAS']
                      ).map(key => [
                        key,
                        filteredMapActivities.filter(a => getResiduos(a).some((r: any) => r.tipoResiduo === key)).length,
                      ]).filter(([, val]) => (val as number) > 0)
                    )}
                    size={130}
                  />
                </div>
              )}

              {panelDerecho === 'ocupacion' && (
                <div className="absolute inset-0 flex flex-col">
                  <p className="text-[11px] text-neutral-500 mb-1 shrink-0">Metros lineales ocupados por tipo</p>
                  <div className="flex-1 min-h-0 flex items-center justify-center">
                    <PieChart
                      data={Object.fromEntries(
                        technicalResidueKeys
                          .filter(k => k !== 'PLANTAS')
                          .map(key => [key, Math.round(ambientalInsightsData.totalArea[key] || 0)])
                          .filter(([, val]) => (val as number) > 0)
                      )}
                      size={130}
                      suffix="m"
                      hideLegend={false}
                      hideCenterText={false}
                    />
                  </div>
                </div>
              )}

              {panelDerecho === 'tiempos' && (
                <div className="absolute inset-0 overflow-y-auto pr-1">
                  <p className="text-[11px] text-neutral-500 mb-3">
                    Días promedio entre el registro del residuo y su recolección.
                  </p>
                  <div className="flex flex-col gap-3">
                    {tiempos.map(({ key, dias }) => {
                      const alto = dias !== undefined && dias > 5;
                      const medio = dias !== undefined && dias > 2 && dias <= 5;
                      const color = dias === undefined ? '#cbd5e0' : alto ? '#e4032e' : medio ? '#EAB308' : '#16a34a';
                      return (
                        <div key={key}>
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-[11px] font-semibold text-neutral-600">{residuoLabels[key]}</span>
                            <span className="tabular text-[13px] font-extrabold" style={{ color }}>
                              {dias !== undefined ? `${dias} d` : 'Sin datos'}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-neutral-200/70 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-[width] duration-700"
                              style={{ width: dias !== undefined ? `${Math.min((dias / 15) * 100, 100)}%` : '0%', background: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-3 border-t border-neutral-200/70 grid grid-cols-3 gap-2">
                    {[
                      { label: 'Publicados', valor: ambientalInsightsData.totalPub, color: '#16a34a' },
                      { label: 'En validación', valor: ambientalInsightsData.totalVal, color: '#2563eb' },
                      { label: 'Rechazados', valor: ambientalInsightsData.totalRech, color: '#e4032e' },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="tabular text-lg font-extrabold leading-none" style={{ color: item.color }}>{item.valor}</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
