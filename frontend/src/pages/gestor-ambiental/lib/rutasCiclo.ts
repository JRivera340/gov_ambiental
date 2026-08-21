import type { ParadaRuta } from './ruta.types';
import type { SemanaPlanDTO } from '../../../services/ambiental.service';

// Selección de paradas por semana del ciclo.
//
// Reemplaza a los tres modos de ruta anteriores (Completa / Emergencia / Sin
// Visita). El problema de esos modos era que se armaban sobre TODOS los puntos
// asignados, así que el gestor podía recorrer puntos de la semana que no le
// tocaba y esas visitas no contaban en ningún lado. Ahora solo se puede
// planificar una de las dos semanas del ciclo, que son las mismas contra las
// que el backend mide el cumplimiento.

export type SlotRuta = 0 | 1;

export function getParadasDeSemana(paradas: ParadaRuta[], semana: SemanaPlanDTO): ParadaRuta[] {
  const planificados = new Set(semana.planificados);
  const esEmergencia = new Set(semana.emergencia);
  return paradas
    .filter((p) => planificados.has(p.puntoId))
    // Las emergencias primero: son las que no pueden esperar.
    .sort((a, b) => Number(esEmergencia.has(b.puntoId)) - Number(esEmergencia.has(a.puntoId)));
}

export type ResumenSemana = {
  total: number;
  visitados: number;
  pendientes: number;
  emergencias: number;
  pct: number;
};

export function resumenSemana(semana: SemanaPlanDTO): ResumenSemana {
  const total = semana.planificados.length;
  const visitados = semana.visitados.length;
  return {
    total,
    visitados,
    pendientes: total - visitados,
    emergencias: semana.emergencia.length,
    pct: total > 0 ? Math.round((visitados / total) * 100) : 0,
  };
}
