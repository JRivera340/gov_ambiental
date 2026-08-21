import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { activityService } from '../../services/activity.service';
import { suscribirsePuntosEliminados } from '../../lib/puntosChannel';
import { cerrarSesion } from '../../lib/cerrarSesion';
import type { Activity } from '../../types';
import { AsignacionPuntosPanel } from './tabs/environmental/AsignacionPuntosPanel';
import { IndicadoresAmbientalPanel } from './tabs/environmental/IndicadoresAmbientalPanel';
import { DesempenoGestoresPanel } from './tabs/environmental/DesempenoGestoresPanel';
import { ObjetivosDiariosTile } from './tabs/environmental/ObjetivosDiariosTile';
import { EnvironmentalTab } from './tabs/EnvironmentalTab';
import { computeAmbientalInsights } from './utils/adminHelpers';
import type { LayerVisibility } from '../../components/MapLayerControl';

type Seccion = 'none' | 'asignacion' | 'indicadores' | 'desempeno';

const LAYERS_INICIALES: LayerVisibility = {
  barrios: true, carrera7: false, colegios: false, cestas: false,
  falloSanVictorino: false, propiedadHorizontal: false, upz: false,
  cambuches: false, bodegas: false,
};

const TABS: { key: Seccion; label: string; color: string }[] = [
  { key: 'asignacion', label: 'Asignación de Puntos', color: '#2563eb' },
  { key: 'indicadores', label: 'Indicadores', color: '#16a34a' },
  { key: 'desempeno', label: 'Desempeño', color: '#9333ea' },
];

export const AdminDashboard: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Colapsado por defecto — son consultas pesadas (todos los gestores con
  // todos sus puntos), no hace falta verlas siempre abiertas.
  const [seccion, setSeccion] = useState<Seccion>('none');

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

  // El borrado ocurre en la pestaña del detalle (se abre con window.open), así
  // que este dashboard nunca se entera por sí solo: sin esto había que
  // refrescar para que el punto desapareciera del mapa y de los KPIs.
  useEffect(() => suscribirsePuntosEliminados((puntoId) => {
    setActivities((prev) => prev.filter((a) => a.id !== puntoId));
  }), []);

  const actividadesParaAsignacion = activities.map((a) => ({
    id: a.id,
    barrio: a.barrio,
    pointNumber: a.pointNumber,
  }));

  // Filtros del mapa (estado/emergencia/búsqueda por número) — el filtro por
  // tipo de residuo colorea el marcador (ver getCategoryIcon), no oculta
  // puntos, igual que en el hub.
  const filteredMapActivities = useMemo(() => {
    return activities.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      return true;
    });
  }, [activities, statusFilter]);

  const ambientalInsightsData = useMemo(() => computeAmbientalInsights(activities), [activities]);

  return (
    <div className="h-screen flex flex-col bg-neutral-50 overflow-hidden">
      {/* ── Cabecera fija: título + pestañas + objetivos ── */}
      <div className="shrink-0 flex flex-col gap-2 p-2 md:px-4 md:py-2 border-b border-neutral-100 bg-white">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-sm font-black text-neutral-900">Panel de Administración — Sector Ambiental</h1>
          <div className="flex gap-2 items-center">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSeccion((s) => (s === tab.key ? 'none' : tab.key))}
                aria-pressed={seccion === tab.key}
                className="text-[9px] px-2 py-1 rounded border shadow-sm font-bold transition-colors"
                style={seccion === tab.key
                  ? { background: tab.color, borderColor: tab.color, color: 'white' }
                  : { background: 'white', borderColor: tab.color, color: tab.color }}
              >
                {seccion === tab.key ? `Ocultar ${tab.label}` : tab.label}
              </button>
            ))}
            {/* El panel admin era la única pantalla sin forma de salir. */}
            <button
              onClick={cerrarSesion}
              className="text-[9px] px-2 py-1 rounded border border-neutral-200 bg-white text-neutral-500 shadow-sm font-bold hover:bg-neutral-50 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
        <ObjetivosDiariosTile />
      </div>

      {/* ── Cuerpo: el panel elegido (si hay uno) scrollea su propio
          espacio; el mapa/KPIs de EnvironmentalTab ocupan el resto del
          alto disponible sin depender del scroll de la página. ── */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 p-2 md:p-3 overflow-hidden">
        {error && (
          <div className="shrink-0 p-2 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-700 font-bold">
            {error}
          </div>
        )}

        {seccion !== 'none' && (
          <div className="shrink-0 max-h-[38vh] overflow-y-auto">
            {seccion === 'asignacion' && <AsignacionPuntosPanel actividades={actividadesParaAsignacion} />}
            {seccion === 'indicadores' && <IndicadoresAmbientalPanel actividades={activities} />}
            {seccion === 'desempeno' && <DesempenoGestoresPanel />}
          </div>
        )}

        {loading ? (
          <p className="text-[11px] text-neutral-400">Cargando…</p>
        ) : (
          <div className="flex-1 min-h-0">
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
              globalSubtipo=""
              setSelectedActivity={setSelectedActivity}
              setShowDetailModal={setShowDetailModal}
            />
          </div>
        )}
      </div>
    </div>
  );
};
