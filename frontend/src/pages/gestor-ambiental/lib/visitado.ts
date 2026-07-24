const BOGOTA_OFFSET_MS = 5 * 3600000;
const DAY_MS = 86400000;

function limitesSemanaBogota(ahora: Date): { inicio: number; fin: number } {
  const bogota = new Date(ahora.getTime() - BOGOTA_OFFSET_MS);
  const dow = bogota.getUTCDay();
  const desdeLunes = (dow + 6) % 7;
  const lunesBogota = Date.UTC(
    bogota.getUTCFullYear(), bogota.getUTCMonth(), bogota.getUTCDate() - desdeLunes, 0, 0, 0, 0,
  );
  const inicio = lunesBogota + BOGOTA_OFFSET_MS;
  const fin = inicio + 7 * DAY_MS - 1;
  return { inicio, fin };
}

export function visitadoEstaSemana(
  ultimoSeguimientoAt: string | null | undefined,
  ahora: Date,
): boolean {
  if (!ultimoSeguimientoAt) return false;
  const t = new Date(ultimoSeguimientoAt).getTime();
  const { inicio, fin } = limitesSemanaBogota(ahora);
  return t >= inicio && t <= fin;
}

export function diasDesdeUltimoSeguimiento(
  ultimoSeguimientoAt: string | null | undefined,
  ahora: Date,
): number {
  if (!ultimoSeguimientoAt) return Infinity;
  const ms = ahora.getTime() - new Date(ultimoSeguimientoAt).getTime();
  return Math.max(0, Math.floor(ms / DAY_MS));
}
