import api from './api';

export interface AsignacionRow {
  activityId: string;
  gestorId: string | null;
}
export interface ParadaLite {
  activityId: string;
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
    const { data } = await api.get<string[]>('/sorver/ambiental/asignacion/mine');
    return Array.isArray(data) ? data : [];
  },
  async getAsignacionAll(): Promise<AsignacionRow[]> {
    const { data } = await api.get<AsignacionRow[]>('/sorver/ambiental/asignacion/all');
    return Array.isArray(data) ? data : [];
  },
  async getSinAsignar(): Promise<string[]> {
    const { data } = await api.get<string[]>('/sorver/ambiental/asignacion/sin-asignar');
    return Array.isArray(data) ? data : [];
  },
  async reasignarPunto(activityId: string, gestorId: string | null): Promise<AsignacionRow> {
    const { data } = await api.patch<AsignacionRow>('/sorver/ambiental/asignacion/punto', { activityId, gestorId });
    return data;
  },
  async getRutaSemanal(): Promise<RutaSemanalDTO | null> {
    const { data } = await api.get<RutaSemanalDTO | null>('/sorver/ambiental/ruta-semanal/mine');
    return data ?? null;
  },
  async crearRutaSemana(paradas: ParadaLite[], segmentos: any[]): Promise<RutaSemanalDTO> {
    const { data } = await api.post<RutaSemanalDTO>('/sorver/ambiental/ruta-semanal', { paradas, segmentos });
    return data;
  },
  async cancelarRutaSemana(rutaId: string): Promise<RutaSemanalDTO> {
    const { data } = await api.patch<RutaSemanalDTO>(`/sorver/ambiental/ruta-semanal/${rutaId}/cancelar`);
    return data;
  },
  async getArrastre(): Promise<string[]> {
    const { data } = await api.get<string[]>('/sorver/ambiental/ruta-semanal/arrastre/mine');
    return Array.isArray(data) ? data : [];
  },
};
