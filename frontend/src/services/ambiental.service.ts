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

/** La quincena en curso (1 al 15, o 16 al fin de mes): cubre el 100% de los asignados. */
export interface QuincenaPlanDTO {
  /** Índice absoluto desde el lunes ancla. Identifica la quincena sin arrastrar fechas. */
  indice: number;
  inicioISO: string;
  finISO: string;
  /** "Quincena del 10 al 23 de agosto" — la arma el backend, la UI no compone fechas. */
  etiqueta: string;
  /** Puntos vencidos: van primero en el orden del plan. */
  emergencia: string[];
  regular: string[];
  planificados: string[];
  /** Puntos ya visitados. Solo viene de GET /visitas/plan. */
  visitados: string[];
  /** Progreso de frecuencia por punto (parejas de días consecutivos por mitad, según el régimen vigente). Solo viene de GET /visitas/plan. */
  progresoVisitas?: Record<string, ProgresoFrecuenciaDTO>;
}

/** Progreso crudo de frecuencia de un punto dentro de la quincena en curso. */
export interface ProgresoFrecuenciaDTO {
  /** 'parejas': quincena en régimen nuevo. 'simple': quincena vieja, 1 visita ya alcanza. */
  regimen: 'parejas' | 'simple';
  paresMitadActual: number;
  paresMitadRestante: number;
  paresRequeridos: number;
  cumpleMitadActual: boolean;
  cumpleMitadRestante: boolean;
}
export interface PlanQuincenaDTO {
  gestorId: string;
  asignados: number;
  quincena: QuincenaPlanDTO;
}

export interface ParadaHistorialDTO {
  puntoId: string;
  lat: number;
  lng: number;
  barrio: string;
  visitado: boolean;
  pointNumber: number | null;
}
/** Una quincena cerrada del historial, con sus rutas ya fusionadas. */
export interface QuincenaHistorialDTO {
  indice: number;
  inicioISO: string;
  finISO: string;
  etiqueta: string;
  rutas: { id: string; estado: RutaSemanalDTO['estado']; inicioISO: string; finISO: string; cerradaISO: string }[];
  paradas: ParadaHistorialDTO[];
  planificados: number;
  visitados: number;
  pendientes: number;
  pct: number;
}

export interface DesempenoGestorDTO {
  gestorId: string;
  asignados: number;
  planificados: number;
  visitados: number;
  pct: number;
  visitasFueraDePlan: number;
}
export interface ResumenDesempenoDTO {
  quincenaInicioISO: string;
  quincenaFinISO: string;
  /** "Quincena del 10 al 23 de agosto". Nunca formato de semana ISO. */
  etiqueta: string;
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
  async getRutaQuincena(): Promise<RutaSemanalDTO | null> {
    const { data } = await api.get<RutaSemanalDTO | null>('/rutas-semanales/mine');
    return data ?? null;
  },
  async crearRutaQuincena(paradas: ParadaLite[], segmentos: any[]): Promise<RutaSemanalDTO> {
    const { data } = await api.post<RutaSemanalDTO>('/rutas-semanales', { paradas, segmentos });
    return data;
  },
  async cancelarRutaQuincena(rutaId: string): Promise<RutaSemanalDTO> {
    const { data } = await api.patch<RutaSemanalDTO>(`/rutas-semanales/${rutaId}/cancelar`);
    return data;
  },
  async getArrastre(): Promise<string[]> {
    const { data } = await api.get<string[]>('/rutas-semanales/arrastre/mine');
    return Array.isArray(data) ? data : [];
  },
  // Fuente única de "qué está visitado": el plan de la quincena ya viene
  // cruzado con las visitas reales. Antes cada pantalla lo deducía por su
  // cuenta y no coincidían entre sí.
  async getPlanQuincena(): Promise<PlanQuincenaDTO> {
    const { data } = await api.get<PlanQuincenaDTO>('/visitas/plan');
    return data;
  },
  // Quincenas ya cerradas, con el cumplimiento real (cruzado con las visitas,
  // no con el flag congelado de la ruta). Sin gestorId trae las propias; el
  // admin pasa el id del gestor que está mirando.
  async getHistorialRutas(gestorId?: string, limit = 20): Promise<QuincenaHistorialDTO[]> {
    const { data } = await api.get<QuincenaHistorialDTO[]>('/visitas/historial', {
      params: { ...(gestorId ? { gestorId } : {}), limit },
    });
    return Array.isArray(data) ? data : [];
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
