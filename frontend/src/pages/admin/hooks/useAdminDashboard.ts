import { useEffect, useMemo, useState } from 'react';
import { activityService } from '../../../services/activity.service';
import type { Activity } from '../../../types';
import type { LayerVisibility } from '../../../components/MapLayerControl';
import { getResiduos, getPuntoCriticoTier, findTechnicalResidueKey } from '../utils/adminHelpers';
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

function computeInsights(activities: Activity[]): AmbientalInsightsData {
  let totalIdentified = 0;
  let totalCollected = 0;
  const collectionDaysByTipo: Record<string, number[]> = {};
  const totalArea: Record<string, number> = {};

  for (const a of activities) {
    for (const r of getResiduos(a)) {
      totalIdentified++;
      const tipo = findTechnicalResidueKey(r.tipoResiduo || '');
      if (r.recogido) {
        totalCollected++;
        if (r.fechaRecogida && r.dateTime) {
          const dias = (new Date(r.fechaRecogida).getTime() - new Date(r.dateTime).getTime()) / DAY;
          if (isFinite(dias) && dias >= 0) {
            (collectionDaysByTipo[tipo] ??= []).push(dias);
          }
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
    totalVal: activities.filter(a => a.status === 'APROBADA').length,
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

  const load = () => {
    setLoading(true);
    setError(null);
    activityService.getAll()
      .then(setActivities)
      .catch(e => setError(e?.response?.data?.message || 'Error al cargar los puntos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filteredActivities = useMemo(() => {
    return activities
      .filter(a => !statusFilter || a.status === statusFilter)
      .filter(a => !emergencyFilter || getPuntoCriticoTier(a) > 0)
      .filter(a => {
        if (!tipoResiduoFilter) return true;
        return getResiduos(a).some(r => findTechnicalResidueKey(r.tipoResiduo || '') === findTechnicalResidueKey(tipoResiduoFilter));
      });
  }, [activities, statusFilter, emergencyFilter, tipoResiduoFilter]);

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
  };
}
