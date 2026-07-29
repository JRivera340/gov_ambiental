// Determina la fecha de "última actualización" de un punto. Antes leía
// operativoData.infoActualizadaAt (campo que nunca existió en el backend, ver
// ESTADO-EXTRACCION.md) — usa `updatedAt`, que ya es columna estándar de
// TypeORM en PuntoResiduo (@UpdateDateColumn, se actualiza sola en cada save).
export function getUltimaActualizacion(
  updatedAt: string | Date | undefined,
  createdAt?: string | Date,
): { iso: string; esEdicion: boolean } | null {
  const toIso = (v: string | Date) => (typeof v === 'string' ? v : new Date(v).toISOString());
  if (updatedAt && createdAt && toIso(updatedAt) !== toIso(createdAt)) {
    return { iso: toIso(updatedAt), esEdicion: true };
  }
  if (createdAt) return { iso: toIso(createdAt), esEdicion: false };
  if (updatedAt) return { iso: toIso(updatedAt), esEdicion: false };
  return null;
}
