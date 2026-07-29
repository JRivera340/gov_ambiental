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
// Fuente única de getResiduos()/isPuntoRecogido() — antes había una copia
// separada acá que leía activity.operativoData (campo que nunca existió en
// el backend de este repo, ver ESTADO-EXTRACCION.md). Unificado 2026-07-29.
import { getResiduos, isPuntoRecogido } from '../../gestor-ambiental/lib/residuos';

export { getResiduos, isPuntoRecogido };

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

// ── Lógica de puntos críticos ──────────────────────────────

/** Retorna el tier de criticidad de un punto (0 = normal, 1 = vencido, 2 = crítico) */
export function getPuntoCriticoTier(activity: Activity): 0 | 1 | 2 {
  if (activity.operativoSubtipo !== 'AMBIENTAL_PUNTOS_ACUMULACION') return 0;
  const residuos = getResiduos(activity);
  let maxDays = 0;
  let hasPending = false;

  residuos.forEach(r => {
    if (!r.recogido) {
      hasPending = true;
      const days = differenceInDays(new Date(), new Date(r.dateTime));
      if (days > maxDays) maxDays = days;
    }
  });

  if (!hasPending) return 0;
  if (maxDays >= 3) return 2;
  if (maxDays >= 2) return 1;
  return 0;
}

export function isPuntoEmergencia(activity: Activity): boolean {
  return getPuntoCriticoTier(activity) > 0;
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
  // Este repo es mono-dominio (ver CLAUDE.md invariantes) — toda actividad ya
  // es AMBIENTAL, no hace falta (ni existe) operativoCategoria para
  // distinguirlo. Antes esto siempre caía en DEFAULT (gris) porque el campo
  // no existe en este backend. Bug real corregido 2026-07-29.
  let color = markerColors.AMBIENTAL;
  const tier = getPuntoCriticoTier(a);

  if (isSectorAmbiental && tier > 0) {
    color = tier === 2 ? '#DC2626' : '#EAB308';
  } else if (isCobertura) {
    color = '#10B981';
  }

  if (a.operativoSubtipo === 'AMBIENTAL_PUNTOS_ACUMULACION' && selectedTipoResiduo) {
    const filterLabel = getResiduoLabel(selectedTipoResiduo);
    const matches = getResiduos(a).some((r) => getResiduoLabel(r.tipoResiduo) === filterLabel);

    if (matches) {
      color = tipoResiduoColors[selectedTipoResiduo] || color;
    }
  }

  return createMarkerIcon(color, 'AMBIENTAL', a.operativoSubtipo, number);
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

  // Antes había una rama acá para ubicaciones adicionales de ESPACIO_PUBLICO
  // (leída de operativoData) — código muerto, ese dominio no existe en este
  // repo (mono-dominio ambiental, ver CLAUDE.md) y el campo tampoco existe en
  // el backend. Eliminada 2026-07-29, ver ESTADO-EXTRACCION.md.
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

