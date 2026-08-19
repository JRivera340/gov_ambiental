import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavIcon } from '../../../components/shell/NavIcon';
import type L from 'leaflet';
import { MapContainer, TileLayer, Popup, Marker } from 'react-leaflet';
import { Loading } from '../../../components/Loading';
import { StatusBadge } from '../../../components/StatusBadge';
import { MapLayerControl } from '../../../components/MapLayerControl';
import { BoundaryLayer } from '../../../components/BoundaryLayer';
import { RecoleccionSectorLayer } from '../../../components/RecoleccionSectorLayer';
import { SectorRecoleccionPanel } from '../../../components/SectorRecoleccionPanel';
import { format } from 'date-fns';

import { InvalidateMap, MapFocus } from './MapHelpers';
import { AMBIENTAL_COLOR, tipoResiduoLabels } from '../lib/constants';
import { getResiduos, isPuntoEmergencia } from '../lib/residuos';
import { createPuntoCriticoIcon, createAmbientalIcon } from '../lib/icons';
import { useGestorAmbientalCtx } from '../context/GestorAmbientalContext';
import { coberturaPct, puntosVencidos } from '../lib/indicadoresAmbiental.lib';
import { openDirections } from '../lib/geo';
import { FiltrosDrawer } from './FiltrosDrawer';

// ════════════════════════════════════════════════════════════════
// GeneralMapView — vista del mapa general (viewMode === 'general-map').
// Consume todo el estado/handlers desde GestorAmbientalContext: mapa
// Leaflet + Map Tools (filtros, sectores, insignia Actividades, en calor),
// drawer de filtros, panel de sectores, markers y leyenda.
// ════════════════════════════════════════════════════════════════
export const GeneralMapView: React.FC = () => {
  const {
    showSectorPanel, setShowSectorPanel,
    activeSectorIds, setActiveSectorIds,
    isNocturnalGestor,
    showActividadesCalor, setShowActividadesCalor,
    actividadesEnCalor,
    genFilterEstado,
    allSectors, sectorsLoading,
    showAllSectors, setShowAllSectors,
    selectedSector, setSelectedSector,
    openActivity,
    loadingGeneral, activities,
    mapZoomEnabled,
    focusPoint, focusNonce, focusOnPoint,
    layerVisibility, setLayerVisibility,
    mapActivitiesFinal, activitySectorMap,
    loadActivities,
    genFilterDesde, genFilterHasta,
    genFilterTipo,
    layersPanelOpen, setLayersPanelOpen,
    puntosAsignados,
    puntoCriticoActivities,
    emergencyFilter, setEmergencyFilter,
    focusActivityId, focusActivityNonce,
    soloMios, setSoloMios,
  } = useGestorAmbientalCtx();

  const markerRefs = useRef<Map<string, L.Marker>>(new Map());
  const [legendOpen, setLegendOpen] = useState(false);
  const puntosAsignadosSet = useMemo(() => new Set(puntosAsignados), [puntosAsignados]);

  const misPuntos = useMemo(() => {
    return puntoCriticoActivities.filter((a: any) => puntosAsignadosSet.has(a.id));
  }, [puntoCriticoActivities, puntosAsignadosSet]);

  const kpisMios = useMemo(() => ({
    vencidos: puntosVencidos(misPuntos).length,
    cobertura: coberturaPct(misPuntos),
  }), [misPuntos]);

  // Al tocar el KPI "vencidos" se resaltan esos puntos en el mapa
  // (los demas se atenuan). Volver a tocarlo limpia el resaltado.
  // El KPI "vencidos" controla el filtro de emergencia global y persistido
  // (emergencyFilter) — un solo mecanismo de filtro de emergencia en la app.
  const focusIds = useMemo<Set<string> | null>(() => {
    if (emergencyFilter) return new Set(puntosVencidos(misPuntos).map((a: any) => a.id));
    return null;
  }, [emergencyFilter, misPuntos]);

  useEffect(() => {
    if (!focusActivityId) return;
    const marker = markerRefs.current.get(focusActivityId);
    marker?.openPopup();
  }, [focusActivityNonce, focusActivityId]);

  return (
            <div className="flex-1 flex flex-col h-full relative overflow-hidden animate-in fade-in duration-500">
              <FiltrosDrawer />
              <div className="flex-1 w-full relative bg-neutral-100 overflow-hidden">
                <div className="absolute inset-0">
                  {/* Map Tools */}
                  <div className="absolute top-4 right-4 md:top-6 md:right-6 z-[1000] flex flex-col items-end gap-2 md:gap-3 pointer-events-none max-w-[calc(100%-32px)] md:max-w-[calc(100%-48px)]">
                    <div className="flex flex-row-reverse flex-wrap gap-2 md:gap-3">
                      {/* Mini-KPIs: impacto sobre mis puntos asignados */}
                      {puntosAsignados.length > 0 && (
                        <div
                          className="pointer-events-auto flex items-center gap-2 md:gap-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 px-3 py-1.5 md:px-4 md:py-2"
                          title="Indicadores sobre mis puntos asignados"
                        >
                          <button
                            type="button"
                            onClick={() => setEmergencyFilter(!emergencyFilter)}
                            className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg px-1.5 py-0.5 transition-all ${emergencyFilter ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300' : 'text-amber-700 hover:bg-amber-50'}`}
                            title="Filtrar y resaltar mis puntos vencidos"
                          >
                            {kpisMios.vencidos}
                            <span className="text-neutral-400 font-bold normal-case tracking-normal">Puntos vencidos</span>
                          </button>
                          <span className="w-px h-3 bg-neutral-200" />
                          <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-700" title="Cobertura de recolección">
                            {kpisMios.cobertura}%
                            <span className="text-neutral-400 font-bold normal-case tracking-normal">cob.</span>
                          </span>
                        </div>
                      )}
                      {/* Toggle: Mis puntos asignados / Todos los puntos */}
                      <div className="pointer-events-auto flex bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 p-1">
                        <button
                          onClick={() => setSoloMios(true)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-bold text-xs uppercase tracking-wider ${soloMios ? 'bg-emerald-700 text-white' : 'text-neutral-500 hover:text-emerald-700'}`}
                          title="Mostrar solo mis puntos asignados"
                        >
                          Mis puntos
                        </button>
                        <button
                          onClick={() => setSoloMios(false)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-bold text-xs uppercase tracking-wider ${!soloMios ? 'bg-emerald-700 text-white' : 'text-neutral-500 hover:text-emerald-700'}`}
                          title="Mostrar todos los puntos"
                        >
                          Todos
                        </button>
                      </div>
                      {/* Botón: abrir panel de selección de sectores de recolección */}
                      <button
                        onClick={() => setShowSectorPanel(!showSectorPanel)}
                        className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all font-bold text-xs uppercase tracking-wider ${
                          showSectorPanel || activeSectorIds.size > 0
                            ? 'bg-emerald-700 border-emerald-600 text-white'
                            : 'bg-white/95 border-white/50 text-neutral-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700'
                        }`}
                        title="Seleccionar sectores de recolección Promoambiental"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <span className="hidden sm:inline">Sectores Recolección{activeSectorIds.size > 0 ? ` (${activeSectorIds.size})` : ''}</span>
                        <span className="sm:hidden">Sectores{activeSectorIds.size > 0 ? ` (${activeSectorIds.size})` : ''}</span>
                      </button>

                      {/* Botón: Auto-marcar Ordinarios en días de recolección Promoambiental */}
                      {/* SE DESHABILITA ESTA OPCIÓN POR SOLICITUD DEL USUARIO
                      <button
                        onClick={handleAutoMarkOrdinarios}
                        disabled={isMarkingOrdinarios}
                        className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all font-bold text-xs uppercase tracking-wider ${
                          isMarkingOrdinarios
                            ? 'bg-neutral-200 border-neutral-300 text-neutral-400 cursor-not-allowed'
                            : 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100 hover:border-orange-400'
                        }`}
                        title={`Marcar ordinarios pendientes en sectores programados para hoy (${collectionDayName})`}
                      >
                        {isMarkingOrdinarios ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <span className="hidden sm:inline">
                          {isMarkingOrdinarios ? 'Marcando...' : `Ordinarios ${collectionDayName}`}
                        </span>
                        <span className="sm:hidden">{isMarkingOrdinarios ? '...' : 'Ordinarios'}</span>
                      </button>
                      */}

                      {/* Botón: Actividades en Calor (solo gestor nocturno) */}
                      {isNocturnalGestor && (
                        <button
                          onClick={() => setShowActividadesCalor(!showActividadesCalor)}
                          className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all font-bold text-xs uppercase tracking-wider ${
                            showActividadesCalor
                              ? 'bg-red-700 border-red-600 text-white'
                              : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-400'
                          }`}
                          title="Actividades en calor — Residuos más antiguos pendientes"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                          </svg>
                          <span className="hidden sm:inline">Actividades en Calor ({actividadesEnCalor.length})</span>
                          <span className="sm:hidden">En calor</span>
                        </button>
                      )}
                    </div>

                    {/* Panel: Lista de Sectores de Recolección */}
                    {showSectorPanel && (
                      <div className="bg-white/97 backdrop-blur-md p-4 rounded-[28px] shadow-2xl border border-white/50 w-full max-w-sm pointer-events-auto">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-black text-neutral-700 uppercase tracking-widest">Sectores de Recolección</h3>
                          <div className="flex items-center gap-2">
                            {activeSectorIds.size > 0 && (
                              <button
                                onClick={() => setActiveSectorIds(new Set())}
                                className="text-[11px] font-bold text-red-400 hover:text-red-600 transition-colors"
                              >
                                Limpiar ({activeSectorIds.size})
                              </button>
                            )}
                            {allSectors.length > 0 && (
                              <button
                                onClick={() => {
                                  if (activeSectorIds.size === allSectors.length) {
                                    setActiveSectorIds(new Set());
                                  } else {
                                    setActiveSectorIds(new Set(allSectors.map(s => s.id)));
                                  }
                                }}
                                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                              >
                                {activeSectorIds.size === allSectors.length ? 'Desselec. todos' : 'Todos'}
                              </button>
                            )}
                          </div>
                        </div>
                        {sectorsLoading ? (
                          <div className="flex justify-center py-4">
                            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : allSectors.length === 0 ? (
                          <p className="text-xs text-neutral-400 text-center py-2">No se encontraron sectores en el KMZ</p>
                        ) : (
                          <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                            {(showAllSectors ? allSectors : allSectors.filter(s => activeSectorIds.has(s.id))).length === 0 && (
                              <p className="text-xs text-neutral-400 text-center py-3">No has señalado sectores todavía. Toca "Ver más" para verlos todos.</p>
                            )}
                            {(showAllSectors ? allSectors : allSectors.filter(s => activeSectorIds.has(s.id))).map((sector) => {
                              const isActive = activeSectorIds.has(sector.id);
                              const sectorName =
                                sector.properties?.name ||
                                sector.properties?.Name ||
                                sector.properties?.Nombre ||
                                sector.id;
                              const macroRuta =
                                sector.properties?.MACRO_RUTA ||
                                sector.properties?.MacroRuta ||
                                sector.properties?.macro_ruta;
                              const turno =
                                sector.properties?.TURNO ||
                                sector.properties?.Turno ||
                                sector.properties?.turno;
                              return (
                                <button
                                  key={sector.id}
                                  onClick={() => {
                                    const next = new Set(activeSectorIds);
                                    if (isActive) {
                                      next.delete(sector.id);
                                      if (selectedSector?.id === sector.id) setSelectedSector(null);
                                    } else {
                                      next.add(sector.id);
                                    }
                                    setActiveSectorIds(next);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-start gap-2.5 border ${
                                    isActive
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                      : 'bg-neutral-50 border-neutral-100 text-neutral-600 hover:border-emerald-100 hover:bg-emerald-50/50'
                                  }`}
                                >
                                  <div className={`w-3.5 h-3.5 mt-0.5 rounded shrink-0 flex items-center justify-center border-2 ${
                                    isActive ? 'bg-emerald-500 border-emerald-500' : 'border-neutral-300'
                                  }`}>
                                    {isActive && (
                                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{sectorName}</p>
                                    {(macroRuta || turno) && (
                                      <p className="text-[11px] text-neutral-400 truncate">
                                        {[macroRuta && `MR: ${macroRuta}`, turno].filter(Boolean).join(' · ')}
                                      </p>
                                    )}
                                  </div>
                                  {isActive && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setSelectedSector(sector); }}
                                      className="shrink-0 text-[11px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg px-1.5 py-0.5 transition-all"
                                    >
                                      Ver
                                    </button>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {allSectors.length > 0 && (
                          <button
                            onClick={() => setShowAllSectors(v => !v)}
                            className="w-full mt-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl py-2.5 transition-all"
                          >
                            {showAllSectors ? 'Ver solo los señalados' : `Ver más — todos los sectores (${allSectors.length})`}
                          </button>
                        )}
                        <p className="text-[11px] text-neutral-400 text-center mt-2 pt-2 border-t border-neutral-100">
                          {activeSectorIds.size}/{allSectors.length} sectores visibles en el mapa
                        </p>
                      </div>
                    )}

                    {/* Panel: Actividades en Calor (Gestor Nocturno) */}
                    {isNocturnalGestor && showActividadesCalor && (
                      <div className="bg-white/97 backdrop-blur-md p-4 rounded-[28px] shadow-2xl border border-white/50 w-full max-w-sm pointer-events-auto mt-2">
                        <div className="flex items-center justify-between mb-3 border-b border-neutral-100 pb-2">
                          <h3 className="text-xs font-black text-red-700 uppercase tracking-widest flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                            </svg>
                            Actividades en Calor
                          </h3>
                          <button onClick={() => setShowActividadesCalor(false)} className="text-neutral-400 hover:text-red-500">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {actividadesEnCalor.length === 0 ? (
                          <p className="text-xs text-neutral-400 text-center py-4 italic">No hay residuos pendientes.</p>
                        ) : (
                          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {actividadesEnCalor.map(({ activity, residuo, daysPending }, idx) => (
                              <button
                                key={`${activity.id}-${residuo.id}`}
                                onClick={() => openActivity(activity)}
                                className={`w-full text-left p-3 rounded-xl transition-all border block ${
                                  daysPending > 3
                                    ? 'bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300'
                                    : daysPending > 1
                                      ? 'bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                                      : 'bg-white border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-xs font-bold text-neutral-800">#{idx + 1} {tipoResiduoLabels[residuo.tipoResiduo] || residuo.tipoResiduo}</span>
                                  <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                                    daysPending > 3 ? 'bg-red-100 text-red-700' :
                                    daysPending > 1 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                  }`}>
                                    {daysPending} días
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutral-500 line-clamp-1">{activity.barrio}</p>
                                <p className="text-[11px] text-neutral-400 mt-1">Registrado el {format(new Date(residuo.dateTime || activity.createdAt), 'dd MMM yyyy')}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {loadingGeneral && activities.length === 0 ? (
                    <div className="absolute inset-0 z-[2000] flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
                      <Loading />
                    </div>
                  ) : (
                    <MapContainer center={[4.6097, -74.0717]} zoom={14} scrollWheelZoom={mapZoomEnabled} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                       <InvalidateMap />
                       <MapFocus point={focusPoint} nonce={focusNonce} />
                       <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

                       {/* Control de capas */}
                       <MapLayerControl
                         layerVisibility={layerVisibility}
                         onLayerVisibilityChange={(layer, visible) => {
                           setLayerVisibility(prev => ({ ...prev, [layer]: visible }));
                         }}
                         onToggleAll={(visible) => {
                           setLayerVisibility({
                             barrios: visible,
                             carrera7: visible,
                             colegios: visible,
                             cestas: visible,
                             falloSanVictorino: visible,
                             propiedadHorizontal: visible,
                             upz: visible,
                             cambuches: visible,
                             bodegas: visible,
                           });
                         }}
                         position="bottomright"
                         onOpenChange={setLayersPanelOpen}
                       />

                       <BoundaryLayer
                         kmlPath="/boundaries/KMZ_Sectores_Catastrales_SF_2026.kmz"
                         color="#DC2626"
                         fillColor="#DC2626"
                         fillOpacity={0.1}
                         weight={2.5}
                       />

                       <BoundaryLayer
                         kmlPath="/boundaries/Carrera7.kmz"
                         color="#3b82f6"
                         fillColor="#3b82f6"
                         fillOpacity={0.2}
                         weight={3}
                         visible={layerVisibility.carrera7}
                       />
                       <BoundaryLayer
                         kmlPath="/boundaries/Capa_Colegios.kmz"
                         color="#7c3aed"
                         fillColor="#7c3aed"
                         fillOpacity={0.15}
                         weight={2.5}
                         visible={layerVisibility.colegios}
                       />
                       <BoundaryLayer
                         kmlPath="/boundaries/Cestas (1).kmz"
                         color="#3b82f6"
                         fillColor="#3b82f6"
                         fillOpacity={0.2}
                         weight={2}
                         visible={layerVisibility.cestas}
                       />
                       <BoundaryLayer
                         kmlPath="/boundaries/Vias_FalloSV_LaCapuchina.kmz"
                         color="#ea580c"
                         fillColor="#ea580c"
                         fillOpacity={0.3}
                         weight={3}
                         visible={layerVisibility.falloSanVictorino}
                       />
                       <BoundaryLayer
                         kmlPath="/boundaries/Vias_FalloSV_SantaInes.kmz"
                         color="#ea580c"
                         fillColor="#ea580c"
                         fillOpacity={0.3}
                         weight={3}
                         visible={layerVisibility.falloSanVictorino}
                       />
                       <BoundaryLayer
                         kmlPath="/boundaries/PropiedadHorizontal (1).kmz"
                         color="#eab308"
                         fillColor="#eab308"
                         fillOpacity={0.5}
                         weight={2}
                         visible={layerVisibility.propiedadHorizontal}
                       />
                       <BoundaryLayer
                         kmlPath="/boundaries/UPZ_SantaFe.kmz"
                         color="#f97316"
                         fillColor="#f97316"
                         fillOpacity={0.2}
                         weight={2.5}
                         visible={layerVisibility.upz}
                       />
                       <BoundaryLayer
                         kmlPath="/boundaries/Capa_Cambuches.kmz"
                         color="#ef4444"
                         fillColor="#ef4444"
                         fillOpacity={0.3}
                         weight={2.5}
                         visible={layerVisibility.cambuches}
                       />
                       <BoundaryLayer
                         kmlPath="/boundaries/Capa_Bodegas.kmz"
                         color="#4b5563"
                         fillColor="#4b5563"
                         fillOpacity={0.2}
                         weight={2.5}
                         visible={layerVisibility.bodegas}
                       />
                      {activeSectorIds.size > 0 && (
                        <RecoleccionSectorLayer
                          visible={true}
                          onSectorClick={(s) => setSelectedSector(s)}
                          selectedSectorId={selectedSector?.id || null}
                          activeSectorIds={activeSectorIds}
                        />
                      )}
                      {mapActivitiesFinal
                        .filter(({ activity: a }) => a.lat && a.lng)
                        .map(({ activity: a, displayIdx }) => {
                          // Mono-subtipo: todo lo que llega a este backend ya
                          // es punto de acumulación — operativoSubtipo es un
                          // campo del hub que no existe acá. Chequearlo
                          // siempre daba false y forzaba el ícono genérico
                          // (hoja verde) en vez del de residuos.
                          const isPuntoCritico = true;
                          const hasEmergency = isPuntoCritico && isPuntoEmergencia(a);
                          const faded = focusIds !== null && isPuntoCritico && !focusIds.has(a.id);

                          // Determinar color basado en estado y emergencia
                          let markerColor = '#16A34A'; // Verde por defecto (Validadas/Publicadas)

                          if (a.status === 'ENVIADA') {
                            markerColor = '#78350f'; // Marrón para pendientes de validación
                          } else if (a.status === 'RECHAZADA') {
                            markerColor = '#000000'; // Negro para rechazadas
                          } else if (hasEmergency) {
                            markerColor = '#EAB308'; // Amarillo/Ambar para emergencia
                          }

                          if (isPuntoCritico) {
                            const sectorIds = activitySectorMap.get(a.id);
                            if (sectorIds && sectorIds.some(id => activeSectorIds.has(id))) {
                               // Si está en al menos un sector activo, forzar el color del sector
                               markerColor = '#2563eb';
                               if (selectedSector && sectorIds.includes(selectedSector.id)) {
                                  markerColor = '#6366f1'; // Color de selección
                               }
                            }
                          }

                          const icon = isPuntoCritico ? createPuntoCriticoIcon(markerColor, displayIdx) : createAmbientalIcon(displayIdx);
                          return (
                            <Marker
                              key={a.id}
                              ref={(instance) => {
                                if (instance) markerRefs.current.set(a.id, instance);
                                else markerRefs.current.delete(a.id);
                              }}
                              position={[a.lat, a.lng]}
                              icon={icon}
                              opacity={faded ? 0.3 : 1}
                              eventHandlers={{
                                click: () => {
                                  focusOnPoint(a.lat, a.lng);
                                  // Marca (señala) los sectores del punto para que aparezcan
                                  // seleccionados en el menú de sectores, sin abrir el panel.
                                  const ids = activitySectorMap.get(a.id);
                                  if (ids && ids.length > 0) {
                                    setActiveSectorIds(prev => {
                                      const next = new Set(prev);
                                      ids.forEach(id => next.add(id));
                                      return next;
                                    });
                                  }
                                }
                              }}
                            >
                              <Popup>
                                <div className="min-w-[200px] p-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <StatusBadge status={a.status} size="sm" />
                                  </div>
                                  <h4 className="font-bold text-neutral-800 text-sm mb-1 leading-tight flex items-start gap-1">
                                    <span className="text-[11px] font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-1 py-0.5 rounded break-keep shrink-0 mt-0.5">#{displayIdx}</span>
                                    <span>{isPuntoCritico ? 'Punto de Residuos' : 'Act. Ambiental'} · {a.barrio}</span>
                                  </h4>
                                  {isPuntoCritico && (
                                    <p className="text-xs text-neutral-500 mb-1">{getResiduos(a).length} tipo(s) de residuo</p>
                                  )}
                                  {!isPuntoCritico && a.results && (
                                    <p className="text-xs text-neutral-500 mb-1 line-clamp-2">{a.results}</p>
                                  )}
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      onClick={() => openActivity(a)}
                                      className={`flex-1 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isPuntoCritico ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                    >
                                      Ver Detalle
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        openDirections(a.lat, a.lng);
                                      }}
                                      className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors text-center flex items-center justify-center gap-1 border border-neutral-200"
                                      title="Abrir indicaciones en Google Maps"
                                    >
                                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      Ir con Maps
                                    </button>
                                  </div>
                                </div>
                              </Popup>
                            </Marker>
                          );
                        })}
                    </MapContainer>
                  )}
                </div>

                {/* Panel lateral de sector de recolección */}
                {selectedSector && (
                  <div className="absolute top-0 right-0 bottom-0 z-[1200] pointer-events-none" style={{ width: '100%' }}>
                    <div className="absolute top-0 right-0 bottom-0 w-full sm:w-96 pointer-events-auto">
                      <SectorRecoleccionPanel
                        sector={selectedSector}
                        onClose={() => setSelectedSector(null)}
                        onRefresh={loadActivities}
                        desde={genFilterDesde}
                        hasta={genFilterHasta}
                        status={genFilterEstado}
                        tipo={genFilterTipo}
                      />
                    </div>
                  </div>
                )}


                {/* Legend — compacta en móvil, se puede colapsar tocando el título */}
                <div className={`absolute bottom-4 left-4 md:bottom-6 md:left-6 z-[1000] bg-white/95 backdrop-blur-md p-1 md:p-3 rounded-xl md:rounded-[24px] shadow-xl border border-white/50 max-w-[42vw] md:max-w-none ${layersPanelOpen ? 'hidden md:block' : 'block'}`}>
                  <button
                    onClick={() => setLegendOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-1 md:cursor-default"
                  >
                    <h5 className="text-[8px] md:text-[11px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-neutral-400 px-1">Leyenda</h5>
                    <NavIcon name={legendOpen ? 'chevron-down' : 'chevron-up'} className="w-3 h-3 text-neutral-400 md:hidden" />
                  </button>
                  <div className={`space-y-0 md:space-y-1.5 mt-0.5 md:mt-1.5 ${legendOpen ? 'block' : 'hidden'} md:block`}>
                    <div className="flex items-center gap-1 md:gap-2 px-1">
                      <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: '#78350f' }}></div>
                      <span className="text-[9px] md:text-[11px] font-bold text-neutral-600 leading-tight">Pendiente Validación</span>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2 px-1">
                      <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: '#16A34A' }}></div>
                      <span className="text-[9px] md:text-[11px] font-bold text-neutral-600 leading-tight">Punto Validado</span>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2 px-1">
                      <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: '#000000' }}></div>
                      <span className="text-[9px] md:text-[11px] font-bold text-neutral-600 leading-tight">Rechazadas</span>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2 px-1">
                      <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: AMBIENTAL_COLOR }}></div>
                      <span className="text-[9px] md:text-[11px] font-bold text-neutral-600 leading-tight">Act. Ambiental</span>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2 px-1">
                      <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: '#EAB308' }}></div>
                      <span className="text-[9px] md:text-[11px] font-bold text-neutral-600 leading-tight">Residuos vencidos pendientes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
  );
};
