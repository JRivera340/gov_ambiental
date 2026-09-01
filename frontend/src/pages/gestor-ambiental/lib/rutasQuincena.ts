import type { ParadaRuta } from './ruta.types';
import type { QuincenaPlanDTO } from '../../../services/ambiental.service';

// Selección de paradas de la quincena.
//
// Reemplaza a los tres modos de ruta anteriores (Completa / Emergencia / Sin
// Visita), que se armaban sobre TODOS los puntos asignados sin coincidir con lo
// que el backend medía. También reemplaza al reparto en dos semanas: ese
// obligaba al gestor a esperar a la semana siguiente para tocar la otra mitad
// de sus puntos. La quincena es un bloque único de 14 días con el 100% de los
// asignados, y es contra eso que se mide el cumplimiento.

export function getParadasDeQuincena(paradas: ParadaRuta[], quincena: QuincenaPlanDTO): ParadaRuta[] {
  const planificados = new Set(quincena.planificados);
  const esEmergencia = new Set(quincena.emergencia);
  return paradas
    .filter((p) => planificados.has(p.puntoId))
    // Las emergencias primero: son las que no pueden esperar.
    .sort((a, b) => Number(esEmergencia.has(b.puntoId)) - Number(esEmergencia.has(a.puntoId)));
}

export type ResumenQuincena = {
  total: number;
  visitados: number;
  pendientes: number;
  emergencias: number;
  pct: number;
};

export function resumenQuincena(quincena: QuincenaPlanDTO): ResumenQuincena {
  const total = quincena.planificados.length;
  const visitados = quincena.visitados.length;
  return {
    total,
    visitados,
    pendientes: total - visitados,
    emergencias: quincena.emergencia.length,
    pct: total > 0 ? Math.round((visitados / total) * 100) : 0,
  };
}
