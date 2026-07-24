import api from './api';
import type { Activity, CreateActivityDTO } from '../types';

// Recortado del monolito: acá solo quedan los métodos que usa el módulo
// Ambiental (registro de punto, seguimiento, aprobación, residuos). Todo
// apunta a /puntos en vez de /sorver/activities, y el backend de este repo
// solo conoce puntos de acumulación — no hay categoría/subtipo que filtrar.
function normalizeActivity(activity: any): Activity {
  return {
    ...activity,
    photos: Array.isArray(activity.photos) ? activity.photos : (activity.photos ? [activity.photos] : []),
    photosFase2: Array.isArray(activity.photosFase2) ? activity.photosFase2 : (activity.photosFase2 ? [activity.photosFase2] : []),
  };
}

export const activityService = {
  // GESTOR_AMBIENTAL: Registrar un punto (con residuos/fotos/acta iniciales)
  async create(data: CreateActivityDTO): Promise<Activity> {
    const { data: activity } = await api.post<Activity>('/puntos', data);
    return normalizeActivity(activity);
  },

  // GESTOR_AMBIENTAL: Corregir un punto en BORRADOR/RECHAZADA antes de reenviar
  async update(id: string, data: Partial<CreateActivityDTO>): Promise<Activity> {
    const { data: activity } = await api.patch<Activity>(`/puntos/${id}`, data);
    return normalizeActivity(activity);
  },

  // GESTOR_AMBIENTAL: Enviar el punto a validación
  async send(id: string): Promise<Activity> {
    const { data } = await api.post<Activity>(`/puntos/${id}/send`);
    return normalizeActivity(data);
  },

  // Obtener un punto por id (para editar / revisar)
  async getById(id: string): Promise<Activity> {
    const { data } = await api.get<Activity>(`/puntos/${id}`);
    return normalizeActivity(data);
  },

  // Todos los puntos (mapa general / mapa del validador) — este repo no tiene
  // categorías, la tabla ya es solo de puntos de acumulación.
  async getAll(filters?: { desde?: string; hasta?: string; [extra: string]: any }): Promise<Activity[]> {
    const { data } = await api.get<any[]>('/puntos', { params: filters });
    return Array.isArray(data) ? data.map(normalizeActivity) : [];
  },

  // VALIDADOR_AMBIENTAL: Aprobar punto
  async approve(id: string, notes?: string): Promise<Activity> {
    const { data } = await api.post<Activity>(`/puntos/${id}/approve`, { notes: notes || undefined });
    return normalizeActivity(data);
  },

  // VALIDADOR_AMBIENTAL: Rechazar punto
  async reject(id: string, notes: string): Promise<Activity> {
    const { data } = await api.post<Activity>(`/puntos/${id}/reject`, { notes });
    return normalizeActivity(data);
  },

  // VALIDADOR_AMBIENTAL: Aprobar residuos específicos de un punto
  async aprobarResiduo(id: string, residuos: any[]): Promise<Activity> {
    const { data } = await api.patch<Activity>(`/puntos/${id}/aprobar-residuo`, { residuos });
    return normalizeActivity(data);
  },

  // GESTOR_AMBIENTAL: Marcar residuo recogido / agregar residuo nuevo a un punto ya registrado
  async addSeguimiento(id: string, data: {
    action: 'MARCAR_RECOGIDO' | 'AGREGAR_RESIDUO';
    residuoId?: string;
    photosRecogida?: string[];
    fechaRecogida?: string;
    /** El backend siempre usa el email del JWT como nombre — este campo se acepta pero se ignora. */
    recogidoByNombre?: string;
    nuevoResiduo?: {
      tipoResiduo: string;
      quienDispuso: string;
      percibeOlores: boolean;
      percibeVectores: boolean;
      volumenEstimadoM3?: number;
      areaLinealMetros: number;
      observaciones?: string;
      photos: string[];
    };
  }): Promise<Activity> {
    const { data: activity } = await api.patch<Activity>(`/puntos/${id}/seguimiento`, data);
    return normalizeActivity(activity);
  },

  async agregarNotaResiduo(puntoId: string, residuoId: string, texto: string): Promise<Activity> {
    const { data } = await api.post<Activity>(`/puntos/${puntoId}/residuo-nota`, { residuoId, texto });
    return normalizeActivity(data);
  },

  async eliminarNotaResiduo(puntoId: string, residuoId: string, notaId: string): Promise<Activity> {
    const { data } = await api.delete<Activity>(`/puntos/${puntoId}/residuo-nota`, { data: { residuoId, notaId } });
    return normalizeActivity(data);
  },
};
