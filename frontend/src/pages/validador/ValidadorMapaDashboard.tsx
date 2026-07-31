import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import { useAuthStore } from '../../store/authStore';
import { activityService } from '../../services/activity.service';
import { BoundaryLayer } from '../../components/BoundaryLayer';
import { ValidadorResiduoPanel } from '../../components/ValidadorResiduoPanel';
import { ValidadorActividadPanel } from '../../components/ValidadorActividadPanel';
import type { Activity } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { startOfMonthStr as gSOM, endOfMonthStr as gEOM } from '../../utils/dateRanges';
import { getResiduos } from '../gestor-ambiental/lib/residuos';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const gYearStart = () => `${new Date().getFullYear()}-01-01`;
const gYearEnd = () => `${new Date().getFullYear()}-12-31`;

function countPendientes(activity: Activity): number {
  return getResiduos(activity).filter(r => !(r as any).aprobado).length;
}

function countAprobados(activity: Activity): number {
  return getResiduos(activity).filter(r => (r as any).aprobado).length;
}

function createMarkerIcon(color: string, pulse: boolean, number?: number): DivIcon {
  return new DivIcon({
    className: '',
    html: `<div style="position:relative; width:30px; height:30px;">
      <div style="
        background: #fff; width: 30px; height: 30px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2.5px solid ${color};
        ${pulse ? 'animation: pulse-ring 1.5s infinite;' : ''}
      ">
        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color};"></div>
      </div>
      ${number ? `<div style="
        position:absolute; top:-8px; right:-8px;
        background:${color}; color:#fff; font-size:10px; font-weight:700;
        padding:1px 5px; border-radius:8px; border:1.5px solid white;
        box-shadow:0 2px 4px rgba(0,0,0,0.2); min-width:18px; text-align:center;
      ">${number}</div>` : ''}
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
}

const InvalidateMap = () => {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, [map]);
  return null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ValidadorMapaDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const filterRef = useRef<HTMLDivElement>(null);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [desdeFilter, setDesdeFilter] = useState(gSOM());
  const [hastaFilter, setHastaFilter] = useState(gEOM());
  const [numberFilter, setNumberFilter] = useState('');
  const [filterMode, setFilterMode] = useState<'monthly' | 'annual'>('monthly');
  const [filterOpen, setFilterOpen] = useState(false);
  const [mapMode, setMapMode] = useState<'actividad' | 'residuos'>('actividad');

  const handleLogout = () => { logout(); navigate('/', { replace: true }); };

  const applyFilterMode = (mode: 'monthly' | 'annual') => {
    setFilterMode(mode);
    if (mode === 'monthly') {
      setDesdeFilter(gSOM());
      setHastaFilter(gEOM());
    } else {
      setDesdeFilter(gYearStart());
      setHastaFilter(gYearEnd());
    }
  };

  const loadPoints = useCallback(async () => {
    setLoading(true);
    try {
      const data = await activityService.getAll({
        operativoCategoria: 'AMBIENTAL',
        operativoSubtipo: 'AMBIENTAL_PUNTOS_ACUMULACION',
        desde: desdeFilter || undefined,
        hasta: hastaFilter || undefined,
        limit: 2000,
      });
      setActivities(data || []);
    } catch (e) {
      console.error('[ValidadorMapa] Error cargando puntos:', e);
    } finally {
      setLoading(false);
    }
  }, [desdeFilter, hastaFilter]);

  useEffect(() => { loadPoints(); }, [loadPoints]);

  // Cierra el panel de filtros al hacer click fuera
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (!a.lat || !a.lng) return false;
      if (numberFilter.trim() !== '') {
        const n = parseInt(numberFilter, 10);
        if (!isNaN(n) && a.pointNumber !== n) return false;
      }
      return true;
    });
  }, [activities, numberFilter]);

  const stats = useMemo(() => {
    if (mapMode === 'actividad') {
      const validados = filtered.filter(a => a.status === 'APROBADA' || a.status === 'PUBLICADA').length;
      const pendientes = filtered.filter(a => a.status === 'ENVIADA').length;
      return {
        countA: filtered.length, labelA: 'Total Puntos',
        countB: pendientes, labelB: 'Puntos Pendientes',
        countC: validados, labelC: 'Puntos Validados',
        showD: false
      };
    } else {
      const validados = filtered.reduce((acc, a) => {
        const res = getResiduos(a);
        return acc + res.filter((r: any) => r.aprobado).length;
      }, 0);
      const pendientes = filtered.reduce((acc, a) => {
        const res = getResiduos(a);
        return acc + res.filter((r: any) => !r.aprobado).length;
      }, 0);
      const totalResiduos = filtered.reduce((acc, a) => acc + getResiduos(a).length, 0);
      return {
        countA: filtered.length, labelA: 'Total Puntos',
        countB: pendientes, labelB: 'Residuos por validar',
        countC: validados, labelC: 'Residuos validados',
        countD: totalResiduos, labelD: 'Residuos Total',
        showD: true
      };
    }
  }, [filtered, mapMode]);

  const handleActivityUpdated = useCallback((updated: Activity) => {
    setActivities(prev => prev.map(a => (a.id === updated.id ? updated : a)));
    setSelectedActivity(updated);
  }, []);

  const hasActiveFilters = numberFilter.trim() !== '' || filterMode === 'annual';

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-neutral-100">
      {/* Header */}
      <header style={{
        height: 60, background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 45%, #991b1b 100%)',
        boxShadow: '0 4px 20px rgba(153,27,27,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/images/alcaldialocalsantafe-sinfondo.png" alt="Alcaldía" style={{ height: 40, objectFit: 'contain' }} />
          <div className="hidden sm:block w-px h-8 bg-white/25" />
          <div className="hidden sm:block">
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Sistema de Seguimiento Territorial</div>
            <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 11 }}>Alcaldía Local de Santa Fe · Mapa de Residuos</div>
          </div>
        </div>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <img src="/images/bogotaneidapp_sinfondo.png" alt="BogotaneidApp" style={{ height: 72, objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{user?.name}</span>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 14px', background: 'rgba(255,255,255,0.15)', color: 'white',
              border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 8, fontSize: 12,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
            }}
          >Cerrar Sesión</button>
        </div>
      </header>

      {/* Stats bar */}
      {/* "Volver al Panel" (navegaba a /validador/dashboard) se quito 2026-07-31:
          esa ruta es un redirect a esta misma pantalla (App.tsx) — no hay un
          "panel" distinto al que volver en este repo mono-dominio, a
          diferencia del hub, donde /validador/dashboard es un shell
          multi-dominio real. El boton solo rebotaba a si mismo (se sentia
          como un refresh sin efecto). Ver RESUMEN-NOCHE.md. */}
      <div className="shrink-0 bg-white border-b border-neutral-200 px-4 py-2.5 flex items-center gap-4 overflow-x-auto">
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-lg font-black text-neutral-800">{stats.countA}</span>
          <span className="text-[10px] font-bold text-neutral-400 uppercase">{stats.labelA}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-lg font-black text-amber-600">{stats.countB}</span>
          <span className="text-[10px] font-bold text-neutral-400 uppercase">{stats.labelB}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-lg font-black text-emerald-600">{stats.countC}</span>
          <span className="text-[10px] font-bold text-neutral-400 uppercase">{stats.labelC}</span>
        </div>
        {stats.showD && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-lg font-black text-neutral-600">{stats.countD}</span>
            <span className="text-[10px] font-bold text-neutral-400 uppercase">{stats.labelD}</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200">
            <button
              onClick={() => setMapMode('actividad')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${mapMode === 'actividad' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Validación de Actividades
            </button>
            <button
              onClick={() => setMapMode('residuos')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${mapMode === 'residuos' ? 'bg-white text-red-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Validación de Residuos
            </button>
          </div>

        </div>
      </div>

      {/* Map + Panel */}
      <div className="flex-1 relative overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-neutral-500 font-medium">Cargando puntos de residuos...</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={[4.6097, -74.0717]} zoom={14}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <InvalidateMap />
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <BoundaryLayer
              kmlPath="/boundaries/KMZ_Sectores_Catastrales_SF_2026.kmz"
              color="#DC2626"
              fillColor="#DC2626"
              fillOpacity={0.05}
              weight={2}
            />

            {filtered.map(activity => {
              const pendientes = countPendientes(activity);
              const aprobados = countAprobados(activity);
              const total = getResiduos(activity).length;

              let isGreen = false;
              if (mapMode === 'actividad') {
                isGreen = activity.status === 'APROBADA' || activity.status === 'PUBLICADA';
              } else {
                isGreen = total > 0 && aprobados === total;
              }

              const color = isGreen ? '#10b981' : '#f59e0b';
              const pulse = !isGreen;
              const icon = createMarkerIcon(color, pulse, activity.pointNumber || undefined);
              const isSelected = selectedActivity?.id === activity.id;

              return (
                <Marker
                  key={activity.id}
                  position={[activity.lat, activity.lng]}
                  icon={icon}
                  eventHandlers={{ click: () => setSelectedActivity(isSelected ? null : activity) }}
                >
                  <Popup>
                    <div className="min-w-[180px] p-1">
                      {(activity.pointNumber ?? 0) > 0 && (
                        <span className="inline-block text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mb-1">#{activity.pointNumber}</span>
                      )}
                      <h4 className="font-bold text-neutral-800 text-sm mb-1">{activity.barrio}</h4>
                      <p className="text-xs text-neutral-500 mb-2">
                        {format(new Date(activity.dateTime || activity.createdAt), 'dd/MM/yyyy', { locale: es })}
                      </p>
                      {mapMode === 'residuos' && (
                        <>
                          <div className="flex gap-2 text-[10px] mb-2">
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</span>
                            {aprobados > 0 && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{aprobados} aprobado{aprobados !== 1 ? 's' : ''}</span>}
                          </div>
                          <button
                            onClick={() => setSelectedActivity(activity)}
                            className="w-full bg-red-600 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Ver Residuos
                          </button>
                        </>
                      )}
                      {mapMode === 'actividad' && (
                        <button
                          onClick={() => navigate(`/validador/actividad/${activity.id}`)}
                          className="w-full bg-red-600 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Ver Actividad
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}

        {/* Botón flotante de filtros */}
        <div className="absolute top-4 right-4 z-[1100]" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl font-bold text-sm transition-all border ${filterOpen ? 'bg-red-600 text-white border-red-700 shadow-red-200' : hasActiveFilters ? 'bg-white text-red-600 border-red-300 shadow-red-100' : 'bg-white/95 backdrop-blur-md text-neutral-700 border-white/50 hover:text-red-600'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            Filtros
            {hasActiveFilters && (
              <span className={`w-2 h-2 rounded-full ${filterOpen ? 'bg-white' : 'bg-red-500'}`} />
            )}
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 z-[1200] p-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-3">Filtros del mapa</h3>

              <div className="mb-4">
                <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1.5 block">Período</label>
                <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200">
                  <button
                    onClick={() => applyFilterMode('monthly')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${filterMode === 'monthly' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    Mensual
                  </button>
                  <button
                    onClick={() => applyFilterMode('annual')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${filterMode === 'annual' ? 'bg-white text-red-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    Anual ({new Date().getFullYear()})
                  </button>
                </div>
                {filterMode === 'monthly' && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-1">Desde</label>
                      <input
                        type="date" value={desdeFilter}
                        onChange={e => setDesdeFilter(e.target.value)}
                        className="w-full text-xs border border-neutral-200 rounded-lg px-2 py-1.5 bg-neutral-50 focus:outline-none focus:border-red-400"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-neutral-400 uppercase block mb-1">Hasta</label>
                      <input
                        type="date" value={hastaFilter}
                        onChange={e => setHastaFilter(e.target.value)}
                        className="w-full text-xs border border-neutral-200 rounded-lg px-2 py-1.5 bg-neutral-50 focus:outline-none focus:border-red-400"
                      />
                    </div>
                  </div>
                )}
                {filterMode === 'annual' && (
                  <p className="text-[10px] text-neutral-400 mt-1.5 text-center">
                    Mostrando todos los puntos del {new Date().getFullYear()}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1.5 block">Buscar por número de punto</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">#</span>
                  <input
                    type="number"
                    value={numberFilter}
                    onChange={e => setNumberFilter(e.target.value)}
                    placeholder="Ej: 74"
                    min={1}
                    className="w-full text-xs border border-neutral-200 rounded-lg pl-6 pr-3 py-1.5 bg-neutral-50 focus:outline-none focus:border-red-400"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setNumberFilter(''); applyFilterMode('monthly'); }}
                  className="flex-1 py-1.5 text-xs font-bold text-neutral-500 border border-neutral-200 rounded-lg hover:border-neutral-300 transition-colors"
                >
                  Limpiar
                </button>
                <button
                  onClick={() => { loadPoints(); setFilterOpen(false); }}
                  className="flex-1 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Leyenda */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50">
          <h5 className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">Leyenda ({mapMode === 'actividad' ? 'Macro' : 'Micro'})</h5>
          <div className="space-y-1.5">
            {[
              { color: '#f59e0b', label: mapMode === 'actividad' ? 'Actividad Pendiente' : 'Residuos Pendientes', pulse: true },
              { color: '#10b981', label: mapMode === 'actividad' ? 'Actividad Aprobada' : 'Residuos Validados' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0 border-2"
                  style={{ borderColor: color, background: `${color}33` }}
                />
                <span className="text-[10px] font-medium text-neutral-600">{label}</span>
              </div>
            ))}
          </div>
          {filterMode === 'annual' && (
            <div className="mt-2 pt-2 border-t border-neutral-100">
              <span className="text-[9px] font-bold text-red-500 uppercase">Vista anual {new Date().getFullYear()}</span>
            </div>
          )}
          {numberFilter && (
            <div className="mt-1">
              <span className="text-[9px] font-bold text-amber-600 uppercase">Punto #{numberFilter}</span>
            </div>
          )}
        </div>

        {/* Panel lateral del punto seleccionado */}
        {selectedActivity && (
          <div className="absolute top-0 right-0 bottom-0 z-[1200] w-full sm:w-[420px]">
            {mapMode === 'actividad' ? (
              <ValidadorActividadPanel
                key={`macro-${selectedActivity.id}`}
                activity={selectedActivity}
                onClose={() => setSelectedActivity(null)}
                onUpdated={handleActivityUpdated}
              />
            ) : (
              <ValidadorResiduoPanel
                key={`micro-${selectedActivity.id}`}
                activity={selectedActivity}
                onClose={() => setSelectedActivity(null)}
                onUpdated={handleActivityUpdated}
              />
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(234,179,8,0.5); }
          50%        { box-shadow: 0 0 0 6px rgba(234,179,8,0); }
        }
      `}</style>
    </div>
  );
};
