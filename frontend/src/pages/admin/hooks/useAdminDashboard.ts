import { useEffect, useMemo, useState } from 'react';
import { activityService } from '../../../services/activity.service';
import { catalogService } from '../../../services/catalog.service';
import type { Activity } from '../../../types';
import type { LayerVisibility } from '../../../components/MapLayerControl';
import { getResiduos, getPuntoCriticoTier, findTechnicalResidueKey, isPuntoRecogido } from '../utils/adminHelpers';
import { technicalResidueKeys } from '../utils/adminConstants';

export interface AmbientalInsightsData {
  totalIdentified: number;
  totalCollected: number;
  totalAct: number;
  totalPub: number;
  totalVal: number;
  totalRech: number;
  avgCollectionTimes: Record<string, number | undefined>;
  totalArea: Record<string, number>;
}

const DAY = 86400000;

// Definiciones alineadas 1:1 con el hub (useAdminDashboard.ts del hub,
// ambientalInsightsData, SOLO LECTURA verificado 2026-07-29): "Ident."/
// "Recog." cuentan PUNTOS publicados, no entradas de residuo — el hub exige
// status === 'PUBLICADA' (+ operativoSubtipo === 'AMBIENTAL_PUNTOS_ACUMULACION',
// redundante acá: este repo es mono-dominio, todo punto YA es de acumulación).
// totalArea/avgCollectionTimes no llevan ese filtro en el hub tampoco — se
// calculan sobre todos los residuos sin importar el estado del punto.
export function computeInsights(activities: Activity[]): AmbientalInsightsData {
  let totalIdentified = 0;
  let totalCollected = 0;
  const collectionDaysByTipo: Record<string, number[]> = {};
  const totalArea: Record<string, number> = {};

  for (const a of activities) {
    const residuos = getResiduos(a);
    const isPublished = a.status === 'PUBLICADA';
    if (isPublished) {
      totalIdentified++;
      if (residuos.some(r => r.recogido)) totalCollected++;
    }
    for (const r of residuos) {
      const tipo = findTechnicalResidueKey(r.tipoResiduo || '');
      if (r.recogido && r.fechaRecogida && r.dateTime) {
        const dias = (new Date(r.fechaRecogida).getTime() - new Date(r.dateTime).getTime()) / DAY;
        if (isFinite(dias) && dias >= 0) {
          (collectionDaysByTipo[tipo] ??= []).push(dias);
        }
      }
      if (typeof r.areaLinealMetros === 'number') {
        totalArea[tipo] = (totalArea[tipo] || 0) + r.areaLinealMetros;
      }
    }
  }

  const avgCollectionTimes: Record<string, number | undefined> = {};
  for (const key of technicalResidueKeys) {
    const dias = collectionDaysByTipo[key];
    avgCollectionTimes[key] = dias && dias.length > 0
      ? Math.round((dias.reduce((s, d) => s + d, 0) / dias.length) * 10) / 10
      : undefined;
  }

  return {
    totalIdentified,
    totalCollected,
    totalAct: activities.length,
    totalPub: activities.filter(a => a.status === 'PUBLICADA').length,
    // "En Validación": el hub cuenta ENVIADA + APROBADA. APROBADA es un
    // estado transitorio que casi nunca tiene filas en reposo (se convierte
    // en PUBLICADA de inmediato al aprobar) — antes solo se contaba APROBADA
    // y siempre daba 0 pese a haber puntos reales en ENVIADA.
    totalVal: activities.filter(a => a.status === 'ENVIADA' || a.status === 'APROBADA').length,
    totalRech: activities.filter(a => a.status === 'RECHAZADA').length,
    avgCollectionTimes,
    totalArea,
  };
}

export function useAdminDashboard() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    barrios: true, carrera7: false, colegios: false, cestas: false,
    falloSanVictorino: false, propiedadHorizontal: false, upz: false,
    cambuches: false, bodegas: false,
  });

  const [tipoResiduoFilter, setTipoResiduoFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [emergencyFilter, setEmergencyFilter] = useState(false);
  const [listSearchNumber, setListSearchNumber] = useState('');
  const [pointsSidebarOpen, setPointsSidebarOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ── Filtros globales (panel derecho, portado del hub) ──
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [barrioFilter, setBarrioFilter] = useState('');
  const [desdeFilter, setDesdeFilter] = useState('');
  const [hastaFilter, setHastaFilter] = useState('');
  const [barriosCatalog, setBarriosCatalog] = useState<string[]>([]);

  // ── Sidebar "Lista de Residuos" (portado del hub) ──
  const [mapaEstadoRecoleccionFilter, setMapaEstadoRecoleccionFilter] = useState<'ALL' | 'RECOGIDOS' | 'NO_RECOGIDOS'>('ALL');

  const load = () => {
    setLoading(true);
    setError(null);
    activityService.getAll()
      .then(setActivities)
      .catch(e => setError(e?.response?.data?.message || 'Error al cargar los puntos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { catalogService.getBarrios().then(setBarriosCatalog).catch(() => setBarriosCatalog([])); }, []);

  // Catálogo completo de barrios + los que ya aparecen en los puntos (por si
  // algún punto migrado trae un barrio fuera del catálogo oficial) — mismo
  // patrón que `barriosUnicos` del hub.
  const barriosUnicos = useMemo(() => {
    const b = new Set<string>(barriosCatalog);
    activities.forEach(a => { if (a.barrio) b.add(a.barrio); });
    return Array.from(b).filter(Boolean).sort();
  }, [activities, barriosCatalog]);

  const clearFilters = () => {
    setStatusFilter(''); setTipoResiduoFilter(''); setBarrioFilter('');
    setDesdeFilter(''); setHastaFilter('');
  };

  const filteredActivities = useMemo(() => {
    return activities
      .filter(a => !statusFilter || a.status === statusFilter)
      .filter(a => !emergencyFilter || getPuntoCriticoTier(a) > 0)
      .filter(a => {
        if (!tipoResiduoFilter) return true;
        return getResiduos(a).some(r => findTechnicalResidueKey(r.tipoResiduo || '') === findTechnicalResidueKey(tipoResiduoFilter));
      })
      .filter(a => !barrioFilter || a.barrio === barrioFilter)
      .filter(a => !desdeFilter || new Date(a.dateTime).getTime() >= new Date(desdeFilter).getTime())
      .filter(a => !hastaFilter || new Date(a.dateTime).getTime() <= new Date(hastaFilter + 'T23:59:59').getTime());
  }, [activities, statusFilter, emergencyFilter, tipoResiduoFilter, barrioFilter, desdeFilter, hastaFilter]);

  // Refinamiento propio del sidebar "Lista de Residuos" sobre lo que ya
  // filtraron los filtros globales: por # buscado y por Recogidos/Pendientes.
  const sidebarActivities = useMemo(() => {
    return filteredActivities
      .filter(a => {
        if (mapaEstadoRecoleccionFilter === 'ALL') return true;
        const recogido = isPuntoRecogido(a);
        return mapaEstadoRecoleccionFilter === 'RECOGIDOS' ? recogido : !recogido;
      })
      .filter(a => !listSearchNumber || a.pointNumber?.toString() === listSearchNumber.trim())
      .sort((a, b) => (b.pointNumber || 0) - (a.pointNumber || 0));
  }, [filteredActivities, mapaEstadoRecoleccionFilter, listSearchNumber]);

  const ambientalInsightsData = useMemo(() => computeInsights(activities), [activities]);

  // Cada PuntoResiduo ya trae su propio pointNumber del backend (a diferencia
  // del hub, que calcula un índice dentro de una lista multi-dominio) --
  // no hace falta un índice global aparte.
  const getGlobalActivityIndex = (id: string, obj?: Activity) => (obj ?? activities.find(a => a.id === id))?.pointNumber;

  return {
    activities: filteredActivities,
    loading,
    error,
    reload: load,
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
    pointsSidebarOpen,
    setPointsSidebarOpen,
    selectedActivity,
    setSelectedActivity,
    showDetailModal,
    setShowDetailModal,
    getGlobalActivityIndex,
    ambientalInsightsData,
    sidebarOpen,
    setSidebarOpen,
    barrioFilter,
    setBarrioFilter,
    desdeFilter,
    setDesdeFilter,
    hastaFilter,
    setHastaFilter,
    barriosUnicos,
    clearFilters,
    mapaEstadoRecoleccionFilter,
    setMapaEstadoRecoleccionFilter,
    sidebarActivities,
  };
}
