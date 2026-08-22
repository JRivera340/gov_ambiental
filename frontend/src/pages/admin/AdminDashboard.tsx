import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { activityService } from '../../services/activity.service';
import { ambientalService } from '../../services/ambiental.service';
import { suscribirsePuntosEliminados } from '../../lib/puntosChannel';
import { cerrarSesion } from '../../lib/cerrarSesion';
import { useAuthStore } from '../../store/authStore';
import { usePersistentState } from '../../hooks/usePersistentState';
import { InstitutionalHeader } from '../../components/shell/InstitutionalHeader';
import { AmbientCanvas } from '../../components/AmbientCanvas';
import type { Activity } from '../../types';
import { AsignacionPuntosPanel } from './tabs/environmental/AsignacionPuntosPanel';
import { IndicadoresAmbientalPanel } from './tabs/environmental/IndicadoresAmbientalPanel';
import { DesempenoGestoresPanel } from './tabs/environmental/DesempenoGestoresPanel';
import { CicloRibbon } from './components/CicloRibbon';
import { EnvironmentalTab } from './tabs/EnvironmentalTab';
import { computeAmbientalInsights, isPuntoEmergencia } from './utils/adminHelpers';
import type { LayerVisibility } from '../../components/MapLayerControl';

// Panel de administración del sector ambiental.
//
// Las secciones dejaron de ser paneles que se abrían encima del mapa dentro de
// una franja de 38vh: cada una es una vista con la pantalla completa. Antes
// había dos scrolls anidados peleando por el mismo alto y todo quedaba
// aplastado.

type Vista = 'operacion' | 'asignacion' | 'indicadores' | 'desempeno';

const LAYERS_INICIALES: LayerVisibility = {
  barrios: true, carrera7: false, colegios: false, cestas: false,
  falloSanVictorino: false, propiedadHorizontal: false, upz: false,
  cambuches: false, bodegas: false,
};

const VISTAS: { key: Vista; label: string; descripcion: string }[] = [
  { key: 'operacion', label: 'Operación', descripcion: 'Mapa y estado de los puntos' },
  { key: 'asignacion', label: 'Asignación', descripcion: 'Qué gestor atiende cada punto' },
  { key: 'indicadores', label: 'Indicadores', descripcion: 'Tiempos, tipos y reincidencia' },
  { key: 'desempeno', label: 'Desempeño', descripcion: 'Cumplimiento por gestor' },
];

export const AdminDashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = usePersistentState<Vista>('admin-vista', 'operacion');
  const [idsAsignados, setIdsAsignados] = useState<Set<string> | null>(null);

  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(LAYERS_INICIALES);
  const [tipoResiduoFilter, setTipoResiduoFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [emergencyFilter, setEmergencyFilter] = useState(false);
  const [listSearchNumber, setListSearchNumber] = useState('');
  const [, setPointsSidebarOpen] = useState(false);
  const [, setSelectedActivity] = useState<Activity | null>(null);
  const [, setShowDetailModal] = useState(false);

  const cargarPuntos = useCallback(async () => {
    try {
      setActivities(await activityService.getAll());
      setError(null);
    } catch {
      setError('No se pudo cargar la información de puntos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarPuntos(); }, [cargarPuntos]);

  // Puntos con gestor: se calcula contra las filas de asignación en vez de
  // usar /asignaciones/sin-asignar, que solo ve los puntos que ya tienen fila
  // (los migrados sin fila no aparecían en ningún lado).
  useEffect(() => {
    let cancelado = false;
    ambientalService.getAsignacionAll()
      .then((filas) => {
        if (cancelado) return;
        setIdsAsignados(new Set(filas.filter((f) => f.gestorId).map((f) => f.puntoResiduoId)));
      })
      .catch(() => { if (!cancelado) setIdsAsignados(new Set()); });
    return () => { cancelado = true; };
  }, []);

  // El borrado ocurre en la pestaña del detalle (se abre con window.open), así
  // que este dashboard nunca se entera por sí solo: sin esto había que
  // refrescar para que el punto desapareciera del mapa y de los KPIs.
  useEffect(() => suscribirsePuntosEliminados((puntoId) => {
    setActivities((prev) => prev.filter((a) => a.id !== puntoId));
  }), []);

  const actividadesParaAsignacion = useMemo(
    () => activities.map((a) => ({ id: a.id, barrio: a.barrio, pointNumber: a.pointNumber })),
    [activities],
  );

  // El botón "En emergencia" del mapa cambiaba de color pero no filtraba nada:
  // el estado no llegaba a esta lista.
  const filteredMapActivities = useMemo(
    () => activities.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (emergencyFilter && !isPuntoEmergencia(a)) return false;
      return true;
    }),
    [activities, statusFilter, emergencyFilter],
  );

  const ambientalInsightsData = useMemo(() => computeAmbientalInsights(activities), [activities]);

  // Alertas operativas: lo que exige una decisión del administrador hoy.
  // `sinGestor` queda en null hasta que llegan las asignaciones: sin eso, el
  // primer render mostraba todos los puntos como si no tuvieran gestor.
  const alertas = useMemo(() => ({
    emergencias: activities.filter(isPuntoEmergencia).length,
    sinGestor: idsAsignados ? activities.filter((a) => !idsAsignados.has(a.id)).length : null,
    porValidar: activities.filter((a) => a.status === 'ENVIADA').length,
  }), [activities, idsAsignados]);

  const vistaActual = VISTAS.find((v) => v.key === vista) ?? VISTAS[0];

  return (
    <div className="admin-canvas h-screen w-full flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      <InstitutionalHeader
        titulo="Sistema de Seguimiento Territorial"
        subtitulo="Alcaldía Local de Santa Fe · Administración Ambiental"
        usuario={user}
        onCerrarSesion={cerrarSesion}
      />

      {/* El ambiente vive detrás del contenido, nunca debajo del mapa. */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <AmbientCanvas densidad={90} />

        <div className="relative z-10 flex-1 min-h-0 flex flex-col gap-3 px-3 sm:px-5 pt-3 pb-4 overflow-hidden">
          <CicloRibbon />

          {/* Navegación de vistas */}
          <nav className="shrink-0 flex items-center gap-1 glass-panel rounded-2xl p-1.5 overflow-x-auto hide-scrollbar">
            {VISTAS.map((v) => {
              const activa = v.key === vista;
              return (
                <button
                  key={v.key}
                  onClick={() => setVista(v.key)}
                  aria-current={activa ? 'page' : undefined}
                  title={v.descripcion}
                  className={`shrink-0 px-4 py-2 rounded-xl font-display text-[12px] font-bold tracking-wide transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    activa
                      ? 'text-white shadow-md'
                      : 'text-neutral-500 hover:text-neutral-800 hover:bg-white/70'
                  }`}
                  style={activa ? { background: 'linear-gradient(135deg, #c9142f, #e4032e)' } : undefined}
                >
                  {v.label}
                </button>
              );
            })}
            <span className="hidden lg:block ml-2 text-[11px] text-neutral-400 truncate">
              {vistaActual.descripcion}
            </span>
          </nav>

          {error && (
            <div className="shrink-0 glass-panel rounded-xl px-3 py-2 text-[12px] text-primary-700 font-semibold border-l-4 border-l-primary">
              {error}
            </div>
          )}

          <div key={vista} className="admin-rise flex-1 min-h-0 overflow-hidden">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-[12px] font-semibold text-neutral-500">Cargando puntos…</p>
              </div>
            ) : vista === 'operacion' ? (
              <EnvironmentalTab
                filteredMapActivities={filteredMapActivities}
                getGlobalActivityIndex={(id) => filteredMapActivities.find((a) => a.id === id)?.pointNumber}
                layerVisibility={layerVisibility}
                setLayerVisibility={setLayerVisibility}
                tipoResiduoFilter={tipoResiduoFilter}
                setTipoResiduoFilter={setTipoResiduoFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                emergencyFilter={emergencyFilter}
                setEmergencyFilter={setEmergencyFilter}
                listSearchNumber={listSearchNumber}
                setListSearchNumber={setListSearchNumber}
                setPointsSidebarOpen={setPointsSidebarOpen}
                ambientalInsightsData={ambientalInsightsData}
                alertas={alertas}
                globalSubtipo=""
                setSelectedActivity={setSelectedActivity}
                setShowDetailModal={setShowDetailModal}
              />
            ) : (
              <div className="h-full overflow-y-auto pr-1">
                {vista === 'asignacion' && <AsignacionPuntosPanel actividades={actividadesParaAsignacion} />}
                {vista === 'indicadores' && <IndicadoresAmbientalPanel actividades={activities} />}
                {vista === 'desempeno' && <DesempenoGestoresPanel />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
