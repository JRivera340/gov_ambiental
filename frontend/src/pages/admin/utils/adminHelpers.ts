// ============================================================
// adminHelpers.ts — Funciones puras reutilizables del AdminDashboard
// ============================================================

import { DivIcon } from 'leaflet';
import { differenceInDays } from 'date-fns';
import type { Activity } from '../../../types';
import {
  technicalResidueKeys,
  residuoLabels,
  tipoResiduoColors,
  markerColors,
} from './adminConstants';

// ── Helpers de residuos ────────────────────────────────────

/** Devuelve la etiqueta legible de un tipo de residuo (insensible a case/espacios) */
export const getResiduoLabel = (key: string): string | undefined => {
  if (!key) return undefined;
  const k = key.trim().toLowerCase();
  const found = Object.entries(residuoLabels).find(([rk]) => rk.toLowerCase() === k);
  return found ? found[1] : undefined;
};

/** Devuelve el color de un tipo de residuo (insensible a case/espacios) */
export const getResiduoColor = (key: string): string | undefined => {
  if (!key) return undefined;
  const k = key.trim().toLowerCase();
  const found = Object.entries(tipoResiduoColors).find(([ck]) => ck.toLowerCase() === k);
  return found ? found[1] : undefined;
};

/** Convierte cualquier valor (key técnico o etiqueta humana) al key técnico normalizado */
export const findTechnicalResidueKey = (value: string): string => {
  if (!value) return technicalResidueKeys[0];
  const normalized = value.trim().toLowerCase();

  if (technicalResidueKeys.some(k => k.toLowerCase() === normalized)) {
    return technicalResidueKeys.find(k => k.toLowerCase() === normalized)!;
  }

  const foundEntry = Object.entries(residuoLabels).find(
    ([rk, rv]) => rv.toLowerCase() === normalized || rk.toLowerCase() === normalized,
  );

  if (foundEntry) {
    const key = foundEntry[0];
    if (technicalResidueKeys.includes(key)) return key;
    const label = residuoLabels[key];
    const techKey = technicalResidueKeys.find(tk => residuoLabels[tk] === label);
    if (techKey) return techKey;
  }

  return technicalResidueKeys[0];
};

/**
 * Retorna el array de residuos de una actividad. `residuos` es columna propia
 * de PuntoResiduo (jsonb) en este backend — no un sub-campo de operativoData
 * (ese campo nunca existió acá, es del hub). Mismo criterio que
 * gestor-ambiental/lib/residuos.ts::getResiduos, duplicado acá para no
 * introducir un import cruzado entre árboles de página.
 */
export function getResiduos(activity: Activity): any[] {
  const residuos = (activity as any).residuos;
  if (!Array.isArray(residuos)) return [];
  return residuos.map((r: any) => ({
    ...r,
    dateTime: r.dateTime || activity.dateTime || (activity as any).createdAt,
  }));
}

// ── Lógica de puntos críticos ──────────────────────────────

// Umbral unificado con el backend (src/puntos/lib/emergencia.util.ts): un
// punto está vencido/crítico a partir de 4 días sin recoger. Antes esta
// función usaba operativoSubtipo (campo del hub, siempre undefined acá) y
// umbrales de 2/3 días — nunca marcaba nada como emergencia.
const UMBRAL_EMERGENCIA_DIAS = 4;

/** Retorna el tier de criticidad de un punto (0 = normal, 2 = crítico/vencido) */
export function getPuntoCriticoTier(activity: Activity): 0 | 1 | 2 {
  const residuos = getResiduos(activity);
  let hasPending = false;

  for (const r of residuos) {
    if (!r.recogido && r.status !== 'Recogido') {
      const days = differenceInDays(new Date(), new Date(r.dateTime));
      if (days >= UMBRAL_EMERGENCIA_DIAS) return 2;
      hasPending = true;
    }
  }
  return hasPending ? 1 : 0;
}

export function isPuntoEmergencia(activity: Activity): boolean {
  return getPuntoCriticoTier(activity) === 2;
}

export function isPuntoRecogido(activity: Activity): boolean {
  const residuos = getResiduos(activity);
  if (residuos.length === 0) return false;
  return residuos.every(r => r.recogido || r.status === 'Recogido');
}

// ── Geometría ─────────────────────────────────────────────

/** Ray Casting Algorithm — determina si un punto está dentro de un polígono GeoJSON */
export function isInside(lat: number, lng: number, geometry: any): boolean {
  if (!geometry) return false;

  const checkPolygon = (polygon: number[][][]) => {
    const exterior = polygon[0];
    let inside = false;

    for (let i = 0, j = exterior.length - 1; i < exterior.length; j = i++) {
      const xi = exterior[i][0], yi = exterior[i][1];
      const xj = exterior[j][0], yj = exterior[j][1];
      const intersect =
        yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    if (!inside) return false;

    for (let k = 1; k < polygon.length; k++) {
      const hole = polygon[k];
      let inHole = false;
      for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
        const xi = hole[i][0], yi = hole[i][1];
        const xj = hole[j][0], yj = hole[j][1];
        const intersect =
          yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
        if (intersect) inHole = !inHole;
      }
      if (inHole) return false;
    }

    return true;
  };

  if (geometry.type === 'Polygon') {
    return checkPolygon(geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly: number[][][]) => checkPolygon(poly));
  } else if (geometry.type === 'GeometryCollection') {
    return (geometry.geometries || []).some((g: any) => {
      if (g.type === 'Polygon' || g.type === 'MultiPolygon') return isInside(lat, lng, g);
      return false;
    });
  }
  return false;
}

// ── Iconos del mapa ───────────────────────────────────────

/** Crea un DivIcon de Leaflet con color institucional y PNG masqueado */
export const createMarkerIcon = (
  color: string,
  cat: string,
  subtipo?: string,
  number?: number,
): DivIcon => {
  let ip = '/icons/EspacioPublico.png';
  const cUpper = (cat || '').toUpperCase();
  if (cUpper === 'IVC') ip = '/icons/IVC.png';
  else if (cUpper === 'AMBIENTAL') {
    ip =
      subtipo === 'AMBIENTAL_PUNTOS_ACUMULACION'
        ? '/icons/Residuos.png'
        : '/icons/Ambiental.png';
  }

  const html = `
    <div style="position: relative;">
      <div class="custom-marker-clickable" style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3),0 0 0 3px white;border:2px solid white;">
        <div style="width:13px;height:13px;background:white;mask-image:url('${ip}');mask-size:contain;mask-repeat:no-repeat;-webkit-mask-image:url('${ip}');-webkit-mask-size:contain;-webkit-mask-repeat:no-repeat;pointer-events:none;"></div>
      </div>
      ${
        number
          ? `
      <div style="
        position: absolute; top: -10px; right: -10px;
        background: ${color}; color: white;
        font-size: 10px; font-weight: 800;
        padding: 2px 5px; border-radius: 8px;
        border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        z-index: 10; min-width: 18px; text-align: center;
      ">
        ${number}
      </div>
      `
          : ''
      }
    </div>
  `;

  return new DivIcon({
    className: 'custom-marker',
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

/** Selecciona el ícono correcto para una actividad en el mapa */
export const getCategoryIcon = (
  a: Activity,
  selectedTipoResiduo: string,
  isCobertura?: boolean,
  isSectorAmbiental?: boolean,
  number?: number,
): DivIcon => {
  // Mono-dominio: todo lo que llega a este backend ya es AMBIENTAL / punto
  // de acumulación — no hay operativoCategoria/operativoSubtipo que leer.
  let color = markerColors.AMBIENTAL;
  const tier = getPuntoCriticoTier(a);

  if (isSectorAmbiental && tier > 0) {
    color = tier === 2 ? '#DC2626' : '#EAB308';
  } else if (isCobertura) {
    color = '#10B981';
  }

  if (selectedTipoResiduo) {
    const filterLabel = getResiduoLabel(selectedTipoResiduo);
    const matches = getResiduos(a).some((r: any) => getResiduoLabel(r.tipoResiduo) === filterLabel);
    if (matches) color = tipoResiduoColors[selectedTipoResiduo] || color;
  }

  return createMarkerIcon(color, 'AMBIENTAL', 'AMBIENTAL_PUNTOS_ACUMULACION', number);
};

// ── Ubicaciones de actividad ──────────────────────────────

/** Retorna todas las ubicaciones de una actividad (principal + adicionales) */
export const getAllLocations = (
  activity: Activity | null,
): Array<{ lat: number; lng: number; label: string; activity: Activity }> => {
  const locations: Array<{ lat: number; lng: number; label: string; activity: Activity }> = [];
  if (!activity) return locations;

  if (
    activity.lat != null &&
    activity.lng != null &&
    typeof activity.lat === 'number' &&
    typeof activity.lng === 'number' &&
    !isNaN(activity.lat) &&
    !isNaN(activity.lng)
  ) {
    locations.push({ lat: activity.lat, lng: activity.lng, label: 'Ubicacion Principal', activity });
  }

  if (
    activity.operativoCategoria === 'ESPACIO_PUBLICO' &&
    activity.operativoData &&
    typeof activity.operativoData === 'object' &&
    activity.operativoData !== null &&
    'additionalLocations' in activity.operativoData &&
    Array.isArray((activity.operativoData as any).additionalLocations)
  ) {
    try {
      const additionalLocations = (activity.operativoData as any).additionalLocations;
      if (additionalLocations && additionalLocations.length > 0) {
        additionalLocations.forEach((loc: any, index: number) => {
          if (
            loc &&
            typeof loc === 'object' &&
            loc.lat != null &&
            loc.lng != null &&
            typeof loc.lat === 'number' &&
            typeof loc.lng === 'number' &&
            !isNaN(loc.lat) &&
            !isNaN(loc.lng)
          ) {
            locations.push({
              lat: loc.lat,
              lng: loc.lng,
              label: `Ubicacion ${index + 2}`,
              activity,
            });
          }
        });
      }
    } catch (error) {
      console.error('Error procesando ubicaciones adicionales:', error);
    }
  }

  return locations;
};

// ── Helpers de fechas ──────────────────────────────────────

/** Retorna el primer día del mes actual en formato YYYY-MM-DD */
export const getFirstDayOfMonth = (): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
};

/** Retorna el último día del mes actual en formato YYYY-MM-DD */
export const getLastDayOfMonth = (): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
};

// ── Insights del sector ambiental (para EnvironmentalTab) ──

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

/** Calcula los KPIs que muestra EnvironmentalTab a partir de los puntos crudos. */
export function computeAmbientalInsights(activities: Activity[]): AmbientalInsightsData {
  let totalIdentified = 0;
  let totalCollected = 0;
  let totalPub = 0;
  let totalVal = 0;
  let totalRech = 0;
  const timesByKey: Record<string, number[]> = {};
  const areaByKey: Record<string, number> = {};

  for (const a of activities) {
    if (a.status === 'PUBLICADA') totalPub++;
    else if (a.status === 'ENVIADA') totalVal++;
    else if (a.status === 'RECHAZADA') totalRech++;

    for (const r of getResiduos(a)) {
      totalIdentified++;
      if (r.recogido) totalCollected++;

      const key = r.tipoResiduo || 'SIN_TIPO';
      if (typeof r.areaLinealMetros === 'number') {
        areaByKey[key] = (areaByKey[key] || 0) + r.areaLinealMetros;
      }
      if (r.recogido && r.fechaRecogida && r.dateTime) {
        const dias = (new Date(r.fechaRecogida).getTime() - new Date(r.dateTime).getTime()) / 86400000;
        if (isFinite(dias) && dias >= 0) {
          (timesByKey[key] ??= []).push(dias);
        }
      }
    }
  }

  const avgCollectionTimes: Record<string, number | undefined> = {};
  for (const [key, arr] of Object.entries(timesByKey)) {
    avgCollectionTimes[key] = Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
  }

  return {
    totalIdentified,
    totalCollected,
    totalAct: activities.length,
    totalPub,
    totalVal,
    totalRech,
    avgCollectionTimes,
    totalArea: areaByKey,
  };
}

