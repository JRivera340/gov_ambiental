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
  async crearRutaSemana(paradas: ParadaLite[], segmentos: any[]): Promise<RutaSemanalDTO> {
    const { data } = await api.post<RutaSemanalDTO>('/rutas-semanales', { paradas, segmentos });
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
};
