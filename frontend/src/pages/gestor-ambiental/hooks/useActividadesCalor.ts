import { useState, useMemo, useCallback } from 'react';
import { differenceInDays } from 'date-fns';
import type { Activity, ResiduoEntry } from '../../../types';
import type { SectorFeature } from '../../../components/RecoleccionSectorLayer';
import { activityService } from '../../../services/activity.service';
import { getResiduos } from '../lib/residuos';

interface UseActividadesCalorParams {
  activities: Activity[];
  user: { name?: string; lastname?: string; email?: string } | null;
  setToast: (t: { message: string; type: 'success' | 'error' | 'info' }) => void;
  loadActivities: () => Promise<void>;
  activeSectorIds: Set<string>;
  activitySectorMap: Map<string, string[]>;
  collectionDayName: string;
  getSectorsCollectedToday: () => SectorFeature[];
}

// Actividades en calor (residuos pendientes) y auto-marcado de residuos ordinarios
// según el horario de recolección del sector. Glue entre actividades y sectores.
export function useActividadesCalor({
  activities,
  user,
  setToast,
  loadActivities,
  activeSectorIds,
  activitySectorMap,
  collectionDayName,
  getSectorsCollectedToday,
}: UseActividadesCalorParams) {
  const [showActividadesCalor, setShowActividadesCalor] = useState(false);
  const [isMarkingOrdinarios, setIsMarkingOrdinarios] = useState(false);

  // Actividades en calor: todos los residuos pendientes, ordenados de más antiguo a más nuevo
  const actividadesEnCalor = useMemo(() => {
    const result: Array<{ activity: Activity; residuo: ResiduoEntry; daysPending: number }> = [];
    activities.forEach(a => {
      const residuos = getResiduos(a);
      residuos.forEach(r => {
        if (!r.recogido) {
          const daysPending = differenceInDays(new Date(), new Date(r.dateTime || a.createdAt));
          result.push({ activity: a, residuo: r, daysPending });
        }
      });
    });
    // Ordenar de más antiguo a más nuevo (mayor tiempo pendiente = primero)
    return result.sort((x, y) =>
      new Date(x.residuo.dateTime || x.activity.createdAt).getTime() -
      new Date(y.residuo.dateTime || y.activity.createdAt).getTime()
    );
  }, [activities]);

  // Auto-marcar residuos ordinarios como recogidos (según horario del sector en KMZ)
  const handleAutoMarkOrdinarios = useCallback(async () => {
    const sectorsToday = getSectorsCollectedToday();

    // Si el usuario tiene sectores activos (seleccionados manualmente en la lista),
    // filtramos solo para operar sobre los que están seleccionados y además tienen recolección hoy.
    // Si no hay ninguno activo, operamos sobre TODOS los sectores que recogen hoy.
    const targetSectors = activeSectorIds.size > 0
      ? sectorsToday.filter(s => activeSectorIds.has(s.id))
      : sectorsToday;

    if (targetSectors.length === 0) {
      setToast({ message: `No hay sectores con horario de recolección para hoy (${collectionDayName}) en los sectores seleccionados.`, type: 'info' });
      return;
    }

    const targetSectorIds = new Set(targetSectors.map(s => s.id));

    setIsMarkingOrdinarios(true);
    try {
      const targetActivities = activities.filter(a => {
        const matchingSectors = activitySectorMap.get(a.id);
        if (!matchingSectors || !matchingSectors.some(id => targetSectorIds.has(id))) return false;

        const residuos = getResiduos(a);
        return residuos.some(r => r.tipoResiduo === 'RESIDUOS_ORDINARIOS' && !r.recogido);
      });

      if (targetActivities.length === 0) {
        setToast({ message: `No hay residuos ordinarios pendientes en los sectores de recolección de hoy.`, type: 'info' });
        setIsMarkingOrdinarios(false);
        return;
      }

      let marked = 0;
      const userName = user?.name
        ? `${user.name} ${user.lastname || ''}`.trim()
        : user?.email || 'Sistema';

      for (const activity of targetActivities) {
        const residuos = getResiduos(activity);
        const pendingOrdinarios = residuos.filter(
          r => r.tipoResiduo === 'RESIDUOS_ORDINARIOS' && !r.recogido
        );
        for (const residuo of pendingOrdinarios) {
          await activityService.addSeguimiento(activity.id, {
            action: 'MARCAR_RECOGIDO',
            residuoId: residuo.id,
            photosRecogida: [],
            fechaRecogida: new Date().toISOString(),
            recogidoByNombre: `${userName} (Auto-Promoambiental)`,
          });
          marked++;
        }
      }

      setToast({
        message: `✅ ${marked} residuo(s) ordinario(s) marcado(s) como recogido(s) en sectores de ${collectionDayName}`,
        type: 'success'
      });
      await loadActivities();
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || 'Error al marcar residuos ordinarios', type: 'error' });
    } finally {
      setIsMarkingOrdinarios(false);
    }
  }, [activities, activeSectorIds, activitySectorMap, user, collectionDayName, loadActivities, getSectorsCollectedToday]);

  return {
    showActividadesCalor, setShowActividadesCalor,
    isMarkingOrdinarios, setIsMarkingOrdinarios,
    actividadesEnCalor,
    handleAutoMarkOrdinarios,
  };
}
