import api from './api';
import { authService } from './auth.service';
import type { Activity, CreateActivityDTO, PaginatedResponse } from '../types';

// Función helper para normalizar una actividad y asegurar que los campos que deben ser arrays lo sean
function normalizeActivity(activity: any): Activity {
  return {
    ...activity,
    gestoresInvolucrados: Array.isArray(activity.gestoresInvolucrados)
      ? activity.gestoresInvolucrados
      : (activity.gestoresInvolucrados ? [activity.gestoresInvolucrados] : []),
    entidadesAcompanantes: Array.isArray(activity.entidadesAcompanantes)
      ? activity.entidadesAcompanantes
      : (activity.entidadesAcompanantes ? [activity.entidadesAcompanantes] : []),
    photos: Array.isArray(activity.photos)
      ? activity.photos
      : (activity.photos ? [activity.photos] : []),
    photosFase2: Array.isArray(activity.photosFase2)
      ? activity.photosFase2
      : (activity.photosFase2 ? [activity.photosFase2] : []),
  };
}

// Normaliza una respuesta paginada del backend a { data, total }, tolerando que
// el backend devuelva un array plano en vez del envoltorio { data, total }.
function unwrapPaginated(data: any): PaginatedResponse<Activity> {
  if (data && typeof data === 'object' && 'data' in data && 'total' in data) {
    const normalizedData = Array.isArray(data.data) ? data.data.map(normalizeActivity) : [];
    return { data: normalizedData, total: data.total || normalizedData.length };
  }
  const activities = Array.isArray(data) ? (data as any[]).map(normalizeActivity) : [];
  return { data: activities, total: activities.length };
}

export const activityService = {
  // GESTOR: Crear actividad
  async create(data: CreateActivityDTO): Promise<Activity> {
    const { data: activity } = await api.post<Activity>('/sorver/activities', data);
    return normalizeActivity(activity);
  },

  // GESTOR: Obtener estadísticas de mis actividades
  async getMyStats(filters?: { desde?: string; hasta?: string }): Promise<{ enviada: number; aprobada: number; rechazada: number }> {
    const params = new URLSearchParams();
    if (filters?.desde) params.append('desde', filters.desde);
    if (filters?.hasta) params.append('hasta', filters.hasta);
    const url = `/sorver/activities/mine/stats${params.toString() ? `?${params.toString()}` : ''}`;
    const { data } = await api.get<{ enviada: number; aprobada: number; rechazada: number }>(url);
    return data;
  },

  // GESTOR: Ver mis actividades
  async getMine(filters?: { desde?: string; hasta?: string; limit?: number; offset?: number }): Promise<PaginatedResponse<Activity>> {
    const params = new URLSearchParams();
    if (filters?.desde) params.append('desde', filters.desde);
    if (filters?.hasta) params.append('hasta', filters.hasta);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());
    const { data } = await api.get<PaginatedResponse<Activity>>(`/sorver/activities/mine?${params.toString()}`);
    return unwrapPaginated(data);
  },

  // GESTOR: Enviar actividad para validación
  async send(id: string): Promise<Activity> {
    const { data } = await api.post<Activity>(`/sorver/activities/${id}/send`);
    return normalizeActivity(data);
  },

  // Obtener actividad por ID (soporta acceso público sin autenticación)
  async getById(id: string): Promise<Activity> {
    const hasToken = !!authService.getToken();
    const url = hasToken ? `/sorver/activities/${id}` : `/sorver/public/actividad/${id}`;
    try {
      const { data } = await api.get<Activity>(url);
      return normalizeActivity(data);
    } catch (error) {
      if (hasToken) {
        try {
          const { data } = await api.get<Activity>(`/sorver/public/actividad/${id}`);
          return normalizeActivity(data);
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  // ADMIN: Listar todas las actividades (sin paginación, para uso interno o reportes)
  async getAll(filters?: any): Promise<Activity[]> {
    // Add cache buster to avoid stale responses from browser/proxy
    const cacheBuster = Date.now();
    try {
      const { data } = await api.get<any>('/sorver/activities', {
        params: { ...filters, _t: cacheBuster }
      });

      // The backend returns { data: Activity[], total: number }
      if (data && data.data && Array.isArray(data.data)) {
        return data.data.map(normalizeActivity);
      }
      // Fallback if it's already an array
      if (Array.isArray(data)) {
        return data.map(normalizeActivity);
      }
      return [];
    } catch (error) {
      console.error('[activityService.getAll] Error fetching activities:', error);
      throw error;
    }
  },

  // VALIDADOR: Ver actividades pendientes
  async getPending(filters?: {
    desde?: string;
    hasta?: string;
    categoria?: string;
    subtipo?: string;
    barrio?: string;
    gestor?: string;
    limit?: number;
    offset?: number
  }): Promise<PaginatedResponse<Activity>> {
    const params = new URLSearchParams();
    if (filters?.desde) params.append('desde', filters.desde);
    if (filters?.hasta) params.append('hasta', filters.hasta);
    if (filters?.categoria) {
      params.append('categoria', filters.categoria);
    }
    if (filters?.subtipo) {
      params.append('subtipo', filters.subtipo);
    }
    if (filters?.barrio) params.append('barrio', filters.barrio);
    if (filters?.gestor) params.append('gestor', filters.gestor);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());
    const { data } = await api.get<PaginatedResponse<Activity>>(`/sorver/activities/pending?${params.toString()}`);
    return unwrapPaginated(data);
  },

  // VALIDADOR: Historial de validaciones (MIS validaciones)
  async getMyValidations(filters?: {
    desde?: string;
    hasta?: string;
    categoria?: string;
    subtipo?: string;
    barrio?: string;
    status?: string;
    gestor?: string;
    limit?: number;
    offset?: number
  }): Promise<PaginatedResponse<Activity>> {
    const params = new URLSearchParams();
    if (filters?.desde) params.append('desde', filters.desde);
    if (filters?.hasta) params.append('hasta', filters.hasta);
    if (filters?.categoria) {
      params.append('categoria', filters.categoria);
      params.append('operativoCategoria', filters.categoria);
    }
    if (filters?.subtipo) {
      params.append('subtipo', filters.subtipo);
      params.append('operativoSubtipo', filters.subtipo);
    }
    if (filters?.barrio) params.append('barrio', filters.barrio);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.gestor) params.append('gestor', filters.gestor);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());
    const queryString = params.toString();
    const url = `/sorver/activities/my-validations${queryString ? `?${queryString}` : ''}`;
    const { data } = await api.get<PaginatedResponse<Activity>>(url);
    return unwrapPaginated(data);
  },

  // VALIDADOR: Historial de validaciones (TODAS las validaciones del sistema)
  async getValidated(filters?: {
    desde?: string;
    hasta?: string;
    categoria?: string;
    subtipo?: string;
    barrio?: string;
    status?: string;
    gestor?: string;
    limit?: number;
    offset?: number
  }): Promise<PaginatedResponse<Activity>> {
    const params = new URLSearchParams();
    // El historial de validaciones filtra por fecha de validación (validatedAt),
    // no por la fecha del operativo, para que aparezcan las validadas de meses
    // anteriores. Filtrar por validatedAt excluye además lo no validado.
    params.append('dateField', 'validatedAt');
    if (filters?.desde) params.append('desde', filters.desde);
    if (filters?.hasta) params.append('hasta', filters.hasta);
    if (filters?.categoria) {
      params.append('operativoCategoria', filters.categoria);
    }
    if (filters?.subtipo) {
      params.append('operativoSubtipo', filters.subtipo);
    }
    if (filters?.barrio) params.append('barrio', filters.barrio);
    if (filters?.status) {
      params.append('status', filters.status);
    } else {
      // No forzamos estados si no hay filtro, para ver qué devuelve el servidor
      // y filtrar en el frontend si es necesario o dejar que el backend decida por rol
    }
    if (filters?.gestor) params.append('gestor', filters.gestor);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const url = `/sorver/activities?${queryString}`; // Usamos el endpoint general con filtros
    const { data } = await api.get<PaginatedResponse<Activity>>(url);
    return unwrapPaginated(data);
  },

  // VALIDADOR: Aprobar actividad
  async approve(id: string, notes?: string, selectedPhotos?: string[]): Promise<Activity> {
    const { data } = await api.post<Activity>(`/sorver/activities/${id}/approve`, {
      notes: notes || undefined,
      selectedPhotos: selectedPhotos || undefined,
    });
    return normalizeActivity(data);
  },

  // VALIDADOR: Rechazar actividad
  async reject(id: string, notes: string): Promise<Activity> {
    const { data } = await api.post<Activity>(`/sorver/activities/${id}/reject`, {
      notes,
    });
    return normalizeActivity(data);
  },

  // GESTOR/VALIDADOR/ADMIN: Actualizar actividad
  async update(id: string, dto: any): Promise<Activity> {
    const { data } = await api.patch<Activity>(`/sorver/activities/${id}`, dto);
    return normalizeActivity(data);
  },

  // GESTOR_PYBA: Agregar seguimiento (nota + fotos) a un punto canino
  async addPybaSeguimiento(id: string, payload: { nota: string; photos?: string[] }): Promise<Activity> {
    const { data } = await api.post<Activity>(`/sorver/activities/${id}/pyba-seguimiento`, payload);
    return normalizeActivity(data);
  },

  // VALIDADOR_AMBIENTAL: Aprobar residuos específicos (bypassing generic patch)
  async aprobarResiduo(id: string, residuos: any[]): Promise<Activity> {
    const { data } = await api.patch<Activity>(`/sorver/activities/${id}/aprobar-residuo`, { residuos });
    return normalizeActivity(data);
  },

  // ADMIN/GESTOR_AMBIENTAL: Editar campos de un residuo individual por id o índice
  async editarResiduo(id: string, payload: {
    residuoId?: string;
    residuoIndex?: number;
    campos: {
      tipoResiduo?: string;
      areaLinealMetros?: number;
      recogido?: boolean;
      fechaRecogida?: string;
      dateTime?: string;
      observaciones?: string;
    };
  }): Promise<Activity> {
    const { data } = await api.patch<Activity>(`/sorver/activities/${id}/editar-residuo`, payload);
    return normalizeActivity(data);
  },

  // ADMIN: Listar todas las actividades (con paginación)
  async getAllPaginated(filters?: { status?: string; operativoCategoria?: string; operativoSubtipo?: string; desde?: string; hasta?: string; limit?: number; offset?: number }): Promise<PaginatedResponse<Activity>> {
    const { data } = await api.get<PaginatedResponse<Activity>>('/sorver/activities', { params: filters });
    return unwrapPaginated(data);
  },

  async agregarNotaResiduo(activityId: string, residuoId: string, texto: string): Promise<Activity> {
    const { data } = await api.post<Activity>(`/sorver/activities/${activityId}/residuo-nota`, { residuoId, texto });
    return normalizeActivity(data);
  },

  async eliminarNotaResiduo(activityId: string, residuoId: string, notaId: string): Promise<Activity> {
    const { data } = await api.delete<Activity>(`/sorver/activities/${activityId}/residuo-nota`, { data: { residuoId, notaId } });
    return normalizeActivity(data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/sorver/activities/${id}`);
  },

  // ADMIN: Eliminación masiva de actividades
  async bulkDelete(ids: string[]): Promise<{ success: boolean; count: number }> {
    const { data } = await api.post<{ success: boolean; count: number }>('/sorver/activities/bulk-delete', { ids });
    return data;
  },

  // ADMIN: Importar Excel Ambiental
  async importAmbientalExcel(file: File): Promise<{ success: boolean; importedGroups: number; totalRows: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<{ success: boolean; importedGroups: number; totalRows: number }>('/sorver/activities/import-ambiental-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  // ADMIN/GESTOR_AMBIENTAL: Obtener todos los IDs filtrados
  async listAllIds(filters?: any): Promise<string[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, String(filters[key]));
        }
      });
    }
    const { data } = await api.get<string[]>(`/sorver/activities/all-ids?${params.toString()}`);
    return data;
  },

  // GESTOR_AMBIENTAL: Agregar seguimiento a punto de residuos
  async addSeguimiento(id: string, data: {
    action: 'MARCAR_RECOGIDO' | 'AGREGAR_RESIDUO';
    residuoId?: string;
    photosRecogida?: string[];
    fechaRecogida?: string;
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
      createdByUserId?: string;
      createdByNombre?: string;
    };
  }): Promise<Activity> {
    const { data: activity } = await api.patch<Activity>(`/sorver/activities/${id}/seguimiento`, data);
    return normalizeActivity(activity);
  },
};
