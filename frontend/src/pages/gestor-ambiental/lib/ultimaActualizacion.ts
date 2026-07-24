// Determina la fecha de "última actualización" de un punto: prioriza
// operativoData.infoActualizadaAt (marcada al editar la info del punto) y cae
// a createdAt de la actividad si nunca fue editado.
export function getUltimaActualizacion(
  operativoData: any,
  createdAt?: string | Date,
): { iso: string; esEdicion: boolean } | null {
  const info = operativoData?.infoActualizadaAt;
  if (info) return { iso: typeof info === 'string' ? info : new Date(info).toISOString(), esEdicion: true };
  if (createdAt) return { iso: typeof createdAt === 'string' ? createdAt : new Date(createdAt).toISOString(), esEdicion: false };
  return null;
}
