import api from './api';

export interface AsignacionRow {
  puntoResiduoId: string;
  gestorId: string | null;
}
export interface ParadaLite {
  puntoId: string;
  lat: number;
  lng: number;
  barrio: string;
  visitado: boolean;
}
export interface RutaSemanalDTO {
  id: string;
  gestorId: string;
  semanaInicio: string;
  semanaFin: string;
  estado: 'en_progreso' | 'completada' | 'cerrada' | 'cancelada';
  paradas: ParadaLite[];
  segmentos: any[];
  arrastre: string[];
  /** Última vez que se guardó la fila — se usa como hora real de cierre/cancelación. */
  updatedAt?: string;
}

/** Una de las dos semanas del ciclo. Entre ambas cubren todos los puntos asignados. */
export interface SemanaPlanDTO {
  slot: 0 | 1;
  semanaISO: string;
  inicioISO: string;
  finISO: string;
  /** "Semana del 17 al 23 de agosto" — la arma el backend, la UI no compone fechas. */
  etiqueta: string;
  ventanaDesdeISO: string;
  esActual: boolean;
  /** Solo la semana en curso trae emergencias: los vencidos se adelantan a ella. */
  emergencia: string[];
  regular: string[];
  planificados: string[];
  /** Puntos ya visitados de esta semana. Solo viene de GET /visitas/plan. */
  visitados: string[];
}
export interface PlanCicloDTO {
  gestorId: string;
  asignados: number;
  semanas: [SemanaPlanDTO, SemanaPlanDTO];
}

export interface SemanaDesempenoDTO {
  slot: 0 | 1;
  esActual: boolean;
  inicioISO: string;
  finISO: string;
  etiqueta: string;
  planificados: number;
  visitados: number;
  pct: number;
}
export interface DesempenoGestorDTO {
  gestorId: string;
  asignados: number;
  semanas: [SemanaDesempenoDTO, SemanaDesempenoDTO];
  visitasFueraDePlan: number;
}
export interface ResumenDesempenoDTO {
  cicloInicioISO: string;
  cicloFinISO: string;
  gestores: DesempenoGestorDTO[];
  targetTotal: number;
  actualTotal: number;
}

export const ambientalService = {
  async getMisPuntos(): Promise<string[]> {
    const { data } = await api.get<string[]>('/asignaciones/mine');
    return Array.isArray(data) ? data : [];
  },
  async getAsignacionAll(): Promise<AsignacionRow[]> {
    const { data } = await api.get<AsignacionRow[]>('/asignaciones/all');
    return Array.isArray(data) ? data : [];
  },
  async getSinAsignar(): Promise<string[]> {
    const { data } = await api.get<string[]>('/asignaciones/sin-asignar');
    return Array.isArray(data) ? data : [];
  },
  async reasignarPunto(puntoResiduoId: string, gestorId: string | null): Promise<AsignacionRow> {
    const { data } = await api.patch<AsignacionRow>('/asignaciones/punto', { puntoResiduoId, gestorId });
    return data;
  },
  async getRutaSemanal(): Promise<RutaSemanalDTO | null> {
    const { data } = await api.get<RutaSemanalDTO | null>('/rutas-semanales/mine');
    return data ?? null;
  },
  /** Las rutas de las dos semanas del ciclo, en el mismo orden que el plan. */
  async getRutasDelCiclo(): Promise<[RutaSemanalDTO | null, RutaSemanalDTO | null]> {
    const { data } = await api.get<[RutaSemanalDTO | null, RutaSemanalDTO | null]>('/rutas-semanales/mine/ciclo');
    return Array.isArray(data) ? data : [null, null];
  },
  async crearRutaSemana(paradas: ParadaLite[], segmentos: any[], semanaInicioISO?: string): Promise<RutaSemanalDTO> {
    const { data } = await api.post<RutaSemanalDTO>('/rutas-semanales', { paradas, segmentos, semanaInicioISO });
    return data;
  },
  async cancelarRutaSemana(rutaId: string): Promise<RutaSemanalDTO> {
    const { data } = await api.patch<RutaSemanalDTO>(`/rutas-semanales/${rutaId}/cancelar`);
    return data;
  },
  async getArrastre(): Promise<string[]> {
    const { data } = await api.get<string[]>('/rutas-semanales/arrastre/mine');
    return Array.isArray(data) ? data : [];
  },
  // Fuente única de "qué está visitado": el plan del ciclo ya viene cruzado
  // con las visitas reales. Antes cada pantalla lo deducía por su cuenta y no
  // coincidían entre sí.
  async getPlanCiclo(): Promise<PlanCicloDTO> {
    const { data } = await api.get<PlanCicloDTO>('/visitas/plan');
    return data;
  },
  async getDesempeno(gestorId?: string): Promise<ResumenDesempenoDTO> {
    const { data } = await api.get<ResumenDesempenoDTO>('/visitas/desempeno', { params: gestorId ? { gestorId } : undefined });
    return data;
  },
  async getMiDesempeno(): Promise<ResumenDesempenoDTO> {
    const { data } = await api.get<ResumenDesempenoDTO>('/visitas/mine');
    return data;
  },
};
