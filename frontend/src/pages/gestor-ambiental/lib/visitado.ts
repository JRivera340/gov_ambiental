const DAY_MS = 86400000;

// Antigüedad del último toque al punto, para mostrar "hace N días".
//
// OJO: esto NO es "visitado". `ultimoSeguimientoAt` no guarda autor, así que no
// puede responder si lo visitó ESTE gestor, que es lo que dice la regla de
// negocio (recogido / residuo nuevo / nota, hechos por él). Esa pregunta la
// responde el backend: los ids visitados vienen en el plan del ciclo
// (GET /visitas/plan). Antes se derivaba de este campo y, entre otras cosas,
// una nota no lo actualizaba, así que el punto figuraba sin visitar.
export function diasDesdeUltimoToque(
  ultimoSeguimientoAt: string | null | undefined,
  ahora: Date,
): number {
  if (!ultimoSeguimientoAt) return Infinity;
  const ms = ahora.getTime() - new Date(ultimoSeguimientoAt).getTime();
  return Math.max(0, Math.floor(ms / DAY_MS));
}
