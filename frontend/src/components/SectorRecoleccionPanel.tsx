import React, { useEffect, useState, useCallback } from 'react';
import { activityService } from '../services/activity.service';
import { authService } from '../services/auth.service';
import type { SectorFeature } from './RecoleccionSectorLayer';

interface PuntoEnSector {
  actividadId: string;
  barrio: string;
  lat: number;
  lng: number;
  status: string;
  dateTime: string;
  totalResiduos: number;
  recogidos: number;
  pendientes: number;
  residuos: any[];
}

interface SectorData {
  sectorId: string;
  nombre: string;
  properties: Record<string, any>;
  totalPuntos: number;
  totalResiduosOrdinarios: number; // Mantenemos el nombre por compatibilidad con el backend
  totalRecogidos: number;
  totalPendientes: number;
  puntos: PuntoEnSector[];
}

interface Props {
  sector: SectorFeature;
  onClose: () => void;
  onRefresh?: () => void;
  desde?: string;
  hasta?: string;
  status?: string;
  tipo?: string;
}

// VITE_AMBIENTAL_API_URL es la misma variable que usa services/api.ts —
// VITE_API_BASE_URL nunca se define en este build, quedaba siempre vacío y
// las llamadas de acá le pegaban al propio frontend (nginx) en vez del
// backend.
const API_BASE = import.meta.env.VITE_AMBIENTAL_API_URL || '';

async function fetchAuthJSON(url: string, opts?: RequestInit) {
  const token = authService.getToken();
  const res = await fetch(`${API_BASE}${url}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json();
}

const AttrRow: React.FC<{ label: string; value?: any }> = ({ label, value }) => {
  if (value == null || value === '' || value === undefined) return null;
  return (
    <div className="flex justify-between py-1 border-b border-neutral-100 last:border-0 gap-3">
      <span className="text-xs text-neutral-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-neutral-800 text-right">{String(value)}</span>
    </div>
  );
};

/**
 * Panel lateral que muestra los detalles de un sector de recolección
 * y permite marcar todos sus residuos ordinarios como recogidos.
 */
export const SectorRecoleccionPanel: React.FC<Props> = ({
  sector,
  onClose,
  onRefresh,
  desde,
  hasta,
  status,
  tipo,
}) => {
  const [data, setData] = useState<SectorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [openPointIds, setOpenPointIds] = useState<Set<string>>(new Set());

  const nombre =
    sector.properties?.name ||
    sector.properties?.Name ||
    sector.properties?.Nombre ||
    sector.id;

  const props = sector.properties || {};

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        sectorId: sector.id,
      });
      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);
      if (status) params.append('status', status);
      if (tipo) params.append('tipo', tipo);

      const props = sector.properties || {};
      const sectorBarrio = props.barrio || props.Barrio || props.BARRIO;
      if (sectorBarrio) params.append('sectorBarrio', sectorBarrio);

      const result = await fetchAuthJSON(
        `/api/sectores/puntos?${params.toString()}`,
      );
      setData(result);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Error desconocido al cargar el sector');
    } finally {
      setLoading(false);
    }
  }, [sector.id, desde, hasta, status, tipo]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarcarRecogido = async () => {
    setMarking(true);
    try {
      const result = await fetchAuthJSON('/api/sectores/marcar-recogido-masivo', {
        method: 'PATCH',
        body: JSON.stringify({
          sectorId: sector.id,
          fechaRecogida: new Date().toISOString(),
          desde: desde,
          hasta: hasta,
          status: status,
          tipo: 'ORDINARIO',
          sectorBarrio: props.barrio || props.Barrio || props.BARRIO,
        }),
      });
      setToast({
        msg: `✅ ${result.residuosMarcados} residuos marcados (${result.activitiesProcessed} puntos procesados)`,
        type: 'success',
      });
      setShowConfirm(false);
      await load();
      onRefresh?.();
    } catch (e: any) {
      setToast({ msg: `Error: ${e.message}`, type: 'error' });
    } finally {
      setMarking(false);
    }
  };

  // Helper to extract known KMZ attribute by possible key names
  const attr = (keys: string[]) => {
    // Primero buscar en properties.extracted_metadata si existe (backend lo envía ahora)
    if (props.extracted_metadata) {
      for (const k of keys) {
        const foundKey = Object.keys(props.extracted_metadata).find(ek => ek.toLowerCase() === k.toLowerCase());
        if (foundKey) return props.extracted_metadata[foundKey];
      }
    }
    // Fallback a properties directo
    for (const k of keys) {
      if (props[k] != null && props[k] !== '') return props[k];
    }
    return null;
  };

  return (
    <div
      className="absolute top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-[500] flex flex-col overflow-hidden rounded-l-2xl"
      style={{ animation: 'slideInRight 0.25s ease' }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-white flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-[11px] font-semibold tracking-wider opacity-80 uppercase">Sector de Recolección</span>
          </div>
          <h2 className="text-sm font-bold leading-tight">{nombre}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-xs font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
        >
          {toast.msg}
          <button onClick={() => setToast(null)} className="float-right opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 shadow-inner">

        {/* Atributos operativos */}
        <section>
          <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Atributos del Sector</h3>
          <div className="bg-neutral-50 rounded-xl p-3 space-y-0.5 border border-neutral-100">
            <AttrRow label="Macro ruta" value={attr(['Macro', 'MACRO_RUTA', 'MacroRuta', 'macro_ruta', 'Macroruta'])} />
            <AttrRow label="Micro ruta" value={attr(['Micro', 'MICRO_RUTA', 'MicroRuta', 'micro_ruta', 'Microruta'])} />
            <AttrRow label="Turno" value={attr(['Turno', 'TURNO', 'turno'])} />
            <AttrRow label="Hora inicial" value={attr(['Hora Inicial', 'HORA_INICIAL', 'HoraInicial', 'hora_inicial', 'Hora_inicial'])} />
            <AttrRow label="Hora final" value={attr(['Hora Final', 'HORA_FINAL', 'HoraFinal', 'hora_final', 'Hora_final'])} />
            <AttrRow label="Frecuencia" value={attr(['Frecuencia', 'FRECUENCIA', 'frecuencia'])} />
            <AttrRow label="Días de operación" value={attr(['Días', 'DIAS', 'Dias', 'dias', 'Días de la frecuencia'])} />
            <AttrRow label="Localidad" value={attr(['Localidad', 'LOCALIDAD', 'localidad'])} />
            <AttrRow label="Barrio" value={attr(['Barrio', 'BARRIO', 'barrio'])} />
            <AttrRow label="Tipo de suelo" value={attr(['TIPO_SUELO', 'TipoSuelo', 'tipo_suelo'])} />
            <AttrRow label="Tipo de servicio" value={attr(['TIPO_SERVICIO', 'TipoServicio', 'tipo_servicio'])} />
            <AttrRow label="Tipo vehículo" value={attr(['TIPO_VEHICULO', 'TipoVehiculo', 'tipo_vehiculo'])} />
            <AttrRow label="Km recorridos" value={attr(['KM_RECORRIDOS', 'KmRecorridos', 'km_recorridos', 'Km_recorridos', 'km_pav'])} />
            <AttrRow label="Área (ha)" value={attr(['AREA', 'Area', 'area', 'area_micro'])} />
            <AttrRow label="Dir. inicio" value={attr(['DIR_INICIO', 'DirInicio', 'dir_inicio', 'Dirección Inicial'])} />
            <AttrRow label="Dir. fin" value={attr(['DIR_FIN', 'DirFin', 'dir_fin', 'Dirección Final'])} />
          </div>
        </section>

        {/* Estadísticas de residuos */}
        <section>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight">Cargando puntos del sector...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
              <p className="text-xs text-red-600 font-medium">{error}</p>
              <button 
                onClick={load}
                className="mt-2 text-[10px] font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full hover:bg-red-200 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : data ? (
            <>
              <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Información de Residuo</h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-2 text-center flex flex-col justify-center">
                  <div className="text-xl font-black text-neutral-800">{data.totalPuntos}</div>
                  <div className="text-[9px] text-neutral-500 mt-0.5 leading-tight">Puntos de residuos identificados</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-2 text-center flex flex-col justify-center">
                  <div className="text-xl font-black text-amber-600">{data.totalPendientes}</div>
                  <div className="text-[9px] text-amber-500 mt-0.5 font-medium leading-tight">Total de residuos Pendientes</div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-2 text-center flex flex-col justify-center">
                  <div className="text-xl font-black text-green-600">{data.totalRecogidos}</div>
                  <div className="text-[9px] text-green-500 mt-0.5 font-medium leading-tight">Total de residuos Recogidos</div>
                </div>
              </div>

              {/* Barra de progreso */}
              {data.totalResiduosOrdinarios > 0 && (
                <div className="mb-2">
                  <div className="flex justify-between text-[10px] text-neutral-500 mb-1.5 font-bold">
                    <span>PROGRESO DE RECOLECCIÓN</span>
                    <span className="text-emerald-600">{Math.round((data.totalRecogidos / data.totalResiduosOrdinarios) * 100)}%</span>
                  </div>
                  <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/50">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      style={{ width: `${Math.round((data.totalRecogidos / data.totalResiduosOrdinarios) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Detalle de residuos recogidos */}
              {data.totalRecogidos > 0 && (
                <div className="bg-green-50/50 border border-green-100 rounded-xl p-3 mb-4">
                   <h4 className="text-[10px] font-bold text-green-700 uppercase mb-2">Desglose de Recogidos</h4>
                   <div className="space-y-1">
                      {Object.entries(
                        data.puntos.flatMap(p => p.residuos)
                          .filter(r => r.recogido)
                          .reduce((acc: Record<string, number>, r) => {
                            const tipo = (r.tipoResiduo || 'Otros').trim();
                            acc[tipo] = (acc[tipo] || 0) + 1;
                            return acc;
                          }, {})
                      ).map(([tipo, count]) => (
                        <div key={tipo} className="flex justify-between text-[10px] text-green-600 font-medium">
                          <span>{tipo}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {/* Lista de Puntos con dropdown de residuos */}
              {(() => {
                const totalPuntos = data.puntos.length;
                const totalResiduos = data.puntos.flatMap(p => p.residuos).length;

                return (
                  <>
                    <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-2 mt-4">
                      Puntos en el Sector ({totalPuntos}) · {totalResiduos} residuos
                    </h3>
                    {totalPuntos > 0 ? (
                      <div className="space-y-2">
                        {data.puntos.map((punto, idx) => {
                          const isOpen = openPointIds.has(punto.actividadId);
                          const todosRecogidos = punto.residuos.length > 0 && punto.residuos.every(r => r.recogido);
                          const algunoPendiente = punto.residuos.some(r => !r.recogido);

                          return (
                            <div
                              key={punto.actividadId}
                              className={`rounded-xl border overflow-hidden transition-all ${
                                todosRecogidos
                                  ? 'border-emerald-100 bg-emerald-50/40'
                                  : algunoPendiente
                                  ? 'border-amber-100 bg-amber-50/20'
                                  : 'border-neutral-100 bg-white'
                              }`}
                            >
                              {/* Cabecera del punto (botón toggle) */}
                              <button
                                onClick={() => {
                                  setOpenPointIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(punto.actividadId)) {
                                      next.delete(punto.actividadId);
                                    } else {
                                      next.add(punto.actividadId);
                                    }
                                    return next;
                                  });
                                }}
                                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-black/5 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                                    todosRecogidos ? 'bg-emerald-500' : algunoPendiente ? 'bg-amber-500 animate-pulse' : 'bg-neutral-300'
                                  }`} />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-neutral-800 truncate">
                                      Punto {idx + 1} · {punto.barrio}
                                    </p>
                                    <p className="text-[10px] text-neutral-400 font-medium">
                                      {punto.residuos.length} residuo{punto.residuos.length !== 1 ? 's' : ''} ·{' '}
                                      <span className="text-amber-500 font-bold">{punto.pendientes} pendiente{punto.pendientes !== 1 ? 's' : ''}</span>
                                      {punto.recogidos > 0 && (
                                        <span className="text-emerald-600 font-bold"> · {punto.recogidos} recogido{punto.recogidos !== 1 ? 's' : ''}</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <svg
                                  className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                              </button>

                              {/* Contenido expandible: residuos del punto */}
                              {isOpen && (
                                <div className="border-t border-neutral-100/60 px-3 py-2 space-y-1.5 bg-white/60">
                                  {punto.residuos.length === 0 ? (
                                    <p className="text-[10px] text-neutral-400 text-center py-2">Sin residuos registrados</p>
                                  ) : (
                                    punto.residuos.map((residuo: any, rIdx: number) => (
                                      <div
                                        key={`${punto.actividadId}-${residuo.id || rIdx}`}
                                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border ${
                                          !residuo.recogido
                                            ? 'border-amber-100 bg-amber-50/50'
                                            : 'border-emerald-100 bg-emerald-50/30'
                                        }`}
                                      >
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${!residuo.recogido ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 truncate">
                                            <p className="text-[11px] font-bold text-neutral-700 truncate">
                                              {String(residuo.tipoResiduo || '').replace(/_/g, ' ')}
                                            </p>
                                            {residuo.aprobado && (
                                              <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase shrink-0">
                                                Validado
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-neutral-400 font-medium truncate">
                                            {residuo.areaLinealMetros || 0}m²
                                            {residuo.quienDispuso ? ` · ${residuo.quienDispuso}` : ''}
                                          </p>
                                        </div>
                                        {!residuo.recogido ? (
                                          <span className="text-[9px] font-black text-amber-700 bg-amber-100 rounded-lg px-2 py-0.5 shrink-0 border border-amber-200 uppercase">
                                            Pendiente
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 rounded-lg px-2 py-0.5 shrink-0 border border-emerald-100">
                                            Recogido
                                          </span>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-neutral-50 border border-dashed border-neutral-200 rounded-xl py-6 px-4 text-center">
                        <p className="text-xs text-neutral-400 font-medium">
                          No se identificaron puntos de residuos en este sector.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
              
              {/* Debug Section (Small) */}
              <div className="mt-8 pt-4 border-t border-dashed border-neutral-100 opacity-20 hover:opacity-100 transition-opacity">
                 <p className="text-[8px] font-mono text-neutral-400 uppercase mb-1">Internal Debug Info</p>
                 <pre className="text-[7px] font-mono whitespace-pre-wrap text-neutral-500 bg-neutral-50 p-2 rounded">
                    ID: {sector.id} | Barrio Extraído: {sector.properties?.barrio || 'N/A'} | Area Approx: {(sector.properties as any)?.area_approx?.toFixed(6) || 'N/A'} | Polygons: {sector.geometry.type === 'MultiPolygon' ? sector.geometry.coordinates.length : 1}
                 </pre>
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
               <p className="text-xs text-neutral-400">Seleccione un sector válido.</p>
            </div>
          )}
        </section>
      </div>

      {/* Footer: botón de recolección masiva - SOLO Residuos Ordinarios */}
      {/* SE DESHABILITA ESTA OPCIÓN POR SOLICITUD DEL USUARIO
      {data && (() => {
        const pendientesOrdinarios = data.puntos
          .flatMap(p => p.residuos)
          .filter(r => !r.recogido && String(r.tipoResiduo || '').toUpperCase().replace(/_/g, ' ').trim().includes('ORDINARIO'))
          .length;

        if (pendientesOrdinarios === 0) {
          if (data.totalRecogidos > 0) {
            return (
              <div className="shrink-0 border-t border-neutral-100 p-4">
                <div className="flex items-center justify-center gap-2 py-2 text-green-600 text-xs font-bold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Todos los residuos ordinarios han sido recogidos
                </div>
              </div>
            );
          }
          return null;
        }

        return (
          <div className="shrink-0 border-t border-neutral-100 p-4">
            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Marcar ordinarios como recogidos ({pendientesOrdinarios})
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-neutral-600 text-center">
                  ¿Confirmar recolección de <span className="font-bold">{pendientesOrdinarios}</span> residuos ordinarios en este sector?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2.5 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleMarcarRecogido}
                    disabled={marking}
                    className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {marking ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>✓ Confirmar</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      */}
    </div>
  );
};
