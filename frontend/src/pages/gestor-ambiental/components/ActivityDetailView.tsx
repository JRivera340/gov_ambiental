import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { format, differenceInDays } from 'date-fns';
import { StatusBadge } from '../../../components/StatusBadge';
import { BoundaryLayer } from '../../../components/BoundaryLayer';
import { MapLayerControl, type LayerVisibility } from '../../../components/MapLayerControl';
import { InvalidateMap } from './MapHelpers';
import { tipoResiduoLabels } from '../lib/constants';
import { getResiduos, isPuntoEmergencia } from '../lib/residuos';
import { getPuntoSurveyAnswers } from '../lib/puntoInfo';
import { getUltimaActualizacion } from '../lib/ultimaActualizacion';
import { createPuntoCriticoIcon } from '../lib/icons';
import { usePersistentState } from '../hooks/usePersistentState';
import { useAuthStore } from '../../../store/authStore';
import { useGestorAmbientalCtx } from '../context/GestorAmbientalContext';
import { NotasResiduoModal } from './NotasResiduoModal';
import type { ResiduoEntry } from '../../../types';

interface ActivityDetailViewProps {
  activity: any;
  /** Índice de despliegue (#N) calculado en el dashboard */
  displayIdx?: number;
  layerVisibility: LayerVisibility;
  setLayerVisibility: React.Dispatch<React.SetStateAction<LayerVisibility>>;
  onBack: () => void;
  onOpenSeguimiento: () => void;
  onResiduoDetail: (residuo: any) => void;
  onEdit: (id: string) => void;
  onShowActividades?: () => void;
  actividadesCount?: number;
  onVolverARuta?: () => void;
  onActivityUpdated?: (updated: any) => void;
  setToast?: (t: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export const ActivityDetailView: React.FC<ActivityDetailViewProps> = ({
  activity,
  displayIdx,
  layerVisibility,
  setLayerVisibility,
  onBack,
  onOpenSeguimiento,
  onResiduoDetail,
  onEdit,
  onShowActividades,
  actividadesCount,
  onVolverARuta,
  onActivityUpdated,
  setToast,
}) => {
  const [recogidosDesde, setRecogidosDesde] = usePersistentState<string>('gad_recDesde', '');
  const [recogidosHasta, setRecogidosHasta] = usePersistentState<string>('gad_recHasta', '');
  const [selectedResiduoForNota, setSelectedResiduoForNota] = useState<ResiduoEntry | null>(null);

  const user = useAuthStore((s) => s.user);
  const canAddNota = user?.role === 'GESTOR_AMBIENTAL' || user?.role === 'ADMIN';
  const navigate = useNavigate();
  const { puntosAsignados } = useGestorAmbientalCtx();
  // El punto lo puede actualizar el gestor al que esta asignado (jurisdiccion
  // por punto) o el admin. Este repo es mono-subtipo (todo PuntoResiduo ya es
  // "punto de acumulación", ver CLAUDE.md) — el chequeo de operativoSubtipo
  // comparaba contra un campo que no existe en este backend y bloqueaba el
  // botón de actualizar para TODOS los gestores. Bug real corregido
  // 2026-07-29, ver ESTADO-EXTRACCION.md.
  const puedeActualizar =
    !!user && (puntosAsignados.includes(activity.id) || user.role === 'ADMIN');

  const residuos = getResiduos(activity);
  const recogidos = residuos.filter(r => r.recogido);
  const pendientes = residuos.filter(r => !r.recogido);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white animate-in slide-in-from-right-4 duration-500">
      <div className="max-w-4xl mx-auto">
        {/* Banner ruta activa */}
        {onVolverARuta && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase">Ruta activa</span>
              <span className="text-[11px] text-blue-700 font-medium">Estás viendo un punto de la ruta</span>
            </div>
            <button
              onClick={onVolverARuta}
              className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Volver a la ruta
            </button>
          </div>
        )}
        {/* Back Button + Ver Actividades */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-[11px] font-black text-green-600 hover:text-green-700 flex items-center gap-1.5 uppercase tracking-widest transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Volver al Mapa
          </button>
          {onShowActividades && (
            <button
              onClick={onShowActividades}
              className="flex items-center gap-2 bg-green-600/90 hover:bg-green-700 text-white px-3 py-2 rounded-xl shadow-md border border-green-500/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {actividadesCount !== undefined ? `${actividadesCount} Actividades` : 'Ver Actividades'}
              </span>
            </button>
          )}
        </div>

        {/* Activity Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={activity.status} size="sm" />
            <span className="text-xs text-neutral-400 font-bold">{format(new Date(activity.createdAt), 'dd MMM yyyy HH:mm')}</span>
            {activity.createdByNombre && (
              <span className="text-[11px] font-black text-neutral-400 uppercase tracking-widest bg-neutral-100 px-2 py-0.5 rounded-full ml-auto">Por: {activity.createdByNombre}</span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-neutral-900 leading-tight flex items-center gap-2">
            {displayIdx ? <span className="text-xl md:text-2xl font-bold text-neutral-400 bg-neutral-100 px-2 rounded">#{displayIdx}</span> : null}
            <span>Punto de Residuos · {activity.barrio}</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">{activity.results || 'Sin descripción adicional.'}</p>
        </div>

        {/* Información del formulario del punto de acumulación */}
        <div className="mb-6 bg-neutral-50 rounded-2xl p-5 border border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Información del Punto</h3>
              {puedeActualizar && (
                <button
                  onClick={() => navigate('/gestor-ambiental/editar-actividad/' + activity.id)}
                  className="flex items-center gap-1.5 text-[11px] font-black text-neutral-500 hover:text-green-700 uppercase tracking-widest transition-colors bg-white border border-neutral-200 hover:border-green-200 px-2.5 py-1.5 rounded-xl shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                  Actualizar punto
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-[11px] uppercase font-bold text-neutral-500 mb-1">Fecha y hora</p>
                <p className="text-sm font-bold text-neutral-800">{format(new Date(activity.dateTime), 'dd MMM yyyy HH:mm')}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase font-bold text-neutral-500 mb-1">Barrio</p>
                <p className="text-sm font-bold text-neutral-800">{activity.barrio || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase font-bold text-neutral-500 mb-1">Ubicación</p>
                <p className="text-sm font-bold text-neutral-800">{activity.lat?.toFixed(5)}, {activity.lng?.toFixed(5)}</p>
              </div>
              {activity.entidadResponsable && (
                <div>
                  <p className="text-[11px] uppercase font-bold text-neutral-500 mb-1">Entidad responsable</p>
                  <p className="text-sm font-bold text-neutral-800">{activity.entidadResponsable}</p>
                </div>
              )}
              {Array.isArray(activity.entidadesAcompanantes) && activity.entidadesAcompanantes.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase font-bold text-neutral-500 mb-1">Entidades acompañantes</p>
                  <p className="text-sm font-bold text-neutral-800">{activity.entidadesAcompanantes.join(', ')}</p>
                </div>
              )}
              {(() => {
                const ua = getUltimaActualizacion(activity.updatedAt, activity.createdAt);
                if (!ua) return null;
                return (
                  <div>
                    <p className="text-[11px] uppercase font-bold text-neutral-500 mb-1">
                      {ua.esEdicion ? 'Última actualización' : 'Creado'}
                    </p>
                    <p className="text-sm font-bold text-neutral-800">{format(new Date(ua.iso), 'dd MMM yyyy HH:mm')}</p>
                  </div>
                );
              })()}
              {getPuntoSurveyAnswers(activity).map((row) => (
                <div key={row.key}>
                  <p className="text-[11px] uppercase font-bold text-neutral-500 mb-1">{row.label}</p>
                  <p className="text-sm font-bold text-neutral-800">{row.value}</p>
                </div>
              ))}
            </div>
            {activity.results && (
              <div className="mt-4">
                <p className="text-[11px] uppercase font-bold text-neutral-500 mb-1">Observaciones</p>
                <p className="text-sm text-neutral-600 bg-white p-3 rounded-xl border border-neutral-200 italic">"{activity.results}"</p>
              </div>
            )}
          </div>

        {/* Mini Map */}
        <div className="mb-6 h-64 w-full rounded-2xl overflow-hidden border border-neutral-100 shadow-sm relative z-0">
          <MapContainer
            center={[activity.lat, activity.lng]}
            zoom={16}
            zoomControl={true}
            dragging={true}
            touchZoom={true}
            doubleClickZoom={true}
            scrollWheelZoom={true}
            boxZoom={true}
            keyboard={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

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
            <Marker position={[activity.lat, activity.lng]} icon={createPuntoCriticoIcon(isPuntoEmergencia(activity) ? '#EAB308' : '#16A34A', activity.pointNumber)} />
            <InvalidateMap />
          </MapContainer>
        </div>

        {/* Action Button & Date Filter */}
        <div className="flex flex-col gap-3 mb-8">
          {activity.status === 'RECHAZADA' ? (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-red-100 shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-red-600 uppercase tracking-widest pl-1">Punto Rechazado</p>
                  <p className="text-xs text-red-700/80 font-medium">Este punto ha sido rechazado por un validador.</p>
                </div>
              </div>

              {activity.validationNotes && (
                <div className="p-4 bg-neutral-900 text-white rounded-2xl shadow-xl">
                  <p className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-2">Nota del Validador</p>
                  <p className="text-sm font-medium leading-relaxed italic text-neutral-200">
                    "{activity.validationNotes}"
                  </p>
                </div>
              )}

              <button
                onClick={() => onEdit(activity.id)}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 px-6 rounded-2xl text-sm font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                Corregir Actividad
              </button>
            </div>
          ) : activity.status === 'ENVIADA' ? (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-amber-100 shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-amber-600 uppercase tracking-widest pl-1">Punto en Validación</p>
                <p className="text-xs text-amber-700/80 font-medium">Este punto se encuentra en revisión. No se pueden agregar más residuos hasta que sea aprobado.</p>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenSeguimiento}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 px-6 rounded-2xl text-sm font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Hacer Seguimiento
            </button>
          )}

          {/* Residuos Date Filter placed next to action button */}
          {residuos.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
              <span className="text-xs font-bold text-neutral-600 ml-1">Filtrar residuos por fecha:</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="input-field text-xs py-1.5 px-2 bg-white"
                  value={recogidosDesde}
                  onChange={(e) => setRecogidosDesde(e.target.value)}
                />
                <span className="text-neutral-400 font-bold">-</span>
                <input
                  type="date"
                  className="input-field text-xs py-1.5 px-2 bg-white"
                  value={recogidosHasta}
                  onChange={(e) => setRecogidosHasta(e.target.value)}
                />
                {(recogidosDesde || recogidosHasta) && (
                  <button onClick={() => { setRecogidosDesde(''); setRecogidosHasta(''); }} className="ml-1 text-red-400 hover:text-red-600 bg-white p-1.5 rounded-lg border border-neutral-200 hover:border-red-200 shadow-sm transition-all">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Residue Lists Grid */}
        <div className="grid grid-cols-2 gap-4 md:gap-8 items-start">
          {/* Residuos Pendientes */}
          <div>
            {pendientes.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider mb-3">Residuos Pendientes ({pendientes.length})</h3>
                <div className="space-y-3">
                  {(() => {
                    let filteredPendientes = pendientes;
                    if (recogidosDesde) {
                      filteredPendientes = filteredPendientes.filter(r => r.dateTime && new Date(r.dateTime) >= new Date(recogidosDesde));
                    }
                    if (recogidosHasta) {
                      const hastaDate = new Date(recogidosHasta);
                      hastaDate.setHours(23, 59, 59, 999);
                      filteredPendientes = filteredPendientes.filter(r => r.dateTime && new Date(r.dateTime) <= hastaDate);
                    }

                    if (filteredPendientes.length === 0) {
                      return <p className="text-xs font-bold text-neutral-400 p-4 border-2 border-dashed border-neutral-100 rounded-2xl text-center">No hay pendientes en este rango</p>;
                    }

                    return filteredPendientes.map((r, index) => {
                      const isOverdue = r.dateTime ? differenceInDays(new Date(), new Date(r.dateTime)) >= 4 : false;
                      const hasNotas = (r.notas?.length ?? 0) > 0;
                      const displayNombre = r.createdByNombre || activity.createdByNombre;
                      const cardColor = isOverdue
                        ? 'bg-orange-50 border-orange-300 hover:bg-orange-100/50'
                        : 'bg-amber-50 border-amber-200 hover:bg-amber-100/50';
                      return (
                        <div key={r.id} className={`rounded-2xl border transition-all group ${cardColor}`}>
                          <div
                            className="p-4 cursor-pointer"
                            onClick={() => onResiduoDetail(r)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-amber-800">{index + 1}. {tipoResiduoLabels[r.tipoResiduo] || r.tipoResiduo}</span>
                                {r.aprobado && (
                                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-lg uppercase tracking-wider">Validado</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {isOverdue && <span className="text-[11px] font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full uppercase">⚠️ Vencido</span>}
                                <span className="text-[11px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full uppercase">Pendiente</span>
                                <svg className="w-4 h-4 text-amber-300 group-hover:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                              </div>
                            </div>
                            <div className="text-xs text-neutral-600 space-y-0.5">
                              <span>Área: {r.areaLinealMetros ?? 0} m</span>
                              {displayNombre && (
                                <p className="text-[11px] text-amber-600/70 font-bold uppercase break-words">Por: {displayNombre}</p>
                              )}
                            </div>
                          </div>
                          {(hasNotas || canAddNota) && (
                            <div className="px-4 pb-3 flex items-center gap-2 border-t border-amber-200/50 mt-0 pt-2">
                              {hasNotas && (
                                <button
                                  onClick={() => setSelectedResiduoForNota(r as ResiduoEntry)}
                                  className="text-[10px] font-black text-amber-700 bg-white border border-amber-200 px-2.5 py-1 rounded-lg uppercase tracking-wider hover:bg-amber-100 transition-colors flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                                  Ver notas ({r.notas!.length})
                                </button>
                              )}
                              {canAddNota && (
                                <button
                                  onClick={() => setSelectedResiduoForNota(r as ResiduoEntry)}
                                  className="text-[10px] font-black text-neutral-500 bg-white border border-neutral-200 px-2.5 py-1 rounded-lg uppercase tracking-wider hover:bg-neutral-50 hover:text-neutral-700 transition-all flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                  Agregar nota
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              <div className="mb-6 border-2 border-dashed border-neutral-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <p className="text-xs font-bold text-neutral-400">No hay residuos pendientes</p>
              </div>
            )}
          </div>

          {/* Residuos Recogidos */}
          <div>
            {(() => {
              let filteredRecogidos = recogidos;
              if (recogidosDesde) {
                filteredRecogidos = filteredRecogidos.filter(r => r.fechaRecogida && new Date(r.fechaRecogida) >= new Date(recogidosDesde));
              }
              if (recogidosHasta) {
                const hastaDate = new Date(recogidosHasta);
                hastaDate.setHours(23, 59, 59, 999);
                filteredRecogidos = filteredRecogidos.filter(r => r.fechaRecogida && new Date(r.fechaRecogida) <= hastaDate);
              }

              return (
                <>
                  <div className="mb-4">
                    <h3 className="text-sm font-black text-green-700 uppercase tracking-wider">
                      Residuos Recogidos ({filteredRecogidos.length})
                    </h3>
                  </div>

                  {filteredRecogidos.length > 0 ? (
                    <div className="mb-6">
                      <div className="space-y-3">
                        {filteredRecogidos.map((r, index) => {
                          const hasNotasRec = (r.notas?.length ?? 0) > 0;
                          return (
                          <div key={r.id} className="rounded-2xl border border-green-200 bg-green-50 transition-all group">
                            <div
                              className="p-4 cursor-pointer hover:bg-green-100/50 transition-all"
                              onClick={() => onResiduoDetail(r)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-green-800">{index + 1}. {tipoResiduoLabels[r.tipoResiduo] || r.tipoResiduo}</span>
                                  {r.aprobado && (
                                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-lg uppercase tracking-wider">Validado</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full uppercase">Recogido</span>
                                  <svg className="w-4 h-4 text-green-300 group-hover:text-green-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                                </div>
                              </div>
                              {r.fechaRecogida && <p className="text-xs text-green-600 font-bold">Recogido el {format(new Date(r.fechaRecogida), 'dd MMM yyyy')}</p>}
                              {r.recogidoByNombre && <p className="text-[11px] text-green-700/70 font-bold uppercase break-words">Por: {r.recogidoByNombre}</p>}
                            </div>
                            {(hasNotasRec || canAddNota) && (
                              <div className="px-3 pb-2 flex items-center gap-1.5 border-t border-green-200/50 pt-2">
                                {hasNotasRec && (
                                  <button
                                    onClick={() => setSelectedResiduoForNota(r as ResiduoEntry)}
                                    title={`Ver notas (${r.notas!.length})`}
                                    className="relative text-green-700 bg-white border border-green-200 p-1.5 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                                    <span className="text-[10px] font-black">{r.notas!.length}</span>
                                  </button>
                                )}
                                {canAddNota && (
                                  <button
                                    onClick={() => setSelectedResiduoForNota(r as ResiduoEntry)}
                                    title="Agregar nota"
                                    className="text-[10px] font-black text-neutral-500 bg-white border border-neutral-200 px-2.5 py-1.5 rounded-lg uppercase tracking-wider hover:bg-neutral-50 hover:text-neutral-700 transition-all flex items-center gap-1"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                    Nota
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 border-2 border-dashed border-neutral-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                      <p className="text-xs font-bold text-neutral-400">
                        {(recogidosDesde || recogidosHasta) ? 'No hay residuos recogidos en este rango de fechas' : 'No hay residuos recogidos aún'}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

      </div>

      {selectedResiduoForNota && (
        <NotasResiduoModal
          residuo={selectedResiduoForNota}
          puntoId={activity.id}
          canAdd={canAddNota}
          onClose={() => setSelectedResiduoForNota(null)}
          onUpdated={(updated) => {
            setSelectedResiduoForNota(null);
            if (onActivityUpdated) onActivityUpdated(updated);
          }}
          setToast={setToast || (() => {})}
        />
      )}
    </div>
  );
};
