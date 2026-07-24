import type { ParadaLite } from './paradas.types';
export type { ParadaLite } from './paradas.types';

const BOGOTA_OFFSET_MS = 5 * 3600000; // UTC-5 fijo

export function limitesSemana(fecha: Date): { inicioISO: string; finISO: string } {
  const bogota = new Date(fecha.getTime() - BOGOTA_OFFSET_MS);
  const dow = bogota.getUTCDay();
  const desdeLunes = (dow + 6) % 7;
  const lunesBogota = Date.UTC(
    bogota.getUTCFullYear(), bogota.getUTCMonth(), bogota.getUTCDate() - desdeLunes, 0, 0, 0, 0,
  );
  const inicioUTC = lunesBogota + BOGOTA_OFFSET_MS;
  const finUTC = inicioUTC + 7 * 86400000 - 1;
  return { inicioISO: new Date(inicioUTC).toISOString(), finISO: new Date(finUTC).toISOString() };
}

export function semanaVencida(finISO: string, ahora: Date): boolean {
  return ahora.getTime() > new Date(finISO).getTime();
}

export function calcularArrastre(paradas: ParadaLite[]): string[] {
  return paradas.filter(p => !p.visitado).map(p => p.puntoId);
}
