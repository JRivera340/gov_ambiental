import { differenceInDays } from 'date-fns';
import type { Activity, ResiduoEntry } from '../../../types';
import { AmbientalPuntosAcumulacionData } from '../../../types';

// Devuelve los residuos de una actividad, normalizando formatos viejos y nuevos.
export function getResiduos(activity: Activity): ResiduoEntry[] {
  const opData = activity.operativoData as AmbientalPuntosAcumulacionData;
  if (opData?.residuos && Array.isArray(opData.residuos) && opData.residuos.length > 0) {
    return opData.residuos.map((r) => ({
      ...r,
      dateTime: r.dateTime || activity.dateTime || activity.createdAt,
    }));
  }

  // Legacy: tipoResiduo único
  if (opData?.tipoResiduo) {
    return [{
      id: 'legacy-0',
      tipoResiduo: opData.tipoResiduo,
      quienDispuso: opData.quienDispuso || '',
      percibeOlores: opData.percibeOlores ?? false,
      percibeVectores: opData.percibeVectores ?? false,
      areaLinealMetros: opData.areaLinealMetros || 0,
      observaciones: opData.observaciones || '',
      dateTime: activity.dateTime || activity.createdAt,
      photos: activity.photos || [],
      recogido: false,
    }];
  }

  // Transicional: datos guardados por clave UUID de pregunta — detectar por sets de enum
  if (opData) {
    const TIPO_VALUES = ['RESIDUOS_ORDINARIOS', 'RESIDUOS_VOLUMINOSOS', 'ESCOMBROS', 'PLANTAS'];
    const QUIEN_VALUES = ['COMUNIDAD', 'ESTABLECIMIENTOS_COMERCIALES', 'VOLQUETAS', 'HABITANTES_DE_CALLE', 'OTROS_NO_SE_CONOCE'];
    const vals = Object.values(opData as Record<string, any>);
    const tipoResiduo = vals.find((v): v is string => TIPO_VALUES.includes(String(v)));
    if (tipoResiduo) {
      const quienDispuso = (vals.find((v): v is string => QUIEN_VALUES.includes(String(v))) || '') as string;
      const areaLinealMetros = (vals.find((v) => typeof v === 'number' && v > 0) || 0) as number;
      const fotosRaw = vals.find((v) => Array.isArray(v) && v.length > 0 && typeof v[0] === 'string');
      return [{
        id: 'legacy-survey',
        tipoResiduo,
        quienDispuso,
        percibeOlores: false,
        percibeVectores: false,
        areaLinealMetros,
        observaciones: '',
        dateTime: activity.dateTime || activity.createdAt,
        photos: fotosRaw || activity.photos || [],
        recogido: false,
      }];
    }
  }

  return [];
}

// Un punto está en emergencia si tiene residuos pendientes con 4+ días.
export function isPuntoEmergencia(activity: Activity): boolean {
  if (activity.operativoSubtipo !== 'AMBIENTAL_PUNTOS_ACUMULACION') return false;
  const residuos = getResiduos(activity);
  return residuos.some((r) => {
    if (r.recogido) return false;
    const days = differenceInDays(new Date(), new Date(r.dateTime));
    return days >= 4;
  });
}

// Un punto está recogido si todos sus residuos lo están.
export function isPuntoRecogido(activity: Activity): boolean {
  if (activity.status === 'Recogido') return true;
  if (activity.operativoSubtipo !== 'AMBIENTAL_PUNTOS_ACUMULACION') return false;
  const residuos = getResiduos(activity);
  if (residuos.length === 0) return false;
  return residuos.every((r) => r.recogido || r.status === 'Recogido');
}
