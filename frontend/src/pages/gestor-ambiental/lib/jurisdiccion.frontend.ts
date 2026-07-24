export function filtrarPuntosAsignados<T extends { puntoId: string }>(puntos: T[], asignados: string[]): T[] {
  if (!asignados || asignados.length === 0) return [];
  const set = new Set(asignados);
  return puntos.filter(p => set.has(p.puntoId));
}
