import { PuntoResiduo } from '../entities/punto-residuo.entity';

// Fuente única de verdad del criterio de "emergencia" — antes vivía
// duplicado e inconsistente en dos lugares: el frontend (isPuntoEmergencia,
// ≥4 días, frontend/src/pages/gestor-ambiental/lib/residuos.ts) y
// reporte.service.ts (≥3 días). Se unifica acá en el backend en ≥4 días,
// que es el criterio correcto (el mismo que ya usa "Ruta de Emergencia" en
// el frontend). Cualquier cosa que necesite decidir si un punto/residuo
// está vencido debe llamar a estas funciones, no reimplementar el cálculo.

export const UMBRAL_EMERGENCIA_DIAS = 4;

function diasDesde(dateTimeISO: string | Date, ahora: Date): number {
  const diff = ahora.getTime() - new Date(dateTimeISO).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Un residuo está vencido si no fue recogido y pasaron 4+ días desde su registro. */
export function esResiduoVencido(dateTimeISO: string | Date, ahora: Date = new Date()): boolean {
  const dias = diasDesde(dateTimeISO, ahora);
  return !isNaN(dias) && dias >= UMBRAL_EMERGENCIA_DIAS;
}

/** Un punto está en emergencia si tiene al menos un residuo pendiente vencido. */
export function esPuntoEnEmergencia(punto: PuntoResiduo, ahora: Date = new Date()): boolean {
  const residuos = punto.residuos || [];
  return residuos.some((r) => {
    if (r.recogido) return false;
    const dt = r.dateTime || punto.dateTime;
    if (!dt) return false;
    return esResiduoVencido(dt, ahora);
  });
}
